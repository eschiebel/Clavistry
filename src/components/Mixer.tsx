import {Fragment} from 'react'
import {Toggle} from './Toggle'
import type {PulseMatrix} from '../rhythm/sequence'
import type {SourceMode} from '../utils'

type InstrumentSettings = Record<string, {vol: number; mute: boolean; source?: SourceMode}>
type FormDef = {name: string; variants: Record<string, number>}

interface MixerProps {
  matrix: PulseMatrix
  instrumentSettings: InstrumentSettings
  setInstrumentSettings: React.Dispatch<React.SetStateAction<InstrumentSettings>>
  selectedVariants: Record<string, number>
  onChangeVariant: (base: string, idx: number) => void
  forms?: FormDef[] | null
  selectedFormIdx?: number | null
  onChangeFormIdx?: (idx: number) => void
}

export function Mixer({
  matrix,
  instrumentSettings,
  setInstrumentSettings,
  selectedVariants,
  onChangeVariant,
  forms,
  selectedFormIdx,
  onChangeFormIdx,
}: MixerProps) {
  const getVariantLabel = (base: string, idx: number): string => {
    if (forms && forms.length > 0) {
      const hit = forms.find(
        f =>
          !!f.variants &&
          Object.prototype.hasOwnProperty.call(f.variants, base) &&
          f.variants[base] === idx,
      )
      if (hit?.name) return hit.name
    }
    return idx === 0 ? 'default' : `alt(${idx})`
  }

  // Group rows by baseInstrument
  const groups = new Map<string, typeof matrix.rows>()
  const variantsByBase = new Map<string, number[]>()
  for (const row of matrix.rows) {
    const base = row.baseInstrument ?? row.instrument
    const arr = groups.get(base) ?? []
    arr.push(row)
    groups.set(base, arr)
    const vidx = row.variantIndex ?? 0
    const vArr = variantsByBase.get(base) ?? []
    if (!vArr.includes(vidx)) vArr.push(vidx)
    variantsByBase.set(base, vArr)
  }

  return (
    <div className="mixer-card">
      <h2>Mixer</h2>
      {forms &&
        forms.length > 0 &&
        (forms.length === 2 ? (
          <div style={{display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 8px 494px'}}>
            <span>Form:</span>
            <Toggle
              value={(selectedFormIdx ?? 0) as number}
              onValue={1}
              offValue={0}
              onLabel={forms[1]?.name || 'B'}
              offLabel={forms[0]?.name || 'A'}
              onChange={val => onChangeFormIdx?.(Number(val))}
            />
          </div>
        ) : (
          <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8}}>
            <label style={{display: 'inline-flex', gap: 6, alignItems: 'center'}}>
              Form
              <select
                value={selectedFormIdx ?? 0}
                onChange={e => onChangeFormIdx?.(Number(e.target.value))}
                style={{padding: '4px 6px'}}
              >
                {forms.map((f, i) => (
                  <option key={`form-${f.name || i}`} value={i}>
                    {f.name || `Form ${i + 1}`}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ))}
      <div className="mixer-grid">
        <div className="mixer-header">Instrument</div>
        <div className="mixer-header mixer-center">Mute</div>
        <div className="mixer-header">Volume</div>
        <div className="mixer-header">Variant</div>
        <div className="mixer-header">Voice</div>
        {[...groups.entries()].map(([base, rows]) => {
          // Prefer the default variant row for display if present
          const defaultRow = rows.find(r => (r.variantIndex ?? 0) === 0) ?? rows[0]
          const label = defaultRow.instrument
          const s = instrumentSettings[defaultRow.instrument] ?? {vol: 1.0, mute: false}
          const groupVariants = (variantsByBase.get(base) ?? [0]).sort((a, b) => a - b)
          const showVariant = groupVariants.length > 1
          return (
            <Fragment key={base}>
              <div className="instrument-name">{label}</div>
              <div className="mixer-center">
                <label className="mute-label">
                  <input
                    type="checkbox"
                    checked={!!s.mute}
                    onChange={e =>
                      setInstrumentSettings(prev => {
                        const next = {...prev}
                        for (const r of rows) {
                          const cur = next[r.instrument] ?? {vol: 1.0, mute: false}
                          next[r.instrument] = {...cur, mute: e.target.checked}
                        }
                        return next
                      })
                    }
                  />
                  <span className="screenreader-only">Mute</span>
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
                    setInstrumentSettings(prev => {
                      const next = {...prev}
                      const vol = Number(e.target.value)
                      for (const r of rows) {
                        const cur = next[r.instrument] ?? {vol: 1.0, mute: false}
                        next[r.instrument] = {...cur, vol}
                      }
                      return next
                    })
                  }
                  className="vol-range"
                />
                <span className="vol-value">{Math.round(s.vol * 100)}%</span>
              </div>
              <div>
                {showVariant ? (
                  <fieldset className="variant-group">
                    <legend className="screenreader-only">{`${base} variants`}</legend>
                    {groupVariants.map(idx => (
                      <label
                        key={`${base}-v-${idx}`}
                        style={{display: 'inline-flex', gap: 4, alignItems: 'center'}}
                      >
                        <input
                          type="radio"
                          name={`variant-${base}`}
                          value={idx}
                          checked={(selectedVariants[base] ?? 0) === idx}
                          onChange={() => onChangeVariant(base, idx)}
                        />
                        <span>{getVariantLabel(base, idx)}</span>
                      </label>
                    ))}
                  </fieldset>
                ) : (
                  <span style={{opacity: 0.6}}>—</span>
                )}
              </div>
              <div>
                <div
                  className="source-label"
                  style={{display: 'inline-flex', gap: 6, alignItems: 'center'}}
                >
                  <span className="screenreader-only">Voice</span>
                  <Toggle
                    value={(s.source ?? 'sample') as SourceMode}
                    onValue={'sample' as SourceMode}
                    offValue={'synth' as SourceMode}
                    onLabel="Sample"
                    offLabel="Synth"
                    onChange={val =>
                      setInstrumentSettings(prev => {
                        const next = {...prev}
                        for (const r of rows) {
                          const cur = next[r.instrument] ?? {vol: 1.0, mute: false}
                          next[r.instrument] = {
                            ...cur,
                            source: val as SourceMode,
                          }
                        }
                        return next
                      })
                    }
                  />
                </div>
              </div>
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}
