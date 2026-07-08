import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { EliminatedBadge } from '../components/EliminatedBadge'
import { EmptyState } from '../components/EmptyState'
import { PlayerPortrait } from '../components/PlayerPortrait'
import { PlayerStatsModal } from '../components/PlayerStatsModal'
import { StatTile } from '../components/StatTile'
import { TeamFlag } from '../components/TeamFlag'
import { getMessages, type AppMessages } from '../i18n/messages'
import { fetchPlayerPoints, fetchSquadUsage } from '../lib/api'
import { formatCost } from '../lib/playerValue'
import { toPlayerSeed, type PlayerStatsSeed } from '../lib/playerStatsSeed'
import { buildBestSquads, buildPeoplesSquads, type SquadBoard, type SquadTier } from '../lib/squadOptimizer'
import type { LocaleCode, SlotClass } from '../lib/types'

type LoadState = 'loading' | 'ready' | 'error'
type View = 'people' | 'best'
type BestXICopy = AppMessages['bestXI']

const POSITION_ORDER: SlotClass[] = ['GK', 'DEF', 'MID', 'FWD']
const DEFAULT_BUDGET = 3_000_000

function formatPoints(value: number) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
  })
}

function formatNumber(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: value % 1 === 0 ? 0 : 2 })
}

// The headline metric a tier is compared by: final score (Best squad) or total picks (People's XI).
function tierMetric(tier: SquadTier, kind: View) {
  return kind === 'best' ? tier.finalScore ?? 0 : tier.total
}

function SquadCard({
  imageUrl,
  name,
  teamCode,
  primary,
  secondary,
  badge,
  locale,
  onClick,
}: {
  imageUrl?: string
  name: string
  teamCode: string
  primary: string
  secondary: string
  badge?: string
  locale: LocaleCode
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-[0.9rem] border border-white/8 bg-black/18 p-2.5 text-left transition hover:border-[var(--color-accent)]/28 hover:bg-white/5"
    >
      <PlayerPortrait
        src={imageUrl ?? '/placeholders/player.svg'}
        alt={name}
        width={44}
        height={44}
        className="h-11 w-11 shrink-0 rounded-lg border border-white/10 object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{name}</p>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[var(--color-muted)]">
          <TeamFlag teamCode={teamCode} label={teamCode} size="sm" />
          <EliminatedBadge teamCode={teamCode} locale={locale} />
          {badge ? (
            <span className="mono rounded-full border border-white/12 px-1.5 text-[9px] uppercase tracking-[0.12em] text-[var(--color-muted)]">
              {badge}
            </span>
          ) : null}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-base font-black leading-none text-[var(--color-accent)]">{primary}</p>
        <p className="mono mt-1 text-[10px] uppercase tracking-[0.12em] text-[var(--color-muted)]">{secondary}</p>
      </div>
    </button>
  )
}

function PositionGroup({ slotClass, children }: { slotClass: SlotClass; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">{slotClass}</p>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
    </div>
  )
}

