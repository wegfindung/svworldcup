import { useEffect, useMemo, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { PlayerPortrait } from '../components/PlayerPortrait'
import { PlayerStatsModal } from '../components/PlayerStatsModal'
import { StatTile } from '../components/StatTile'
import { TeamFlag } from '../components/TeamFlag'
import { getMessages, type AppMessages } from '../i18n/messages'
import { fetchPlayerPoints } from '../lib/api'
import { toPlayerSeed, type PlayerStatsSeed } from '../lib/playerStatsSeed'
import type { LocaleCode, PlayerPointsPayload, PlayerPointsPlayer, SlotClass } from '../lib/types'

type LoadState = 'loading' | 'ready' | 'error'
type PointsCopy = AppMessages['playerPoints']

const positions: SlotClass[] = ['GK', 'DEF', 'MID', 'FWD']
const PAGE_SIZE = 50

function formatNumber(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: value % 1 === 0 ? 0 : 2 })
}

function formatPoints(value: number) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  })
}

function roleLabel(player: PlayerPointsPlayer) {
  return player.positionMain ?? player.positions.slice(0, 2).join('/') ?? player.positionClasses.join('/')
}

// Clean-sheet points this player has banked for the chosen position (0 if they kept none, or the class pays
// nothing — e.g. FWD, or a non-DM central mid placed at MID).
function cleanSheetForPosition(player: PlayerPointsPlayer, position: SlotClass) {
  return player.cleanSheetByPosition.find((entry) => entry.slotClass === position)?.points ?? 0
}

// A player's total points if placed in the chosen position: the position-independent base plus that
// position's accumulated clean sheet (the convention from the Results-page goalkeeper fold, generalised).
function totalForPosition(player: PlayerPointsPlayer, position: SlotClass) {
  return player.basePoints + cleanSheetForPosition(player, position)
}

type PointsMode = 'total' | 'perGame'

// The value a player is ranked/shown by: the position total, or that total divided by appearances.
function valueForMode(player: PlayerPointsPlayer, position: SlotClass, mode: PointsMode) {
  const total = totalForPosition(player, position)
  return mode === 'perGame' ? (player.appearances > 0 ? total / player.appearances : 0) : total
}

function PlayerPointsRow({ player, rank, position, mode, copy, onSelect }: { player: PlayerPointsPlayer; rank: number; position: SlotClass; mode: PointsMode; copy: PointsCopy; onSelect: () => void }) {
  const cleanSheet = cleanSheetForPosition(player, position)
  const total = player.basePoints + cleanSheet
  const value = valueForMode(player, position, mode)

  return (
    <article className="grid gap-4 rounded-[1rem] border border-white/8 bg-black/18 p-4 transition hover:border-[var(--color-accent)]/28 hover:bg-white/5 lg:grid-cols-[minmax(0,1.4fr)_minmax(11rem,0.7fr)_minmax(9rem,0.5fr)] lg:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <span className="mono grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-xs text-[var(--color-muted)]">
          #{rank}
        </span>
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
      </div>

      <div>
        <div className="flex items-end gap-2">
          <p className="text-3xl font-black leading-none text-[var(--color-accent)]">{formatPoints(value)}</p>
          <p className="mono pb-1 text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">{mode === 'perGame' ? copy.perGameLabel : copy.totalLabel}</p>
        </div>
        {mode === 'perGame' ? (
          <p className="mono mt-1.5 text-[11px] text-[var(--color-muted)]">
            {formatPoints(total)} · {player.appearances} {copy.appsLabel}
          </p>
        ) : (
          <p className="mono mt-1.5 text-[11px] text-[var(--color-muted)]">
            {formatPoints(player.basePoints)} {copy.baseLabel}
            {cleanSheet > 0 ? <span className="text-[var(--color-accent)]"> · +{formatPoints(cleanSheet)} {copy.cleanSheetLabel}</span> : null}
          </p>
        )}
      </div>

      <div className="flex gap-2 text-[11px] text-[var(--color-muted)]">
        <span>
          <span className="font-bold text-white">{player.appearances}</span> {copy.appsLabel}
        </span>
        <span className="text-white/20">|</span>
        <span>
          <span className="font-bold text-white">{player.goals}</span> G
        </span>
        <span className="text-white/20">|</span>
        <span>
          <span className="font-bold text-white">{player.assists}</span> A
        </span>
      </div>
    </article>
  )
}

