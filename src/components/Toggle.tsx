import React from 'react'

export interface ToggleProps<T extends string | number | boolean = boolean> {
  value: T
  onValue: T
  offValue: T
  onLabel: string
  offLabel: string
  onChange: (value: T) => void
  disabled?: boolean
  id?: string
}

export function Toggle<T extends string | number | boolean = boolean>({
  value,
  onValue,
  offValue,
  onLabel,
  offLabel,
  onChange,
  disabled,
}: ToggleProps<T>) {
  const checked = value === onValue
  return (
    <div className="toggle">
      <span className="toggle-label toggle-label-off">{offLabel}</span>
      <button
        type="button"
        className={`toggle-switch${checked ? ' is-on' : ''}`}
        role="switch"
        aria-checked={checked}
        aria-label={checked ? onLabel : offLabel}
        onClick={() => onChange(checked ? offValue : onValue)}
        disabled={disabled}
      >
        <span className="toggle-track">
          <span className="toggle-thumb" />
        </span>
      </button>
      <span className="toggle-label toggle-label-on">{onLabel}</span>
    </div>
  )
}
