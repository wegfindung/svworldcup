import { describe, expect, it } from 'vitest'
import type { SoccerversePlayerRecord } from '../domain/types.js'
import { MemoryTeamPoolRepository } from './teamPoolRepository.js'
import { LineupValidationError, MemoryLineupRepository } from './lineupRepository.js'

function svPlayer(overrides: Partial<SoccerversePlayerRecord> & { playerId: number; displayName: string }): SoccerversePlayerRecord {
  return {
    playerId: overrides.playerId,
    displayName: overrides.displayName,
    nationalityCode: overrides.nationalityCode ?? 'FRA',
    rating: overrides.rating ?? 80,
    clubId: overrides.clubId ?? 1,
    positions: overrides.positions ?? ['CM'],
    positionMain: overrides.positionMain ?? overrides.positions?.[0] ?? 'CM',
    imageUrl: overrides.imageUrl,
  }
}

async function setupRepository() {
  const pools = new MemoryTeamPoolRepository()
  await pools.replaceTeamPlayers('FRA', [
    svPlayer({ playerId: 1, displayName: 'Goalkeeper', positions: ['GK'], positionMain: 'GK', rating: 70 }),
    svPlayer({ playerId: 2, displayName: 'Defender', positions: ['CB'], positionMain: 'CB', rating: 70 }),
    svPlayer({ playerId: 3, displayName: 'Midfielder', positions: ['CM'], positionMain: 'CM', rating: 70 }),
    svPlayer({ playerId: 4, displayName: 'Forward', positions: ['ST'], positionMain: 'ST', rating: 70 }),
  ])
  return new MemoryLineupRepository(pools)
}

describe('MemoryLineupRepository', () => {
  it('creates an empty fixture lineup with the canonical 15 slots', async () => {
    const repo = await setupRepository()
    const lineup = await repo.getOrCreate('participant-1', 'fixture-1')

    expect(lineup.fixtureId).toBe('fixture-1')
    expect(lineup.isLocked).toBe(false)
    expect(lineup.slots).toHaveLength(15)
    expect(lineup.slots.every((slot) => slot.player === null)).toBe(true)
  })

  it('assigns players per fixture without leaking into another fixture', async () => {
    const repo = await setupRepository()

    await repo.assignPlayer('participant-1', 'fixture-1', { slotKey: 'starter-gk-1', playerId: 1 })
    const fixtureOne = await repo.getOrCreate('participant-1', 'fixture-1')
    const fixtureTwo = await repo.getOrCreate('participant-1', 'fixture-2')

    expect(fixtureOne.slots.find((slot) => slot.key === 'starter-gk-1')?.player?.playerId).toBe(1)
    expect(fixtureTwo.slots.find((slot) => slot.key === 'starter-gk-1')?.player).toBeNull()
  })

  it('rejects invalid slot assignments', async () => {
    const repo = await setupRepository()

    await expect(repo.assignPlayer('participant-1', 'fixture-1', { slotKey: 'starter-gk-1', playerId: 4 })).rejects.toBeInstanceOf(
      LineupValidationError,
    )
  })

  it('locks only complete fixture lineups', async () => {
    const repo = await setupRepository()

    await expect(repo.lockLineup('participant-1', 'fixture-1')).rejects.toBeInstanceOf(LineupValidationError)
  })
})
