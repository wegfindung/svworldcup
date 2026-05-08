import { useEffect, useRef, useState } from 'react'
import type { LocaleCode } from '../lib/types'

interface LocaleRailProps {
  activeLocale: LocaleCode
  locales: LocaleCode[]
  onChange: (locale: LocaleCode) => void
}

const localeMeta: Record<LocaleCode, { label: string; flag: string }> = {
  en: { label: 'English', flag: '/flags/en.svg' },
  es: { label: 'Spanish', flag: '/flags/es.svg' },
  de: { label: 'German', flag: '/flags/de.svg' },
  fr: { label: 'French', flag: '/flags/fr.svg' },
  pt: { label: 'Portuguese', flag: '/flags/pt.svg' },
  ru: { label: 'Russian', flag: '/flags/ru.svg' },
  zh: { label: 'Chinese', flag: '/flags/zh.svg' },
}

export function LocaleRail({ activeLocale, locales, onChange }: LocaleRailProps) {
  const [open, setOpen] = useState(false)
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

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Select language"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-10 items-center gap-3 rounded-full border border-white/10 bg-white/4 px-3 py-2 text-sm text-white transition duration-300 ease-out hover:-translate-y-[1px] hover:bg-white/8 active:scale-[0.98]"
      >
        <img
          src={activeMeta.flag}
          alt={activeMeta.label}
          width={28}
          height={20}
          className="h-5 w-7 rounded-[3px] object-cover shadow-[0_4px_10px_rgba(0,0,0,0.35)]"
        />
        <span className="mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-muted)]">{activeLocale}</span>
        <svg
          viewBox="0 0 20 20"
          aria-hidden="true"
          className={['h-4 w-4 text-[var(--color-muted)] transition', open ? 'rotate-180' : 'rotate-0'].join(' ')}
        >
          <path d="M5 7.5 10 12.5 15 7.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open ? (
        <div className="glass-panel absolute right-0 top-[calc(100%+0.75rem)] z-30 w-56 rounded-[1.4rem] p-2">
          {locales.map((locale) => (
            <button
              key={locale}
              type="button"
              onClick={() => {
                onChange(locale)
                setOpen(false)
              }}
              aria-label={localeMeta[locale].label}
              title={localeMeta[locale].label}
              className={[
                'flex w-full items-center gap-3 rounded-[1rem] px-3 py-2.5 text-left transition duration-300 ease-out hover:bg-white/8 active:scale-[0.99]',
                locale === activeLocale ? 'bg-[var(--color-accent)]/10' : '',
              ].join(' ')}
            >
              <span className="grid h-8 w-10 place-items-center overflow-hidden rounded-lg border border-white/10 bg-white/4">
                <img
                  src={localeMeta[locale].flag}
                  alt={localeMeta[locale].label}
                  width={28}
                  height={20}
                  className="h-5 w-7 rounded-[3px] object-cover shadow-[0_4px_10px_rgba(0,0,0,0.35)]"
                />
              </span>
              <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                <span className="text-sm font-medium text-white">{localeMeta[locale].label}</span>
                <span className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">{locale}</span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