function SquadBoardView({
  board,
  kind,
  loadState,
  copy,
  emptyTitle,
  emptyBody,
  locale,
  onSelect,
}: {
  board: SquadBoard
  kind: View
  loadState: LoadState
  copy: BestXICopy
  emptyTitle: string
  emptyBody: string
  locale: LocaleCode
  onSelect: (seed: PlayerStatsSeed) => void
}) {
  const [budget, setBudget] = useState(DEFAULT_BUDGET)
  const dropdownRef = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const node = dropdownRef.current
      if (node?.open && !node.contains(event.target as Node)) {
        node.removeAttribute('open')
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  const tier = board.find((entry) => entry.budgetLimit === budget) ?? board[0] ?? null
  const bestTier = useMemo(
    () => board.reduce<SquadTier | null>((best, entry) => (!best || tierMetric(entry, kind) > tierMetric(best, kind) ? entry : best), null),
    [board, kind],
  )
  const slotsByClass = useMemo(() => {
    const groups: Record<SlotClass, SquadTier['slots']> = { GK: [], DEF: [], MID: [], FWD: [] }
    for (const slot of tier?.slots ?? []) {
      groups[slot.slotClass].push(slot)
    }
    return groups
  }, [tier])

  if (loadState === 'loading') {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="skeleton h-16 rounded-[0.9rem]" />
        ))}
      </div>
    )
  }
  if (loadState === 'error') {
    return <EmptyState title={copy.errorTitle} body={copy.errorBody} />
  }
  if (!tier || tier.filledSlots === 0) {
    return <EmptyState title={emptyTitle} body={emptyBody} />
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <p className="max-w-[60ch] text-sm leading-relaxed text-[var(--color-muted)]">
          {kind === 'best' ? copy.bestBody : copy.peoplesBody}
        </p>
        <details ref={dropdownRef} className="nav-disclosure group relative justify-self-start lg:justify-self-end">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-white/10 bg-black/24 py-2.5 pl-4 pr-4 text-sm font-semibold text-white transition hover:border-[var(--color-accent)]/45">
            <span className="text-[var(--color-muted)]">{copy.budgetLabel}:</span>
            <span>{formatCost(tier.budgetLimit)}{kind === 'best' ? ` · ×${tier.scoreMultiplier}` : ''}</span>
            <svg viewBox="0 0 20 20" aria-hidden="true" className="ml-1.5 h-3.5 w-3.5 text-[var(--color-accent)] transition group-open:rotate-180">
              <path d="M5 7.5 10 12.5 15 7.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </summary>
          <div className="absolute right-0 top-[calc(100%+0.55rem)] z-30 grid max-h-72 min-w-48 gap-1 overflow-auto rounded-[1rem] border border-white/10 bg-[rgba(7,16,14,0.98)] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_28px_70px_-38px_rgba(0,0,0,0.96)]">
            {board.map((entry) => (
              <button
                key={entry.budgetLimit}
                type="button"
                onClick={(event) => {
                  setBudget(entry.budgetLimit)
                  event.currentTarget.closest('details')?.removeAttribute('open')
                }}
                className={[
                  'flex items-center justify-between gap-3 rounded-[0.75rem] px-3 py-2 text-left text-sm font-semibold',
                  entry.budgetLimit === tier.budgetLimit
                    ? 'bg-white/10 text-white'
                    : 'text-[var(--color-muted)] hover:bg-white/7 hover:text-white active:scale-[0.98]',
                ].join(' ')}
              >
                <span>{formatCost(entry.budgetLimit)}{kind === 'best' ? ` · ×${entry.scoreMultiplier}` : ''}</span>
                <span className="mono text-[11px] text-[var(--color-accent)]">{formatPoints(tierMetric(entry, kind))}</span>
              </button>
            ))}
          </div>
        </details>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kind === 'best' ? (
          <>
            <StatTile label={copy.baseLabel} value={formatPoints(tier.total)} tone="sand" />
            <StatTile label={copy.finalLabel} value={formatPoints(tier.finalScore ?? 0)} tone="accent" />
            <StatTile label={copy.spentLabel} value={`${formatCost(tier.budgetUsed)} / ${formatCost(tier.budgetLimit)}`} />
            <StatTile
              label={copy.topBudgetLabel}
              value={bestTier ? `${formatCost(bestTier.budgetLimit)} · ×${bestTier.scoreMultiplier}` : '—'}
            />
          </>
        ) : (
          <>
            <StatTile label={copy.totalPicksLabel} value={formatNumber(tier.total)} tone="accent" />
            <StatTile label={copy.spentLabel} value={`${formatCost(tier.budgetUsed)} / ${formatCost(tier.budgetLimit)}`} tone="sand" />
          </>
        )}
      </div>

      {!tier.complete ? (
        <p className="rounded-[0.9rem] border border-[var(--color-accent)]/22 bg-[var(--color-accent)]/8 px-4 py-2.5 text-[12px] leading-relaxed text-[var(--color-muted)]">
          {copy.partialNote}
        </p>
      ) : null}

      <div className="grid gap-5">
        {POSITION_ORDER.map((slotClass) => (
          <PositionGroup key={slotClass} slotClass={slotClass}>
            {slotsByClass[slotClass].map((slot, index) =>
              slot.player ? (
                <SquadCard
                  key={slot.player.playerId}
                  imageUrl={slot.player.imageUrl}
                  name={slot.player.displayName}
                  teamCode={slot.player.teamCode}
                  primary={kind === 'best' ? formatPoints(slot.player.effectivePoints ?? 0) : formatNumber(slot.player.usageCount ?? 0)}
                  secondary={kind === 'best' ? formatCost(slot.player.capCost) : `${formatCost(slot.player.capCost)} · ${slot.player.usageCount ?? 0} ${copy.squadsLabel}`}
                  badge={slot.slotGroup === 'sub' ? copy.benchLabel : undefined}
                  locale={locale}
                  onClick={() => onSelect(toPlayerSeed(slot.player!))}
                />
              ) : (
                <div
                  key={`${slotClass}-empty-${index}`}
                  className="flex h-[4.25rem] items-center justify-center rounded-[0.9rem] border border-dashed border-white/12 bg-black/10 text-[11px] text-[var(--color-muted)]"
                >
                  {slot.slotGroup === 'sub' ? copy.benchLabel : slot.slotClass}
                </div>
              ),
            )}
          </PositionGroup>
        ))}
      </div>

      <p className="text-[11px] leading-relaxed text-[var(--color-muted)]">{kind === 'best' ? copy.note : copy.peoplesNote}</p>
    </div>
  )
}

