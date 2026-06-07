import { Link } from 'react-router-dom'
import { getMessages } from '../i18n/messages'
import { prizeLeagues, prizeTotalWithUnit } from '../data/prizePool'
import type { LocaleCode } from '../lib/types'

interface PrizesPageProps {
  locale: LocaleCode
}

// The decorative graphic's alt text. Localised; the rest of the page text comes from the shared
// prizes dictionary + the prizePool constant so the figures stay in one place.
const imageAltByLocale: Partial<Record<LocaleCode, string>> = {
  en: 'Final prize distribution graphic for The Grand Tournament Soccerverse Community Event',
  es: 'Grafica final de distribucion de premios de The Grand Tournament Soccerverse Community Event',
  it: 'Grafica finale della distribuzione premi di The Grand Tournament Soccerverse Community Event',
  de: 'Finale Preisverteilungs-Grafik fuer The Grand Tournament Soccerverse Community Event',
  fr: 'Graphique final de distribution des prix de The Grand Tournament Soccerverse Community Event',
  pt: 'Grafico final da distribuicao de premios do The Grand Tournament Soccerverse Community Event',
  ru: 'Финальная графика распределения призов The Grand Tournament Soccerverse Community Event',
  zh: 'The Grand Tournament Soccerverse Community Event 最终奖品分配图',
  ja: 'The Grand Tournament Soccerverse Community Event の最終賞品配分グラフィック',
}

export function PrizesPage({ locale }: PrizesPageProps) {
  const copy = getMessages(locale).prizes
  const imageAlt = imageAltByLocale[locale] ?? imageAltByLocale.en!

  return (
    <div className="mx-auto max-w-[72rem] space-y-5 pb-12">
      <section className="hero-card rounded-[1.25rem] px-5 py-7 sm:px-7">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1 className="section-title mt-4">{copy.title}</h1>
        <p className="mt-4 max-w-[64ch] text-base leading-relaxed text-[var(--color-muted)]">
          {copy.freeNote} {copy.vouchersNote} {copy.activation}
        </p>
        <div className="mt-5 flex items-baseline gap-3">
          <span className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">{copy.totalLabel}</span>
          <span className="mono text-3xl font-extrabold tracking-tight text-[var(--color-sand)]">{prizeTotalWithUnit}</span>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {prizeLeagues.map((league) => (
          <div key={league.key} className="glass-panel rounded-[1.15rem] p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-white">{league.name}</h2>
              <span className="mono text-[11px] uppercase tracking-[0.14em] text-[var(--color-muted)]">
                {league.sharePercent}% {copy.shareSuffix}
              </span>
            </div>
            <p className="mono mt-1 text-2xl font-bold text-[var(--color-sand)]">{league.total}</p>
            <ul className="mt-4 space-y-2 text-sm">
              {league.places.map((place) => (
                <li
                  key={place.place}
                  className="flex items-baseline justify-between gap-3 border-b border-white/6 pb-2 last:border-0 last:pb-0"
                >
                  <span className="text-[var(--color-muted)]">{place.place}</span>
                  <span className="font-semibold text-white">
                    {place.amount}
                    {place.note ? <span className="ml-1 text-xs text-[var(--color-sand)]">{place.note}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
            {league.key === 'nations' ? (
              <p className="mt-3 text-xs leading-relaxed text-[var(--color-muted)]">{copy.nationsSplitNote}</p>
            ) : null}
          </div>
        ))}
      </section>

      <section className="hero-card overflow-hidden rounded-[1.25rem] p-2 sm:p-3">
        <img
          src="/prizes/final_prize_distribution.webp"
          alt={imageAlt}
          width={1055}
          height={1491}
          className="block h-auto w-full rounded-[1rem]"
        />
      </section>

      <div className="flex justify-center">
        <Link to="/register" className="premium-button px-6 py-3 text-sm font-semibold">
          {copy.registerCta}
        </Link>
      </div>
    </div>
  )
}
