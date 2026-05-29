import { describe, expect, it } from 'vitest'
import { findSuspiciousTeamPoolCountryMismatch } from './teamPoolCountryGuard.js'
import type { SoccerversePlayerRecord } from '../domain/types.js'

function player(playerId: number, nationalityCode: string): SoccerversePlayerRecord {
  return {
    playerId,
    displayName: `Player ${playerId}`,
    nationalityCode,
    rating: 70,
    clubId: 0,
    positions: ['CB'],
  }
}

describe('findSuspiciousTeamPoolCountryMismatch', () => {
  it('flags a pool that is overwhelmingly from another country', () => {
    const players = Array.from({ length: 10 }, (_, index) => player(index + 1, 'JPN'))

    const result = findSuspiciousTeamPoolCountryMismatch('TUR', players)

    expect(result).toMatchObject({
      expectedCountryId: 'TUR',
      mismatchCount: 10,
      playerCount: 10,
    })
  })

  it('allows isolated nationality mismatches for eligibility edge cases', () => {
    const players = [
      ...Array.from({ length: 22 }, (_, index) => player(index + 1, 'TUR')),
      player(30, 'DEU'),
      player(31, 'NLD'),
    ]

    expect(findSuspiciousTeamPoolCountryMismatch('TUR', players)).toBeNull()
  })
})
