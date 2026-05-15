import { describe, expect, it } from 'vitest'
import { MatchImportValidationError } from './matchImportError.js'
import { parseMatchImportCsv, type CsvMatchOptions } from './matchImportCsv.js'

const options: CsvMatchOptions = {
  homeTeamCode: 'BRA',
  awayTeamCode: 'MAR',
  homeTeamName: 'Brazil',
  awayTeamName: 'Morocco',
  homeGoals: 3,
  awayGoals: 0,
  sourceUrl: 'https://x.test/m',
}

describe('parseMatchImportCsv', () => {
  it('parses a tab-separated table with a header row', () => {
    const text = [
      'name\tteam\tlineupStatus\tminutes\tgoals\tassists\trating',
      'Vinicius Junior\tBrazil\tstarter\t90\t1\t0\t8.4',
      'Achraf Hakimi\tMAR\tstarter\t90\t0\t0\t7.0',
    ].join('\n')
    const json = parseMatchImportCsv(text, options)
    expect(json.match).toEqual({
      homeTeam: 'Brazil',
      awayTeam: 'Morocco',
      homeGoals: 3,
      awayGoals: 0,
      sourceUrl: 'https://x.test/m',
    })
    expect(json.players).toHaveLength(2)
    expect(json.players[0]).toEqual({
      name: 'Vinicius Junior',
      team: 'Brazil',
      lineupStatus: 'starter',
      minutes: 90,
      goals: 1,
      assists: 0,
      rating: 8.4,
    })
    // A 3-letter code in the team column resolves to the canonical team name.
    expect(json.players[1].team).toBe('Morocco')
  })

  it('parses a comma-separated table with a free column order', () => {
    const text = ['rating,name,goals,assists,minutes,lineupStatus,team', '7.2,Rodrygo,0,1,75,substitute,Brazil'].join(
      '\n',
    )
    const json = parseMatchImportCsv(text, options)
    expect(json.players[0]).toEqual({
      name: 'Rodrygo',
      team: 'Brazil',
      lineupStatus: 'substitute',
      minutes: 75,
      goals: 0,
      assists: 1,
      rating: 7.2,
    })
  })

  it('rejects a header missing a required column', () => {
    const text = ['name\tteam\tlineupStatus\tminutes\tgoals\tassists', 'X\tBrazil\tstarter\t90\t0\t0'].join('\n')
    expect(() => parseMatchImportCsv(text, options)).toThrow(MatchImportValidationError)
  })

  it('rejects a row whose team is not one of the fixture teams', () => {
    const text = [
      'name\tteam\tlineupStatus\tminutes\tgoals\tassists\trating',
      'Someone\tFrance\tstarter\t90\t0\t0\t7.0',
    ].join('\n')
    expect(() => parseMatchImportCsv(text, options)).toThrow(MatchImportValidationError)
  })

  it('rejects a row with the wrong column count', () => {
    const text = ['name\tteam\tlineupStatus\tminutes\tgoals\tassists\trating', 'Short\tBrazil\tstarter\t90'].join('\n')
    expect(() => parseMatchImportCsv(text, options)).toThrow(MatchImportValidationError)
  })

  it('rejects input with a header but no player rows', () => {
    expect(() =>
      parseMatchImportCsv('name\tteam\tlineupStatus\tminutes\tgoals\tassists\trating', options),
    ).toThrow(MatchImportValidationError)
  })
})
