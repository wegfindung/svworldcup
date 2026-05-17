import { describe, expect, it } from 'vitest'
import type { FixtureSeed, TeamPoolPlayer } from '../domain/types.js'
import { fixtures as seedFixtures, teams as seedTeams } from '../data/worldCupSeed.js'
import { simulateCompleteCompetition, simulateConfiguredCompetition, simulateFixture } from './competitionSimulation.js'

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
  kickoffTimeUtc: '18:00:00',
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

  it('simulates the full 104-match tournament through the final', () => {
    const playersByTeam = new Map<string, TeamPoolPlayer[]>(
      seedTeams.map((seedTeam, index) => [seedTeam.code, team(seedTeam.code, 10_000 + index * 100, 70 + (index % 18))]),
    )

    const simulated = simulateCompleteCompetition(seedFixtures, playersByTeam, { seed: 'full-demo' })

    expect(simulated.fixtures).toHaveLength(104)
    expect(simulated.fixtures.filter((result) => /^[A-L]$/.test(result.groupKey))).toHaveLength(72)
    expect(simulated.fixtures.filter((result) => result.groupKey === 'R32')).toHaveLength(16)
    expect(simulated.fixtures.filter((result) => result.groupKey === 'R16')).toHaveLength(8)
    expect(simulated.fixtures.filter((result) => result.groupKey === 'QF')).toHaveLength(4)
    expect(simulated.fixtures.filter((result) => result.groupKey === 'SF')).toHaveLength(2)
    expect(simulated.fixtures.filter((result) => result.groupKey === '3P')).toHaveLength(1)
    expect(simulated.fixtures.filter((result) => result.groupKey === 'FINAL')).toHaveLength(1)
    expect(simulated.final.fixtureId).toBe('2026-07-19-final-104')
    expect(simulated.champion).toMatch(/^[A-Z]{3}$/)
  })
})