export function BestXIPanel({ locale }: { locale: LocaleCode }) {
  const copy = getMessages(locale).bestXI
  const [view, setView] = useState<View>('people')
  const [usageState, setUsageState] = useState<LoadState>('loading')
  const [peoplesBoard, setPeoplesBoard] = useState<SquadBoard>([])
  const [pointsState, setPointsState] = useState<LoadState>('loading')
  const [bestBoard, setBestBoard] = useState<SquadBoard>([])
  const [modalSeed, setModalSeed] = useState<PlayerStatsSeed | null>(null)

  useEffect(() => {
    let active = true
    void fetchSquadUsage()
      .then((response) => {
        if (active) {
          setPeoplesBoard(buildPeoplesSquads(response.items))
          setUsageState('ready')
        }
      })
      .catch(() => {
        if (active) setUsageState('error')
      })
    void fetchPlayerPoints()
      .then((response) => {
        if (active) {
          setBestBoard(buildBestSquads(response.items))
          setPointsState('ready')
        }
      })
      .catch(() => {
        if (active) setPointsState('error')
      })
    return () => {
      active = false
    }
  }, [])

  const subTabs: Array<{ key: View; label: string }> = [
    { key: 'people', label: copy.peoplesTab },
    { key: 'best', label: copy.bestTab },
  ]

  return (
    <div className="space-y-4">
      <section className="glass-panel allow-dropdown-overflow relative z-20 rounded-[1.15rem] p-5">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-black text-white">{view === 'best' ? copy.bestTitle : copy.peoplesTitle}</h3>
          <div className="inline-flex gap-1 rounded-full border border-white/8 bg-black/18 p-1">
            {subTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setView(tab.key)}
                className={[
                  'rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] transition',
                  view === tab.key
                    ? 'bg-[var(--color-accent)] text-[var(--color-ink)]'
                    : 'text-[var(--color-muted)] hover:bg-white/7 hover:text-white',
                ].join(' ')}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        {view === 'people' ? (
          <SquadBoardView
            board={peoplesBoard}
            kind="people"
            loadState={usageState}
            copy={copy}
            emptyTitle={copy.peoplesEmptyTitle}
            emptyBody={copy.peoplesEmptyBody}
            locale={locale}
            onSelect={setModalSeed}
          />
        ) : (
          <SquadBoardView
            board={bestBoard}
            kind="best"
            loadState={pointsState}
            copy={copy}
            emptyTitle={copy.bestTitle}
            emptyBody={copy.partialNote}
            locale={locale}
            onSelect={setModalSeed}
          />
        )}
      </section>

      {modalSeed ? <PlayerStatsModal seed={modalSeed} locale={locale} onClose={() => setModalSeed(null)} /> : null}
    </div>
  )
}
