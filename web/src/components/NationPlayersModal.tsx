import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { fetchPlayerPoints } from '../lib/api'
import { getMessages } from '../i18n/messages'
import { nationPoolPlayers, sortNationPoolPlayers, type NationPoolSortKey, type SortDir } from '../lib/nationPoolPlayers'
import type { PlayerStatsSeed } from '../lib/playerStatsSeed'
import type { LocaleCode, PlayerPointsPayload, PlayerPointsPlayer } from '../lib/types'
import { PlayerStatsModal } from './PlayerStatsModal'
import { TeamFlag } from './TeamFlag'

export interface NationPlayersTarget {
  teamCode: string
  name: string
}

type NationPoolCopy = ReturnType<typeof getMessages>['results']['nationPool']

// /player-points is one global payload for every nation, so it is fetched once and re-filtered per
// nation. State is intentionally not keyed to the target (the payload serves all of them).
type LoadState = { kind: 'idle' } | { kind: 'ready'; payload: PlayerPointsPayload } | { kind: 'error' }

function formatPoints(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 })
}

function formatInt(value: number) {
  return value.toLocaleString()
}

function formatRating(value: number) {
  return value > 0 ? value.toFixed(1) : '-'
}

function poolTotals(players: PlayerPointsPlayer[]) {
  return players.reduce(
    (totals, player) => ({
      goals: totals.goals + player.goals,
      assists: totals.assists + player.assists,
      appearances: totals.appearances + player.appearances,
      minutes: totals.minutes + player.minutes,
      cleanSheets: totals.cleanSheets + player.cleanSheets,
      points: totals.points + player.basePoints,
    }),
    { goals: 0, assists: 0, appearances: 0, minutes: 0, cleanSheets: 0, points: 0 },
  )
}

function seedFor(player: PlayerPointsPlayer): PlayerStatsSeed {
  return {
    playerId: player.playerId,
    displayName: player.displayName,
    teamCode: player.teamCode,
    imageUrl: player.imageUrl,
    rating: player.rating,
    capCost: player.capCost,
    positions: player.positions,
    positionMain: player.positionMain,
  }
}

function PlayerAvatar({ player, size = 'md' }: { player: PlayerPointsPlayer; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'h-7 w-7 text-[9px]' : 'h-10 w-10 text-[10px]'
  return (
    <span className={`${sizeClass} grid shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-white/5 font-bold text-[var(--color-muted)]`}>
      {player.imageUrl ? (
        <img src={player.imageUrl} alt={player.displayName} width={size === 'sm' ? 28 : 40} height={size === 'sm' ? 28 : 40} className="h-full w-full object-cover" />
      ) : (
        player.displayName.slice(0, 2).toUpperCase()
      )}
    </span>
  )
}

function PoolMetric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="min-w-0 rounded-[0.8rem] border border-white/8 bg-black/20 px-3 py-2.5">
      <p className="mono truncate text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">{label}</p>
      <p className={`mono mt-1 text-lg font-black leading-none ${accent ? 'text-[var(--color-accent)]' : 'text-white'}`}>{value}</p>
    </div>
  )
}

function TopPlayerPanel({
  player,
  copy,
  onSelect,
}: {
  player: PlayerPointsPlayer
  copy: NationPoolCopy
  onSelect: (player: PlayerPointsPlayer) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(player)}
      className="group flex min-w-0 items-center justify-between gap-4 rounded-[1rem] border border-[var(--color-accent)]/18 bg-[var(--color-accent)]/7 px-4 py-3 text-left transition hover:-translate-y-[1px] hover:border-[var(--color-accent)]/36 hover:bg-[var(--color-accent)]/10 active:scale-[0.99]"
    >
      <span className="flex min-w-0 items-center gap-3">
        <PlayerAvatar player={player} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold text-white transition group-hover:text-[var(--color-accent)]">{player.displayName}</span>
          <span className="mono mt-1 block text-[10px] uppercase tracking-[0.14em] text-[var(--color-muted)]">
            {player.positionMain ?? player.positions[0] ?? '-'} / {copy.rating} {formatRating(player.averageRating)}
          </span>
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="mono block text-2xl font-black leading-none text-[var(--color-accent)]">{formatPoints(player.basePoints)}</span>
        <span className="mono mt-1 block text-[9px] uppercase tracking-[0.14em] text-[var(--color-muted)]">{copy.points}</span>
      </span>
    </button>
  )
}

