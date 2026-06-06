import { describe, expect, it } from 'vitest'
import { createSignedShareSnapshot } from './shareSignature.js'

describe('createSignedShareSnapshot', () => {
  it('uses the current share render cache version in signed paths', () => {
    const signed = createSignedShareSnapshot({
      version: 1,
      locale: 'en',
      managerName: 'Share Manager',
      statement: 'My 3 top picks for The Grand Tournament.',
      featuredPlayers: [
        {
          playerId: 1,
          displayName: 'Player One',
          teamCode: 'FRA',
          imageUrl: 'https://example.com/player-one.png',
          slotClass: 'FWD',
          rating: 91,
        },
        {
          playerId: 2,
          displayName: 'Player Two',
          teamCode: 'BRA',
          imageUrl: 'https://example.com/player-two.png',
          slotClass: 'MID',
          rating: 88,
        },
      ],
    })

    expect(signed.snapshotPath).toContain('&v=12')
    expect(signed.cardPath).toContain('&v=12')
  })
})
