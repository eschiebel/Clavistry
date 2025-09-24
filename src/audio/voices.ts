export type InstrumentName = string;
export type StrokeSymbol = 'T' | 's' | 'M' | 'B' | 'p' | 't' | 'x';

// Simple synthesized drum voices using Web Audio primitives
export function triggerVoice(
  ctx: AudioContext,
  destination: AudioNode,
  instrument: InstrumentName,
  stroke: StrokeSymbol,
  when?: number,
) {
  // Map instrument+stroke to a small set of synthesis recipes
  const lower = instrument.toLowerCase();
  const now = when ?? ctx.currentTime;

  // Utility: simple envelope on a GainNode
  function envNode(decay: number, peak = 1, curve: 'linear' | 'exp' = 'exp') {
    const g = ctx.createGain();
    g.gain.cancelScheduledValues(now);
    // Fast attack to reach peak decisively
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(Math.max(0.0001, peak), now + 0.005);
    const end = now + decay;
    if (curve === 'exp') {
      g.gain.exponentialRampToValueAtTime(0.0001, end);
    } else {
      g.gain.linearRampToValueAtTime(0, end);
    }
    return { node: g, endTime: end };
  }

  // Utility: noise buffer
  function whiteNoise() {
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    return src;
  }

  // Simple bell strike for 'x'
  function bell(freq = 1200, decay = 0.3) {
    const osc = ctx.createOscillator();
    const mod = ctx.createOscillator();
    const modGain = ctx.createGain();
    modGain.gain.value = freq * 0.5;
    mod.frequency.value = freq * 1.5;
    mod.connect(modGain);
    modGain.connect(osc.frequency);
    osc.frequency.value = freq;
    const { node: g, endTime } = envNode(decay, 1.4);
    osc.connect(g);
    g.connect(destination);
    osc.start(now);
    mod.start(now);
    osc.stop(endTime);
    mod.stop(endTime);
  }

  // Simple tom/skin tone: sine with quick decay + slight pitch drop
  function skin(freq = 180, decay = 0.32, peak = 1.2) {
    const osc = ctx.createOscillator();
    const gWrap = envNode(decay, peak);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 1.05, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq), now + decay);
    osc.connect(gWrap.node);
    gWrap.node.connect(destination);
    osc.start(now);
    osc.stop(gWrap.endTime);
  }

  // Bass thump: sine + short noise click + lowpass
  function bass(freq = 80, decay = 0.45) {
    const gWrap = envNode(decay, 1.3);
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 1.1, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq), now + decay);
    osc.connect(gWrap.node);

    // Click
    const n = whiteNoise();
    const bp = ctx.createBiquadFilter();
    bp.type = 'highpass';
    bp.frequency.value = 2000;
    const clickEnv = envNode(0.03, 0.5);
    n.connect(bp).connect(clickEnv.node).connect(destination);
    n.start(now);
    n.stop(now + 0.05);

    gWrap.node.connect(destination);
    osc.start(now);
    osc.stop(gWrap.endTime);
  }

  // Slap: bright noise burst with bandpass
  function slap(decay = 0.12) {
    const n = whiteNoise();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2500;
    bp.Q.value = 4;
    const gWrap = envNode(decay, 1.0);
    n.connect(bp).connect(gWrap.node).connect(destination);
    n.start(now);
    n.stop(now + decay + 0.02);
  }

  // Palm/touch: softer noise/skin
  function palmTouch(decay = 0.08, gain = 0.6) {
    const n = whiteNoise();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1000;
    const gWrap = envNode(decay, gain);
    n.connect(lp).connect(gWrap.node).connect(destination);
    n.start(now);
    n.stop(now + decay + 0.02);
  }

  // Choose voice by symbol with slight instrument-based tuning
  const baseFreq = lower.includes('tumba') ? 90 : lower.includes('conga') ? 150 : lower.includes('quinto') ? 220 : lower.includes('bell') ? 1200 : 180;

  switch (stroke) {
    case 'x':
      bell(baseFreq >= 400 ? baseFreq : 1200, 0.25);
      break;
    case 'B':
      bass(Math.max(50, baseFreq * 0.7), 0.45);
      break;
    case 'T':
      skin(baseFreq, 0.28, 0.9);
      break;
    case 's':
      slap(0.12);
      break;
    case 'M':
      skin(baseFreq * 0.95, 0.14, 0.6);
      break;
    case 'p':
      palmTouch(0.10, 0.5);
      break;
    case 't':
      palmTouch(0.06, 0.4);
      break;
  }
}
