import {Fragment} from 'react'
import {getMeterInfo} from '../utils'
import type {ParsedRhythm} from '../rhythm/types'
import type {PulseMatrix} from '../rhythm/sequence'

interface RhythmViewProps {
  rhythm: ParsedRhythm
  matrix: PulseMatrix
  currentPulse: number
  pulseIds: string[]
  headerIds: string[]
}
export function RhythmView({rhythm, matrix, currentPulse, pulseIds, headerIds}: RhythmViewProps) {
  const renderInstrumentLabel = (raw: string, isGroupStart: boolean): JSX.Element => {
    const [baseRaw, subRaw] = raw.includes(':') ? raw.split(':') : [raw, '']
    const base = (baseRaw ?? '').trim()
    const sub = (subRaw ?? '').trim().toLowerCase()
    const sideLabel = sub === 'left' ? 'L' : sub === 'right' ? 'R' : (subRaw ?? '').trim()
    const leftLabel = isGroupStart ? base : ''
    return (
      <div className="instrument-name">
        <span className="inst-left">{leftLabel}</span>
        <span className="inst-side">{sideLabel}</span>
      </div>
    )
  }

  // Base instrument label (text before ':') for grouping
  function getBaseLabel(i: number, rows: PulseMatrix['rows']): string {
    return (rows[i]?.instrument ?? '').split(':')[0].trim()
  }

  // Render a single matrix row with group separator, instrument label, and cells
  function renderMatrixRow(row: PulseMatrix['rows'][number], idx: number): JSX.Element {
    const rows = matrix.rows
    const isGroupStart = idx === 0 || getBaseLabel(idx, rows) !== getBaseLabel(idx - 1, rows)
    return (
      <Fragment key={`${row.instrument}-${idx}`}>
        {isGroupStart && idx > 0 && (
          <div className="instrument-sep" style={{gridColumn: '1 / -1'}} aria-hidden="true" />
        )}
        <div style={{display: 'contents'}}>
          {renderInstrumentLabel(row.instrument, isGroupStart)}
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
      <h2 style={{marginTop: 0}}>{rhythm.name}</h2>
      <div>
        <span>
          Time Signature: {rhythm.timeSignature.numerator}/{rhythm.timeSignature.denominator}
        </span>
        <span style={{marginLeft: '16px'}}>Pulses per Measure: {rhythm.pulsesPerMeasure}</span>
      </div>

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
