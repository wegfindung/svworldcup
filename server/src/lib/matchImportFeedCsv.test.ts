import { describe, expect, it } from 'vitest'
import { MatchImportValidationError } from './matchImportError.js'
import { assertMatchImportSemantics } from './matchImportJson.js'
import { isFeedCsv, parseMatchImportFeedCsv } from './matchImportFeedCsv.js'
import { REAL_FEED_CSV } from './matchImportFeedCsv.testdata.js'
import type { CsvMatchOptions } from './matchImportCsv.js'

const options: CsvMatchOptions = {
  homeTeamCode: 'MEX',
  awayTeamCode: 'RSA',
  homeTeamName: 'Mexico',
  awayTeamName: 'South Africa',
  homeGoals: 2,
  awayGoals: 0,
  sourceUrl: 'https://x.test/m',
}

describe('isFeedCsv', () => {
  it('detects the provider feed header', () => {
    expect(isFeedCsv(REAL_FEED_CSV)).toBe(true)
  })

  it('does not match the manual paste contract', () => {
    expect(isFeedCsv('name\tteam\tlineupStatus\tminutes\tgoals\tassists\trating\nX\tMexico\tstarter\t90\t0\t0\t7.0')).toBe(
      false,
    )
  })

  it('does not match non-tabular text', () => {
    expect(isFeedCsv('{"match": {}}')).toBe(false)
    expect(isFeedCsv('')).toBe(false)
  })
})

describe('parseMatchImportFeedCsv', () => {
  it('parses the real provider file: played rows only, match block from the form options', () => {
    const json = parseMatchImportFeedCsv(REAL_FEED_CSV, options)
    expect(json.match).toEqual({
      homeTeam: 'Mexico',
      awayTeam: 'South Africa',
      homeGoals: 2,
      awayGoals: 0,
      sourceUrl: 'https://x.test/m',
    })
    // 16 Mexico + 15 South Africa rows have minutes; the 21 no-show squad rows are dropped.
    expect(json.players).toHaveLength(31)
    expect(json.players.filter((player) => player.team === 'Mexico')).toHaveLength(16)
    expect(json.players.some((player) => player.name === 'Guillermo Ochoa')).toBe(false)
    // The whole parse satisfies the shared semantic checks (teams, duplicates, starter cap).
    expect(() => assertMatchImportSemantics(json)).not.toThrow()
  })

  it('reads empty goals/assists cells as zero and keeps real stat values', () => {
    const json = parseMatchImportFeedCsv(REAL_FEED_CSV, options)
    const montes = json.players.find((player) => player.name === 'César Montes')
    expect(montes).toMatchObject({ team: 'Mexico', minutes: 92, goals: 0, assists: 0, rating: 7 })
    const quinones = json.players.find((player) => player.name === 'Julián Quiñones')
    expect(quinones).toMatchObject({ minutes: 79, goals: 1, assists: 0, rating: 8.5 })
    // Red-card row with an explicit `0` assists cell.
    const sithole = json.players.find((player) => player.name === 'Siphephelo Sithole')
    expect(sithole).toMatchObject({ team: 'South Africa', minutes: 49, assists: 0, rating: 5.2 })
  })

  it('marks the eleven most-played rows per team as starters', () => {
    const json = parseMatchImportFeedCsv(REAL_FEED_CSV, options)
    for (const team of ['Mexico', 'South Africa']) {
      const starters = json.players.filter(
        (player) => player.team === team && player.lineupStatus === 'starter',
      )
      expect(starters).toHaveLength(11)
    }
    const byName = new Map(json.players.map((player) => [player.name, player.lineupStatus]))
    expect(byName.get('Julián Quiñones')).toBe('starter') // 79 minutes — 7th most for Mexico
    expect(byName.get('Gilberto Mora')).toBe('substitute') // 26 minutes — 12th most
    expect(byName.get('Siphephelo Sithole')).toBe('starter') // 49 minutes — 11th most for RSA
    expect(byName.get('Themba Zwane')).toBe('substitute') // 23 minutes — 13th most
  })

  it('rejects a row whose team is not one of the fixture teams', () => {
    const text = [
      'team,player,minutes,goals,assists,rating',
      'France,Someone,90,0,0,7.0',
    ].join('\n')
    expect(() => parseMatchImportFeedCsv(text, options)).toThrow(MatchImportValidationError)
  })

  it('rejects a header missing a required column', () => {
    const text = ['team,player,minutes,goals,assists', 'Mexico,X,90,0,0'].join('\n')
    expect(() => parseMatchImportFeedCsv(text, options)).toThrow(/missing required column/)
  })

  it('rejects a row with the wrong column count', () => {
    const text = ['team,player,minutes,goals,assists,rating', 'Mexico,X,90'].join('\n')
    expect(() => parseMatchImportFeedCsv(text, options)).toThrow(MatchImportValidationError)
  })

  it('rejects a file where no row has minutes', () => {
    const text = ['team,player,minutes,goals,assists,rating', 'Mexico,X,,,,'].join('\n')
    expect(() => parseMatchImportFeedCsv(text, options)).toThrow(/nothing to import/)
  })
})