function MobilePlayerCard({
  player,
  rank,
  copy,
  onSelect,
}: {
  player: PlayerPointsPlayer
  rank: number
  copy: NationPoolCopy
  onSelect: (player: PlayerPointsPlayer) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(player)}
      className="group rounded-[0.95rem] border border-white/8 bg-black/18 p-3 text-left transition hover:border-[var(--color-accent)]/30 hover:bg-white/[0.03] active:scale-[0.99]"
    >
      <span className="flex min-w-0 items-start justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="mono grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-[10px] font-bold text-[var(--color-muted)]">
            {rank}
          </span>
          <PlayerAvatar player={player} size="sm" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold text-white transition group-hover:text-[var(--color-accent)]">{player.displayName}</span>
            <span className="mono mt-0.5 block text-[10px] uppercase tracking-[0.14em] text-[var(--color-muted)]">{player.positionMain ?? player.positions[0] ?? '-'}</span>
          </span>
        </span>
        <span className="mono shrink-0 text-right text-lg font-black leading-none text-[var(--color-accent)]">{formatPoints(player.basePoints)}</span>
      </span>
      <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
        <PoolMetric label={copy.goals} value={formatInt(player.goals)} />
        <PoolMetric label={copy.assists} value={formatInt(player.assists)} />
        <PoolMetric label={copy.minutes} value={formatInt(player.minutes)} />
        <PoolMetric label={copy.rating} value={formatRating(player.averageRating)} />
      </div>
    </button>
  )
}

// Module-level (not defined during render — react-hooks/static-components) sortable column header.
function SortHeader({
  columnKey,
  label,
  align = 'center',
  sticky = false,
  activeKey,
  dir,
  onToggle,
}: {
  columnKey: NationPoolSortKey
  label: string
  align?: 'left' | 'center'
  sticky?: boolean
  activeKey: NationPoolSortKey
  dir: SortDir
  onToggle: (key: NationPoolSortKey) => void
}) {
  const active = activeKey === columnKey
  return (
    <th
      aria-sort={active ? (dir === 'desc' ? 'descending' : 'ascending') : 'none'}
      className={`px-2 py-2 font-semibold ${align === 'left' ? 'text-left' : 'text-center'} ${sticky ? 'sticky left-0 z-40 min-w-[15rem] bg-[#0e1614]' : ''}`}
    >
      <button
        type="button"
        onClick={() => onToggle(columnKey)}
        className={[
          'mono inline-flex items-center justify-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] uppercase tracking-[0.12em] transition hover:text-white active:scale-[0.98]',
          align === 'left' ? 'justify-start' : '',
          active
            ? 'border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
            : 'border-transparent text-[var(--color-muted)] hover:border-white/10 hover:bg-white/5',
        ].join(' ')}
      >
        {label}
        <span className={`w-2 text-[8px] ${active ? 'opacity-100' : 'opacity-35'}`}>{active ? (dir === 'desc' ? '▼' : '▲') : '↕'}</span>
      </button>
    </th>
  )
}

