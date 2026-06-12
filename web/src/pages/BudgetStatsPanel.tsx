import { useEffect, useMemo, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { StatTile } from '../components/StatTile'
import { getMessages, type AppMessages } from '../i18n/messages'
import { fetchBudgetStats } from '../lib/api'
import type { BudgetStatRow, BudgetStatsPayload, LocaleCode } from '../lib/types'

type LoadState = 'loading' | 'ready' | 'error'
type BudgetsCopy = AppMessages['budgets']

function formatBudget(value: number) {
  return `${(value / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 1 })}M`
}

function formatMultiplier(value: number) {
  return `×${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

function formatPoints(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 1, minimumFractionDigits: value % 1 === 0 ? 0 : 1 })
}

function formatShare(count: number, total: number) {
  if (total <= 0) {
    return '0%'
  }
  return `${((count / total) * 100).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`
}

// A two-table read surface: how many locked squads chose each salary budget (popularity), and the average
// final score each budget has produced (multiplier already applied). Both tables read one payload — see
// SOP "Stats — Budget Stats".
export function BudgetStatsPanel({ locale }: { locale: LocaleCode }) {
  const copy = getMessages(locale).budgets
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [payload, setPayload] = useState<BudgetStatsPayload | null>(null)

  useEffect(() => {
    let active = true
    void fetchBudgetStats()
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

  const lockedManagers = payload?.summary.lockedManagerCount ?? 0

  // Table 1: popularity — most managers first. Table 2: production — highest average first.
  const byPopularity = useMemo(
    () => [...(payload?.items ?? [])].sort((left, right) => right.managerCount - left.managerCount || left.budgetLimit - right.budgetLimit),
    [payload?.items],
  )
  const byAverage = useMemo(
    () => [...(payload?.items ?? [])].sort((left, right) => right.averageScore - left.averageScore || right.managerCount - left.managerCount),
    [payload?.items],
  )

  if (loadState === 'loading') {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="skeleton h-72 rounded-[1.15rem]" />
        ))}
      </div>
    )
  }

  if (loadState === 'error') {
    return (
      <section className="glass-panel rounded-[1.15rem] p-5">
        <EmptyState title={copy.errorTitle} body={copy.errorBody} />
      </section>
    )
  }

  if (byPopularity.length === 0) {
    return (
      <section className="glass-panel rounded-[1.15rem] p-5">
        <EmptyState title={copy.emptyTitle} body={copy.emptyBody} />
      </section>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatTile label={copy.statManagers} value={lockedManagers.toLocaleString()} tone="accent" />
        <StatTile label={copy.statTiers} value={(payload?.summary.tierCount ?? 0).toLocaleString()} tone="sand" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BudgetTable
          title={copy.popularTitle}
          note={copy.popularNote}
          rows={byPopularity}
          copy={copy}
          lockedManagers={lockedManagers}
          metric="popularity"
        />
        <BudgetTable
          title={copy.averageTitle}
          note={copy.averageNote}
          rows={byAverage}
          copy={copy}
          lockedManagers={lockedManagers}
          metric="average"
        />
      </div>
    </div>
  )
}

function BudgetTable({
  title,
  note,
  rows,
  copy,
  lockedManagers,
  metric,
}: {
  title: string
  note: string
  rows: BudgetStatRow[]
  copy: BudgetsCopy
  lockedManagers: number
  metric: 'popularity' | 'average'
}) {
  return (
    <section className="glass-panel rounded-[1.15rem] p-4">
      <h3 className="text-lg font-bold text-white">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted)]">{note}</p>

      <div className="mono mt-4 grid grid-cols-[1fr_auto_auto] gap-x-3 border-b border-white/8 pb-2 text-[10px] uppercase tracking-[0.14em] text-[var(--color-muted)]">
        <span>{copy.budgetCol}</span>
        <span className="text-right">{copy.multiplierCol}</span>
        <span className="text-right">{metric === 'popularity' ? copy.managersCol : copy.avgPointsCol}</span>
      </div>

      <ol className="mt-1 divide-y divide-white/6">
        {rows.map((row) => (
          <li key={row.budgetLimit} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 py-2.5">
            <span className="text-sm font-semibold text-white">{formatBudget(row.budgetLimit)}</span>
            <span className="mono text-right text-xs text-[var(--color-muted)]">{formatMultiplier(row.scoreMultiplier)}</span>
            {metric === 'popularity' ? (
              <span className="text-right">
                <span className="mono text-sm font-bold text-[var(--color-accent)]">{row.managerCount.toLocaleString()}</span>
                <span className="mono ml-1.5 text-[10px] text-[var(--color-muted)]">{formatShare(row.managerCount, lockedManagers)}</span>
              </span>
            ) : (
              <span className="text-right">
                <span className="mono text-sm font-bold text-[var(--color-accent)]">{formatPoints(row.averageScore)}</span>
                <span className="mono ml-1.5 text-[10px] text-[var(--color-muted)]">
                  {row.managerCount.toLocaleString()} {copy.managersShort}
                </span>
              </span>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}
