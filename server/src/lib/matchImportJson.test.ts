import { describe, expect, it } from 'vitest'
import { ZodError } from 'zod'
import { MatchImportValidationError } from './matchImportError.js'
import { assertMatchImportSemantics, parseMatchImportJson } from './matchImportJson.js'

function validJson() {
  return {
    match: {
      homeTeam: 'Brazil',
      awayTeam: 'Morocco',
      homeGoals: 2,
      awayGoals: 0,
      sourceUrl: 'https://sofascore.com/match',
    },
    players: [
      { name: 'Vinicius Junior', team: 'Brazil', lineupStatus: 'starter', minutes: 90, goals: 1, assists: 0, rating: 8.2 },
      { name: 'Achraf Hakimi', team: 'Morocco', lineupStatus: 'starter', minutes: 90, goals: 0, assists: 0, rating: 6.9 },
    ],
  }
}

describe('parseMatchImportJson', () => {
  it('accepts a valid payload', () => {
    expect(() => parseMatchImportJson(validJson())).not.toThrow()
  })

  it('rejects a malformed payload with a ZodError', () => {
    const bad = validJson()
    // sourceUrl is optional in the schema (it may come from the import panel's form field);
    // homeTeam is still required, so dropping it is a genuine schema violation.
    delete (bad.match as Partial<typeof bad.match>).homeTeam
    expect(() => parseMatchImportJson(bad)).toThrow(ZodError)
  })

  it('accepts a payload with no sourceUrl (it may come from the form field)', () => {
    const ok = validJson()
    delete (ok.match as Partial<typeof ok.match>).sourceUrl
    expect(() => parseMatchImportJson(ok)).not.toThrow()
  })

  it('rejects an unknown lineupStatus', () => {
    const bad = validJson()
    ;(bad.players[0] as { lineupStatus: string }).lineupStatus = 'benched'
    expect(() => parseMatchImportJson(bad)).toThrow(ZodError)
  })
})

describe('assertMatchImportSemantics', () => {
  it('passes a clean payload', () => {
    expect(() => assertMatchImportSemantics(parseMatchImportJson(validJson()))).not.toThrow()
  })

  it('rejects a player assigned to a team not in the match', () => {
    const json = parseMatchImportJson(validJson())
    json.players[0].team = 'Argentina'
    expect(() => assertMatchImportSemantics(json)).toThrow(MatchImportValidationError)
  })

  it('rejects a duplicate player for the same team (D4)', () => {
    const raw = validJson()
    raw.players.push({ ...raw.players[0] })
    expect(() => assertMatchImportSemantics(parseMatchImportJson(raw))).toThrow(MatchImportValidationError)
  })

  it('rejects a match that names the same team twice', () => {
    const json = parseMatchImportJson(validJson())
    json.match.awayTeam = 'Brazil'
    json.players[1].team = 'Brazil'
    expect(() => assertMatchImportSemantics(json)).toThrow(MatchImportValidationError)
  })

  it('rejects more than 11 starters for one team (Fix 8)', () => {
    const raw = validJson()
    for (let i = 0; i < 11; i += 1) {
      raw.players.push({
        name: `Brazil starter ${i}`,
        team: 'Brazil',
        lineupStatus: 'starter',
        minutes: 90,
        goals: 0,
        assists: 0,
        rating: 6.5,
      })
    }
    expect(() => assertMatchImportSemantics(parseMatchImportJson(raw))).toThrow(
      MatchImportValidationError,
    )
  })

  it('accepts exactly 11 starters for one team (Fix 8)', () => {
    const raw = validJson()
    for (let i = 0; i < 10; i += 1) {
      raw.players.push({
        name: `Brazil starter ${i}`,
        team: 'Brazil',
        lineupStatus: 'starter',
        minutes: 90,
        goals: 0,
        assists: 0,
        rating: 6.5,
      })
    }
    expect(() => assertMatchImportSemantics(parseMatchImportJson(raw))).not.toThrow()
  })
})
