import type {ParsedPart, ParsedRhythm, PartValue, RhythmJSON, StrokeSymbol} from './types'

const VALID_STROKES = new Set<StrokeSymbol>(['T', 's', 'M', 'B', 'p', 't', 'r', 'x', '.', '|'])

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

function validateLine(raw: string, instrument: string) {
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i] as StrokeSymbol
    if (!VALID_STROKES.has(ch)) {
      const allowed = Array.from(VALID_STROKES).join(', ')
      throw new Error(
        `Invalid stroke character '${raw[i]}' in instrument '${instrument}' at position ${i + 1}. Allowed: ${allowed}`,
      )
    }
  }
}

function isRecord(v: unknown): v is Record<string, string> {
  return !!v && !Array.isArray(v) && typeof v === 'object'
}

function parsePart(instrument: string, value: PartValue): ParsedPart[] {
  const processOne = (idx: number, v: string | Record<string, string>): ParsedPart => {
    if (typeof v === 'string') {
      validateLine(v, instrument)
      const tokens = stripBars(tokenizeLine(v)) as StrokeSymbol[]
      return {
        instrument: idx === 0 ? instrument : `${instrument} alt[${idx}]`,
        baseInstrument: instrument,
        variantIndex: idx,
        raw: v,
        tokens,
      }
    }
    const labels = Object.keys(v)
    const subparts: {label: string; tokens: StrokeSymbol[]}[] = []
    for (const label of labels) {
      const raw = v[label] as string
      validateLine(raw, `${instrument}:${label}`)
      const tokens = stripBars(tokenizeLine(raw)) as StrokeSymbol[]
      subparts.push({label, tokens})
    }
    const maxLen = subparts.reduce((m, sp) => Math.max(m, sp.tokens.length), 0)
    const merged: StrokeSymbol[] = []
    for (let i = 0; i < maxLen; i++) {
      let tok: StrokeSymbol = '.'
      for (const sp of subparts) {
        const t = (sp.tokens[i] ?? '.') as StrokeSymbol
        if (t !== '.') {
          tok = t
          break
        }
      }
      merged.push(tok)
    }
    const rawJoined = labels.map(l => v[l]).join('\n')
    return {
      instrument: idx === 0 ? instrument : `${instrument} alt[${idx}]`,
      baseInstrument: instrument,
      variantIndex: idx,
      raw: rawJoined,
      tokens: merged,
      displaySubparts: subparts,
    }
  }

  if (typeof value === 'string' || isRecord(value)) {
    // Single string or object of subparts
    return [processOne(0, value as string | Record<string, string>)]
  }
  // Array of alternates
  const arr = value as Array<string | Record<string, string>>
  const out: ParsedPart[] = []
  arr.forEach((v, idx) => out.push(processOne(idx, v)))
  return out
}

export function parseRhythm(json: RhythmJSON): ParsedRhythm {
  const {numerator, denominator} = parseTimeSignature(json.time_signature)
  const parts: ParsedPart[] = Object.entries(json.parts).flatMap(([instrument, value]) =>
    parsePart(instrument, value),
  )

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
