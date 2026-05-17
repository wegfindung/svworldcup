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

function entry(fixtureId: string, playerId: number, goals: number): MatchEntryRecord {
  return {
    entryId: `${fixtureId}-${playerId}`,
    fixtureId,
    playerId,
    inOfficialSquad: true,
    minutes: 90,
    goals,
    assists: 0,
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
})
