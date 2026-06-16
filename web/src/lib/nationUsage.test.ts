import { describe, expect, it } from 'vitest'
import {
  aggregateNationPools,
  nationByParticipantFromRows,
  playersForRepresentedNation,
  representedNationOptions,
} from './nationUsage'
import type { ParticipantScoreRow, PublicSquadUsageManager, PublicSquadUsagePayload, PublicSquadUsagePlayer } from './types'

function manager(participantId: string, overrides: Partial<PublicSquadUsageManager> = {}): PublicSquadUsageManager {
  return {
    participantId,
    displayName: participantId,
    leagueType: 'rookie',
    profilePath: `/profiles/${participantId}`,
    slotKey: 'gk1',
    slotGroup: 'starter',
    slotClass: 'GK',
    ...overrides,
  }
}

function player(
  playerId: number,
  teamCode: string,
  managers: PublicSquadUsageManager[],
  overrides: Partial<PublicSquadUsagePlayer> = {},
): PublicSquadUsagePlayer {
  return {
    playerId,
    displayName: `Player ${playerId}`,
    teamCode,
    nationalityCode: teamCode,
    rating: 70,
    capCost: 50_000,
    positionMain: 'MID',
    positions: ['MID'],
    positionClasses: ['MID'],
    usageCount: managers.length,
    starterCount: managers.length,
    subCount: 0,
    presenceRate: 0,
    managers,
    ...overrides,
  }
}

function payload(items: PublicSquadUsagePlayer[]): PublicSquadUsagePayload {
  return {
    summary: {
      visibleSquadCount: 0,
      visibleManagerCount: 0,
      totalSelections: 0,
      uniquePlayerCount: items.length,
      averageSelectionsPerPlayer: 0,
    },
    items,
  }
}

function row(participantId: string, primaryTeamCode: string, secondaryTeamCode?: string): ParticipantScoreRow {
  return {
    participantId,
    displayName: participantId,
    leagueType: 'rookie',
    primaryTeamCode,
    secondaryTeamCode,
    totalScore: 0,
    baseScore: 0,
    bonusPercent: 0,
    scoreMultiplier: 1,
    breakdown: {
      goals: { count: 0, points: 0 },
      assists: { count: 0, points: 0 },
      appearances: { count: 0, points: 0 },
      minutes: { count: 0, points: 0 },
      cleanSheets: { count: 0, points: 0 },
      performance: { points: 0 },
    },
    fixtures: [],
    rank: 0,
  }
}

describe('aggregateNationPools', () => {
  it('groups by teamCode, sums picks, counts distinct players, and shares of all picks', () => {
    const data = payload([
      player(1, 'BRA', [manager('a'), manager('b')], { usageCount: 2 }),
      player(2, 'BRA', [manager('c')], { usageCount: 1 }),
      player(3, 'ARG', [manager('a')], { usageCount: 1 }),
    ])
    const rows = aggregateNationPools(data)
    expect(rows).toHaveLength(2)
    // BRA: 2 players, 3 picks (most-picked → first). ARG: 1 player, 1 pick.
    expect(rows[0]).toMatchObject({ teamCode: 'BRA', totalPicks: 3, distinctPlayers: 2 })
    expect(rows[0].share).toBeCloseTo(3 / 4, 5)
    expect(rows[1]).toMatchObject({ teamCode: 'ARG', totalPicks: 1, distinctPlayers: 1 })
    expect(rows[1].share).toBeCloseTo(1 / 4, 5)
  })

  it('returns an empty list for a null payload', () => {
    expect(aggregateNationPools(null)).toEqual([])
  })
})

describe('nationByParticipantFromRows', () => {
  it('merges rookie + veteran boards and keeps the first entry per participant', () => {
    const map = nationByParticipantFromRows([row('a', 'se', 'no')], [row('b', 'br'), row('a', 'dk')])
    expect(map.get('a')).toEqual({ primaryTeamCode: 'se', secondaryTeamCode: 'no' })
    expect(map.get('b')).toEqual({ primaryTeamCode: 'br', secondaryTeamCode: undefined })
    expect(map.size).toBe(2)
  })
})

describe('representedNationOptions', () => {
  it('counts a manager under both primary and secondary, sorted most-represented first', () => {
    const data = payload([player(1, 'BRA', [manager('a'), manager('b'), manager('c')])])
    const nations = nationByParticipantFromRows([row('a', 'se', 'no'), row('b', 'se'), row('c', 'no')])
    const options = representedNationOptions(data, nations)
    // se: a + b = 2. no: a + c = 2 (tie → alphabetical). Both nations represented.
    expect(options).toEqual([
      { code: 'no', managerCount: 2 },
      { code: 'se', managerCount: 2 },
    ])
  })
})

describe('playersForRepresentedNation', () => {
  it('ranks players by that nation’s pickers (primary OR secondary), share = pickers ÷ nation managers', () => {
    const data = payload([
      // p1 picked by a (se primary) and b (se secondary) → 2 Swedish pickers.
      player(1, 'BRA', [manager('a'), manager('b')]),
      // p2 picked by a and c; c is Norwegian, so only a counts for Sweden → 1 Swedish picker.
      player(2, 'ARG', [manager('a'), manager('c')]),
      // p3 picked only by c (Norway) → 0 Swedish pickers, filtered out.
      player(3, 'FRA', [manager('c')]),
    ])
    const nations = nationByParticipantFromRows([row('a', 'se'), row('b', 'no', 'se'), row('c', 'no')])
    const result = playersForRepresentedNation(data, nations, 'se')
    // Swedish managers = a, b → nationManagerCount 2.
    expect(result.nationManagerCount).toBe(2)
    expect(result.players.map((entry) => entry.player.playerId)).toEqual([1, 2])
    expect(result.players[0]).toMatchObject({ pickers: 2 })
    expect(result.players[0].share).toBeCloseTo(1, 5)
    expect(result.players[1]).toMatchObject({ pickers: 1 })
    expect(result.players[1].share).toBeCloseTo(0.5, 5)
  })

  it('returns nothing when no nation is selected', () => {
    const data = payload([player(1, 'BRA', [manager('a')])])
    const nations = nationByParticipantFromRows([row('a', 'se')])
    expect(playersForRepresentedNation(data, nations, undefined)).toEqual({ nationManagerCount: 0, players: [] })
  })
})
