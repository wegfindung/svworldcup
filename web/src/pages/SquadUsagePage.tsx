import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { PlayerPortrait } from '../components/PlayerPortrait'
import { PlayerTooltip } from '../components/PlayerTooltip'
import { StatTile } from '../components/StatTile'
import { TeamFlag } from '../components/TeamFlag'
import { fetchSquadUsage } from '../lib/api'
import type { PublicSquadUsagePayload, PublicSquadUsagePlayer, SlotClass } from '../lib/types'

type LoadState = 'loading' | 'ready' | 'error'
type PositionFilter = 'ALL' | SlotClass
type SortKey = 'presence' | 'starters' | 'subs' | 'rating'

const positionFilters: PositionFilter[] = ['ALL', 'GK', 'DEF', 'MID', 'FWD']

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

function PlayerUsageRow({ player, rank }: { player: PublicSquadUsagePlayer; rank: number }) {
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
          <PlayerPortrait
            src={player.imageUrl ?? '/placeholders/player.svg'}
            alt={player.displayName}
            width={52}
            height={52}
            className="h-12 w-12 rounded-xl border border-white/10 object-cover"
          />
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-white">{player.displayName}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted)]">
              <TeamFlag teamCode={player.teamCode} label={player.teamCode} size="sm" />
              <span className="mono uppercase tracking-[0.14em]">{roleLabel(player)}</span>
              <span className="mono uppercase tracking-[0.14em]">ID {player.playerId}</span>
            </div>
          </div>
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

export function SquadUsagePage() {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [payload, setPayload] = useState<PublicSquadUsagePayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [positionFilter, setPositionFilter] = useState<PositionFilter>('ALL')
  const [sortKey, setSortKey] = useState<SortKey>('presence')

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
    <div className="space-y-4 pb-10">
      <section className="hero-card rounded-[1.25rem] px-5 py-6 sm:px-6">
        <p className="eyebrow">squad usage</p>
        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.6fr)] lg:items-end">
          <div>
            <h2 className="section-title max-w-[12ch]">Player presence</h2>
            <p className="mt-4 max-w-[66ch] text-base leading-relaxed text-[var(--color-muted)]">
              A live read of revealed active squads: who appears most often, who starts, and which managers selected each player.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StatTile label="visible squads" value={formatNumber(payload?.summary.visibleSquadCount ?? 0)} tone="accent" />
            <StatTile label="unique players" value={formatNumber(payload?.summary.uniquePlayerCount ?? 0)} tone="sand" />
          </div>
        </div>
      </section>

      <section className="glass-panel rounded-[1.15rem] p-4">
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

          <select
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value as SortKey)}
            className="rounded-full border border-white/10 bg-black/24 px-4 py-2.5 text-sm font-semibold text-white outline-none focus:border-[var(--color-accent)]/55"
          >
            <option value="presence">Presence</option>
            <option value="starters">Starter count</option>
            <option value="subs">Sub count</option>
            <option value="rating">Rating</option>
          </select>
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
            <PlayerUsageRow key={player.playerId} player={player} rank={index + 1} />
          ))}
        </section>
      ) : null}
    </div>
  )
}
