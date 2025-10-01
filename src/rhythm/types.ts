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

export type PartValue = string | Record<string, string> | Array<string | Record<string, string>>

export interface RhythmJSON {
  name: string
  time_signature: string // e.g. "6/8"
  parts: Record<string, PartValue> // instrument -> tablature line(s)
  pulses_per_measure?: number // optional explicit grid resolution per measure
  // Optional global form presets to select variant indices per base instrument.
  // This is UI metadata; parser ignores it, App uses it to set selectedVariants.
  forms?: Array<{
    name: string
    variants: Record<string, number>
  }>
  initial_state?: {
    mixer?: Record<string, MixerInstrumentState>
    tempo?: number
  }
}

export interface ParsedPart {
  instrument: string // display name; may include alt suffix in base name
  baseInstrument: string // instrument key as in JSON parts
  variantIndex: number // 0 for default, >0 for alternates
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
