import { useEffect, useMemo, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { PlayerPortrait } from '../components/PlayerPortrait'
import { TeamFlag } from '../components/TeamFlag'
import { getMessages } from '../i18n/messages'
import { fetchPlayerPoints } from '../lib/api'
import type { LocaleCode, PlayerPointsPayload, PlayerPointsPlayer } from '../lib/types'

type LoadState = 'loading' | 'ready' | 'error'
type Metric = 'goals' | 'assists' | 'cleanSheets' | 'average'

const metrics: Metric[] = ['goals', 'assists', 'cleanSheets', 'average']
const PAGE_SIZE = 50
// Average rating needs a minimum sample so a single strong game doesn't top the board.
const MIN_AVG_APPEARANCES = 2

function formatRating(value: number) {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function roleLabel(player: PlayerPointsPlayer) {
  return player.positionMain ?? player.positions.slice(0, 2).join('/') ?? player.positionClasses.join('/')
}

// The metric value a player is ranked by, whether they qualify for that board, and how the value renders.
function metricValue(player: PlayerPointsPlayer, metric: Metric) {
  if (metric === 'goals') return player.goals
  if (metric === 'assists') return player.assists
  if (metric === 'cleanSheets') return player.cleanSheets
  return player.averageRating
}

function qualifies(player: PlayerPointsPlayer, metric: Metric) {
  if (metric === 'average') return player.appearances >= MIN_AVG_APPEARANCES
  return metricValue(player, metric) > 0
}

export function LeadersPanel({ locale }: { locale: LocaleCode }) {
  const copy = getMessages(locale).playerPoints
  const leadersCopy = getMessages(locale).leaders
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [payload, setPayload] = useState<PlayerPointsPayload | null>(null)
  const [metric, setMetric] = useState<Metric>('goals')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    let active = true
    void fetchPlayerPoints()
      .then((response) => {
        if (active) {
          setPayload(response)
          setLoadState('ready')
        }
      })
      .catch(() => {
        if (active) {
          setLoadState('error')
        }
      })
    return () => {
      active = false
    }
  }, [])

  const ranked = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return (payload?.items ?? [])
      .filter((player) => qualifies(player, metric))
      .filter(
        (player) =>
          !normalizedQuery ||
          player.displayName.toLowerCase().includes(normalizedQuery) ||
          player.teamCode.toLowerCase().includes(normalizedQuery) ||
          String(player.playerId).includes(normalizedQuery),
      )
      .sort(
        (left, right) =>
          metricValue(right, metric) - metricValue(left, metric) ||
          right.basePoints - left.basePoints ||
          left.displayName.localeCompare(right.displayName),
      )
  }, [payload?.items, metric, query])

  const totalPages = Math.max(1, Math.ceil(ranked.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageItems = ranked.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  function selectMetric(next: Metric) {
    setMetric(next)
    setPage(1)
  }

  function search(next: string) {
    setQuery(next)
    setPage(1)
  }

  const metricLabel: Record<Metric, string> = {
    goals: leadersCopy.goals,
    assists: leadersCopy.assists,
    cleanSheets: leadersCopy.cleanSheets,
    average: leadersCopy.average,
  }
  const metricUnit: Record<Metric, string> = {
    goals: leadersCopy.goalsUnit,
    assists: leadersCopy.assistsUnit,
    cleanSheets: leadersCopy.cleanSheetsUnit,
    average: leadersCopy.averageUnit,
  }

  return (
    <div className="space-y-4">
      <section className="glass-panel rounded-[1.15rem] p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(12rem,1fr)_auto] lg:items-center">
          <label className="block">
            <span className="sr-only">{copy.searchPlaceholder}</span>
            <input
              value={query}
              onChange={(event) => search(event.target.value)}
              placeholder={copy.searchPlaceholder}
              className="w-full rounded-full border border-white/10 bg-black/24 px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)]/55"
            />
          </label>
          <div className="flex flex-wrap gap-1 rounded-full border border-white/8 bg-black/18 p-1">
            {metrics.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => selectMetric(option)}
                className={[
                  'rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] transition',
                  metric === option
                    ? 'bg-[var(--color-accent)] text-[var(--color-ink)]'
                    : 'text-[var(--color-muted)] hover:bg-white/7 hover:text-white',
                ].join(' ')}
              >
                {metricLabel[option]}
              </button>
            ))}
          </div>
        </div>
        {metric === 'average' ? (
          <p className="mono mt-3 text-[11px] uppercase tracking-[0.14em] text-[var(--color-muted)]">{leadersCopy.avgMinNote}</p>
        ) : null}
      </section>

      {loadState === 'loading' ? (
        <section className="grid gap-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="skeleton h-20 rounded-[1rem]" />
          ))}
        </section>
      ) : null}

      {loadState === 'error' ? (
        <section className="glass-panel rounded-[1.15rem] p-5">
          <EmptyState title={copy.errorTitle} body={copy.errorBody} />
        </section>
      ) : null}

      {loadState === 'ready' && pageItems.length === 0 ? (
        <section className="glass-panel rounded-[1.15rem] p-5">
          <EmptyState title={copy.emptyTitle} body={copy.emptyBody} />
        </section>
      ) : null}

      {loadState === 'ready' && pageItems.length > 0 ? (
        <>
          <section className="grid gap-2">
            {pageItems.map((player, index) => {
              const value = metricValue(player, metric)
              return (
                <article
                  key={player.playerId}
                  className="flex items-center gap-3 rounded-[0.95rem] border border-white/8 bg-black/18 p-3 transition hover:border-[var(--color-accent)]/28 hover:bg-white/5"
                >
                  <span className="mono grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-xs text-[var(--color-muted)]">
                    {(currentPage - 1) * PAGE_SIZE + index + 1}
                  </span>
                  <PlayerPortrait
                    src={player.imageUrl ?? '/placeholders/player.svg'}
                    alt={player.displayName}
                    width={40}
                    height={40}
                    className="h-10 w-10 shrink-0 rounded-lg border border-white/10 object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{player.displayName}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-[var(--color-muted)]">
                      <TeamFlag teamCode={player.teamCode} label={player.teamCode} size="sm" />
                      <span className="mono uppercase tracking-[0.14em]">{roleLabel(player)}</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-2xl font-black leading-none text-[var(--color-accent)]">
                      {metric === 'average' ? formatRating(value) : value}
                    </span>
                    <p className="mono mt-1 text-[9px] uppercase tracking-[0.16em] text-[var(--color-muted)]">{metricUnit[metric]}</p>
                  </div>
                </article>
              )
            })}
          </section>

          {totalPages > 1 ? (
            <nav className="flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
                className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:border-[var(--color-accent)]/50 hover:text-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {copy.previous}
              </button>
              <span className="mono text-[11px] uppercase tracking-[0.14em] text-[var(--color-muted)]">
                {copy.pageStatus.replace('{page}', String(currentPage)).replace('{totalPages}', String(totalPages))}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage(currentPage + 1)}
                className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:border-[var(--color-accent)]/50 hover:text-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {copy.next}
              </button>
            </nav>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
