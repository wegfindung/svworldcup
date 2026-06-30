import { describe, expect, it } from 'vitest'
import { officialRoundOf32Fixtures, playoffMatchNumberFromFixtureId } from '../data/playoffBracket.js'
import { fixtures as groupFixtures } from '../data/worldCupSeed.js'
import type { FixtureSeed } from '../domain/types.js'
import { buildDerivedPlayoffFixtures } from './playoffFixtures.js'
import type { PublicFixtureResult } from './matchResults.js'

function resultFor(fixture: FixtureSeed, homeGoals = 1, awayGoals = 0): PublicFixtureResult {
  return {
    ...fixture,
    homeGoals,
    awayGoals,
    status: 'final',
    entryCount: 1,
    homePlayers: [],
    awayPlayers: [],
  }
}

describe('playoff fixture derivation', () => {
  it('does not materialize knockout fixtures before every group fixture is final', () => {
    const results = groupFixtures.map((fixture, index) => ({
      ...resultFor(fixture),
      status: index === 0 ? 'pending' as const : 'final' as const,
      homeGoals: index === 0 ? null : 1,
      awayGoals: index === 0 ? null : 0,
    }))

    expect(buildDerivedPlayoffFixtures(results)).toEqual([])
  })

  it('materializes the official round-of-32 fixtures once the group stage is final', () => {
    const derived = buildDerivedPlayoffFixtures(groupFixtures.map((fixture) => resultFor(fixture)))
    const byMatch = new Map(derived.map((fixture) => [playoffMatchNumberFromFixtureId(fixture.fixtureId), fixture]))

    expect(derived).toHaveLength(16)
    expect(derived).toEqual(officialRoundOf32Fixtures)
    expect(derived.every((fixture) => fixture.groupKey === 'R32')).toBe(true)
    expect(byMatch.get(74)).toMatchObject({ homeTeamCode: 'GER', awayTeamCode: 'PAR' })
    expect(byMatch.get(77)).toMatchObject({ homeTeamCode: 'FRA', awayTeamCode: 'SWE' })
    expect(byMatch.get(82)).toMatchObject({ homeTeamCode: 'BEL', awayTeamCode: 'SEN' })
    expect(byMatch.get(85)).toMatchObject({ homeTeamCode: 'SUI', awayTeamCode: 'ALG' })
  })

  it('materializes the round of 16 once round-of-32 winners are known', () => {
    const roundOf32 = buildDerivedPlayoffFixtures(groupFixtures.map((fixture) => resultFor(fixture)))
    const derived = buildDerivedPlayoffFixtures([
      ...groupFixtures.map((fixture) => resultFor(fixture)),
      ...roundOf32.map((fixture) => resultFor(fixture)),
    ])

    expect(derived.filter((fixture) => fixture.groupKey === 'R32')).toHaveLength(16)
    expect(derived.filter((fixture) => fixture.groupKey === 'R16')).toHaveLength(8)
    expect(derived.map((fixture) => fixture.fixtureId)).toContain('2026-07-04-r16-89')
  })

  it('advances the penalty-shootout winner from a knockout fixture that finished level', () => {
    const roundOf32 = buildDerivedPlayoffFixtures(groupFixtures.map((fixture) => resultFor(fixture)))
    // R16 match 89's home comes from the winner of R32 match 74 (GER v PAR). Make that match end
    // level (1-1) and award the shootout to the away side (PAR).
    const r32WithShootout = roundOf32.map((fixture) => {
      if (playoffMatchNumberFromFixtureId(fixture.fixtureId) === 74) {
        return { ...resultFor(fixture, 1, 1), penaltyWinnerTeamCode: fixture.awayTeamCode }
      }
      return resultFor(fixture)
    })
    const derived = buildDerivedPlayoffFixtures([
      ...groupFixtures.map((fixture) => resultFor(fixture)),
      ...r32WithShootout,
    ])
    const match89 = derived.find((fixture) => playoffMatchNumberFromFixtureId(fixture.fixtureId) === 89)
    expect(match89?.homeTeamCode).toBe('PAR')
  })

  it('does not advance a level knockout fixture with no penalty winner recorded', () => {
    const roundOf32 = buildDerivedPlayoffFixtures(groupFixtures.map((fixture) => resultFor(fixture)))
    const r32WithDraw = roundOf32.map((fixture) =>
      playoffMatchNumberFromFixtureId(fixture.fixtureId) === 74 ? resultFor(fixture, 1, 1) : resultFor(fixture),
    )
    const derived = buildDerivedPlayoffFixtures([
      ...groupFixtures.map((fixture) => resultFor(fixture)),
      ...r32WithDraw,
    ])
    // Match 89 needs both its source winners; an undecided 74 leaves it unmaterialized.
    expect(derived.find((fixture) => playoffMatchNumberFromFixtureId(fixture.fixtureId) === 89)).toBeUndefined()
  })
})
