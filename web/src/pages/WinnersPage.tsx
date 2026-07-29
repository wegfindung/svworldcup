import { useEffect, useMemo, useState } from 'react'
import { PrizeClaimPanel } from '../components/PrizeClaimPanel'
import { fetchParticipantSession } from '../lib/api'
import type { LocaleCode, ParticipantProfile } from '../lib/types'

type Winner = {
  displayName: string
  totalSvv: number
  veteranSvv: number
  rookieSvv: number
  nationsSvv: number
}

type Category = 'all' | 'veteran' | 'rookie' | 'nations'

const englishCopy = {
  eyebrow: 'The Grand Tournament · final standings',
  title: 'One tournament. 85 winners.',
  intro:
    'The final rewards are confirmed. Congratulations to every manager who earned SVV in the Veteran, Rookie, and Nations leagues.',
  total: 'Total rewards',
  managers: 'Rewarded managers',
  veteran: 'Veteran League',
  rookie: 'Rookie League',
  nations: 'Nations League',
  galleryLabel: 'Official result posters',
  standingsEyebrow: 'Full reward ledger',
  standingsTitle: 'All winners',
  standingsBody: 'Filter the final list by competition and review every SVV reward.',
  all: 'All',
  manager: 'Manager',
  reward: 'Total reward',
  loading: 'Loading the final standings',
  errorTitle: 'The winners list could not be loaded.',
  errorBody: 'Please refresh the page and try again.',
  posterAlt: (league: string) => `${league} final results poster`,
}

const germanCopy: typeof englishCopy = {
  eyebrow: 'The Grand Tournament · Endstand',
  title: 'Ein Turnier. 85 Gewinner.',
  intro:
    'Die finalen Auszahlungen stehen fest. Herzlichen Glückwunsch an alle Manager, die sich in der Veteran, Rookie und Nations League SVV gesichert haben.',
  total: 'Gesamte Ausschüttung',
  managers: 'Ausgezeichnete Manager',
  veteran: 'Veteran League',
  rookie: 'Rookie League',
  nations: 'Nations League',
  galleryLabel: 'Offizielle Ergebnisgrafiken',
  standingsEyebrow: 'Vollständige Ausschüttung',
  standingsTitle: 'Alle Gewinner',
  standingsBody: 'Filtere die finale Liste nach Wettbewerb und sieh dir jede SVV-Auszahlung an.',
  all: 'Alle',
  manager: 'Manager',
  reward: 'Gesamtgewinn',
  loading: 'Endstand wird geladen',
  errorTitle: 'Die Gewinnerliste konnte nicht geladen werden.',
  errorBody: 'Bitte lade die Seite neu und versuche es noch einmal.',
  posterAlt: (league: string) => `Ergebnisgrafik der ${league}`,
}

const posters = [
  { category: 'veteran' as const, src: '/results/veteran-league.png' },
  { category: 'rookie' as const, src: '/results/rookie-league.png' },
  { category: 'nations' as const, src: '/results/nations-league.png' },
]

function parseCsvLine(line: string) {
  const values: string[] = []
  let value = ''
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (character === ',' && !quoted) {
      values.push(value)
      value = ''
    } else {
      value += character
    }
  }
  values.push(value)
  return values
}

function parseWinnersCsv(raw: string): Winner[] {
  return raw
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map(parseCsvLine)
    .map(([displayName, totalSvv, veteranSvv, rookieSvv, nationsSvv]) => ({
      displayName,
      totalSvv: Number(totalSvv),
      veteranSvv: Number(veteranSvv),
      rookieSvv: Number(rookieSvv),
      nationsSvv: Number(nationsSvv),
    }))
    .filter((winner) => winner.displayName && Number.isFinite(winner.totalSvv))
}

function categoryAmount(winner: Winner, category: Category) {
  if (category === 'veteran') return winner.veteranSvv
  if (category === 'rookie') return winner.rookieSvv
  if (category === 'nations') return winner.nationsSvv
  return winner.totalSvv
}

function normalizedDisplayName(displayName: string) {
  return displayName.trim().toLocaleLowerCase()
}

