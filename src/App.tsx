import {useEffect, useMemo, useRef, useState} from 'react'
import WebRenderer from '@elemaudio/web-renderer'
import type {ParsedRhythm, RhythmJSON} from './rhythm/types'
import {parseRhythm} from './rhythm/parser'
import {buildPulseMatrix} from './rhythm/sequence'
import {triggerVoice, type StrokeSymbol} from './audio/voices'
import {toBaseName, loadRhythm, getMeterInfo} from './utils'
import {Mixer} from './components/Mixer'
import {RhythmView} from './components/RhythmView'

export default function App() {
  const rendererRef = useRef<WebRenderer | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const masterGainRef = useRef<GainNode | null>(null)
  const compressorRef = useRef<DynamicsCompressorNode | null>(null)
  const outputGainRef = useRef<GainNode | null>(null)
  const [masterVol, setMasterVol] = useState(1.6) // linear gain
  // Mixer: per-instrument settings and nodes
  const [instrumentSettings, setInstrumentSettings] = useState<
    Record<string, {vol: number; mute: boolean}>
  >({})
  const mixerNodesRef = useRef<Map<string, GainNode>>(new Map())
  const [rendererReady, setRendererReady] = useState<'idle' | 'ok' | 'failed'>('idle')
  const [started, setStarted] = useState(false)
  const [paused, setPaused] = useState(false)
  const [bpm, setBpm] = useState(120)
  const [bpmInput, setBpmInput] = useState(bpm)
  const [rhythm, setRhythm] = useState<ParsedRhythm | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pulse, setPulse] = useState(0)
  const pulseRef = useRef(0)
  useEffect(() => {
    pulseRef.current = pulse
  }, [pulse])

  // Rhythm selection
  const RHYTHM_OPTIONS = useMemo(
    () => [
      {label: 'Bembé', file: 'bembe.json'},
      {label: 'Guaguancó', file: 'guaguanco.json'},
      {label: 'Tumbao', file: 'tumbao.json'},
      {label: 'Conga de Comparsa', file: 'conga_de_comparsa.json'},
    ],
    [],
  )

  const rhythmMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const opt of RHYTHM_OPTIONS) {
      m.set(toBaseName(opt.file), opt.file)
      m.set(toBaseName(opt.label), opt.file)
    }
    return m
  }, [RHYTHM_OPTIONS])

  // Initialize selection from URL param 'rhythm', fallback to bembe.json
  const [selectedRhythmFile, setSelectedRhythmFile] = useState(() => {
    try {
      const sp = new URLSearchParams(window.location.search)
      const q = sp.get('rhythm')
      if (q) {
        const key = toBaseName(q)
        const file = rhythmMap.get(key) || `${key}.json`
        if (file && rhythmMap.get(toBaseName(file)))
          return rhythmMap.get(toBaseName(file)) as string
      }
    } catch {}
    return 'bembe.json'
  })
  const matrix = useMemo(() => (rhythm ? buildPulseMatrix(rhythm) : null), [rhythm])

  const pulseIds = useMemo(() => {
    const count = matrix?.totalPulses ?? 0
    return Array.from({length: count}, () =>
      globalThis.crypto && 'randomUUID' in globalThis.crypto
        ? (globalThis.crypto as Crypto & {randomUUID: () => string}).randomUUID()
        : Math.random().toString(36).slice(2),
    )
  }, [matrix?.totalPulses])

  // Debounce UI tempo changes into the effective bpm used by the scheduler
  useEffect(() => {
    const id = setTimeout(() => {
      if (Number.isFinite(bpmInput) && bpmInput > 0) setBpm(bpmInput)
    }, 200)
    return () => clearTimeout(id)
  }, [bpmInput])

  // Keep the input display in sync when bpm is changed programmatically (e.g., from JSON)
  useEffect(() => {
    setBpmInput(bpm)
  }, [bpm])

  // Initialize mixer settings when matrix changes (add missing instruments)
  useEffect(() => {
    if (!matrix) return
    setInstrumentSettings(prev => {
      const next = {...prev}
      for (const row of matrix.rows) {
        if (!next[row.instrument]) {
          next[row.instrument] = {vol: 1.0, mute: false}
        }
      }
      // Optionally prune removed instruments
      for (const key of Object.keys(next)) {
        if (!matrix.rows.find(r => r.instrument === key)) {
          delete next[key]
        }
      }
      return next
    })
  }, [matrix])

  const headerIds = useMemo(() => {
    const count = matrix?.totalPulses ?? 0
    return Array.from({length: count}, () =>
      globalThis.crypto && 'randomUUID' in globalThis.crypto
        ? (globalThis.crypto as Crypto & {randomUUID: () => string}).randomUUID()
        : Math.random().toString(36).slice(2),
    )
  }, [matrix?.totalPulses])

  useEffect(() => {
    ;(async () => {
      try {
        const {parsed, initial} = await loadRhythm(selectedRhythmFile)
        setRhythm(parsed)
        setError(null)
        // Reset transport position on rhythm change
        setPulse(0)
        pulseRef.current = 0

        // Apply optional initial_state (tempo and mixer)
        const DEFAULT_TEMPO = 120
        if (initial) {
          const {tempo, mixer} = initial
          // If tempo is provided, use it; otherwise reset to default
          if (typeof tempo === 'number' && Number.isFinite(tempo)) {
            setBpm(tempo)
          } else {
            setBpm(DEFAULT_TEMPO)
          }
          // Reset mixer to rhythm-provided initial state (or empty), not merged
          setInstrumentSettings(mixer ?? {})
        } else {
          // No initial state: clear mixer and reset tempo to default
          setInstrumentSettings({})
          setBpm(DEFAULT_TEMPO)
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        setError(msg)
      }
    })()
  }, [selectedRhythmFile])

  // Keep URL param in sync with selection (use replaceState to avoid history spam)
  useEffect(() => {
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('rhythm', toBaseName(selectedRhythmFile))
      window.history.replaceState({}, '', url)
    } catch {}
  }, [selectedRhythmFile])

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
      audioCtxRef.current = new window.AudioContext()
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
        const ctx = audioCtxRef.current as AudioContext
        await renderer.initialize(ctx, {
          numberOfInputs: 0,
          numberOfOutputs: 1,
          outputChannelCount: [2],
        })
        rendererRef.current = renderer
        setRendererReady('ok')
        return renderer
      }
      const timeout = new Promise<null>(resolve => setTimeout(() => resolve(null), 1500))
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
      audioCtxRef.current = new window.AudioContext()
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

      // Ensure per-instrument mixer nodes exist and are connected
      if (matrix) {
        for (const row of matrix.rows) {
          if (!mixerNodesRef.current.has(row.instrument)) {
            const g = ctx.createGain()
            const setting = instrumentSettings[row.instrument] ?? {vol: 1.0, mute: false}
            g.gain.value = setting.mute ? 0 : setting.vol
            g.connect(masterGainRef.current)
            mixerNodesRef.current.set(row.instrument, g)
          } else {
            const g = mixerNodesRef.current.get(row.instrument)
            if (!g) continue
            try {
              g.disconnect()
            } catch {}
            g.connect(masterGainRef.current)
            const setting = instrumentSettings[row.instrument] ?? {vol: 1.0, mute: false}
            g.gain.value = setting.mute ? 0 : setting.vol
          }
        }
      }
    }
    setPaused(false)
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
      try {
        masterGainRef.current.disconnect()
      } catch {}
      masterGainRef.current = null
    }
    if (compressorRef.current) {
      try {
        compressorRef.current.disconnect()
      } catch {}
      compressorRef.current = null
    }
    if (outputGainRef.current) {
      try {
        outputGainRef.current.disconnect()
      } catch {}
      outputGainRef.current = null
    }
    // Disconnect and clear mixer nodes
    for (const [, node] of mixerNodesRef.current) {
      try {
        node.disconnect()
      } catch {}
    }
    mixerNodesRef.current.clear()
    // Reset UI to beginning
    setPulse(0)
    pulseRef.current = 0
    setStarted(false)
    setPaused(false)
  }

  function pause() {
    // Do not tear down audio nodes; simply stop advancing
    setStarted(false)
    setPaused(true)
  }

  // Lookahead scheduler: schedule audio using AudioContext time with short lookahead
  useEffect(() => {
    if (!rhythm || !matrix) return
    const ctx = audioCtxRef.current ?? rendererRef.current?.context ?? null
    if (!ctx) return

    // Derive pulses per beat from meter (supports compound meters like 6/8)
    const {pulsesPerBeat} = getMeterInfo(rhythm.timeSignature, matrix.pulsesPerMeasure)
    const pulsesPerSecond = (bpm / 60) * pulsesPerBeat
    const secondsPerPulse = 1 / pulsesPerSecond
    const LOOKAHEAD_SEC = 0.1 // schedule 100ms ahead
    const TICK_MS = 25 // check every 25ms
    let nextNoteTime = ctx.currentTime
    let nextIndex = pulseRef.current

    const tick = async () => {
      const modulo = matrix.totalPulses
      if (ctx.state !== 'running') {
        try {
          await ctx.resume()
        } catch {}
      }

      // If transport is not started, either pause (hold) or stop (reset)
      if (!started) {
        if (paused) {
          // Hold current position and keep scheduler aligned with clock
          nextNoteTime = ctx.currentTime
          return
        }
        nextIndex = 0
        setPulse(0)
        nextNoteTime = ctx.currentTime
        return
      }

      while (nextNoteTime < ctx.currentTime + LOOKAHEAD_SEC) {
        // UI update in sync with scheduled note
        nextIndex = (nextIndex + 1) % modulo
        setPulse(nextIndex)

        const destDefault = masterGainRef.current ?? ctx.destination
        const when = nextNoteTime
        for (const row of matrix.rows) {
          const sym = row.symbols[nextIndex]
          if (sym && sym !== '|' && sym !== '.') {
            const node = mixerNodesRef.current.get(row.instrument)
            const dest = node ?? destDefault
            triggerVoice(ctx, dest, row.instrument, sym as StrokeSymbol, when)
          }
        }
        nextNoteTime += secondsPerPulse
      }
    }

    const id = setInterval(tick, TICK_MS)
    return () => clearInterval(id)
  }, [bpm, rhythm, matrix, started, paused])

  // Apply master volume changes dynamically (post-compressor output gain)
  useEffect(() => {
    if (outputGainRef.current) {
      outputGainRef.current.gain.value = masterVol
    }
  }, [masterVol])

  // Apply instrument settings (vol/mute) dynamically
  useEffect(() => {
    const ctx = audioCtxRef.current
    if (!ctx) return
    for (const [name, node] of mixerNodesRef.current) {
      const s = instrumentSettings[name]
      if (!s) continue
      node.gain.value = s.mute ? 0 : s.vol
    }
  }, [instrumentSettings])

  // Ensure mixer nodes exist and are wired for the current matrix even when switching rhythms mid-play
  useEffect(() => {
    const ctx = audioCtxRef.current
    const master = masterGainRef.current
    if (!ctx || !matrix || !master) return
    // Build a set of current instrument names
    const currentInstruments = new Set(matrix.rows.map(r => r.instrument))
    // Ensure a node per instrument and connect to master with correct gain
    for (const row of matrix.rows) {
      let g = mixerNodesRef.current.get(row.instrument)
      if (!g) {
        g = ctx.createGain()
        mixerNodesRef.current.set(row.instrument, g)
      } else {
        try {
          g.disconnect()
        } catch {}
      }
      g.connect(master)
      const s = instrumentSettings[row.instrument] ?? {vol: 1.0, mute: false}
      g.gain.value = s.mute ? 0 : s.vol
    }
    // Remove any stale nodes that are no longer present in the matrix
    for (const [name, node] of mixerNodesRef.current) {
      if (!currentInstruments.has(name)) {
        try {
          node.disconnect()
        } catch {}
        mixerNodesRef.current.delete(name)
      }
    }
  }, [matrix, instrumentSettings])

  return (
    <div style={{fontFamily: 'system-ui, sans-serif', padding: 24}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
        <svg
          className="icon"
          width="28"
          height="28"
          viewBox="0 0 64 64"
          xmlns="http://www.w3.org/2000/svg"
          fill="currentColor"
          aria-hidden="true"
        >
          <circle cx="32" cy="32" r="32" fill="##fff" />
          <path
            d="M32 12c-6 0-12 2-12 4v4c0 1.5 1.5 3 2 4l-2 20c0 6 4 12 12 12s12-6 12-12l-2-20c0-1 2-2.5 2-4v-4c0-2-6-4-12-4zm0 4c4.4 0 8 1.2 8 2s-3.6 2-8 2-8-1.2-8-2 3.6-2 8-2zm-6 10c1 0 2 .5 2 1s-1 1-2 1-2-.5-2-1 1-1 2-1zm12 0c1 0 2 .5 2 1s-1 1-2 1-2-.5-2-1 1-1 2-1zm-6 4c1.1 0 2 .9 2 2v20c0 1.1-.9 2-2 2s-2-.9-2-2V30c0-1.1.9-2 2-2z"
            fill="#3e2f1c"
          />
        </svg>
        <h1>Clavistry</h1>
      </div>
      <p>A drum machine for hand-drum ensemble rhythms.</p>

      <div style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12}}>
        <label style={{display: 'inline-flex', gap: 6, alignItems: 'center'}}>
          Rhythm
          <select
            value={selectedRhythmFile}
            onChange={e => setSelectedRhythmFile(e.target.value)}
            style={{padding: '4px 6px'}}
          >
            {RHYTHM_OPTIONS.map(opt => (
              <option key={opt.file} value={opt.file}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={start} disabled={started}>
          Start
        </button>
        <button type="button" onClick={pause} disabled={!started}>
          Pause
        </button>
        <button type="button" onClick={stop} disabled={!(started || paused)}>
          Stop
        </button>

        <label style={{display: 'inline-flex', gap: 6, alignItems: 'center'}}>
          Tempo (BPM)
          <input
            type="number"
            min={30}
            max={240}
            value={bpmInput}
            onChange={e => setBpmInput(Number(e.target.value))}
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
        Transport: {started ? 'started' : paused ? 'paused' : 'stopped'} · Audio:{' '}
        {audioCtxRef.current?.state ?? 'uninitialized'} · Elementary:{' '}
        {rendererRef.current ? 'ready' : rendererReady}
      </div>

      {matrix && (
        <Mixer
          matrix={matrix}
          instrumentSettings={instrumentSettings}
          setInstrumentSettings={setInstrumentSettings}
        />
      )}

      {error && <div style={{color: '#ffb4b4', marginBottom: 12}}>Error: {error}</div>}

      {rhythm && matrix ? (
        <RhythmView
          rhythm={rhythm}
          matrix={matrix}
          currentPulse={pulse}
          pulseIds={pulseIds}
          headerIds={headerIds}
        />
      ) : (
        <div>Loading rhythm...</div>
      )}
    </div>
  )
}
