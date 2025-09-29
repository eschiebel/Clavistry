import type {ParsedRhythm, StrokeSymbol} from './types'

export interface PulseRow {
  instrument: string
  symbols: StrokeSymbol[] // length = totalPulses
  // For sample selection only: when a part has labeled subparts, this carries
  // the instrument name augmented with the sub-label (e.g., "cowbell open").
  // Mixer routing should continue to use `instrument`.
  sampleInstrument?: string
  // Variant metadata
  baseInstrument?: string
  variantIndex?: number
}

// Build a matrix for DISPLAY only, expanding any left/right subparts into distinct rows.
export function buildDisplayMatrix(r: ParsedRhythm): PulseMatrix {
  const N = r.pulsesPerMeasure
  const maxLen = r.parts.reduce((m, p) => Math.max(m, p.tokens.length), 0)
  const padTo = (arr: StrokeSymbol[], len: number): StrokeSymbol[] => {
    if (arr.length >= len) return arr.slice(0, len)
    return arr.concat(Array.from({length: len - arr.length}, () => '.') as StrokeSymbol[])
  }

  const rows: PulseRow[] = []
  for (const p of r.parts) {
    if (p.displaySubparts && p.displaySubparts.length > 0) {
      for (const sp of p.displaySubparts) {
        rows.push({
          instrument: `${p.instrument}: ${sp.label}`,
          baseInstrument: p.baseInstrument,
          variantIndex: p.variantIndex,
          symbols: padTo(sp.tokens as StrokeSymbol[], maxLen),
        })
      }
    } else {
      rows.push({
        instrument: p.instrument,
        sampleInstrument: p.instrument,
        baseInstrument: p.baseInstrument,
        variantIndex: p.variantIndex,
        symbols: padTo(p.tokens as StrokeSymbol[], maxLen),
      })
    }
  }

  return {pulsesPerMeasure: N, totalPulses: maxLen, rows}
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
    return {
      instrument: p.instrument,
      symbols: line,
      baseInstrument: p.baseInstrument,
      variantIndex: p.variantIndex,
      sampleInstrument: p.instrument,
    }
  })

  return {pulsesPerMeasure: N, totalPulses: maxLen, rows}
}

// Build a matrix for PLAYBACK, expanding subparts into distinct rows and
// preserving instrument routing while allowing subpart-specific samples.
export function buildPlaybackMatrix(r: ParsedRhythm): PulseMatrix {
  const N = r.pulsesPerMeasure
  const maxLen = r.parts.reduce((m, p) => Math.max(m, p.tokens.length), 0)

  const padTo = (arr: StrokeSymbol[], len: number): StrokeSymbol[] => {
    if (arr.length >= len) return arr.slice(0, len)
    return arr.concat(Array.from({length: len - arr.length}, () => '.') as StrokeSymbol[])
  }

  const rows: PulseRow[] = []
  for (const p of r.parts) {
    if (p.displaySubparts && p.displaySubparts.length > 0) {
      for (const sp of p.displaySubparts) {
        rows.push({
          instrument: p.instrument,
          sampleInstrument: `${p.baseInstrument ?? p.instrument} ${sp.label}`,
          baseInstrument: p.baseInstrument,
          variantIndex: p.variantIndex,
          symbols: padTo(sp.tokens as StrokeSymbol[], maxLen),
        })
      }
    } else {
      rows.push({
        instrument: p.instrument,
        sampleInstrument: p.baseInstrument ?? p.instrument,
        baseInstrument: p.baseInstrument,
        variantIndex: p.variantIndex,
        symbols: padTo(p.tokens as StrokeSymbol[], maxLen),
      })
    }
  }

  return {pulsesPerMeasure: N, totalPulses: maxLen, rows}
}

// Build playback matrix honoring selected variant per base instrument
export function buildPlaybackMatrixWithSelection(
  r: ParsedRhythm,
  selectedVariants: Record<string, number>,
): PulseMatrix {
  const filtered: ParsedRhythm = {
    ...r,
    parts: r.parts.filter(p => (selectedVariants[p.baseInstrument] ?? 0) === (p.variantIndex ?? 0)),
  }
  return buildPlaybackMatrix(filtered)
}
