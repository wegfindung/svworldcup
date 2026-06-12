import { getScoreMultiplierForBudget } from '../data/formation.js'
import type { BudgetStatRow, BudgetStatsPayload } from '../domain/types.js'

// Minimal shape needed to aggregate — every locked-participant score row carries both fields.
type BudgetRowInput = { budgetLimit: number; totalScore: number }

// Aggregate locked-participant score rows into per-budget-tier stats for the Stats → Budgets tab.
// `managerCount` drives the "most popular budget" table; `averageScore` (mean final totalScore, with the
// budget multiplier already applied) drives the "average points per budget" table. Rows are returned in
// ascending tier order; each client table re-sorts by the column it leads on. See SOP "Stats — Budget Stats".
export function buildBudgetStats(rows: ReadonlyArray<BudgetRowInput>): BudgetStatsPayload {
  const byTier = new Map<number, { count: number; total: number }>()
  for (const row of rows) {
    const tier = byTier.get(row.budgetLimit) ?? { count: 0, total: 0 }
    tier.count += 1
    tier.total += row.totalScore
    byTier.set(row.budgetLimit, tier)
  }

  const items: BudgetStatRow[] = [...byTier.entries()]
    .map(([budgetLimit, tier]) => ({
      budgetLimit,
      scoreMultiplier: getScoreMultiplierForBudget(budgetLimit),
      managerCount: tier.count,
      averageScore: tier.count ? Math.round((tier.total / tier.count) * 10) / 10 : 0,
    }))
    .sort((left, right) => left.budgetLimit - right.budgetLimit)

  return {
    summary: {
      lockedManagerCount: rows.length,
      tierCount: items.length,
    },
    items,
  }
}
