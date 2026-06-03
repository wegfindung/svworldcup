import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface InfoModalProps {
  open: boolean
  title: string
  closeLabel: string
  onClose: () => void
  children: ReactNode
}

// Informational modal (no confirm/cancel choice — just a close). Portal-rendered to document.body
// for the same backdrop-filter-ancestor reason as ConfirmModal. Used to explain non-obvious controls.
export function InfoModal({ open, title, closeLabel, onClose, children }: InfoModalProps) {
  useEffect(() => {
    if (!open) {
      return
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) {
    return null
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        className="glass-panel w-full max-w-md rounded-[1.25rem] p-6"
      >
        <h3 className="text-xl font-semibold tracking-tight text-white">{title}</h3>
        <div className="mt-4 grid gap-3 text-sm leading-relaxed text-[var(--color-muted)]">{children}</div>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--color-ink)] transition hover:-translate-y-[1px] active:scale-[0.98]"
          >
            {closeLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
