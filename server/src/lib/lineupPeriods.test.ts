import { describe, expect, it } from 'vitest'
import { getFixturePeriodKey, getLineupPeriods } from './lineupPeriods.js'

describe('lineup periods', () => {
  it('groups fixtures by kickoff date and sorts periods chronologically', () => {
    const periods = getLineupPeriods([
      { fixtureId: 'late', groupKey: 'B', kickoffDate: '2026-06-13', kickoffTimeUtc: '21:00:00', homeTeamCode: 'QAT', awayTeamCode: 'SUI' },
      { fixtureId: 'early', groupKey: 'A', kickoffDate: '2026-06-12', kickoffTimeUtc: '04:00:00', homeTeamCode: 'KOR', awayTeamCode: 'CZE' },
      { fixtureId: 'same-day', groupKey: 'D', kickoffDate: '2026-06-13', kickoffTimeUtc: '03:00:00', homeTeamCode: 'USA', awayTeamCode: 'PAR' },
    ])

    expect(periods.map((period) => period.periodKey)).toEqual(['2026-06-12', '2026-06-13'])
    expect(periods[1].fixtures.map((fixture) => fixture.fixtureId)).toEqual(['same-day', 'late'])
  })

  it('finds the period key for a fixture id', () => {
    expect(
      getFixturePeriodKey('fixture-2', [
        { fixtureId: 'fixture-1', groupKey: 'A', kickoffDate: '2026-06-11', kickoffTimeUtc: '21:00:00', homeTeamCode: 'MEX', awayTeamCode: 'RSA' },
        { fixtureId: 'fixture-2', groupKey: 'A', kickoffDate: '2026-06-12', kickoffTimeUtc: '04:00:00', homeTeamCode: 'KOR', awayTeamCode: 'CZE' },
      ]),
    ).toBe('2026-06-12')
  })
})