function participantHasReward(participant: ParticipantProfile, winners: Winner[]) {
  const participantName = normalizedDisplayName(participant.displayName)
  return winners.some((winner) => winner.totalSvv > 0 && normalizedDisplayName(winner.displayName) === participantName)
}

export function WinnersPage({ locale }: { locale: LocaleCode }) {
  const copy = locale === 'de' ? germanCopy : englishCopy
  const [winners, setWinners] = useState<Winner[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [category, setCategory] = useState<Category>('all')
  const [participant, setParticipant] = useState<ParticipantProfile | null>(null)

  useEffect(() => {
    let active = true
    void fetchParticipantSession()
      .then((session) => {
        if (active) setParticipant(session.participant)
      })
      .catch(() => {
        // The winners page stays public. A missing or expired participant session simply means
        // that no private prize-claim controls are rendered.
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    fetch('/data/event-winners.csv', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Winner data request failed with ${response.status}`)
        return response.text()
      })
      .then((raw) => setWinners(parseWinnersCsv(raw)))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setLoadError(true)
      })
    return () => controller.abort()
  }, [])

  const filteredWinners = useMemo(() => {
    if (!winners) return []
    return winners
      .filter((winner) => categoryAmount(winner, category) > 0)
      .sort((left, right) => categoryAmount(right, category) - categoryAmount(left, category) || left.displayName.localeCompare(right.displayName))
  }, [category, winners])

  const totals = useMemo(() => {
    const rows = winners ?? []
    return {
      all: rows.reduce((sum, winner) => sum + winner.totalSvv, 0),
      veteran: rows.reduce((sum, winner) => sum + winner.veteranSvv, 0),
      rookie: rows.reduce((sum, winner) => sum + winner.rookieSvv, 0),
      nations: rows.reduce((sum, winner) => sum + winner.nationsSvv, 0),
    }
  }, [winners])

  const labels: Record<Category, string> = {
    all: copy.all,
    veteran: copy.veteran,
    rookie: copy.rookie,
    nations: copy.nations,
  }

  const showPrizeClaim = participant && winners ? participantHasReward(participant, winners) : false

  return (
    <div className="space-y-5 pb-12">
      <section className="glass-panel overflow-hidden rounded-[1.35rem] border border-[var(--color-sand)]/15 p-5 sm:p-7 lg:p-9">
        <div className="grid items-end gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
          <div>
            <p className="eyebrow text-[var(--color-sand)]">{copy.eyebrow}</p>
            <h1 className="mt-4 max-w-[14ch] text-4xl font-extrabold leading-[0.96] tracking-[-0.045em] text-white sm:text-5xl lg:text-6xl">
              {copy.title}
            </h1>
            <p className="mt-5 max-w-[62ch] text-base leading-relaxed text-[var(--color-muted)] sm:text-lg">{copy.intro}</p>
          </div>
          <div className="grid grid-cols-2 border-y border-white/10">
            <div className="py-4 pr-4">
              <p className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">{copy.total}</p>
              <p className="mono mt-2 text-3xl font-bold text-[var(--color-sand)]">5,000 <span className="text-base">SVV</span></p>
            </div>
            <div className="border-l border-white/10 py-4 pl-4">
              <p className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">{copy.managers}</p>
              <p className="mono mt-2 text-3xl font-bold text-white">85</p>
            </div>
          </div>
        </div>
      </section>

      {showPrizeClaim && participant ? (
        <PrizeClaimPanel locale={locale} participant={participant} onParticipantUpdate={setParticipant} />
      ) : null}

      <section aria-label={copy.galleryLabel} className="grid items-start gap-4 md:grid-cols-2 lg:grid-cols-12">
        {posters.map((poster, index) => {
          const label = labels[poster.category]
          const widthClass = index === 0 ? 'lg:col-span-5' : index === 1 ? 'lg:col-span-3' : 'lg:col-span-4'
          return (
            <figure key={poster.category} className={`${widthClass} group reveal-in`} style={{ animationDelay: `${index * 90}ms` }}>
              <a
                href={poster.src}
                target="_blank"
                rel="noreferrer"
                className="block overflow-hidden rounded-[1.1rem] border border-white/10 bg-[var(--color-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_28px_70px_-44px_rgba(0,0,0,0.95)] transition duration-500 ease-out hover:-translate-y-1 hover:border-[var(--color-sand)]/35 active:scale-[0.99]"
              >
                <img src={poster.src} alt={copy.posterAlt(label)} width={768} height={900} loading={index === 0 ? 'eager' : 'lazy'} className="h-auto w-full" />
              </a>
              <figcaption className="mt-3 flex items-baseline justify-between gap-3 px-1">
                <span className="font-semibold text-white">{label}</span>
                <span className="mono text-xs text-[var(--color-sand)]">{totals[poster.category].toLocaleString()} SVV</span>
              </figcaption>
            </figure>
          )
        })}
      </section>

      <section className="glass-panel rounded-[1.25rem] p-4 sm:p-6">
        <div className="flex flex-col gap-5 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">{copy.standingsEyebrow}</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">{copy.standingsTitle}</h2>
            <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-[var(--color-muted)]">{copy.standingsBody}</p>
          </div>
          <div className="flex flex-wrap gap-2" aria-label={copy.standingsTitle}>
            {(Object.keys(labels) as Category[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setCategory(key)}
                aria-pressed={category === key}
                className={[
                  'rounded-full border px-3.5 py-2 text-xs font-semibold transition duration-300 active:scale-[0.97]',
                  category === key
                    ? 'border-[var(--color-sand)]/35 bg-[var(--color-sand)]/12 text-[var(--color-sand)]'
                    : 'border-white/10 bg-black/15 text-[var(--color-muted)] hover:border-white/20 hover:text-white',
                ].join(' ')}
              >
                {labels[key]}
              </button>
            ))}
          </div>
        </div>

        {loadError ? (
          <div role="alert" className="my-8 border-l-2 border-red-300/70 px-4 py-2">
            <p className="font-semibold text-white">{copy.errorTitle}</p>
            <p className="mt-1 text-sm text-[var(--color-muted)]">{copy.errorBody}</p>
          </div>
        ) : winners === null ? (
          <div role="status" className="space-y-2 py-6" aria-label={copy.loading}>
            {[0, 1, 2, 3, 4].map((item) => <div key={item} className="skeleton h-12 rounded-[0.7rem]" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[38rem] border-collapse text-left">
              <thead>
                <tr className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  <th scope="col" className="w-14 py-3 pr-3 font-medium">#</th>
                  <th scope="col" className="py-3 pr-3 font-medium">{copy.manager}</th>
                  <th scope="col" className="py-3 pr-3 text-right font-medium">{copy.veteran}</th>
                  <th scope="col" className="py-3 pr-3 text-right font-medium">{copy.rookie}</th>
                  <th scope="col" className="py-3 pr-3 text-right font-medium">{copy.nations}</th>
                  <th scope="col" className="py-3 text-right font-medium">{copy.reward}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/7">
                {filteredWinners.map((winner, index) => (
                  <tr key={`${winner.displayName}-${index}`} className="transition duration-300 hover:bg-white/[0.035]">
                    <td className="mono py-3 pr-3 text-sm text-[var(--color-muted)]">{String(index + 1).padStart(2, '0')}</td>
                    <th scope="row" className="py-3 pr-3 text-sm font-semibold text-white">{winner.displayName}</th>
                    <td className="mono py-3 pr-3 text-right text-sm text-[var(--color-muted)]">{winner.veteranSvv || '—'}</td>
                    <td className="mono py-3 pr-3 text-right text-sm text-[var(--color-muted)]">{winner.rookieSvv || '—'}</td>
                    <td className="mono py-3 pr-3 text-right text-sm text-[var(--color-muted)]">{winner.nationsSvv || '—'}</td>
                    <td className="mono py-3 text-right text-sm font-bold text-[var(--color-sand)]">{winner.totalSvv} SVV</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
