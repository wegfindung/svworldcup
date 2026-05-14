import { useEffect } from 'react'

interface ConfirmModalProps {
  open: boolean
  title: string
  body: string
  confirmLabel: string
  cancelLabel?: string
  tone?: 'default' | 'danger'
  onConfirm: () => void
  onCancel: () => void
}

// Shared themed confirmation modal (Fix 4). Replaces silent submits and the bare
// window.confirm — every consequential match-import action routes through this.
export function ConfirmModal({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'default',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!open) {
      return
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onCancel()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) {
    return null
  }

  const confirmClass = [
    'rounded-full px-5 py-2.5 text-sm font-semibold transition hover:-translate-y-[1px] active:scale-[0.98]',
    tone === 'danger'
      ? 'bg-amber-300 text-[var(--color-ink)]'
      : 'bg-[var(--color-accent)] text-[var(--color-ink)]',
  ].join(' ')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        className="glass-panel w-full max-w-md rounded-[1.25rem] p-6"
      >
        <p className="eyebrow">confirm</p>
        <h3 className="mt-3 text-xl font-semibold tracking-tight text-white">{title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">{body}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-white/12 px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]"
          >
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} className={confirmClass}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
