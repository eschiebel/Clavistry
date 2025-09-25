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

export interface RhythmJSON {
  name: string
  time_signature: string // e.g. "6/8"
  parts: Record<string, string> // instrument -> tablature line
  pulses_per_measure?: number // optional explicit grid resolution per measure
  initial_state?: {
    mixer?: Record<string, MixerInstrumentState>
    tempo?: number
  }
}

export interface ParsedPart {
  instrument: string
  raw: string // original tablature string
  tokens: StrokeSymbol[] // includes only strokes and rests (no '|')
}

export interface ParsedRhythm {
  name: string
  timeSignature: {numerator: number; denominator: number}
  pulsesPerMeasure: number // equals numerator
  parts: ParsedPart[]
}
