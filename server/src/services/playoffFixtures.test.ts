import { describe, expect, it } from 'vitest'
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

  it('materializes the round of 32 from finalized group standings', () => {
    const derived = buildDerivedPlayoffFixtures(groupFixtures.map((fixture) => resultFor(fixture)))

    expect(derived).toHaveLength(16)
    expect(derived.map((fixture) => fixture.fixtureId)).toContain('2026-06-28-r32-73')
    expect(derived.every((fixture) => fixture.groupKey === 'R32')).toBe(true)
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
})
