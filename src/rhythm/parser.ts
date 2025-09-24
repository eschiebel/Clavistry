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
    if (!VALID_STROKES.has(ch as StrokeSymbol)) continue // ignore unknown characters silently for now
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
    const tokens = tokenizeLine(raw)
    return {instrument, raw, tokens: stripBars(tokens) as StrokeSymbol[]}
  })

  return {
    name: json.name,
    timeSignature: {numerator, denominator},
    pulsesPerMeasure: numerator,
    parts,
  }
}
