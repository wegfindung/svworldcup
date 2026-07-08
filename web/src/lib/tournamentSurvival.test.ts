import { describe, expect, it } from 'vitest'
import {
  computeSurvival,
  isTeamEliminated,
  rankManagerSurvival,
  survivingCount,
  teamCodesByParticipant,
} from './tournamentSurvival'
import type { PublicFixtureResult, PublicSquadUsagePayload } from './types'

function fixture(
  groupKey: string,
  homeTeamCode: string,
  awayTeamCode: string,
  overrides: Partial<PublicFixtureResult> = {},
): PublicFixtureResult {
  return {
    fixtureId: `${groupKey}-${homeTeamCode}-${awayTeamCode}`,
    groupKey,
    kickoffDate: '2026-07-07',
    kickoffTimeUtc: '20:00:00',
    homeTeamCode,
    awayTeamCode,
    homeGoals: null,
    awayGoals: null,
    status: 'pending',
    entryCount: 0,
    homePlayers: [],
    awayPlayers: [],
    ...overrides,
  }
}

describe('computeSurvival', () => {
  it('keeps knockout teams alive and drops the loser of a decided fixture', () => {
    const survival = computeSurvival([
      fixture('R16', 'BRA', 'JPN', { homeGoals: 2, awayGoals: 0, status: 'final' }),
      fixture('R16', 'SUI', 'COL'), // pending — both stay alive
    ])
    expect(survival.hasKnockoutStarted).toBe(true)
    expect([...survival.aliveTeams].sort()).toEqual(['BRA', 'COL', 'SUI'])
  })

  it('advances the penalty-shootout winner when a knockout fixture finishes level', () => {
    const survival = computeSurvival([
      fixture('R16', 'ARG', 'EGY', { homeGoals: 1, awayGoals: 1, status: 'final', penaltyWinnerTeamCode: 'ARG' }),
    ])
    expect(survival.aliveTeams.has('ARG')).toBe(true)
    expect(survival.aliveTeams.has('EGY')).toBe(false)
  })

  it('leaves both teams alive when a level knockout fixture has no recorded penalty winner', () => {
    const survival = computeSurvival([fixture('R16', 'ARG', 'EGY', { homeGoals: 1, awayGoals: 1, status: 'final' })])
    expect(survival.aliveTeams.has('ARG')).toBe(true)
    expect(survival.aliveTeams.has('EGY')).toBe(true)
  })

  it('is dormant before the knockout stage (group fixtures only)', () => {
    const survival = computeSurvival([fixture('A', 'MEX', 'RSA', { homeGoals: 1, awayGoals: 0, status: 'final' })])
    expect(survival.hasKnockoutStarted).toBe(false)
    expect(survival.aliveTeams.size).toBe(0)
  })
})

describe('isTeamEliminated', () => {
  const survival = computeSurvival([fixture('R16', 'BRA', 'JPN', { homeGoals: 2, awayGoals: 0, status: 'final' })])

  it('marks a decided loser out and an advancing team in', () => {
    expect(isTeamEliminated(survival, 'JPN')).toBe(true)
    expect(isTeamEliminated(survival, 'BRA')).toBe(false)
  })

  it('marks a real team absent from the knockout data as out (group non-qualifier)', () => {
    expect(isTeamEliminated(survival, 'GER')).toBe(true)
  })

  it('never marks a non-tournament code, a null survival, or the pre-knockout state', () => {
    expect(isTeamEliminated(survival, 'ZZZ')).toBe(false)
    expect(isTeamEliminated(null, 'JPN')).toBe(false)
    const dormant = computeSurvival([fixture('A', 'MEX', 'RSA')])
    expect(isTeamEliminated(dormant, 'JPN')).toBe(false)
  })
})

describe('teamCodesByParticipant + survivingCount', () => {
  const usage: PublicSquadUsagePayload = {
    summary: { visibleSquadCount: 2, visibleManagerCount: 2, totalSelections: 3, uniquePlayerCount: 2, averageSelectionsPerPlayer: 1.5 },
    items: [
      {
        playerId: 1, displayName: 'Neymar', teamCode: 'BRA', nationalityCode: 'br', rating: 90, capCost: 100,
        positions: ['FW'], positionClasses: ['FWD'], usageCount: 2, starterCount: 2, subCount: 0, presenceRate: 1,
        managers: [
          { participantId: 'p1', displayName: 'P1', leagueType: 'rookie', profilePath: '/p/1', slotKey: 'fwd1', slotGroup: 'starter', slotClass: 'FWD' },
          { participantId: 'p2', displayName: 'P2', leagueType: 'rookie', profilePath: '/p/2', slotKey: 'fwd1', slotGroup: 'starter', slotClass: 'FWD' },
        ],
      },
      {
        playerId: 2, displayName: 'Endo', teamCode: 'JPN', nationalityCode: 'jp', rating: 80, capCost: 50,
        positions: ['MF'], positionClasses: ['MID'], usageCount: 1, starterCount: 1, subCount: 0, presenceRate: 0.5,
        managers: [
          { participantId: 'p1', displayName: 'P1', leagueType: 'rookie', profilePath: '/p/1', slotKey: 'mid1', slotGroup: 'starter', slotClass: 'MID' },
        ],
      },
    ],
  }

  it('inverts usage into per-participant team codes', () => {
    const map = teamCodesByParticipant(usage)
    expect(map.get('p1')).toEqual(['BRA', 'JPN'])
    expect(map.get('p2')).toEqual(['BRA'])
  })

  it('counts surviving players, returns null for an uncovered manager', () => {
    const map = teamCodesByParticipant(usage)
    const survival = computeSurvival([fixture('R16', 'BRA', 'JPN', { homeGoals: 2, awayGoals: 0, status: 'final' })])
    expect(survivingCount(map, survival, 'p1')).toEqual({ remaining: 1, total: 2 }) // JPN out, BRA in
    expect(survivingCount(map, survival, 'p2')).toEqual({ remaining: 1, total: 1 })
    expect(survivingCount(map, survival, 'unknown')).toBeNull()
  })

  it('counts everyone as in before the knockout stage', () => {
    const map = teamCodesByParticipant(usage)
    expect(survivingCount(map, null, 'p1')).toEqual({ remaining: 2, total: 2 })
  })

  it('ranks managers with survivor/eliminated counts and distinct eliminated flags', () => {
    const survival = computeSurvival([fixture('R16', 'BRA', 'JPN', { homeGoals: 2, awayGoals: 0, status: 'final' })])
    const rows = rankManagerSurvival(usage, survival)
    expect(rows.find((row) => row.participantId === 'p1')).toMatchObject({
      displayName: 'P1',
      profilePath: '/p/1',
      total: 2,
      remaining: 1,
      eliminated: 1,
      eliminatedTeamCodes: ['JPN'],
    })
    expect(rows.find((row) => row.participantId === 'p2')).toMatchObject({
      total: 1,
      remaining: 1,
      eliminated: 0,
      eliminatedTeamCodes: [],
    })
  })
})
