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

// /player-points is one global payload for every nation, so it is fetched once and re-filtered per
// nation. State is intentionally not keyed to the target (the payload serves all of them).
type LoadState = { kind: 'idle' } | { kind: 'ready'; payload: PlayerPointsPayload } | { kind: 'error' }

function formatPoints(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 })
}

function formatRating(value: number) {
  return value > 0 ? value.toFixed(1) : '—'
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

// Module-level (not defined during render — react-hooks/static-components) sortable column header.
function SortHeader({
  columnKey,
  label,
  align = 'center',
  activeKey,
  dir,
  onToggle,
}: {
  columnKey: NationPoolSortKey
  label: string
  align?: 'left' | 'center'
  activeKey: NationPoolSortKey
  dir: SortDir
  onToggle: (key: NationPoolSortKey) => void
}) {
  const active = activeKey === columnKey
  return (
    <th className={`px-2 py-2 font-semibold ${align === 'left' ? 'text-left' : 'text-center'}`}>
      <button
        type="button"
        onClick={() => onToggle(columnKey)}
        className={`mono inline-flex items-center gap-1 uppercase tracking-[0.12em] transition hover:text-white ${active ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]'}`}
      >
        {label}
        <span className={active ? 'opacity-100' : 'opacity-0'}>{dir === 'desc' ? '▼' : '▲'}</span>
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
  const rows = payload ? sortNationPoolPlayers(nationPoolPlayers(payload, target.teamCode), sortKey, sortDir) : []
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
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/72 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        className="glass-panel my-auto w-full max-w-3xl rounded-[1.25rem] p-5 sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
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

        <div className="mt-5">
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
              <div className="overflow-x-auto rounded-[0.9rem] border border-white/8">
                <table className="w-full min-w-[40rem] text-left text-xs">
                  <thead className="border-b border-white/8 bg-[rgba(8,13,12,0.6)] text-[10px]">
                    <tr>
                      <SortHeader columnKey="name" label={copy.player} align="left" activeKey={sortKey} dir={sortDir} onToggle={toggleSort} />
                      <th className="mono px-2 py-2 text-center font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">{copy.position}</th>
                      {numericColumns.map((column) => (
                        <SortHeader key={column.key} columnKey={column.key} label={column.label} activeKey={sortKey} dir={sortDir} onToggle={toggleSort} />
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((player) => (
                      <tr key={player.playerId} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition">
                        <td className="px-2 py-2.5">
                          <button
                            type="button"
                            onClick={() => setPlayerSeed(seedFor(player))}
                            className="flex min-w-0 items-center gap-2 text-left"
                          >
                            <span className="h-7 w-7 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/5">
                              {player.imageUrl ? (
                                <img src={player.imageUrl} alt={player.displayName} width={28} height={28} className="h-full w-full object-cover" />
                              ) : (
                                <span className="grid h-full w-full place-items-center text-[9px] font-bold text-[var(--color-muted)]">
                                  {player.displayName.slice(0, 2).toUpperCase()}
                                </span>
                              )}
                            </span>
                            <span className="truncate font-semibold text-white transition hover:text-[var(--color-accent)]">{player.displayName}</span>
                          </button>
                        </td>
                        <td className="mono px-2 py-2.5 text-center text-[10px] uppercase text-[var(--color-muted)]">{player.positionMain ?? player.positions[0] ?? '—'}</td>
                        <td className="mono px-2 py-2.5 text-center text-[var(--color-paper)]">{player.goals}</td>
                        <td className="mono px-2 py-2.5 text-center text-[var(--color-paper)]">{player.assists}</td>
                        <td className="mono px-2 py-2.5 text-center text-[var(--color-paper)]">{player.appearances}</td>
                        <td className="mono px-2 py-2.5 text-center text-[var(--color-paper)]">{player.minutes}</td>
                        <td className="mono px-2 py-2.5 text-center text-[var(--color-paper)]">{player.cleanSheets}</td>
                        <td className="mono px-2 py-2.5 text-center text-[var(--color-paper)]">{formatRating(player.averageRating)}</td>
                        <td className="mono px-2 py-2.5 text-center text-base font-black text-[var(--color-accent)]">{formatPoints(player.basePoints)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