export function NationPlayersModal({
  target,
  locale,
  onClose,
}: {
  target: NationPlayersTarget | null
  locale: LocaleCode
  onClose: () => void
}) {
  const copy = getMessages(locale).results.nationPool
  const [state, setState] = useState<LoadState>({ kind: 'idle' })
  const [sortKey, setSortKey] = useState<NationPoolSortKey>('points')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [playerSeed, setPlayerSeed] = useState<PlayerStatsSeed | null>(null)

  useEffect(() => {
    if (!target || state.kind === 'ready') {
      return
    }
    let active = true
    fetchPlayerPoints()
      .then((payload) => {
        if (active) setState({ kind: 'ready', payload })
      })
      .catch(() => {
        if (active) setState({ kind: 'error' })
      })
    return () => {
      active = false
    }
  }, [target, state.kind])

  useEffect(() => {
    if (!target) return
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      // Layered close: the player deep-dive closes first, then the nation list.
      if (playerSeed) {
        setPlayerSeed(null)
      } else {
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [target, onClose, playerSeed])

  if (!target) {
    return null
  }

  function toggleSort(key: NationPoolSortKey) {
    if (key === sortKey) {
      setSortDir((dir) => (dir === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'name' ? 'asc' : 'desc')
    }
  }

  const payload = state.kind === 'ready' ? state.payload : null
  const players = payload ? nationPoolPlayers(payload, target.teamCode) : []
  const rows = sortNationPoolPlayers(players, sortKey, sortDir)
  const topPlayer = players.length ? sortNationPoolPlayers(players, 'points', 'desc')[0] : null
  const totals = poolTotals(players)
  // Numeric, sortable columns rendered after the static Position column (in display order).
  const numericColumns: Array<{ key: NationPoolSortKey; label: string }> = [
    { key: 'goals', label: copy.goals },
    { key: 'assists', label: copy.assists },
    { key: 'appearances', label: copy.appearances },
    { key: 'minutes', label: copy.minutes },
    { key: 'cleanSheets', label: copy.cleanSheets },
    { key: 'rating', label: copy.rating },
    { key: 'points', label: copy.points },
  ]

  return createPortal(
    <>
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/72 backdrop-blur-sm sm:items-center sm:overflow-y-auto sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        className="glass-panel flex h-full w-full flex-col rounded-none sm:my-auto sm:h-auto sm:max-h-[calc(100vh-2rem)] sm:max-w-5xl sm:rounded-[1.25rem]"
      >
        {/* Sticky header so the close button stays reachable as the list scrolls (full-screen sheet on mobile). */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/8 p-4 sm:p-6">
          <div className="flex min-w-0 items-center gap-3">
            <TeamFlag teamCode={target.teamCode} label={target.name} size="md" />
            <div className="min-w-0">
              <p className="eyebrow text-[10px]">{copy.eyebrow}</p>
              <h3 className="mt-1 truncate text-2xl font-semibold text-white">{target.name}</h3>
              <p className="mt-1 text-xs text-[var(--color-muted)]">{copy.subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.close}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/12 text-white transition hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {state.kind === 'error' ? (
            <p className="rounded-[1rem] border border-white/8 bg-black/16 px-4 py-6 text-center text-sm text-[var(--color-muted)]">
              {copy.error}
            </p>
          ) : !payload ? (
            <div className="skeleton h-56 rounded-[1.1rem]" />
          ) : rows.length === 0 ? (
            <p className="rounded-[1rem] border border-white/8 bg-black/16 px-4 py-6 text-center text-sm text-[var(--color-muted)]">
              {copy.empty}
            </p>
          ) : (
            <>
              <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
                {topPlayer ? <TopPlayerPanel player={topPlayer} copy={copy} onSelect={(player) => setPlayerSeed(seedFor(player))} /> : null}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
                  <PoolMetric label={copy.points} value={formatPoints(totals.points)} accent />
                  <PoolMetric label={copy.goals} value={formatInt(totals.goals)} />
                  <PoolMetric label={copy.assists} value={formatInt(totals.assists)} />
                  <PoolMetric label={copy.minutes} value={formatInt(totals.minutes)} />
                </div>
              </div>

              <div className="hidden overflow-hidden rounded-[0.95rem] border border-white/8 bg-black/14 sm:block">
                <div className="max-h-[min(58vh,38rem)] overflow-auto">
                  <table className="w-full min-w-[50rem] text-left text-xs">
                    <thead className="sticky top-0 z-30 border-b border-white/8 bg-[rgba(8,13,12,0.96)] text-[10px] shadow-[0_10px_24px_-22px_rgba(0,0,0,0.95)]">
                      <tr>
                        <SortHeader columnKey="name" label={copy.player} align="left" sticky activeKey={sortKey} dir={sortDir} onToggle={toggleSort} />
                        <th className="mono px-2 py-2 text-center text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">{copy.position}</th>
                        {numericColumns.map((column) => (
                          <SortHeader key={column.key} columnKey={column.key} label={column.label} activeKey={sortKey} dir={sortDir} onToggle={toggleSort} />
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {rows.map((player, index) => (
                        <tr key={player.playerId} className="group transition hover:bg-white/[0.025]">
                          <td className="sticky left-0 z-10 bg-[#0b100f]/95 px-3 py-2.5 transition group-hover:bg-[#101614]">
                            <button
                              type="button"
                              onClick={() => setPlayerSeed(seedFor(player))}
                              className="-m-1 flex min-w-0 items-center gap-2 rounded-[0.75rem] p-1 text-left transition hover:bg-white/5 active:scale-[0.99]"
                            >
                              <span className="mono grid h-6 w-6 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-[9px] font-bold text-[var(--color-muted)]">
                                {index + 1}
                              </span>
                              <PlayerAvatar player={player} size="sm" />
                              <span className="truncate font-semibold text-white transition hover:text-[var(--color-accent)]">{player.displayName}</span>
                            </button>
                          </td>
                          <td className="mono px-2 py-2.5 text-center text-[10px] uppercase text-[var(--color-muted)]">{player.positionMain ?? player.positions[0] ?? '-'}</td>
                          <td className="mono px-2 py-2.5 text-center text-[var(--color-paper)]">{player.goals}</td>
                          <td className="mono px-2 py-2.5 text-center text-[var(--color-paper)]">{player.assists}</td>
                          <td className="mono px-2 py-2.5 text-center text-[var(--color-paper)]">{player.appearances}</td>
                          <td className="mono px-2 py-2.5 text-center text-[var(--color-paper)]">{player.minutes}</td>
                          <td className="mono px-2 py-2.5 text-center text-[var(--color-paper)]">{player.cleanSheets}</td>
                          <td className="mono px-2 py-2.5 text-center text-[var(--color-paper)]">{formatRating(player.averageRating)}</td>
                          <td className="mono px-2 py-2.5 text-center">
                            <span className="inline-flex min-w-14 justify-center rounded-full border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/10 px-2 py-1 text-sm font-black text-[var(--color-accent)]">
                              {formatPoints(player.basePoints)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid gap-2 sm:hidden">
                {rows.map((player, index) => (
                  <MobilePlayerCard key={player.playerId} player={player} rank={index + 1} copy={copy} onSelect={(selected) => setPlayerSeed(seedFor(selected))} />
                ))}
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-[var(--color-muted)]">{copy.basePointsNote}</p>
            </>
          )}
        </div>
      </div>
    </div>

    {/* Sibling of the overlay (not a child) so the player card's own backdrop/clicks never bubble to
        the nation overlay's onClick={onClose}. */}
    {playerSeed ? <PlayerStatsModal seed={playerSeed} locale={locale} onClose={() => setPlayerSeed(null)} /> : null}
    </>,
    document.body,
  )
}
