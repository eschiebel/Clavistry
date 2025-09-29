export type StrokeSymbol =
  | 'T' // tone
  | 's' // slap
  | 'M' // muff
  | 'B' // bass
  | 'p' // palm
  | 't' // touch
  | 'x' // strike (e.g., bell)
  | '.' // rest
  | '|' // bar separator

type MixerInstrumentState = {
  vol?: number
  mute?: boolean
}

export type PartValue = string | Record<string, string>

export interface RhythmJSON {
  name: string
  time_signature: string // e.g. "6/8"
  parts: Record<string, PartValue> // instrument -> tablature line(s)
  pulses_per_measure?: number // optional explicit grid resolution per measure
  initial_state?: {
    mixer?: Record<string, MixerInstrumentState>
    tempo?: number
  }
}

export interface ParsedPart {
  instrument: string
  raw: string // original tablature (single line or merged for L/R)
  tokens: StrokeSymbol[] // merged playable line (no '|')
  displaySubparts?: {label: string; tokens: StrokeSymbol[]}[] // optional UI-only split lines
}

export interface ParsedRhythm {
  name: string
  timeSignature: {numerator: number; denominator: number}
  pulsesPerMeasure: number // equals numerator
  parts: ParsedPart[]
}
