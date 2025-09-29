// Sample playback engine: loads a simple instrument:stroke -> file mapping
// and plays decoded AudioBuffers with optional gain trim.

export type SampleMapEntry = {
  file: string
  gain?: number // dB trim relative to unity
}

// Internal caches
let mapLoaded = false
let mapLoadStarted = false
let sampleMap: Record<string, SampleMapEntry> = {}
const bufferCache = new Map<string, AudioBuffer>()
const bufferPromises = new Map<string, Promise<AudioBuffer>>()

function dbToLinear(db: number): number {
  return 10 ** (db / 20)
}

function getBaseUrl(): string {
  // @ts-expect-error Vite exposes BASE_URL at build time
  const b = import.meta.env.BASE_URL ?? '/'
  return b.endsWith('/') ? b : `${b}/`
}

function withBase(path: string): string {
  if (/^https?:\/\//i.test(path)) return path
  const base = getBaseUrl()
  const p = path.startsWith('/') ? path.slice(1) : path
  return `${base}${p}`
}

function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object'
}

function isSampleEntry(v: unknown): v is SampleMapEntry {
  return (
    isObject(v) &&
    typeof v.file === 'string' &&
    (v.gain === undefined || typeof v.gain === 'number')
  )
}

async function loadMap(): Promise<void> {
  if (mapLoaded || mapLoadStarted) return
  mapLoadStarted = true
  try {
    const res = await fetch(withBase('samples/map.json'))
    if (!res.ok) throw new Error(`Failed to load samples map: ${res.status}`)
    const raw = (await res.json()) as unknown
    const flat: Record<string, SampleMapEntry> = {}
    if (isObject(raw)) {
      for (const [k, v] of Object.entries(raw)) {
        if (isSampleEntry(v)) {
          flat[k] = v
        } else if (isObject(v)) {
          // Nested instrument object: keys like "open:x" or "left:T"
          for (const [sk, sv] of Object.entries(v)) {
            if (isSampleEntry(sv)) {
              const combined = `${k} ${sk}`
              flat[combined] = sv
            }
          }
        }
      }
    }
    sampleMap = flat
    mapLoaded = true
  } catch (e) {
    console.warn('[samples] map.json load failed:', e)
    sampleMap = {}
    mapLoaded = true
  }
}

function getEntry(key: string): SampleMapEntry | undefined {
  return sampleMap[key]
}

async function loadBuffer(ctx: AudioContext, path: string): Promise<AudioBuffer> {
  const existing = bufferCache.get(path)
  if (existing) return existing
  const pending = bufferPromises.get(path)
  if (pending) return pending
  const p = (async () => {
    const res = await fetch(withBase(path))
    if (!res.ok) throw new Error(`Failed to fetch sample ${path}: ${res.status}`)
    const arr = await res.arrayBuffer()
    const buf = await ctx.decodeAudioData(arr)
    bufferCache.set(path, buf)
    bufferPromises.delete(path)
    return buf
  })()
  bufferPromises.set(path, p)
  return p
}

// Public API
// Quick synchronous check. Triggers map load lazily and returns false until loaded.
export function sampleAvailable(key: string): boolean {
  if (!mapLoaded && !mapLoadStarted) {
    // Fire and forget
    void loadMap()
    return false
  }
  return !!getEntry(key)
}

// Attempt to play a sample. Returns true if scheduled, false if not available yet.
export function tryPlaySample(
  ctx: AudioContext,
  destination: AudioNode,
  instrument: string,
  stroke: string,
  when?: number,
): boolean {
  const key = `${instrument}:${stroke}`
  if (!mapLoaded) {
    void loadMap()
    return false
  }
  // Use exact, case-sensitive key matching; if missing and instrument contains a
  // subpart suffix (e.g., "conga left"), fall back to the base instrument ("conga").
  let entry = getEntry(key)
  if (!entry) {
    const idx = instrument.lastIndexOf(' ')
    if (idx > 0) {
      const base = instrument.slice(0, idx)
      entry = getEntry(`${base}:${stroke}`)
    }
  }
  if (!entry) return false
  const startTime = when ?? ctx.currentTime
  // Kick off load; schedule when ready if still in future, else play immediately
  void loadBuffer(ctx, entry.file)
    .then(buf => {
      const src = ctx.createBufferSource()
      src.buffer = buf
      const g = ctx.createGain()
      const trim = typeof entry.gain === 'number' ? dbToLinear(entry.gain) : 1.0
      g.gain.value = trim
      src.connect(g).connect(destination)
      const t = Math.max(startTime, ctx.currentTime)
      src.start(t)
    })
    .catch(err => {
      console.warn('[samples] failed to play sample', key, err)
    })
  // We return true to indicate we intend to play sample; however first hit may be slightly delayed if buffer not yet loaded.
  return true
}
