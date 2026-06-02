import { describe, expect, it } from 'vitest'
import type { SoccerversePlayerRecord } from '../domain/types.js'
import { MemoryTeamPoolRepository } from './teamPoolRepository.js'

function player(playerId: number): SoccerversePlayerRecord {
  return {
    playerId,
    displayName: `Player ${playerId}`,
    nationalityCode: 'TST',
    rating: 70,
    clubId: 1,
    positions: ['CM'],
    positionMain: 'CM',
  }
}

describe('MemoryTeamPoolRepository national-team uniqueness', () => {
  it('moves a player out of any previous team when a new pool claims them', async () => {
    const pools = new MemoryTeamPoolRepository()

    await pools.replaceTeamPlayers('JPN', [player(10), player(11)])
    await pools.replaceTeamPlayers('TUR', [player(10), player(12)])

    expect((await pools.listByTeam('JPN')).map((item) => item.playerId)).toEqual([11])
    expect((await pools.listByTeam('TUR')).map((item) => item.playerId)).toEqual([10, 12])
    expect((await pools.getTeamPlayerById(10))?.teamCode).toBe('TUR')
  })
})
