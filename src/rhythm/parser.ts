import type {ParsedPart, ParsedRhythm, RhythmJSON, StrokeSymbol} from './types'

const VALID_STROKES = new Set<StrokeSymbol>(['T', 's', 'M', 'B', 'p', 't', 'x', '.', '|'])

export function parseTimeSignature(ts: string): {numerator: number; denominator: number} {
  const m = ts.match(/^(\d+)\/(\d+)$/)
  if (!m) throw new Error(`Invalid time_signature: ${ts}`)
  const numerator = Number(m[1])
  const denominator = Number(m[2])
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) {
    throw new Error(`Invalid time_signature numbers: ${ts}`)
  }
  return {numerator, denominator}
}

export function tokenizeLine(line: string): StrokeSymbol[] {
  const out: StrokeSymbol[] = []
  for (const ch of line) {
    if (!VALID_STROKES.has(ch as StrokeSymbol)) continue // legacy: keep function generic
    if (ch === '|') {
      // keep bar markers if desired for later alignment; for pulse scheduling we usually skip them
      // We'll include them here and downstream can filter if needed
      out.push('|')
    } else {
      out.push(ch as StrokeSymbol)
    }
  }
  return out
}

export function stripBars(tokens: StrokeSymbol[]): StrokeSymbol[] {
  return tokens.filter(t => t !== '|')
}

export function parseRhythm(json: RhythmJSON): ParsedRhythm {
  const {numerator, denominator} = parseTimeSignature(json.time_signature)
  const parts: ParsedPart[] = Object.entries(json.parts).map(([instrument, raw]) => {
    // Strict validation: throw if any unrecognized character is present
    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i] as StrokeSymbol
      if (!VALID_STROKES.has(ch)) {
        const allowed = Array.from(VALID_STROKES).join(', ')
        throw new Error(
          `Invalid stroke character '${raw[i]}' in instrument '${instrument}' at position ${i + 1}. Allowed: ${allowed}`,
        )
      }
    }
    const tokens = tokenizeLine(raw)
    return {instrument, raw, tokens: stripBars(tokens) as StrokeSymbol[]}
  })

  return {
    name: json.name,
    timeSignature: {numerator, denominator},
    // Grid resolution per measure: prefer explicit pulses_per_measure, else default to beats per measure
    pulsesPerMeasure:
      json.pulses_per_measure && Number.isFinite(json.pulses_per_measure)
        ? Number(json.pulses_per_measure)
        : numerator,
    parts,
  }
}
