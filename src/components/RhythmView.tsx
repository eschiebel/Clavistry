import {Fragment} from 'react'
import {getMeterInfo} from '../utils'
import type {ParsedRhythm} from '../rhythm/types'
import type {PulseMatrix} from '../rhythm/sequence'

type FormDef = {name: string; variants: Record<string, number>}

interface RhythmViewProps {
  rhythm: ParsedRhythm
  matrix: PulseMatrix
  currentPulse: number
  pulseIds: string[]
  headerIds: string[]
  forms?: FormDef[] | null
}

export function RhythmView({
  rhythm,
  matrix,
  currentPulse,
  pulseIds,
  headerIds,
  forms,
}: RhythmViewProps) {
  const variantsByBase = new Map<string, Set<number>>()
  for (const r of matrix.rows) {
    const base = r.baseInstrument ?? (r.instrument ?? '').split(':')[0].trim()
    const set = variantsByBase.get(base) ?? new Set<number>()
    set.add(r.variantIndex ?? 0)
    variantsByBase.set(base, set)
  }

  const baseHasMultipleVariants = (base: string): boolean => {
    const set = variantsByBase.get(base)
    return (set?.size ?? 0) > 1
  }

  const getVariantFormName = (base: string, idx: number): string | null => {
    if (!forms || forms.length === 0) return null
    const hit = forms.find(
      f =>
        !!f.variants &&
        Object.prototype.hasOwnProperty.call(f.variants, base) &&
        f.variants[base] === idx,
    )
    return hit?.name ?? null
  }

  const renderInstrumentLabel = (
    raw: string,
    isVariantStart: boolean,
    leftOverride?: string,
  ): JSX.Element => {
    const [baseRaw, subRaw] = raw.includes(':') ? raw.split(':') : [raw, '']
    const base = (baseRaw ?? '').trim()
    const sub = (subRaw ?? '').trim().toLowerCase()
    const sideLabel = sub === 'left' ? 'L' : sub === 'right' ? 'R' : (subRaw ?? '').trim()
    const leftLabel = isVariantStart ? (leftOverride ?? base) : ''
    return (
      <div className="instrument-name">
        <span className="inst-left">{leftLabel}</span>
        <span className="inst-side">{sideLabel}</span>
      </div>
    )
  }

  // Base instrument label for grouping: prefer metadata, fallback to text before ':'
  function getBaseLabel(i: number, rows: PulseMatrix['rows']): string {
    const r = rows[i]
    if (!r) return ''
    if (r.baseInstrument) return r.baseInstrument
    return (r.instrument ?? '').split(':')[0].trim()
  }

  // Render a single matrix row with separators, variant labeling, and cells
  function renderMatrixRow(row: PulseMatrix['rows'][number], idx: number): JSX.Element {
    const rows = matrix.rows
    const baseNow = getBaseLabel(idx, rows)
    const basePrev = idx > 0 ? getBaseLabel(idx - 1, rows) : ''
    const vNow = row.variantIndex ?? 0
    const vPrev = idx > 0 ? (rows[idx - 1].variantIndex ?? 0) : -1
    const isGroupStart = idx === 0 || baseNow !== basePrev
    const isVariantStart = idx === 0 || baseNow !== basePrev || vNow !== vPrev
    const formName =
      isVariantStart && baseHasMultipleVariants(baseNow) ? getVariantFormName(baseNow, vNow) : null
    const leftOverride = isVariantStart
      ? formName
        ? `${baseNow} ${formName}`
        : vNow > 0
          ? `${baseNow} alt(${vNow})`
          : baseNow
      : undefined
    return (
      <Fragment key={`${row.instrument}-${idx}`}>
        {isGroupStart && idx > 0 && (
          <div className="instrument-sep" style={{gridColumn: '1 / -1'}} aria-hidden="true" />
        )}
        {!isGroupStart && isVariantStart && idx > 0 && (
          <div className="instrument-sep" style={{gridColumn: '1 / -1'}} aria-hidden="true" />
        )}
        <div style={{display: 'contents'}}>
          {renderInstrumentLabel(row.instrument, isVariantStart, leftOverride)}
          {row.symbols.map((sym, i) => {
            const cell = (
              <div
                key={`${row.instrument}-${headerIds[i]}`}
                className={`grid-cell${i === currentPulse ? ' is-current' : ''}${sym === '.' ? ' is-rest' : ''}`}
                title={`Pulse ${i + 1}: ${sym}`}
              >
                {sym}
              </div>
            )
            const needsSep = (i + 1) % rhythm.pulsesPerMeasure === 0 && i + 1 < matrix.totalPulses
            return needsSep ? (
              <Fragment key={`${row.instrument}-wrap-${headerIds[i]}`}>
                {cell}
                <div
                  key={`sep-${row.instrument}-after-${headerIds[i]}`}
                  aria-hidden="true"
                  className="grid-sep"
                />
              </Fragment>
            ) : (
              cell
            )
          })}
        </div>
      </Fragment>
    )
  }

  function renderHeaderCells(): JSX.Element[] {
    const {pulsesPerBeat, isCompound} = getMeterInfo(rhythm.timeSignature, matrix.pulsesPerMeasure)
    const simpleSyllables = ['1', '&']
    const compoundSyllables = ['1', '&', 'a']
    const cells: JSX.Element[] = []
    for (let i = 0; i < matrix.totalPulses; i++) {
      const posInBeat = i % pulsesPerBeat
      const syllables = isCompound ? compoundSyllables : simpleSyllables
      const pulsesIntoMeasure = i % rhythm.pulsesPerMeasure
      const beatInMeasure = Math.floor(pulsesIntoMeasure / pulsesPerBeat) + 1
      const label = posInBeat === 0 ? String(beatInMeasure) : (syllables[posInBeat] ?? '')
      cells.push(
        <div key={headerIds[i]} className="header-label">
          {label}
        </div>,
      )
      if ((i + 1) % rhythm.pulsesPerMeasure === 0 && i + 1 < matrix.totalPulses) {
        cells.push(
          <div key={`sep-h-after-${headerIds[i]}`} aria-hidden="true" className="grid-sep" />,
        )
      }
    }
    return cells
  }

  return (
    <div className="rhythm-card">
      <h2 style={{marginTop: 0, display: 'flex', alignItems: 'baseline', gap: 12}}>
        <span>{rhythm.name}</span>
        <span style={{fontSize: 14, fontWeight: 400, opacity: 0.75}}>
          {rhythm.timeSignature.numerator}/{rhythm.timeSignature.denominator} ·{' '}
          {rhythm.pulsesPerMeasure} pulses/measure
        </span>
      </h2>

      <h3>Tablature</h3>
      {/* Grid with narrow separator columns after each measure */}
      {(() => {
        const cols: string[] = ['160px']
        for (let i = 1; i <= matrix.totalPulses; i++) {
          cols.push('28px')
          if (i % rhythm.pulsesPerMeasure === 0 && i < matrix.totalPulses) cols.push('6px')
        }
        const gridTemplateColumns = cols.join(' ')
        return (
          <div className="rhythm-grid" style={{gridTemplateColumns}}>
            <div className="header-label">Instrument</div>
            {renderHeaderCells()}
            {matrix.rows.map(renderMatrixRow)}
          </div>
        )
      })()}
    </div>
  )
}
