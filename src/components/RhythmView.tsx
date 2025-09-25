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
    <div style={{background: '#11162a', padding: 12, borderRadius: 8}}>
      <h2 style={{marginTop: 0}}>{rhythm.name}</h2>
      <div>
        Time Signature: {rhythm.timeSignature.numerator}/{rhythm.timeSignature.denominator}
      </div>
      <div>Pulses per Measure: {rhythm.pulsesPerMeasure}</div>
      <div style={{marginTop: 8, display: 'flex', gap: 6}}>
        {new Array(matrix?.totalPulses ?? rhythm.pulsesPerMeasure).fill(0).map((_, i) => (
          <div
            key={pulseIds[i]}
            style={{
              width: 24,
              height: 24,
              borderRadius: 4,
              display: 'grid',
              placeItems: 'center',
              background: i === currentPulse ? '#4675ff' : '#242b49',
              color: i === currentPulse ? '#fff' : '#aab',
              fontSize: 12,
              borderLeft:
                i > 0 && i % rhythm.pulsesPerMeasure === 0
                  ? '2px solid #556'
                  : '1px solid transparent',
            }}
            title={`Pulse ${i + 1}`}
          >
            {i + 1}
          </div>
        ))}
      </div>
      <h3>Tablature (full pattern)</h3>
      {matrix && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `160px repeat(${matrix.totalPulses}, 28px)`,
            gap: 6,
            alignItems: 'center',
          }}
        >
          <div style={{opacity: 0.7}}>Instrument</div>
          {new Array(matrix.totalPulses).fill(0).map((_, i) => (
            <div
              key={headerIds[i]}
              style={{
                textAlign: 'center',
                opacity: 0.7,
                borderLeft:
                  i > 0 && i % rhythm.pulsesPerMeasure === 0
                    ? '2px solid #556'
                    : '1px solid transparent',
              }}
            >
              {i + 1}
            </div>
          ))}
          {matrix.rows.map(row => (
            <div key={row.instrument} style={{display: 'contents'}}>
              <div style={{fontWeight: 600}}>{row.instrument}</div>
              {row.symbols.map((sym, i) => (
                <div
                  key={`${row.instrument}-${i}`}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    display: 'grid',
                    placeItems: 'center',
                    background: i === currentPulse ? '#2a3a70' : '#1a2140',
                    border: '1px solid #334',
                    borderLeft:
                      i > 0 && i % rhythm.pulsesPerMeasure === 0
                        ? '2px solid #556'
                        : '1px solid #334',
                    color: sym === '.' ? '#556' : '#e9eef5',
                    fontFamily: 'monospace',
                    fontSize: 13,
                  }}
                  title={`Pulse ${i + 1}: ${sym}`}
                >
                  {sym}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
