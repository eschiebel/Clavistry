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
            {(() => {
              const {pulsesPerBeat, isCompound} = getMeterInfo(
                rhythm.timeSignature,
                matrix.pulsesPerMeasure,
              )
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
                    <div
                      key={`sep-h-after-${headerIds[i]}`}
                      aria-hidden="true"
                      className="grid-sep"
                    />,
                  )
                }
              }
              return cells
            })()}
            {matrix.rows.map(row => (
              <div key={row.instrument} style={{display: 'contents'}}>
                <div className="instrument-name">{row.instrument}</div>
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
                  const needsSep =
                    (i + 1) % rhythm.pulsesPerMeasure === 0 && i + 1 < matrix.totalPulses
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
            ))}
          </div>
        )
      })()}
    </div>
  )
}
