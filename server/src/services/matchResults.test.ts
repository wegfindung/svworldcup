import { describe, expect, it } from 'vitest'
import type { FixtureSeed, MatchEntryRecord, TeamPoolPlayer } from '../domain/types.js'
import { buildPublicFixtureResults } from './matchResults.js'

function player(playerId: number, teamCode: string): TeamPoolPlayer {
  return {
    teamCode,
    playerId,
    displayName: `${teamCode} ${playerId}`,
    nationalityCode: teamCode,
    rating: 70,
    capCost: 100_000,
    positions: ['ST'],
    positionMain: 'ST',
    positionClasses: ['FWD'],
    imageUrl: `https://example.test/${playerId}.png`,
  }
}

function entry(fixtureId: string, playerId: number, goals: number, assists = 0): MatchEntryRecord {
  return {
    entryId: `${fixtureId}-${playerId}`,
    fixtureId,
    playerId,
    inOfficialSquad: true,
    minutes: 90,
    goals,
    assists,
    cleanSheetEligible: false,
    rating: 7,
    sourceNote: 'test',
  }
}

const fixtures: FixtureSeed[] = [
  {
    fixtureId: 'fixture-1',
    groupKey: 'A',
    kickoffDate: '2026-06-11',
    kickoffTimeUtc: '21:00:00',
    homeTeamCode: 'FRA',
    awayTeamCode: 'SEN',
  },
  {
    fixtureId: 'fixture-2',
    groupKey: 'A',
    kickoffDate: '2026-06-12',
    kickoffTimeUtc: '21:00:00',
    homeTeamCode: 'BRA',
    awayTeamCode: 'MAR',
  },
]

describe('buildPublicFixtureResults', () => {
  it('derives fixture scores from scoring entries and team pools', () => {
    const results = buildPublicFixtureResults(
      fixtures,
      new Map([
        ['FRA', [player(10, 'FRA'), player(11, 'FRA')]],
        ['SEN', [player(20, 'SEN')]],
      ]),
      [entry('fixture-1', 10, 2), entry('fixture-1', 11, 1), entry('fixture-1', 20, 1)],
    )

    expect(results[0]).toMatchObject({
      fixtureId: 'fixture-1',
      homeGoals: 3,
      awayGoals: 1,
      status: 'final',
      entryCount: 3,
    })
    expect(results[1]).toMatchObject({
      fixtureId: 'fixture-2',
      homeGoals: null,
      awayGoals: null,
      status: 'pending',
      entryCount: 0,
    })
  })

  it('includes player-level match details for scorers and assists', () => {
    const results = buildPublicFixtureResults(
      fixtures,
      new Map([
        ['FRA', [player(10, 'FRA'), player(11, 'FRA')]],
        ['SEN', [player(20, 'SEN')]],
      ]),
      [entry('fixture-1', 10, 2, 1), entry('fixture-1', 11, 0, 1), entry('fixture-1', 20, 1)],
    )
    const result = results[0] as any

    expect(result.homePlayers).toEqual([
      expect.objectContaining({
        playerId: 10,
        displayName: 'FRA 10',
        teamCode: 'FRA',
        goals: 2,
        assists: 1,
        minutes: 90,
        rating: 7,
      }),
      expect.objectContaining({
        playerId: 11,
        displayName: 'FRA 11',
        teamCode: 'FRA',
        goals: 0,
        assists: 1,
      }),
    ])
    expect(result.awayPlayers).toEqual([
      expect.objectContaining({
        playerId: 20,
        displayName: 'SEN 20',
        teamCode: 'SEN',
        goals: 1,
      }),
    ])
  })
})
