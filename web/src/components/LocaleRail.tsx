import { useEffect, useId, useRef, useState } from 'react'
import type { LocaleCode } from '../lib/types'

interface LocaleRailProps {
  activeLocale: LocaleCode
  locales: LocaleCode[]
  onChange: (locale: LocaleCode) => void
}

const localeMeta: Record<LocaleCode, { label: string; flag: string }> = {
  en: { label: 'English', flag: '/flags/en.svg' },
  es: { label: 'Spanish', flag: '/flags/es.svg' },
  it: { label: 'Italian', flag: '/flags/it.svg' },
  de: { label: 'German', flag: '/flags/de.svg' },
  fr: { label: 'French', flag: '/flags/fr.svg' },
  pt: { label: 'Portuguese', flag: '/flags/pt.svg' },
  ru: { label: 'Russian', flag: '/flags/ru.svg' },
  zh: { label: 'Chinese', flag: '/flags/zh.svg' },
  ja: { label: 'Japanese', flag: '/flags/ja.svg' },
}

export function LocaleRail({ activeLocale, locales, onChange }: LocaleRailProps) {
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const activeMeta = localeMeta[activeLocale]

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [])

  useEffect(() => {
    if (!open) {
      return undefined
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative w-[3.9rem] shrink-0 sm:w-[5.4rem]">
      <button
        type="button"
        aria-controls={menuId}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Select language, current ${activeMeta.label}`}
        onClick={() => setOpen((current) => !current)}
        className={[
          'inline-flex h-9 w-full items-center justify-between gap-1 rounded-full border px-1.5 py-1.5 text-sm text-white transition duration-300 ease-out hover:-translate-y-[1px] hover:bg-white/8 active:scale-[0.98] sm:gap-1.5 sm:px-2',
          open ? 'border-[var(--color-accent)]/55 bg-[var(--color-accent)]/10' : 'border-white/10 bg-white/4',
        ].join(' ')}
      >
        <img
          src={activeMeta.flag}
          alt={activeMeta.label}
          width={28}
          height={20}
          className="h-4.5 w-6 rounded-[3px] object-cover shadow-[0_4px_10px_rgba(0,0,0,0.35)]"
        />
        <span className="mono text-[10px] uppercase tracking-[0.08em] text-[var(--color-muted)] sm:text-[11px]">{activeLocale}</span>
        <svg
          viewBox="0 0 20 20"
          aria-hidden="true"
          className={['hidden h-3.5 w-3.5 text-[var(--color-muted)] transition sm:block', open ? 'rotate-180' : 'rotate-0'].join(' ')}
        >
          <path d="M5 7.5 10 12.5 15 7.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div
        id={menuId}
        role="menu"
        aria-hidden={!open}
        className={[
          'absolute right-0 top-[calc(100%+0.45rem)] z-30 w-full overflow-hidden rounded-[1.05rem] border border-white/10 bg-[rgba(8,16,14,0.96)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_24px_54px_-34px_rgba(0,0,0,0.95)] transition-[max-height,opacity,transform] duration-300 ease-out',
          open ? 'max-h-[21rem] translate-y-0 opacity-100' : 'pointer-events-none max-h-0 -translate-y-1 opacity-0',
        ].join(' ')}
      >
        <div className="grid max-h-[calc(100dvh-6.25rem)] gap-1 overflow-y-auto overscroll-contain p-1 sm:max-h-[20.25rem]">
          {locales.map((locale) => (
            <button
              key={locale}
              type="button"
              role="menuitemradio"
              aria-checked={locale === activeLocale}
              onClick={() => {
                onChange(locale)
                setOpen(false)
              }}
              aria-label={localeMeta[locale].label}
              title={localeMeta[locale].label}
              tabIndex={open ? 0 : -1}
              className={[
                'grid h-9 w-full grid-cols-[1.5rem_1fr] items-center gap-1.5 rounded-[0.75rem] px-1.5 text-left transition duration-300 ease-out hover:bg-white/8 active:scale-[0.98] sm:h-10 sm:gap-2 sm:px-2',
                locale === activeLocale ? 'bg-[var(--color-accent)]/14 text-white' : 'text-[var(--color-muted)]',
              ].join(' ')}
            >
              <img
                src={localeMeta[locale].flag}
                alt=""
                width={28}
                height={20}
                className="h-4.5 w-6 rounded-[3px] object-cover shadow-[0_4px_10px_rgba(0,0,0,0.35)]"
              />
              <span className="mono text-[10px] uppercase tracking-[0.08em]">{locale}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
