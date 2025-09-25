import {Fragment} from 'react'
import type {PulseMatrix} from '../rhythm/sequence'

type InstrumentSettings = Record<string, {vol: number; mute: boolean}>

interface MixerProps {
  matrix: PulseMatrix
  instrumentSettings: InstrumentSettings
  setInstrumentSettings: React.Dispatch<React.SetStateAction<InstrumentSettings>>
}

export function Mixer({matrix, instrumentSettings, setInstrumentSettings}: MixerProps) {
  return (
    <div
      style={{
        background: '#0f1430',
        border: '1px solid #2b355f',
        borderRadius: 8,
        padding: 10,
        marginBottom: 12,
      }}
    >
      <h2 style={{marginBottom: '6px'}}>Mixer</h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '160px 60px 220px',
          gap: 8,
          alignItems: 'center',
        }}
      >
        <div style={{opacity: 0.7}}>Instrument</div>
        <div style={{opacity: 0.7}}>Mute</div>
        <div style={{opacity: 0.7}}>Volume</div>
        {matrix.rows.map(row => {
          const s = instrumentSettings[row.instrument] ?? {vol: 1.0, mute: false}
          return (
            <Fragment key={row.instrument}>
              <div style={{fontWeight: 500}}>{row.instrument}</div>
              <div>
                <label style={{display: 'inline-flex', gap: 6, alignItems: 'center'}}>
                  <input
                    type="checkbox"
                    checked={!!s.mute}
                    onChange={e =>
                      setInstrumentSettings(prev => ({
                        ...prev,
                        [row.instrument]: {...s, mute: e.target.checked},
                      }))
                    }
                  />
                  <span>Mute</span>
                </label>
              </div>
              <div style={{display: 'inline-flex', gap: 8, alignItems: 'center'}}>
                <input
                  type="range"
                  min={0}
                  max={1.5}
                  step={0.05}
                  value={s.vol}
                  onChange={e =>
                    setInstrumentSettings(prev => ({
                      ...prev,
                      [row.instrument]: {...s, vol: Number(e.target.value)},
                    }))
                  }
                  style={{width: 180}}
                />
                <span style={{width: 40, textAlign: 'right'}}>{Math.round(s.vol * 100)}%</span>
              </div>
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}
