export type InstrumentName = string
export type StrokeSymbol = 'T' | 's' | 'M' | 'B' | 'p' | 't' | 'x'

// Simple synthesized drum voices using Web Audio primitives
export function triggerVoice(
  ctx: AudioContext,
  destination: AudioNode,
  instrument: InstrumentName,
  stroke: StrokeSymbol,
  when?: number,
) {
  // Map instrument+stroke to a small set of synthesis recipes
  const lower = instrument.toLowerCase()
  const now = when ?? ctx.currentTime

  // Utility: simple envelope on a GainNode
  function envNode(decay: number, peak = 1, curve: 'linear' | 'exp' = 'exp') {
    const g = ctx.createGain()
    g.gain.cancelScheduledValues(now)
    // Fast attack to reach peak decisively
    g.gain.setValueAtTime(0.0001, now)
    g.gain.linearRampToValueAtTime(Math.max(0.0001, peak), now + 0.005)
    const end = now + decay
    if (curve === 'exp') {
      g.gain.exponentialRampToValueAtTime(0.0001, end)
    } else {
      g.gain.linearRampToValueAtTime(0, end)
    }
    return {node: g, endTime: end}
  }

  // Wood click: for clave and palitos
  function woodClick(kind: 'clave' | 'palitos') {
    // Parallel resonant bandpasses on a noise burst to emulate wood block
    const n = whiteNoise()
    const bp1 = ctx.createBiquadFilter()
    const bp2 = ctx.createBiquadFilter()
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 900
    bp1.type = 'bandpass'
    bp2.type = 'bandpass'
    if (kind === 'clave') {
      // Wood-on-wood clave: slightly lower and less ringing
      bp1.frequency.value = 2600 // upper resonance
      bp1.Q.value = 5
      bp2.frequency.value = 1000 // lower body resonance
      bp2.Q.value = 6
      // warmer transient
      hp.frequency.value = 600
      const env = envNode(0.06, 1.1)
      n.connect(hp)
      hp.connect(bp1)
      hp.connect(bp2)
      const mix = ctx.createGain()
      bp1.connect(mix)
      bp2.connect(mix)
      mix.connect(env.node).connect(destination)
      n.start(now)
      n.stop(now + 0.08)
    } else {
      // palitos: raise pitch (brighter than current clave)
      bp1.frequency.value = 2600
      bp1.Q.value = 6
      bp2.frequency.value = 1500
      bp2.Q.value = 4
      // restore higher highpass cutoff
      hp.frequency.value = 900
      const env = envNode(0.08, 0.9)
      n.connect(hp)
      hp.connect(bp1)
      hp.connect(bp2)
      const mix = ctx.createGain()
      bp1.connect(mix)
      bp2.connect(mix)
      mix.connect(env.node).connect(destination)
      n.start(now)
      n.stop(now + 0.09)
    }
  }

  // Utility: noise buffer
  function whiteNoise() {
    const bufferSize = 2 * ctx.sampleRate
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
    const src = ctx.createBufferSource()
    src.buffer = buffer
    return src
  }

  // Simple bell strike for 'x'
  function bell(freq = 1200, decay = 0.3) {
    const osc = ctx.createOscillator()
    const mod = ctx.createOscillator()
    const modGain = ctx.createGain()
    modGain.gain.value = freq * 0.5
    mod.frequency.value = freq * 1.5
    mod.connect(modGain)
    modGain.connect(osc.frequency)
    osc.frequency.value = freq
    const {node: g, endTime} = envNode(decay, 1.4)
    osc.connect(g)
    g.connect(destination)
    osc.start(now)
    mod.start(now)
    osc.stop(endTime)
    mod.stop(endTime)
  }

  // Simple tom/skin tone: sine with quick decay + slight pitch drop
  function skin(freq = 180, decay = 0.55, peak = 1.2) {
    const osc = ctx.createOscillator()
    const gWrap = envNode(decay, peak)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq * 1.05, now)
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq), now + decay)
    osc.connect(gWrap.node)
    gWrap.node.connect(destination)
    osc.start(now)
    osc.stop(gWrap.endTime)
  }

  // Bass thump: sine + short noise click + lowpass
  function bass(freq = 80, decay = 0.45) {
    const gWrap = envNode(decay, 1.3)
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq * 1.1, now)
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq), now + decay)
    osc.connect(gWrap.node)

    // Click
    const n = whiteNoise()
    const bp = ctx.createBiquadFilter()
    bp.type = 'highpass'
    bp.frequency.value = 2000
    const clickEnv = envNode(0.03, 0.5)
    n.connect(bp).connect(clickEnv.node).connect(destination)
    n.start(now)
    n.stop(now + 0.05)

    gWrap.node.connect(destination)
    osc.start(now)
    osc.stop(gWrap.endTime)
  }

  // Slap: warmer noise burst with broader bandpass + a touch of body
  function slap(decay = 0.14) {
    const n = whiteNoise()
    // Main bandpass slightly lower and broader for warmth
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 1800
    bp.Q.value = 2.8
    // Add a subtle lowpass branch to give body to the slap
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 1200
    // Mix both branches before the envelope
    const mix = ctx.createGain()
    mix.gain.value = 1.0
    const gWrap = envNode(decay, 1.0)
    n.connect(bp)
    n.connect(lp)
    bp.connect(mix)
    lp.connect(mix)
    mix.connect(gWrap.node).connect(destination)
    n.start(now)
    n.stop(now + decay + 0.02)
  }

  // Palm/touch: softer noise/skin
  function palmTouch(decay = 0.08, gain = 0.6) {
    const n = whiteNoise()
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 1000
    const gWrap = envNode(decay, gain)
    n.connect(lp).connect(gWrap.node).connect(destination)
    n.start(now)
    n.stop(now + decay + 0.02)
  }

  // Choose voice by symbol with slight instrument-based tuning
  const baseFreq = lower.includes('tumba')
    ? 90
    : lower.includes('conga')
      ? 150
      : lower.includes('quinto')
        ? 220
        : lower.includes('bell')
          ? 1200
          : 180

  switch (stroke) {
    case 'x':
      if (lower.includes('clave')) {
        woodClick('clave')
      } else if (lower.includes('palitos')) {
        woodClick('palitos')
      } else if (lower.includes('agogo')) {
        // Agogo bells: two bells (1 & 2), each with high/low pitches
        // Typical ranges: low ~800-1000 Hz, high ~1300-1700 Hz
        const isHigh = lower.includes('high')
        const which = lower.includes('bell1') ? 1 : lower.includes('bell2') ? 2 : 0
        const base = isHigh ? 1500 : 900
        const detune = which === 1 ? -60 : which === 2 ? 60 : 0
        const freq = Math.max(200, base + detune)
        bell(freq, 0.55)
      } else {
        bell(baseFreq >= 400 ? baseFreq : 1200, 0.25)
      }
      break
    case 'B':
      bass(Math.max(50, baseFreq * 0.7), 0.45)
      break
    case 'T':
      // Open tone: let it ring a bit longer
      skin(baseFreq, 0.6, 1.0)
      break
    case 's':
      slap(0.16)
      break
    case 'M':
      skin(baseFreq * 0.95, 0.14, 0.6)
      break
    case 'p':
      palmTouch(0.1, 0.5)
      break
    case 't':
      palmTouch(0.06, 0.4)
      break
  }
}
