import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { PlayerPortrait } from '../components/PlayerPortrait'
import { PlayerStatsModal } from '../components/PlayerStatsModal'
import { PlayerTooltip } from '../components/PlayerTooltip'
import { StatTile } from '../components/StatTile'
import { TeamFlag } from '../components/TeamFlag'
import { fetchSquadUsage } from '../lib/api'
import { toPlayerSeed, type PlayerStatsSeed } from '../lib/playerStatsSeed'
import type { LocaleCode, PublicSquadUsagePayload, PublicSquadUsagePlayer, SlotClass } from '../lib/types'

type LoadState = 'loading' | 'ready' | 'error'
type PositionFilter = 'ALL' | SlotClass
type SortKey = 'presence' | 'starters' | 'subs' | 'rating'

const positionFilters: PositionFilter[] = ['ALL', 'GK', 'DEF', 'MID', 'FWD']

const sortOptions: Array<{ key: SortKey; label: string }> = [
  { key: 'presence', label: 'Presence' },
  { key: 'starters', label: 'Starter count' },
  { key: 'subs', label: 'Sub count' },
  { key: 'rating', label: 'Rating' },
]

function formatNumber(value: number) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  })
}

function roleLabel(player: PublicSquadUsagePlayer) {
  return player.positionMain ?? player.positions.slice(0, 2).join('/') ?? player.positionClasses.join('/')
}

function matchesPosition(player: PublicSquadUsagePlayer, filter: PositionFilter) {
  return filter === 'ALL' || player.positionClasses.includes(filter)
}

function sortPlayers(players: PublicSquadUsagePlayer[], sortKey: SortKey) {
  return [...players].sort((left, right) => {
    if (sortKey === 'starters') {
      return right.starterCount - left.starterCount || right.usageCount - left.usageCount || left.displayName.localeCompare(right.displayName)
    }
    if (sortKey === 'subs') {
      return right.subCount - left.subCount || right.usageCount - left.usageCount || left.displayName.localeCompare(right.displayName)
    }
    if (sortKey === 'rating') {
      return right.rating - left.rating || right.usageCount - left.usageCount || left.displayName.localeCompare(right.displayName)
    }
    return right.presenceRate - left.presenceRate || right.starterCount - left.starterCount || left.displayName.localeCompare(right.displayName)
  })
}

function UsageBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/8">
      <div
        className="h-full rounded-full bg-[var(--color-accent)] shadow-[0_0_16px_rgba(34,189,147,0.28)]"
        style={{ width: `${Math.max(2, Math.min(100, value))}%` }}
      />
    </div>
  )
}

