import type {ParsedRhythm, StrokeSymbol} from './types'

export interface PulseRow {
  instrument: string
  symbols: StrokeSymbol[] // length = totalPulses
}

export interface PulseMatrix {
  pulsesPerMeasure: number
  totalPulses: number
  rows: PulseRow[]
}

// Build a full-length matrix for display/scheduling across ALL bars present
// in the tablature. Shorter parts are padded with rests to the maximum length.
export function buildPulseMatrix(r: ParsedRhythm): PulseMatrix {
  const N = r.pulsesPerMeasure
  const tokenLines = r.parts.map(p => p.tokens.filter(t => t !== '|') as StrokeSymbol[])
  const maxLen = tokenLines.reduce((m, arr) => Math.max(m, arr.length), 0)

  const rows: PulseRow[] = r.parts.map((p, idx) => {
    const tokens = tokenLines[idx]
    let line = tokens.slice(0, maxLen)
    if (line.length < maxLen) {
      line = line.concat(Array.from({length: maxLen - line.length}, () => '.') as StrokeSymbol[])
    }
    return {instrument: p.instrument, symbols: line}
  })

  return {pulsesPerMeasure: N, totalPulses: maxLen, rows}
}
