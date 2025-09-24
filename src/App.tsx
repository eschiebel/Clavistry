import {useEffect, useMemo, useRef, useState} from 'react'
import WebRenderer from '@elemaudio/web-renderer'
import type {ParsedRhythm, RhythmJSON} from './rhythm/types'
import {parseRhythm} from './rhythm/parser'
import {buildPulseMatrix} from './rhythm/sequence'
import {triggerVoice} from './audio/voices'

export default function App() {
  const rendererRef = useRef<WebRenderer | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const masterGainRef = useRef<GainNode | null>(null)
  const compressorRef = useRef<DynamicsCompressorNode | null>(null)
  const outputGainRef = useRef<GainNode | null>(null)
  const [masterVol, setMasterVol] = useState(1.6) // linear gain
  const [rendererReady, setRendererReady] = useState<'idle' | 'ok' | 'failed'>('idle')
  const [started, setStarted] = useState(false)
  const [bpm, setBpm] = useState(120)
  const [rhythm, setRhythm] = useState<ParsedRhythm | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pulse, setPulse] = useState(0)
  const pulseRef = useRef(0)
  useEffect(() => {
    pulseRef.current = pulse
  }, [pulse])
  
  const matrix = useMemo(() => (rhythm ? buildPulseMatrix(rhythm) : null), [rhythm])

  const pulseIds = useMemo(() => {
    const count = matrix?.totalPulses ?? 0
    return Array.from({length: count}, () =>
      globalThis.crypto && 'randomUUID' in globalThis.crypto
        ? (globalThis.crypto as Crypto & {randomUUID: () => string}).randomUUID()
        : Math.random().toString(36).slice(2),
    )
  }, [matrix?.totalPulses])

  const headerIds = useMemo(() => {
    const count = matrix?.totalPulses ?? 0
    return Array.from({length: count}, () =>
      globalThis.crypto && 'randomUUID' in globalThis.crypto
        ? (globalThis.crypto as Crypto & {randomUUID: () => string}).randomUUID()
        : Math.random().toString(36).slice(2),
    )
  }, [matrix?.totalPulses])

  // Load example rhythm once
  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/rhythms/bembe.json')
        if (!res.ok) throw new Error(`Failed to load rhythm: ${res.status}`)
        const data = (await res.json()) as RhythmJSON
        const parsed = parseRhythm(data)
        setRhythm(parsed)
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        setError(msg)
      }
    })()
  }, [])

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      rendererRef.current?.context?.close()
      rendererRef.current = null
    }
  }, [])

  async function ensureRenderer() {
    // Always ensure we have an AudioContext for synthesized voices
    if (!audioCtxRef.current) {
      const Ctx: typeof AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext
      audioCtxRef.current = new Ctx()
    }
    if (audioCtxRef.current.state !== 'running') {
      await audioCtxRef.current.resume().catch(() => {})
    }

    if (rendererRef.current || rendererReady === 'failed') return rendererRef.current ?? null

    // Try to initialize Elementary renderer in the background with a timeout so Start doesn't hang
    try {
      const tryInit = async () => {
        const renderer = new WebRenderer()
        // Use the same context for simplicity
        const ctx = audioCtxRef.current!
        await renderer.initialize(ctx, {
          numberOfInputs: 0,
          numberOfOutputs: 1,
          outputChannelCount: [2],
        })
        rendererRef.current = renderer
        setRendererReady('ok')
        return renderer
      }
      const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500))
      const result = await Promise.race([tryInit(), timeout])
      if (result === null) {
        console.warn('[Elementary] initialize timed out; continuing without renderer')
        setRendererReady('failed')
        return null
      }
      return result as WebRenderer
    } catch (e) {
      console.error('[Elementary] initialize failed:', e)
      setRendererReady('failed')
      return null
    }
  }

  async function start() {
    await ensureRenderer()
    // Make sure our synth context is ready
    if (!audioCtxRef.current) {
      const Ctx: typeof AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext
      audioCtxRef.current = new Ctx()
    }
    if (audioCtxRef.current.state !== 'running') {
      await audioCtxRef.current.resume()
    }
    // Set up master (pre) gain, compressor, and output (post) gain chain to improve loudness
    const ctx = audioCtxRef.current
    if (ctx) {
      if (!masterGainRef.current) {
        const g = ctx.createGain()
        g.gain.value = 1.2 // fixed pre-boost before compression
        masterGainRef.current = g
      }
      if (!compressorRef.current) {
        const comp = ctx.createDynamicsCompressor()
        // Gentle bus compression
        comp.threshold.value = -24
        comp.knee.value = 30
        comp.ratio.value = 6
        comp.attack.value = 0.003
        comp.release.value = 0.125
        compressorRef.current = comp
      }
      if (!outputGainRef.current) {
        const out = ctx.createGain()
        out.gain.value = masterVol // user volume control after compression
        outputGainRef.current = out
      }
      try {
        // Connect chain: master -> compressor -> output -> destination
        masterGainRef.current.disconnect()
      } catch {}
      try {
        compressorRef.current.disconnect()
      } catch {}
      try {
        outputGainRef.current.disconnect()
      } catch {}
      masterGainRef.current.connect(compressorRef.current)
      compressorRef.current.connect(outputGainRef.current)
      outputGainRef.current.connect(ctx.destination)
    }
    setStarted(true)
  }

  async function stop() {
    const renderer = rendererRef.current
    if (renderer) {
      await renderer.context?.close().catch(() => {})
      rendererRef.current = null
    }
    if (audioCtxRef.current) {
      await audioCtxRef.current.close().catch(() => {})
      audioCtxRef.current = null
    }
    if (masterGainRef.current) {
      try { masterGainRef.current.disconnect() } catch {}
      masterGainRef.current = null
    }
    if (compressorRef.current) {
      try { compressorRef.current.disconnect() } catch {}
      compressorRef.current = null
    }
    if (outputGainRef.current) {
      try { outputGainRef.current.disconnect() } catch {}
      outputGainRef.current = null
    }
    setStarted(false)
  }

  // Lookahead scheduler: schedule audio using AudioContext time with short lookahead
  useEffect(() => {
    if (!rhythm || !matrix) return
    const ctx = audioCtxRef.current ?? rendererRef.current?.context ?? null
    if (!ctx) return

    const denom = rhythm.timeSignature.denominator
    const factor = denom / 4 // 4 -> 1x, 8 -> 2x, etc.
    const pulsesPerSecond = (bpm / 60) * factor
    const secondsPerPulse = 1 / pulsesPerSecond
    const LOOKAHEAD_SEC = 0.1 // schedule 100ms ahead
    const TICK_MS = 25 // check every 25ms
    let nextNoteTime = ctx.currentTime
    let nextIndex = pulseRef.current

    const tick = async () => {
      const modulo = matrix.totalPulses
      if (ctx.state !== 'running') {
        try { await ctx.resume() } catch {}
      }

      while (nextNoteTime < ctx.currentTime + LOOKAHEAD_SEC) {
        // UI update in sync with scheduled note
        nextIndex = (nextIndex + 1) % modulo
        setPulse(nextIndex)

        if (started) {
          const dest = masterGainRef.current ?? ctx.destination
          const when = nextNoteTime
          for (const row of matrix.rows) {
            const sym = row.symbols[nextIndex]
            if (sym && sym !== '|' && sym !== '.') {
              triggerVoice(ctx, dest, row.instrument, sym as any, when)
            }
          }
        }
        nextNoteTime += secondsPerPulse
      }
    }

    const id = setInterval(tick, TICK_MS)
    return () => clearInterval(id)
  }, [bpm, rhythm, matrix, started])

  // Apply master volume changes dynamically (post-compressor output gain)
  useEffect(() => {
    if (outputGainRef.current) {
      outputGainRef.current.gain.value = masterVol
    }
  }, [masterVol])


  return (
    <div style={{fontFamily: 'system-ui, sans-serif', padding: 24}}>
      <h1>DrumsElementary</h1>
      <p>A drum machine for hand-drum ensemble rhythms using Elementary Audio.</p>

      <div style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12}}>
        <button type="button" onClick={start} disabled={started}>
          Start
        </button>
        <button type="button" onClick={stop} disabled={!started}>
          Stop
        </button>
        <button
          type="button"
          onClick={async () => {
            // Quick diagnostic ping
            const ctx = audioCtxRef.current ?? rendererRef.current?.context ?? null
            if (!ctx) return
            if (ctx.state !== 'running') {
              try { await ctx.resume() } catch {}
            }
            const dest = masterGainRef.current ?? ctx.destination
            triggerVoice(ctx, dest, 'bell', 'x' as any)
          }}
        >
          Test Sound
        </button>
        <label style={{display: 'inline-flex', gap: 6, alignItems: 'center'}}>
          Tempo (BPM)
          <input
            type="number"
            min={30}
            max={240}
            value={bpm}
            onChange={e => setBpm(Number(e.target.value))}
            style={{width: 72}}
          />
        </label>
        <label style={{display: 'inline-flex', gap: 6, alignItems: 'center'}}>
          Volume
          <input
            type="range"
            min={0.5}
            max={3}
            step={0.1}
            value={masterVol}
            onChange={e => setMasterVol(Number(e.target.value))}
            style={{width: 140}}
          />
          <span style={{width: 48, textAlign: 'right'}}>{(masterVol * 100).toFixed(0)}%</span>
        </label>
      </div>
      <div style={{fontSize: 12, opacity: 0.7, marginBottom: 8}}>
        Transport: {started ? 'started' : 'stopped'} · Audio: {audioCtxRef.current?.state ?? 'uninitialized'} · Elementary: {rendererRef.current ? 'ready' : rendererReady}
      </div>

      {error && <div style={{color: '#ffb4b4', marginBottom: 12}}>Error: {error}</div>}

      {rhythm ? (
        <div style={{background: '#11162a', padding: 12, borderRadius: 8}}>
          <h2 style={{marginTop: 0}}>{rhythm.name}</h2>
          <div>
            Time Signature: {rhythm.timeSignature.numerator}/{rhythm.timeSignature.denominator}
          </div>
          <div>Pulses per Measure: {rhythm.pulsesPerMeasure}</div>
          <div style={{marginTop: 8, display: 'flex', gap: 6}}>
            {new Array(matrix?.totalPulses ?? rhythm.pulsesPerMeasure).fill(0).map((_, i) => (
              <div
                key={pulseIds[i]}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 4,
                  display: 'grid',
                  placeItems: 'center',
                  background: i === pulse ? '#4675ff' : '#242b49',
                  color: i === pulse ? '#fff' : '#aab',
                  fontSize: 12,
                  borderLeft:
                    i > 0 && i % rhythm.pulsesPerMeasure === 0 ? '2px solid #556' : '1px solid transparent',
                }}
                title={`Pulse ${i + 1}`}
              >
                {i + 1}
              </div>
            ))}
          </div>
          <h3>Tablature (full pattern)</h3>
          {matrix && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `160px repeat(${matrix.totalPulses}, 28px)`,
                gap: 6,
                alignItems: 'center',
                marginTop: 8,
              }}
            >
              <div style={{opacity: 0.7}}>Instrument</div>
              {new Array(matrix.totalPulses).fill(0).map((_, i) => (
                <div
                  key={headerIds[i]}
                  style={{
                    textAlign: 'center',
                    opacity: 0.7,
                    borderLeft:
                      i > 0 && i % rhythm.pulsesPerMeasure === 0
                        ? '2px solid #556'
                        : '1px solid transparent',
                  }}
                >
                  {i + 1}
                </div>
              ))}
              {matrix.rows.map(row => (
                <div key={row.instrument} style={{display: 'contents'}}>
                  <div style={{fontWeight: 600}}>{row.instrument}</div>
                  {row.symbols.map((sym, i) => (
                    <div
                      key={`${row.instrument}-${i}`}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        display: 'grid',
                        placeItems: 'center',
                        background: i === pulse ? '#2a3a70' : '#1a2140',
                        border: '1px solid #334',
                        borderLeft:
                          i > 0 && i % rhythm.pulsesPerMeasure === 0
                            ? '2px solid #556'
                            : '1px solid #334',
                        color: sym === '.' ? '#556' : '#e9eef5',
                        fontFamily: 'monospace',
                        fontSize: 13,
                      }}
                      title={`Pulse ${i + 1}: ${sym}`}
                    >
                      {sym}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>Loading rhythm...</div>
      )}

      <p style={{marginTop: 16}}>
        Next: schedule strokes from the tablature and map symbols to synthesized/sampled voices.
      </p>
    </div>
  )
}
