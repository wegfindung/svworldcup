import { describe, expect, it } from 'vitest'
import { pointsMetricValue, topBoostLeaders, topPointsLeaders } from './tournamentLeaders'
import type { BoostLeaderboardRow, PlayerPointsPlayer } from './types'

function player(overrides: Partial<PlayerPointsPlayer> & { playerId: number; teamCode: string }): PlayerPointsPlayer {
  return {
    displayName: `Player ${overrides.playerId}`,
    nationalityCode: overrides.teamCode,
    rating: 70,
    capCost: 1000,
    positionMain: 'ST',
    positions: ['ST'],
    positionClasses: ['FWD'],
    appearances: 1,
    minutes: 90,
    goals: 0,
    assists: 0,
    cleanSheets: 0,
    averageRating: 6,
    goalPoints: 0,
    assistPoints: 0,
    appearancePoints: 1,
    minutePoints: 1,
    performancePoints: 0,
    basePoints: 2,
    cleanSheetByPosition: [],
    ...overrides,
  }
}

function boostRow(overrides: Partial<BoostLeaderboardRow> & { playerId: number; totalNetShares: number }): BoostLeaderboardRow {
  return {
    displayName: `Player ${overrides.playerId}`,
    teamCode: 'BRA',
    nationalityCode: 'BRA',
    rating: 80,
    capCost: 5000,
    positionMain: 'ST',
    positions: ['ST'],
    positionClasses: ['FWD'],
    managerCount: 1,
    combinedBonusPercent: 1,
    managers: [],
    ...overrides,
  }
}

describe('topPointsLeaders', () => {
  it('ranks by the chosen metric, desc, dropping zeros', () => {
    const players = [
      player({ playerId: 1, teamCode: 'BRA', goals: 3 }),
      player({ playerId: 2, teamCode: 'FRA', goals: 5 }),
      player({ playerId: 3, teamCode: 'ESP', goals: 0 }), // dropped
    ]
    expect(topPointsLeaders(players, 'goals', 7).map((p) => p.playerId)).toEqual([2, 1])
  })

  it('ranks points by squad-independent base points', () => {
    const players = [
      player({ playerId: 1, teamCode: 'BRA', basePoints: 12 }),
      player({ playerId: 2, teamCode: 'FRA', basePoints: 31 }),
      player({ playerId: 3, teamCode: 'ESP', basePoints: 0 }), // dropped
    ]
    expect(topPointsLeaders(players, 'points', 7).map((p) => p.playerId)).toEqual([2, 1])
  })

  it('clean-sheet board excludes positions that earn no clean-sheet points', () => {
    const keeper = player({ playerId: 1, teamCode: 'BRA', cleanSheets: 2, positionMain: 'GK', positions: ['GK'], positionClasses: ['GK'] })
    const forward = player({ playerId: 2, teamCode: 'FRA', cleanSheets: 3 }) // FWD → no CS points → excluded
    expect(topPointsLeaders([keeper, forward], 'cleanSheets', 7).map((p) => p.playerId)).toEqual([1])
  })

  it('average board keeps only rated players and slices to the limit', () => {
    const players = [
      player({ playerId: 1, teamCode: 'BRA', averageRating: 7.1 }),
      player({ playerId: 2, teamCode: 'FRA', averageRating: 8.4 }),
      player({ playerId: 3, teamCode: 'ESP', averageRating: 6.9 }),
      player({ playerId: 4, teamCode: 'ARG', averageRating: 0 }), // unrated → dropped
    ]
    const top2 = topPointsLeaders(players, 'average', 2)
    expect(top2.map((p) => p.playerId)).toEqual([2, 1])
    expect(top2).toHaveLength(2)
  })

  it('pointsMetricValue reads the right field', () => {
    const p = player({ playerId: 1, teamCode: 'BRA', goals: 2, assists: 4, basePoints: 9, averageRating: 7.5 })
    expect(pointsMetricValue(p, 'goals')).toBe(2)
    expect(pointsMetricValue(p, 'assists')).toBe(4)
    expect(pointsMetricValue(p, 'points')).toBe(9)
    expect(pointsMetricValue(p, 'average')).toBe(7.5)
  })
})

describe('topBoostLeaders', () => {
  it('ranks by total net shares, desc, dropping zeros', () => {
    const rows = [
      boostRow({ playerId: 1, totalNetShares: 40 }),
      boostRow({ playerId: 2, totalNetShares: 100 }),
      boostRow({ playerId: 3, totalNetShares: 0 }), // dropped
    ]
    expect(topBoostLeaders(rows, 7).map((r) => r.playerId)).toEqual([2, 1])
  })
})
