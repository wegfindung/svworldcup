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
  return (
    <div className="flex flex-wrap items-center gap-2">
      {locales.map((locale) => (
        <button
          key={locale}
          type="button"
          onClick={() => onChange(locale)}
          aria-label={localeMeta[locale].label}
          title={localeMeta[locale].label}
          className={[
            'grid h-9 w-12 place-items-center overflow-hidden rounded-xl border transition duration-300 ease-out hover:-translate-y-[1px] active:scale-[0.98]',
            locale === activeLocale
              ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/12'
              : 'border-white/10 bg-white/4 hover:bg-white/8',
          ].join(' ')}
        >
          <img
            src={localeMeta[locale].flag}
            alt={localeMeta[locale].label}
            width={28}
            height={20}
            className="h-5 w-7 rounded-[3px] object-cover shadow-[0_4px_10px_rgba(0,0,0,0.35)]"
          />
        </button>
      ))}
    </div>
  )
}
