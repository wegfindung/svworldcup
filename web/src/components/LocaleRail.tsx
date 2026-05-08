import type { LocaleCode } from '../lib/types'

interface LocaleRailProps {
  activeLocale: LocaleCode
  locales: LocaleCode[]
}

export function LocaleRail({ activeLocale, locales }: LocaleRailProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {locales.map((locale) => (
        <span
          key={locale}
          className={[
            'rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.26em]',
            locale === activeLocale
              ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
              : 'border-white/10 text-[var(--color-muted)]',
          ].join(' ')}
        >
          {locale}
        </span>
      ))}
    </div>
  )
}
