import {type PropsWithChildren, useEffect, useRef} from 'react'
import {createPortal} from 'react-dom'

type DialogProps = {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
}

export function Dialog({open, title, subtitle, onClose, children}: PropsWithChildren<DialogProps>) {
  const dialogRef = useRef<HTMLDialogElement | null>(null)
  const closeBtnRef = useRef<HTMLButtonElement | null>(null)

  // Close on Esc and trap focus
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])',
        )
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        const active = document.activeElement as HTMLElement | null
        if (e.shiftKey) {
          if (active === first || !dialogRef.current.contains(active)) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (active === last || !dialogRef.current.contains(active)) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Focus the close button when opening
  useEffect(() => {
    if (open) setTimeout(() => closeBtnRef.current?.focus(), 0)
  }, [open])

  if (!open) return null

  const renderTitle = () => {
    if (subtitle) {
      return (
        <div>
          <h2 className="title">{title}</h2>
          <span className="sub-title">{subtitle}</span>
        </div>
      )
    }
    return <h2 className="title">{title}</h2>
  }

  const overlay = (
    <div
      role="presentation"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <dialog className="clavistry-dialog" ref={dialogRef} open aria-labelledby="dialog-title">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          {renderTitle()}

          <button ref={closeBtnRef} type="button" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="dialog-body" style={{marginTop: 12, lineHeight: 1.6}}>
          {children}
        </div>
      </dialog>
    </div>
  )

  return createPortal(overlay, document.body)
}
