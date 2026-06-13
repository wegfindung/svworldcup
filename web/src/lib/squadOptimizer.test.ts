import { describe, expect, it } from 'vitest'
import { buildBestSquads, buildPeoplesSquads, type SquadBoard } from './squadOptimizer'
import type { PlayerPointsPlayer, PublicSquadUsagePlayer, SlotClass } from './types'

let nextId = 0

function pointsPlayer(slotClass: SlotClass, basePoints: number, opts: { capCost?: number; teamCode?: string } = {}): PlayerPointsPlayer {
  nextId += 1
  const id = nextId
  return {
    playerId: id,
    displayName: `P${id}`,
    teamCode: opts.teamCode ?? `T${id}`,
    nationalityCode: opts.teamCode ?? `T${id}`,
    rating: 70,
    capCost: opts.capCost ?? 100_000,
    positions: [slotClass],
    positionMain: slotClass,
    positionClasses: [slotClass],
    appearances: 1,
    minutes: 90,
    goals: 0,
    assists: 0,
    cleanSheets: 0,
    averageRating: 0,
    goalPoints: 0,
    assistPoints: 0,
    appearancePoints: 0,
    minutePoints: 0,
    performancePoints: 0,
    basePoints,
    cleanSheetByPosition: [{ slotClass, points: 0 }],
  }
}

function usagePlayer(slotClass: SlotClass, usageCount: number, opts: { capCost?: number; teamCode?: string } = {}): PublicSquadUsagePlayer {
  nextId += 1
  const id = nextId
  return {
    playerId: id,
    displayName: `U${id}`,
    teamCode: opts.teamCode ?? `T${id}`,
    nationalityCode: opts.teamCode ?? `T${id}`,
    rating: 70,
    capCost: opts.capCost ?? 100_000,
    positions: [slotClass],
    positionMain: slotClass,
    positionClasses: [slotClass],
    usageCount,
    starterCount: usageCount,
    subCount: 0,
    presenceRate: usageCount,
    managers: [],
  }
}

const SLOT_CLASS_COUNTS: Record<SlotClass, number> = { GK: 2, DEF: 5, MID: 4, FWD: 4 }

function tierAt(board: SquadBoard, budgetLimit: number) {
  return board.find((tier) => tier.budgetLimit === budgetLimit)!
}

function subPlayer(tier: SquadBoard[number], slotClass: SlotClass) {
  return tier.slots.find((slot) => slot.slotClass === slotClass && slot.slotGroup === 'sub')?.player ?? null
}

function assertLegal(board: SquadBoard) {
  for (const tier of board) {
    expect(tier.slots).toHaveLength(15)
    const filled = tier.slots.filter((slot) => slot.player)
    const ids = filled.map((slot) => slot.player!.playerId)
    expect(new Set(ids).size).toBe(ids.length) // distinct

    const classCounts: Record<SlotClass, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 }
    const nationCounts = new Map<string, number>()
    for (const slot of tier.slots) {
      classCounts[slot.slotClass] += 1
      if (slot.player) {
        expect(slot.player.positionClasses).toContain(slot.slotClass)
        nationCounts.set(slot.player.teamCode, (nationCounts.get(slot.player.teamCode) ?? 0) + 1)
      }
    }
    expect(classCounts).toEqual(SLOT_CLASS_COUNTS)
    for (const count of nationCounts.values()) {
      expect(count).toBeLessThanOrEqual(4)
    }
    expect(tier.budgetUsed).toBeLessThanOrEqual(tier.budgetLimit)
  }
}

describe('buildBestSquads', () => {
  const pool = [
    pointsPlayer('GK', 60), pointsPlayer('GK', 30), pointsPlayer('GK', 10),
    pointsPlayer('DEF', 50), pointsPlayer('DEF', 40), pointsPlayer('DEF', 30), pointsPlayer('DEF', 20), pointsPlayer('DEF', 10), pointsPlayer('DEF', 5),
    pointsPlayer('MID', 45), pointsPlayer('MID', 35), pointsPlayer('MID', 25), pointsPlayer('MID', 15), pointsPlayer('MID', 8),
    pointsPlayer('FWD', 55), pointsPlayer('FWD', 45), pointsPlayer('FWD', 25), pointsPlayer('FWD', 12), pointsPlayer('FWD', 6),
  ]

  it('finds the hand-checked optimum and applies the tier multiplier (best in starters, weakest benched)', () => {
    const top = tierAt(buildBestSquads(pool), 9_000_000)
    expect(top.complete).toBe(true)
    // 60+0.5*30 ; 50+40+30+20+0.5*10 ; 45+35+25+0.5*15 ; 55+45+25+0.5*12 = 463.5
    expect(top.total).toBeCloseTo(463.5, 6)
    expect(top.finalScore).toBeCloseTo(463.5 * 0.2, 6)
    expect(subPlayer(top, 'GK')?.basePoints).toBe(30)
    expect(subPlayer(top, 'DEF')?.basePoints).toBe(10)
    expect(subPlayer(top, 'FWD')?.basePoints).toBe(12)
  })

  it('returns a legal squad for every tier', () => {
    const board = buildBestSquads(pool)
    expect(board).toHaveLength(12)
    assertLegal(board)
  })
})

