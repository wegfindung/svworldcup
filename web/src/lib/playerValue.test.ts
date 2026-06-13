import { describe, expect, it } from 'vitest'
import { formatCost, totalForPosition, valueForMode, valuePerCost } from './playerValue'
import type { PlayerPointsPlayer, PlayerPointsCleanSheet, SlotClass } from './types'

function player(overrides: Partial<PlayerPointsPlayer> = {}): PlayerPointsPlayer {
  return {
    playerId: 1,
    displayName: 'Test Player',
    teamCode: 'BRA',
    nationalityCode: 'BRA',
    rating: 80,
    capCost: 57_506,
    positions: ['MID'],
    positionMain: 'MID',
    positionClasses: ['MID'],
    appearances: 3,
    minutes: 270,
    goals: 0,
    assists: 0,
    cleanSheets: 0,
    averageRating: 7,
    goalPoints: 0,
    assistPoints: 0,
    appearancePoints: 0,
    minutePoints: 0,
    performancePoints: 0,
    basePoints: 18,
    cleanSheetByPosition: [],
    ...overrides,
  }
}

const cs = (slotClass: SlotClass, points: number): PlayerPointsCleanSheet => ({ slotClass, points })

describe('valuePerCost', () => {
  it('is points per 100k of budget cost', () => {
    // 18 points at a cost of 57,506 → 18 / 57506 * 100000 ≈ 31.3 pts per 100k.
    expect(valuePerCost(18, 57_506)).toBeCloseTo(31.3, 1)
  })

  it('returns 0 for a zero or missing cost so a malformed row can never top the board', () => {
    expect(valuePerCost(50, 0)).toBe(0)
  })
})

describe('valueForMode', () => {
  it('ranks a cheap over-performer above an expensive star (the point of a value board)', () => {
    const gem = player({ playerId: 2, capCost: 9_288, basePoints: 12 }) // rating ~70
    const star = player({ playerId: 3, capCost: 886_002, basePoints: 30 }) // rating ~95
    expect(valueForMode(gem, 'MID', 'total')).toBeGreaterThan(valueForMode(star, 'MID', 'total'))
  })

  it('per-match divides the position total by appearances before costing it', () => {
    const p = player({ capCost: 100_000, basePoints: 18, appearances: 3 })
    // total mode: 18 / 100000 * 100000 = 18 ; per game: (18/3) / 100000 * 100000 = 6.
    expect(valueForMode(p, 'MID', 'total')).toBeCloseTo(18, 5)
    expect(valueForMode(p, 'MID', 'perGame')).toBeCloseTo(6, 5)
  })

  it('per-match is 0 when the player has no appearances', () => {
    const p = player({ appearances: 0, basePoints: 10 })
    expect(valueForMode(p, 'MID', 'perGame')).toBe(0)
  })

  it("folds the chosen position's clean sheet into the value, like the Points tab", () => {
    const keeper = player({
      positionClasses: ['GK'],
      basePoints: 8,
      capCost: 100_000,
      cleanSheetByPosition: [cs('GK', 4)],
    })
    expect(totalForPosition(keeper, 'GK')).toBe(12)
    // (8 + 4) / 100000 * 100000 = 12.
    expect(valueForMode(keeper, 'GK', 'total')).toBeCloseTo(12, 5)
  })
})

describe('formatCost', () => {
  it('renders compact budget costs', () => {
    // toLocaleString uses the runtime locale's decimal separator (e.g. "1,3k" on a sv machine), so normalise
    // to a dot before asserting — what we're testing is the k/M compaction and rounding, not the separator.
    const norm = (value: number) => formatCost(value).replace(',', '.')
    expect(norm(1_250)).toBe('1.3k')
    expect(norm(9_288)).toBe('9.3k')
    expect(norm(57_506)).toBe('57.5k')
    expect(norm(119_245)).toBe('119k')
    expect(norm(886_002)).toBe('886k')
    expect(norm(1_837_214)).toBe('1.8M')
    expect(norm(500)).toBe('500')
  })
})