function PlayerUsageRow({ player, rank, onSelect }: { player: PublicSquadUsagePlayer; rank: number; onSelect: () => void }) {
  const previewManagers = player.managers.slice(0, 4)
  const hiddenManagerCount = Math.max(0, player.managers.length - previewManagers.length)

  return (
    <article className="grid gap-4 rounded-[1rem] border border-white/8 bg-black/18 p-4 transition hover:border-[var(--color-accent)]/28 hover:bg-white/5 lg:grid-cols-[minmax(0,1.35fr)_minmax(14rem,0.8fr)_minmax(16rem,1fr)] lg:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <span className="mono grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-xs text-[var(--color-muted)]">
          #{rank}
        </span>
        <PlayerTooltip
          as="div"
          className="flex min-w-0 items-center gap-3"
          info={{
            name: player.displayName,
            nationCode: player.teamCode || player.nationalityCode,
            imageUrl: player.imageUrl,
            meta: [
              { label: 'Rating', value: String(player.rating) },
              { label: 'Cost', value: String(player.capCost) },
              { label: 'Role', value: roleLabel(player) },
            ],
          }}
        >
          <button type="button" onClick={onSelect} className="flex min-w-0 items-center gap-3 text-left">
            <PlayerPortrait
              src={player.imageUrl ?? '/placeholders/player.svg'}
              alt={player.displayName}
              width={52}
              height={52}
              className="h-12 w-12 rounded-xl border border-white/10 object-cover"
            />
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-white transition hover:text-[var(--color-accent)]">{player.displayName}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted)]">
                <TeamFlag teamCode={player.teamCode} label={player.teamCode} size="sm" />
                <span className="mono uppercase tracking-[0.14em]">{roleLabel(player)}</span>
                <span className="mono uppercase tracking-[0.14em]">ID {player.playerId}</span>
              </div>
            </div>
          </button>
        </PlayerTooltip>
      </div>

      <div className="grid gap-2">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">presence</p>
            <p className="mt-1 text-2xl font-black text-[var(--color-accent)]">{formatNumber(player.presenceRate)}%</p>
          </div>
          <p className="text-sm font-semibold text-white">
            {player.usageCount} <span className="font-normal text-[var(--color-muted)]">squads</span>
          </p>
        </div>
        <UsageBar value={player.presenceRate} />
        <div className="flex gap-2 text-[11px] text-[var(--color-muted)]">
          <span>{player.starterCount} starters</span>
          <span className="text-white/20">|</span>
          <span>{player.subCount} subs</span>
        </div>
      </div>

      <div className="min-w-0">
        <p className="mono mb-2 text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">managers</p>
        <div className="flex flex-wrap gap-1.5">
          {previewManagers.map((manager) => (
            <Link
              key={`${manager.participantId}-${manager.slotKey}`}
              to={manager.profilePath}
              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:border-[var(--color-accent)]/45 hover:text-[var(--color-accent)]"
            >
              {manager.displayName}
            </Link>
          ))}
          {hiddenManagerCount > 0 ? (
            <span className="rounded-full border border-white/8 px-2.5 py-1 text-[11px] text-[var(--color-muted)]">
              +{hiddenManagerCount}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  )
}

// The Usage tab of the Stats page (StatsPage renders the shared hero + tab bar around it). Body copy here
// is still English-only — localizing it is a tracked follow-up.
export function UsageStatsPanel({ locale }: { locale: LocaleCode }) {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [payload, setPayload] = useState<PublicSquadUsagePayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [positionFilter, setPositionFilter] = useState<PositionFilter>('ALL')
  const [sortKey, setSortKey] = useState<SortKey>('presence')
  const [modalSeed, setModalSeed] = useState<PlayerStatsSeed | null>(null)
  const sortRef = useRef<HTMLDetailsElement>(null)

  // The sort control is a native <details> dropdown; close it when a pointer lands outside it.
  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const node = sortRef.current
      if (node?.open && !node.contains(event.target as Node)) {
        node.removeAttribute('open')
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  useEffect(() => {
    let active = true
    void fetchSquadUsage()
      .then((response) => {
        if (active) {
          setPayload(response)
          setLoadState('ready')
        }
      })
      .catch((loadError) => {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Usage data could not be loaded.')
          setLoadState('error')
        }
      })
    return () => {
      active = false
    }
  }, [])

  const filteredPlayers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const items = payload?.items ?? []
    const matching = items.filter((player) => {
      const matchesQuery =
        !normalizedQuery ||
        player.displayName.toLowerCase().includes(normalizedQuery) ||
        player.teamCode.toLowerCase().includes(normalizedQuery) ||
        String(player.playerId).includes(normalizedQuery)
      return matchesQuery && matchesPosition(player, positionFilter)
    })
    return sortPlayers(matching, sortKey)
  }, [payload?.items, positionFilter, query, sortKey])

  return (
    <div className="space-y-4">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.6fr)] lg:items-end">
        <p className="max-w-[66ch] text-sm leading-relaxed text-[var(--color-muted)]">
          A live read of revealed active squads: who appears most often, who starts, and which managers selected each player.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="visible squads" value={formatNumber(payload?.summary.visibleSquadCount ?? 0)} tone="accent" />
          <StatTile label="unique players" value={formatNumber(payload?.summary.uniquePlayerCount ?? 0)} tone="sand" />
        </div>
      </div>

      <section className="glass-panel allow-dropdown-overflow relative z-20 rounded-[1.15rem] p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(12rem,1fr)_auto_auto] lg:items-center">
          <label className="block">
            <span className="sr-only">Search players</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search player, team, or ID"
              className="w-full rounded-full border border-white/10 bg-black/24 px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)]/55"
            />
          </label>

          <div className="flex flex-wrap gap-1 rounded-full border border-white/8 bg-black/18 p-1">
            {positionFilters.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setPositionFilter(filter)}
                className={[
                  'rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] transition',
                  positionFilter === filter
                    ? 'bg-[var(--color-accent)] text-[var(--color-ink)]'
                    : 'text-[var(--color-muted)] hover:bg-white/7 hover:text-white',
                ].join(' ')}
              >
                {filter}
              </button>
            ))}
          </div>

          <details ref={sortRef} className="nav-disclosure group relative">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-white/10 bg-black/24 py-2.5 pl-4 pr-4 text-sm font-semibold text-white transition hover:border-[var(--color-accent)]/45">
              <span className="text-[var(--color-muted)]">Sort:</span>
              <span>{sortOptions.find((option) => option.key === sortKey)?.label ?? ''}</span>
              <svg viewBox="0 0 20 20" aria-hidden="true" className="ml-1.5 h-3.5 w-3.5 text-[var(--color-accent)] transition group-open:rotate-180">
                <path d="M5 7.5 10 12.5 15 7.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </summary>
            <div className="absolute right-0 top-[calc(100%+0.55rem)] z-30 grid min-w-44 gap-1 rounded-[1rem] border border-white/10 bg-[rgba(7,16,14,0.98)] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_28px_70px_-38px_rgba(0,0,0,0.96)]">
              {sortOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={(event) => {
                    setSortKey(option.key)
                    event.currentTarget.closest('details')?.removeAttribute('open')
                  }}
                  className={[
                    'rounded-[0.75rem] px-3 py-2 text-left text-sm font-semibold',
                    sortKey === option.key
                      ? 'bg-white/10 text-white'
                      : 'text-[var(--color-muted)] hover:bg-white/7 hover:text-white active:scale-[0.98]',
                  ].join(' ')}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </details>
        </div>
      </section>

      {loadState === 'loading' ? (
        <section className="grid gap-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="skeleton h-28 rounded-[1rem]" />
          ))}
        </section>
      ) : null}

      {loadState === 'error' ? (
        <section className="glass-panel rounded-[1.15rem] p-5">
          <EmptyState title="Usage unavailable" body={error ?? 'The revealed squad usage table could not be loaded.'} />
        </section>
      ) : null}

      {loadState === 'ready' && filteredPlayers.length === 0 ? (
        <section className="glass-panel rounded-[1.15rem] p-5">
          <EmptyState title="No visible squads yet" body="Once active squads are revealed, this page will rank player usage here." />
        </section>
      ) : null}

      {loadState === 'ready' && filteredPlayers.length > 0 ? (
        <section className="grid gap-3">
          {filteredPlayers.map((player, index) => (
            <PlayerUsageRow key={player.playerId} player={player} rank={index + 1} onSelect={() => setModalSeed(toPlayerSeed(player))} />
          ))}
        </section>
      ) : null}

      {modalSeed ? <PlayerStatsModal seed={modalSeed} locale={locale} onClose={() => setModalSeed(null)} /> : null}
    </div>
  )
}
