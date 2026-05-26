import { describe, expect, it } from 'vitest'
import type { MatchResolution } from '../domain/types.js'
import { MatchImportValidationError } from './matchImportError.js'
import { finalizeSubmission } from './matchImportSubmission.js'

function resolution(): MatchResolution {
  return {
    fixtureId: 'wc-2026-001',
    sourceUrl: 'https://x.test/m',
    homeTeamCode: 'BRA',
    awayTeamCode: 'MAR',
    homeGoals: 2,
    awayGoals: 1,
    rows: [
      {
        sourceName: 'Player One',
        teamCode: 'BRA',
        lineupStatus: 'starter',
        minutes: 90,
        goals: 1,
        assists: 0,
        rating: 7.5,
        resolution: { status: 'resolved', playerId: 10 },
      },
    ],
    skippedNames: [],
  }
}

describe('finalizeSubmission', () => {
  it('builds the batch input from already-resolved rows', () => {
    const finalized = finalizeSubmission(resolution(), [], 'importer@example.com')
    expect(finalized.batchInput.rows).toHaveLength(1)
    expect(finalized.batchInput.rows[0].playerId).toBe(10)
    expect(finalized.batchInput.createdBy).toBe('importer@example.com')
    expect(finalized.mappingWrites).toEqual([])
    expect(finalized.skipWrites).toEqual([])
  })

  it('auto-derives clean-sheet eligibility: 60+ minutes and the team conceded none', () => {
    // resolution() home side BRA played 90' and the away side scored 1 (awayGoals: 1) → conceded.
    const conceded = finalizeSubmission(resolution(), [], 'a@example.com')
    expect(conceded.batchInput.rows[0].cleanSheetEligible).toBe(false)

    // Away side kept a clean sheet (awayGoals: 0); the 90' home player qualifies.
    const cleanSheet = resolution()
    cleanSheet.awayGoals = 0
    const finalized = finalizeSubmission(cleanSheet, [], 'a@example.com')
    expect(finalized.batchInput.rows[0].cleanSheetEligible).toBe(true)
  })

  it('denies clean-sheet eligibility under 60 minutes even with a clean sheet', () => {
    const subbedEarly = resolution()
    subbedEarly.awayGoals = 0
    subbedEarly.rows[0].minutes = 59
    const finalized = finalizeSubmission(subbedEarly, [], 'a@example.com')
    expect(finalized.batchInput.rows[0].cleanSheetEligible).toBe(false)
  })

  it('uses the opposing side for the conceded count, mapped by team code', () => {
    // An away-side (MAR) player; their conceded count is the home goals (homeGoals: 2) → no clean sheet.
    const awayPlayer = resolution()
    awayPlayer.rows[0].teamCode = 'MAR'
    expect(finalizeSubmission(awayPlayer, [], 'a@example.com').batchInput.rows[0].cleanSheetEligible).toBe(false)

    // Same away player, but the home side was kept scoreless (homeGoals: 0).
    const awayCleanSheet = resolution()
    awayCleanSheet.rows[0].teamCode = 'MAR'
    awayCleanSheet.homeGoals = 0
    expect(finalizeSubmission(awayCleanSheet, [], 'a@example.com').batchInput.rows[0].cleanSheetEligible).toBe(true)
  })

  it('rejects a submission with an unresolved row and no override', () => {
    const unresolved = resolution()
    unresolved.rows[0].resolution = { status: 'unresolved', reason: 'No matching player.' }
    expect(() => finalizeSubmission(unresolved, [], 'a@example.com')).toThrow(MatchImportValidationError)
  })

  it('applies a playerId override and records the mapping write', () => {
    const unresolved = resolution()
    unresolved.rows[0].resolution = { status: 'unresolved', reason: 'No matching player.' }
    const finalized = finalizeSubmission(
      unresolved,
      [{ sourceName: 'Player One', teamCode: 'BRA', playerId: 99 }],
      'a@example.com',
    )
    expect(finalized.batchInput.rows[0].playerId).toBe(99)
    expect(finalized.mappingWrites).toEqual([
      { teamCode: 'BRA', normalizedSourceName: 'player one', playerId: 99 },
    ])
  })

  it('applies a skip override — the row leaves the batch and a skip write is recorded', () => {
    const unresolved = resolution()
    unresolved.rows[0].resolution = { status: 'unresolved', reason: 'No matching player.' }
    const finalized = finalizeSubmission(
      unresolved,
      [{ sourceName: 'Player One', teamCode: 'BRA', skip: true }],
      'a@example.com',
    )
    expect(finalized.batchInput.rows).toHaveLength(0)
    expect(finalized.skipWrites).toEqual([{ teamCode: 'BRA', normalizedSourceName: 'player one' }])
  })
})
