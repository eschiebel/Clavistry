import {Fragment} from 'react'
import type {PulseMatrix} from '../rhythm/sequence'

type SourceMode = 'auto' | 'sample' | 'synth'
type InstrumentSettings = Record<string, {vol: number; mute: boolean; source?: SourceMode}>

interface MixerProps {
  matrix: PulseMatrix
  instrumentSettings: InstrumentSettings
  setInstrumentSettings: React.Dispatch<React.SetStateAction<InstrumentSettings>>
}

export function Mixer({matrix, instrumentSettings, setInstrumentSettings}: MixerProps) {
  return (
    <div className="mixer-card">
      <h2>Mixer</h2>
      <div className="mixer-grid">
        <div className="mixer-header">Instrument</div>
        <div className="mixer-header">Mute</div>
        <div className="mixer-header">Volume</div>
        <div className="mixer-header">Voice</div>
        {matrix.rows.map(row => {
          const s = instrumentSettings[row.instrument] ?? {vol: 1.0, mute: false}
          return (
            <Fragment key={row.instrument}>
              <div className="instrument-name">{row.instrument}</div>
              <div>
                <label className="mute-label">
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
              <div className="vol-row">
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
                  className="vol-range"
                />
                <span className="vol-value">{Math.round(s.vol * 100)}%</span>
              </div>
              <div>
                <label
                  className="source-label"
                  style={{display: 'inline-flex', gap: 6, alignItems: 'center'}}
                >
                  <span>Voice</span>
                  <select
                    value={s.source ?? 'auto'}
                    onChange={e =>
                      setInstrumentSettings(prev => ({
                        ...prev,
                        [row.instrument]: {
                          ...s,
                          source: (e.target.value as SourceMode) ?? 'auto',
                        },
                      }))
                    }
                  >
                    <option value="auto">Auto</option>
                    <option value="sample">Sample</option>
                    <option value="synth">Synth</option>
                  </select>
                </label>
              </div>
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}
