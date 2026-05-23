import { Link } from 'react-router-dom'
import type { LocaleCode } from '../lib/types'

interface PrizesPageProps {
  locale: LocaleCode
}

const englishCopy = {
  eyebrow: 'prize dummy',
  title: 'Prize structure, pending final confirmation.',
  body:
    'This page mirrors the current infographic so the onboarding mail has a live prize link. Amounts, items, and payout logic are still provisional until the event team confirms them.',
  status: 'Not final confirmed',
  imageAlt: 'Draft infographic for the Soccerverse World Cup Event prize structure',
  individualTitle: 'Individual leagues',
  individualBody: 'Rookie and Veteran leagues currently use the same prize ladder.',
  individualItems: [
    { rank: '1st', prize: '200 SVV', extra: 'Exclusive Winner Shirt' },
    { rank: '2nd', prize: '100 SVV', extra: 'Exclusive Cap' },
    { rank: '3rd', prize: '75 SVV', extra: '' },
    { rank: '4th-10th', prize: '20 SVV each', extra: '' },
  ],
  nationalTitle: 'National league pool',
  nationalBody:
    'The community milestone pool grows with participants, capped at 500 SVV. The achieved milestone pool is distributed in full.',
  nationalItems: [
    '200 participants unlock 50 SVV.',
    '400 participants unlock 100 SVV.',
    '2000 participants unlock the 500 SVV cap.',
    'A winning nation with 11+ managers receives the full unlocked pool for its members.',
    'If an underdog nation with fewer than 11 managers wins, 20% goes there and the remaining pool is reallocated to the next eligible nation or nations.',
  ],
  cta: 'Register your squad',
}

const copyByLocale: Partial<Record<LocaleCode, typeof englishCopy>> = {}

copyByLocale.en = englishCopy
copyByLocale.de = {
  eyebrow: 'preis-dummy',
  title: 'Preisstruktur, noch nicht final bestätigt.',
  body:
    'Diese Seite spiegelt die aktuelle Infografik, damit die Onboarding-Mail bereits einen funktionierenden Preis-Link hat. Beträge, Items und Auszahlungslogik sind noch vorläufig, bis das Event-Team sie final bestätigt.',
  status: 'Noch nicht final bestätigt',
  imageAlt: 'Entwurf der Infografik zur Soccerverse World Cup Event Preisstruktur',
  individualTitle: 'Individual-Leagues',
  individualBody: 'Rookie und Veteran League nutzen aktuell dieselbe Preisstaffel.',
  individualItems: [
    { rank: '1.', prize: '200 SVV', extra: 'Exclusive Winner Shirt' },
    { rank: '2.', prize: '100 SVV', extra: 'Exclusive Cap' },
    { rank: '3.', prize: '75 SVV', extra: '' },
    { rank: '4.-10.', prize: '20 SVV jeweils', extra: '' },
  ],
  nationalTitle: 'National League Pool',
  nationalBody:
    'Der Community Milestone Pool wächst mit der Teilnehmerzahl und ist bei 500 SVV gedeckelt. Der erreichte Milestone Pool wird voll ausgespielt.',
  nationalItems: [
    '200 Teilnehmende schalten 50 SVV frei.',
    '400 Teilnehmende schalten 100 SVV frei.',
    '2000 Teilnehmende schalten den 500 SVV Cap frei.',
    'Eine Gewinner-Nation mit 11+ Managern erhält den vollen freigeschalteten Pool für ihre Mitglieder.',
    'Gewinnt eine Underdog-Nation mit weniger als 11 Managern, gehen 20% dorthin und der Rest wird an die nächste berechtigte Nation oder Nationen verteilt.',
  ],
  cta: 'Kader registrieren',
}

function getPrizeCopy(locale: LocaleCode) {
  return copyByLocale[locale] ?? englishCopy
}

export function PrizesPage({ locale }: PrizesPageProps) {
  const copy = getPrizeCopy(locale)

  return (
    <div className="space-y-4 pb-10">
      <section className="hero-card rounded-[1.25rem] p-3 sm:p-4 lg:p-5">
        <img
          src="/prizes/prize-structure-dummy.svg"
          alt={copy.imageAlt}
          width={1600}
          height={900}
          className="block w-full rounded-[0.85rem] border border-white/10 bg-black/20"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.88fr_1.12fr]">
        <div className="glass-panel rounded-[1.25rem] p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <p className="eyebrow">{copy.eyebrow}</p>
            <span className="mono rounded-full border border-[var(--color-sand)]/25 bg-[var(--color-sand)]/10 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[var(--color-sand)]">
              {copy.status}
            </span>
          </div>
          <h1 className="section-title mt-5 max-w-[13ch] text-white">{copy.title}</h1>
          <p className="mt-5 max-w-[60ch] text-base leading-relaxed text-[var(--color-muted)]">{copy.body}</p>
          <Link to="/register" className="premium-button mt-6 px-6 py-3 text-sm font-semibold">
            {copy.cta}
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-[0.95fr_1.05fr]">
          <article className="glass-panel rounded-[1.15rem] p-4 sm:p-5">
            <p className="eyebrow">{copy.individualTitle}</p>
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">{copy.individualBody}</p>
            <div className="mt-5 space-y-2.5">
              {copy.individualItems.map((item) => (
                <div key={item.rank} className="surface-row rounded-[0.9rem] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-accent)]">{item.rank}</p>
                      <p className="mt-1 text-lg font-semibold text-white">{item.prize}</p>
                    </div>
                    {item.extra ? <p className="max-w-[12rem] text-right text-sm text-[var(--color-muted)]">{item.extra}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="glass-panel rounded-[1.15rem] p-4 sm:p-5">
            <p className="eyebrow">{copy.nationalTitle}</p>
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">{copy.nationalBody}</p>
            <ul className="mt-5 space-y-2.5">
              {copy.nationalItems.map((item, index) => (
                <li key={item} className="surface-row rounded-[0.9rem] p-3 text-sm leading-relaxed text-[var(--color-paper)]">
                  <span className="mono mr-2 text-[var(--color-accent)]">{String(index + 1).padStart(2, '0')}</span>
                  {item}
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>
    </div>
  )
}
