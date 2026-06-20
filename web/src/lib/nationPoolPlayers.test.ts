import { describe, expect, it } from 'vitest'
import { nationPoolPlayers, sortNationPoolPlayers } from './nationPoolPlayers'
import type { PlayerPointsPayload, PlayerPointsPlayer } from './types'

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

function payload(...players: PlayerPointsPlayer[]): PlayerPointsPayload {
  return { summary: { fixturesCounted: 0, playersRanked: players.length }, items: players }
}

describe('nationPoolPlayers', () => {
  it('keeps only the nation’s players that have scored points', () => {
    const data = payload(
      player({ playerId: 1, teamCode: 'BRA', basePoints: 12 }),
      player({ playerId: 2, teamCode: 'BRA', basePoints: 0 }), // featured 0 mins / no points → excluded
      player({ playerId: 3, teamCode: 'FRA', basePoints: 9 }), // other nation → excluded
    )
    const result = nationPoolPlayers(data, 'BRA')
    expect(result.map((entry) => entry.playerId)).toEqual([1])
  })

  it('returns nothing for a null payload', () => {
    expect(nationPoolPlayers(null, 'BRA')).toEqual([])
  })
})

describe('sortNationPoolPlayers', () => {
  const players = [
    player({ playerId: 1, teamCode: 'BRA', goals: 1, assists: 4, basePoints: 16 }),
    player({ playerId: 2, teamCode: 'BRA', goals: 3, assists: 0, basePoints: 17 }),
    player({ playerId: 3, teamCode: 'BRA', goals: 0, assists: 1, basePoints: 5 }),
  ]

  it('sorts by total points descending by default', () => {
    expect(sortNationPoolPlayers(players, 'points', 'desc').map((p) => p.playerId)).toEqual([2, 1, 3])
  })

  it('re-sorts by another column and respects direction', () => {
    expect(sortNationPoolPlayers(players, 'goals', 'desc').map((p) => p.playerId)).toEqual([2, 1, 3])
    expect(sortNationPoolPlayers(players, 'assists', 'desc').map((p) => p.playerId)).toEqual([1, 3, 2])
    expect(sortNationPoolPlayers(players, 'goals', 'asc').map((p) => p.playerId)).toEqual([3, 1, 2])
  })

  it('breaks ties by points then name so the order is stable', () => {
    const tied = [
      player({ playerId: 10, teamCode: 'BRA', displayName: 'Zoe', goals: 2, basePoints: 8 }),
      player({ playerId: 11, teamCode: 'BRA', displayName: 'Ana', goals: 2, basePoints: 8 }),
    ]
    // Equal goals + equal points → alphabetical by name.
    expect(sortNationPoolPlayers(tied, 'goals', 'desc').map((p) => p.displayName)).toEqual(['Ana', 'Zoe'])
  })
})
