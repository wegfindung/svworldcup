import { describe, expect, it } from 'vitest'
import { MAX_PLAYERS_PER_NATION, findNationCapBreach, wouldExceedNationCap } from './formation.js'

describe('wouldExceedNationCap', () => {
  it('allows adding up to the cap from one team', () => {
    // Three already in the squad from FRA — a fourth is still within the cap of 4.
    expect(wouldExceedNationCap(['FRA', 'FRA', 'FRA'], 'FRA')).toBe(false)
  })

  it('flags the player that would push a team to 5 (one over the cap)', () => {
    // Exactly four FRA already in — a fifth breaches the cap.
    expect(wouldExceedNationCap(['FRA', 'FRA', 'FRA', 'FRA'], 'FRA')).toBe(true)
  })

  it('counts only the incoming team, ignoring players from other teams', () => {
    expect(wouldExceedNationCap(['FRA', 'FRA', 'FRA', 'ESP', 'BRA', 'GER'], 'FRA')).toBe(false)
    expect(wouldExceedNationCap(['FRA', 'FRA', 'FRA', 'FRA', 'ESP', 'BRA'], 'FRA')).toBe(true)
  })

  it('never blocks when the incoming team code is empty/unknown', () => {
    expect(wouldExceedNationCap(['FRA', 'FRA', 'FRA', 'FRA'], '')).toBe(false)
  })

  it('ignores empty existing team codes when counting', () => {
    // Empty codes are "no team" and must not count toward any team's tally.
    expect(wouldExceedNationCap(['', '', '', '', ''], 'FRA')).toBe(false)
    expect(wouldExceedNationCap(['FRA', '', 'FRA', '', 'FRA'], 'FRA')).toBe(false)
  })

  it('uses 4 as the cap boundary', () => {
    expect(MAX_PLAYERS_PER_NATION).toBe(4)
  })
})

describe('findNationCapBreach', () => {
  it('returns null for a clean squad spanning multiple teams (<= 4 each)', () => {
    const teamCodes = [
      'GER',
      'ESP',
      'ESP',
      'ESP',
      'ESP',
      'FRA',
      'FRA',
      'FRA',
      'BRA',
      'BRA',
      'BRA',
      'GER',
      'GER',
      'FRA',
      'BRA',
    ]
    expect(findNationCapBreach(teamCodes)).toBeNull()
  })

  it('returns null when a team sits exactly at the cap of 4', () => {
    expect(findNationCapBreach(['FRA', 'FRA', 'FRA', 'FRA'])).toBeNull()
  })

  it('returns the breaching team code when a team exceeds the cap', () => {
    expect(findNationCapBreach(['FRA', 'FRA', 'FRA', 'FRA', 'FRA'])).toBe('FRA')
  })

  it('ignores empty/unknown team codes (they never breach)', () => {
    expect(findNationCapBreach(['', '', '', '', '', ''])).toBeNull()
  })
})
