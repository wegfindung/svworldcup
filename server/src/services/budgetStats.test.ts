import { describe, expect, it } from 'vitest'
import { buildBudgetStats } from './budgetStats.js'

describe('buildBudgetStats', () => {
  it('returns an empty payload for no rows', () => {
    expect(buildBudgetStats([])).toEqual({
      summary: { lockedManagerCount: 0, tierCount: 0 },
      items: [],
    })
  })

  it('groups managers by tier, counts them, and maps the tier multiplier', () => {
    const payload = buildBudgetStats([
      { budgetLimit: 3_000_000, totalScore: 100 },
      { budgetLimit: 3_000_000, totalScore: 200 },
      { budgetLimit: 1_500_000, totalScore: 90 },
    ])

    expect(payload.summary).toEqual({ lockedManagerCount: 3, tierCount: 2 })
    // Ascending tier order.
    expect(payload.items.map((row) => row.budgetLimit)).toEqual([1_500_000, 3_000_000])

    const cheap = payload.items.find((row) => row.budgetLimit === 1_500_000)!
    expect(cheap).toEqual({ budgetLimit: 1_500_000, scoreMultiplier: 1.5, managerCount: 1, averageScore: 90 })

    const neutral = payload.items.find((row) => row.budgetLimit === 3_000_000)!
    expect(neutral).toEqual({ budgetLimit: 3_000_000, scoreMultiplier: 1, managerCount: 2, averageScore: 150 })
  })

  it('averages the final totalScore and rounds to one decimal', () => {
    const [tier] = buildBudgetStats([
      { budgetLimit: 5_000_000, totalScore: 10 },
      { budgetLimit: 5_000_000, totalScore: 11 },
      { budgetLimit: 5_000_000, totalScore: 11 },
    ]).items
    // (10 + 11 + 11) / 3 = 10.6667 → 10.7
    expect(tier.averageScore).toBe(10.7)
  })

  it('counts zero-point managers (popularity is complete regardless of score)', () => {
    const payload = buildBudgetStats([
      { budgetLimit: 9_000_000, totalScore: 0 },
      { budgetLimit: 9_000_000, totalScore: 0 },
    ])
    const [tier] = payload.items
    expect(tier.managerCount).toBe(2)
    expect(tier.averageScore).toBe(0)
  })

  it('falls back to multiplier 1 for an unrecognised budget tier', () => {
    const [tier] = buildBudgetStats([{ budgetLimit: 7_000_000, totalScore: 50 }]).items
    expect(tier.scoreMultiplier).toBe(1)
  })
})
