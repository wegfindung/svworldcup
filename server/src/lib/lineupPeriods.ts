import type { FixtureSeed } from '../domain/types.js'

export interface LineupPeriod {
  periodKey: string
  label: string
  fixtures: FixtureSeed[]
}

export function getLineupPeriods(sourceFixtures: FixtureSeed[]): LineupPeriod[] {
  const fixturesByDate = new Map<string, FixtureSeed[]>()

  for (const fixture of sourceFixtures) {
    const fixtures = fixturesByDate.get(fixture.kickoffDate) ?? []
    fixtures.push(fixture)
    fixturesByDate.set(fixture.kickoffDate, fixtures)
  }

  return [...fixturesByDate.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([periodKey, fixtures]) => ({
      periodKey,
      label: periodKey,
      fixtures: fixtures.sort((left, right) => left.kickoffTimeLocal.localeCompare(right.kickoffTimeLocal)),
    }))
}

export function getFixturePeriodKey(fixtureId: string, sourceFixtures: FixtureSeed[]) {
  return sourceFixtures.find((fixture) => fixture.fixtureId === fixtureId)?.kickoffDate ?? null
}
