import { describe, expect, it } from 'vitest'
import type { FixtureSeed, MatchEntryRecord, SlotClass, TeamPoolPlayer } from '../domain/types.js'
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

function poolPlayer(
  playerId: number,
  teamCode: string,
  positions: string[],
  positionClasses: SlotClass[],
): TeamPoolPlayer {
  return {
    teamCode,
    playerId,
    displayName: `${teamCode} ${playerId}`,
    nationalityCode: teamCode,
    rating: 70,
    capCost: 100_000,
    positions,
    positionMain: positions[0],
    positionClasses,
    imageUrl: `https://example.test/${playerId}.png`,
  }
}

function csEntry(playerId: number, cleanSheetEligible: boolean): MatchEntryRecord {
  return {
    entryId: `fixture-1-${playerId}`,
    fixtureId: 'fixture-1',
    playerId,
    inOfficialSquad: true,
    minutes: 90,
    goals: 0,
    assists: 0,
    cleanSheetEligible,
    rating: 6, // performance curve anchor (6.0 -> 0.5)
    sourceNote: 'test',
  }
}

describe('buildPublicFixtureResults — per-player scoring', () => {
  function homePlayer(players: TeamPoolPlayer[], entries: MatchEntryRecord[], playerId: number) {
    const results = buildPublicFixtureResults(fixtures, new Map([['FRA', players]]), entries)
    return (results[0] as any).homePlayers.find((player: any) => player.playerId === playerId)
  }

  it('computes squad-independent base points identically to the scoring rubric', () => {
    // minutes 90 (appearance 1 + minutes 1) + rating 6 (performance 0.5), no goals/assists.
    const player = homePlayer([poolPlayer(10, 'FRA', ['CB'], ['DEF'])], [csEntry(10, false)], 10)
    expect(player).toMatchObject({
      appearancePoints: 1,
      minutePoints: 1,
      performancePoints: 0.5,
      goalPoints: 0,
      assistPoints: 0,
      basePoints: 2.5,
    })
  })

  it('badge + clean-sheet points are gated by the eligible slot class', () => {
    const players = [
      poolPlayer(1, 'FRA', ['GK'], ['GK']),
      poolPlayer(2, 'FRA', ['CB'], ['DEF']),
      poolPlayer(3, 'FRA', ['DMC'], ['MID']), // DM variant -> MID earns
      poolPlayer(4, 'FRA', ['CM'], ['MID']), // central mid, no DM -> earns nothing
      poolPlayer(5, 'FRA', ['ST'], ['FWD']),
    ]
    const entries = [1, 2, 3, 4, 5].map((id) => csEntry(id, true))

    expect(homePlayer(players, entries, 1)).toMatchObject({ earnsCleanSheet: true, cleanSheetByPosition: [{ slotClass: 'GK', points: 4 }] })
    expect(homePlayer(players, entries, 2)).toMatchObject({ earnsCleanSheet: true, cleanSheetByPosition: [{ slotClass: 'DEF', points: 3 }] })
    expect(homePlayer(players, entries, 3)).toMatchObject({ earnsCleanSheet: true, cleanSheetByPosition: [{ slotClass: 'MID', points: 1 }] })
    expect(homePlayer(players, entries, 4)).toMatchObject({ earnsCleanSheet: false, cleanSheetByPosition: [{ slotClass: 'MID', points: 0 }] })
    expect(homePlayer(players, entries, 5)).toMatchObject({ earnsCleanSheet: false, cleanSheetByPosition: [{ slotClass: 'FWD', points: 0 }] })
  })

  it('lists one clean-sheet line per eligible class for a versatile player', () => {
    const player = homePlayer([poolPlayer(7, 'FRA', ['CB', 'DMC'], ['DEF', 'MID'])], [csEntry(7, true)], 7)
    expect(player.cleanSheetByPosition).toEqual([
      { slotClass: 'DEF', points: 3 },
      { slotClass: 'MID', points: 1 },
    ])
    expect(player.earnsCleanSheet).toBe(true)
  })

  it('pays zero clean sheet (and no badge) when the team conceded', () => {
    const player = homePlayer([poolPlayer(8, 'FRA', ['CB'], ['DEF'])], [csEntry(8, false)], 8)
    expect(player.cleanSheetByPosition).toEqual([{ slotClass: 'DEF', points: 0 }])
    expect(player.earnsCleanSheet).toBe(false)
  })
})
