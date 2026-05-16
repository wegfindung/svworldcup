import { describe, expect, it } from 'vitest'
import type { FixtureSeed, TeamPoolPlayer } from '../domain/types.js'
import { simulateConfiguredCompetition, simulateFixture } from './competitionSimulation.js'

function player(playerId: number, teamCode: string, positionClasses: TeamPoolPlayer['positionClasses'], rating = 75): TeamPoolPlayer {
  return {
    teamCode,
    playerId,
    displayName: `${teamCode} Player ${playerId}`,
    nationalityCode: teamCode,
    rating,
    capCost: 100_000,
    positions: [positionClasses[0]],
    positionMain: positionClasses[0],
    positionClasses,
    imageUrl: `https://example.test/${playerId}.png`,
  }
}

function team(teamCode: string, startId: number, rating = 75) {
  return [
    player(startId, teamCode, ['GK'], rating),
    player(startId + 1, teamCode, ['GK'], rating - 4),
    ...Array.from({ length: 8 }, (_, index) => player(startId + 10 + index, teamCode, ['DEF'], rating - index)),
    ...Array.from({ length: 7 }, (_, index) => player(startId + 30 + index, teamCode, ['MID'], rating - index)),
    ...Array.from({ length: 6 }, (_, index) => player(startId + 50 + index, teamCode, ['FWD'], rating - index)),
    ...Array.from({ length: 3 }, (_, index) => player(startId + 70 + index, teamCode, ['MID', 'FWD'], rating - 8 - index)),
  ]
}

const fixture: FixtureSeed = {
  fixtureId: 'fixture-a-b',
  groupKey: 'A',
  kickoffDate: '2026-06-01',
  kickoffTimeLocal: '18:00:00',
  homeTeamCode: 'FRA',
  awayTeamCode: 'SEN',
}

describe('competition simulation', () => {
  it('generates deterministic match entries for every player in both team pools', () => {
    const first = simulateFixture(fixture, team('FRA', 100, 88), team('SEN', 200, 78), { seed: 'demo' })
    const second = simulateFixture(fixture, team('FRA', 100, 88), team('SEN', 200, 78), { seed: 'demo' })

    expect(second).toEqual(first)
    expect(first.entries).toHaveLength(52)
    expect(first.entries.every((entry) => entry.fixtureId === fixture.fixtureId)).toBe(true)
    expect(first.entries.some((entry) => entry.inOfficialSquad && entry.minutes >= 60)).toBe(true)
    expect(first.entries.some((entry) => !entry.inOfficialSquad && entry.minutes === 0)).toBe(true)
  })

  it('skips configured fixtures when one side has no team pool', () => {
    const simulated = simulateConfiguredCompetition(
      [fixture],
      new Map<string, TeamPoolPlayer[]>([
        ['FRA', team('FRA', 100, 88)],
        ['SEN', []],
      ]),
    )

    expect(simulated).toEqual([])
  })
})
