import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PlayerStatsModal } from './PlayerStatsModal'
import { TeamFlag } from './TeamFlag'
import type { AppMessages } from '../i18n/messages'
import { fetchBoostLeaderboard, fetchPlayerPoints } from '../lib/api'
import { toPlayerSeed, type PlayerStatsSeed } from '../lib/playerStatsSeed'
import { pointsMetricValue, topBoostLeaders, topPointsLeaders, type PointsLeaderMetric } from '../lib/tournamentLeaders'
import type { BoostLeaderboardPayload, LocaleCode, PlayerPointsPayload } from '../lib/types'

type LeadersCopy = AppMessages['home']['leaders']

const TOP_N = 7

// One ranked entry inside a mini-card. seed feeds the click-through PlayerStatsModal; both the
// /player-points and /boost-leaderboard rows carry the seed fields, so one shape serves every board.
interface LeaderEntry {
  seed: PlayerStatsSeed
  teamCode: string
  displayName: string
  value: string
}

interface Board {
  key: string
  title: string
  unit: string
  entries: LeaderEntry[]
}

function formatInt(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 })
}

function formatPoints(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 })
}

function formatRating(value: number) {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function TournamentLeadersCard({ copy, locale }: { copy: LeadersCopy; locale: LocaleCode }) {
  const [points, setPoints] = useState<PlayerPointsPayload | null>(null)
  const [boosts, setBoosts] = useState<BoostLeaderboardPayload | null>(null)
  const [ready, setReady] = useState(false)
  const [modalSeed, setModalSeed] = useState<PlayerStatsSeed | null>(null)

  useEffect(() => {
    let active = true
    void Promise.all([fetchPlayerPoints().catch(() => null), fetchBoostLeaderboard().catch(() => null)]).then(
      ([pointsData, boostData]) => {
        if (!active) return
        setPoints(pointsData)
        setBoosts(boostData)
        setReady(true)
      },
    )
    return () => {
      active = false
    }
  }, [])

  const boards = useMemo<Board[]>(() => {
    const players = points?.items ?? []
    const pointsBoard = (metric: PointsLeaderMetric, title: string, unit: string, format: (value: number) => string): Board => ({
      key: metric,
      title,
      unit,
      entries: topPointsLeaders(players, metric, TOP_N).map((player) => ({
        seed: toPlayerSeed(player),
        teamCode: player.teamCode,
        displayName: player.displayName,
        value: format(pointsMetricValue(player, metric)),
      })),
    })

    return [
      pointsBoard('goals', copy.goals, copy.goalsUnit, formatInt),
      pointsBoard('assists', copy.assists, copy.assistsUnit, formatInt),
      pointsBoard('points', copy.points, copy.pointsUnit, formatPoints),
      pointsBoard('cleanSheets', copy.cleanSheets, copy.cleanSheetsUnit, formatInt),
      pointsBoard('average', copy.average, copy.averageUnit, formatRating),
      {
        key: 'boosted',
        title: copy.boosted,
        unit: copy.boostedUnit,
        entries: topBoostLeaders(boosts?.items ?? [], TOP_N).map((row) => ({
          seed: toPlayerSeed(row),
          teamCode: row.teamCode,
          displayName: row.displayName,
          value: formatInt(row.totalNetShares),
        })),
      },
    ]
  }, [points?.items, boosts?.items, copy])

  const hasAnyData = boards.some((board) => board.entries.length > 0)
  if (!ready || !hasAnyData) {
    return null
  }

  return (
    <section className="glass-panel rounded-[1.25rem] p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{copy.eyebrow}</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-[1.7rem]">{copy.title}</h3>
          <p className="mt-3 max-w-[58ch] text-sm leading-relaxed text-[var(--color-muted)]">{copy.body}</p>
        </div>
        <Link
          to="/stats"
          className="shrink-0 rounded-full border border-white/12 bg-black/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:-translate-y-[1px] hover:border-[var(--color-accent)]/50 hover:text-[var(--color-accent)] active:scale-[0.98]"
        >
          {copy.viewAll}
        </Link>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {boards.map((board) => (
          <div key={board.key} className="surface-row rounded-[1rem] border border-white/6 p-4">
            <div className="flex items-baseline justify-between gap-2 border-b border-white/6 pb-2.5">
              <p className="text-sm font-bold tracking-tight text-white">{board.title}</p>
              <span className="mono text-[9px] uppercase tracking-[0.16em] text-[var(--color-muted)]">{board.unit}</span>
            </div>
            {board.entries.length === 0 ? (
              <p className="mt-3 text-xs leading-relaxed text-[var(--color-muted)]">{copy.emptyBody}</p>
            ) : (
              <ol className="mt-2 space-y-0.5">
                {board.entries.map((entry, index) => (
                  <li key={entry.seed.playerId} className="flex items-center gap-2.5 rounded-[0.6rem] px-1.5 py-1.5 transition hover:bg-white/4">
                    <span
                      className={[
                        'mono grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold',
                        index === 0
                          ? 'bg-[var(--color-accent)] text-[var(--color-ink)]'
                          : 'border border-white/10 text-[var(--color-muted)]',
                      ].join(' ')}
                    >
                      {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => setModalSeed(entry.seed)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      <TeamFlag teamCode={entry.teamCode} label={entry.teamCode} size="sm" />
                      <span className="truncate text-xs font-semibold text-white transition hover:text-[var(--color-accent)]">{entry.displayName}</span>
                    </button>
                    <span className="mono shrink-0 text-sm font-black text-[var(--color-accent)]">{entry.value}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        ))}
      </div>

      {modalSeed ? <PlayerStatsModal seed={modalSeed} locale={locale} onClose={() => setModalSeed(null)} /> : null}
    </section>
  )
}
