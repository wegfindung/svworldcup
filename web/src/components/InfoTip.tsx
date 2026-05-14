import { useId, useState } from 'react'

interface InfoTipProps {
  // Accessible label for the trigger, e.g. "About data version".
  label: string
  content: string
}

// Fix 13: a small focusable "i" trigger that shows a themed tooltip on hover and on keyboard
// focus. Placed next to non-obvious controls only — not every field.
export function InfoTip({ label, content }: InfoTipProps) {
  const [open, setOpen] = useState(false)
  const id = useId()

  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="grid h-4 w-4 place-items-center rounded-full border border-white/25 text-[9px] font-bold leading-none text-[var(--color-muted)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] focus:border-[var(--color-accent)] focus:text-[var(--color-accent)] focus:outline-none"
      >
        i
      </button>
      {open ? (
        <span
          role="tooltip"
          id={id}
          className="absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-[16rem] -translate-x-1/2 rounded-[0.7rem] border border-white/12 bg-[var(--color-ink-soft)] px-3 py-2 text-[11px] font-normal normal-case leading-relaxed tracking-normal text-[var(--color-paper)] shadow-xl"
        >
          {content}
        </span>
      ) : null}
    </span>
  )
}