export function PlayerPointsPanel({ locale }: { locale: LocaleCode }) {
  const copy = getMessages(locale).playerPoints
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [payload, setPayload] = useState<PlayerPointsPayload | null>(null)
  const [position, setPosition] = useState<SlotClass>('GK')
  const [mode, setMode] = useState<PointsMode>('total')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [modalSeed, setModalSeed] = useState<PlayerStatsSeed | null>(null)

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
      .filter((player) => player.positionClasses.includes(position))
      .filter(
        (player) =>
          !normalizedQuery ||
          player.displayName.toLowerCase().includes(normalizedQuery) ||
          player.teamCode.toLowerCase().includes(normalizedQuery) ||
          String(player.playerId).includes(normalizedQuery),
      )
      .sort(
        (left, right) =>
          valueForMode(right, position, mode) - valueForMode(left, position, mode) ||
          right.basePoints - left.basePoints ||
          left.displayName.localeCompare(right.displayName),
      )
  }, [payload?.items, position, query, mode])

  const totalPages = Math.max(1, Math.ceil(ranked.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageItems = ranked.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  // Reset to the first page from the handlers (not an effect) to keep the set-state-in-effect lint clean.
  function selectPosition(next: SlotClass) {
    setPosition(next)
    setPage(1)
  }

  function search(next: string) {
    setQuery(next)
    setPage(1)
  }

  function selectMode(next: PointsMode) {
    setMode(next)
    setPage(1)
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.6fr)] lg:items-end">
        <p className="mono text-[11px] uppercase tracking-[0.14em] text-[var(--color-muted)]">
          {copy.rankedAs.replace('{position}', position)}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <StatTile label={copy.statPlayers} value={formatNumber(payload?.summary.playersRanked ?? 0)} tone="accent" />
          <StatTile label={copy.statFixtures} value={formatNumber(payload?.summary.fixturesCounted ?? 0)} tone="sand" />
        </div>
      </div>

      <section className="glass-panel rounded-[1.15rem] p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(10rem,1fr)_auto_auto] lg:items-center">
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
            {(['total', 'perGame'] as PointsMode[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => selectMode(option)}
                className={[
                  'rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] transition',
                  mode === option
                    ? 'bg-[var(--color-accent)] text-[var(--color-ink)]'
                    : 'text-[var(--color-muted)] hover:bg-white/7 hover:text-white',
                ].join(' ')}
              >
                {option === 'perGame' ? copy.perGameLabel : copy.totalLabel}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1 rounded-full border border-white/8 bg-black/18 p-1">
            {positions.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => selectPosition(filter)}
                className={[
                  'rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] transition',
                  position === filter
                    ? 'bg-[var(--color-accent)] text-[var(--color-ink)]'
                    : 'text-[var(--color-muted)] hover:bg-white/7 hover:text-white',
                ].join(' ')}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </section>

      {loadState === 'loading' ? (
        <section className="grid gap-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="skeleton h-24 rounded-[1rem]" />
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
          <section className="grid gap-3">
            {pageItems.map((player, index) => (
              <PlayerPointsRow
                key={player.playerId}
                player={player}
                rank={(currentPage - 1) * PAGE_SIZE + index + 1}
                position={position}
                mode={mode}
                copy={copy}
                onSelect={() => setModalSeed(toPlayerSeed(player))}
              />
            ))}
          </section>

          <p className="text-[11px] leading-relaxed text-[var(--color-muted)]">{copy.note}</p>

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

      {modalSeed ? <PlayerStatsModal seed={modalSeed} locale={locale} onClose={() => setModalSeed(null)} /> : null}
    </div>
  )
}