describe('buildPeoplesSquads', () => {
  it('selects the most-picked legal squad within budget, benching the least-picked of each position', () => {
    const pool = [
      usagePlayer('GK', 60), usagePlayer('GK', 30), usagePlayer('GK', 10),
      usagePlayer('DEF', 50), usagePlayer('DEF', 40), usagePlayer('DEF', 30), usagePlayer('DEF', 20), usagePlayer('DEF', 10), usagePlayer('DEF', 5),
      usagePlayer('MID', 45), usagePlayer('MID', 35), usagePlayer('MID', 25), usagePlayer('MID', 15), usagePlayer('MID', 8),
      usagePlayer('FWD', 55), usagePlayer('FWD', 45), usagePlayer('FWD', 25), usagePlayer('FWD', 12), usagePlayer('FWD', 6),
    ]
    const top = tierAt(buildPeoplesSquads(pool), 9_000_000)
    expect(top.complete).toBe(true)
    // Picks are not halved: 90 + 150 + 120 + 137 = 497.
    expect(top.total).toBe(497)
    expect(top.finalScore).toBeUndefined()
    expect(subPlayer(top, 'GK')?.usageCount).toBe(30)
    expect(subPlayer(top, 'DEF')?.usageCount).toBe(10)
    expect(subPlayer(top, 'MID')?.usageCount).toBe(15)
    expect(subPlayer(top, 'FWD')?.usageCount).toBe(12)
  })

  it('drops a popular player who would not fit the budget and stays legal', () => {
    // 15 players at 200k each cost 3.0M, so the 1.5M tier fits at most 7 (1.4M).
    const pool = [
      usagePlayer('GK', 60, { capCost: 200_000 }), usagePlayer('GK', 30, { capCost: 200_000 }), usagePlayer('GK', 10, { capCost: 200_000 }),
      usagePlayer('DEF', 50, { capCost: 200_000 }), usagePlayer('DEF', 40, { capCost: 200_000 }), usagePlayer('DEF', 30, { capCost: 200_000 }), usagePlayer('DEF', 20, { capCost: 200_000 }), usagePlayer('DEF', 10, { capCost: 200_000 }), usagePlayer('DEF', 5, { capCost: 200_000 }),
      usagePlayer('MID', 45, { capCost: 200_000 }), usagePlayer('MID', 35, { capCost: 200_000 }), usagePlayer('MID', 25, { capCost: 200_000 }), usagePlayer('MID', 15, { capCost: 200_000 }),
      usagePlayer('FWD', 55, { capCost: 200_000 }), usagePlayer('FWD', 45, { capCost: 200_000 }), usagePlayer('FWD', 25, { capCost: 200_000 }), usagePlayer('FWD', 12, { capCost: 200_000 }),
    ]
    const board = buildPeoplesSquads(pool)
    const low = tierAt(board, 1_500_000)
    expect(low.complete).toBe(false)
    expect(low.filledSlots).toBe(7)
    expect(low.budgetUsed).toBe(1_400_000)
    assertLegal(board)
  })

  it('honours the max-4-per-nation cap when one nation is the most picked', () => {
    const pool = [
      ...Array.from({ length: 8 }, () => usagePlayer('DEF', 100, { teamCode: 'AAA', capCost: 50_000 })),
      usagePlayer('GK', 20), usagePlayer('GK', 18),
      usagePlayer('DEF', 15), usagePlayer('DEF', 14), usagePlayer('DEF', 13),
      usagePlayer('MID', 12), usagePlayer('MID', 11), usagePlayer('MID', 10), usagePlayer('MID', 9),
      usagePlayer('FWD', 12), usagePlayer('FWD', 11), usagePlayer('FWD', 10), usagePlayer('FWD', 9),
    ]
    const top = tierAt(buildPeoplesSquads(pool), 9_000_000)
    const aaa = top.slots.filter((slot) => slot.player?.teamCode === 'AAA').length
    expect(aaa).toBe(4)
  })
})
