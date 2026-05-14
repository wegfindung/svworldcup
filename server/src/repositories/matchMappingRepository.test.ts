import { describe, expect, it } from 'vitest'
import { MemoryMatchMappingRepository } from './matchMappingRepository.js'

describe('MemoryMatchMappingRepository player map', () => {
  it('inserts then updates a mapping for the same team and normalized name', async () => {
    const repo = new MemoryMatchMappingRepository()
    const first = await repo.upsertPlayerMap({
      teamCode: 'BRA',
      normalizedSourceName: 'vini jr',
      playerId: 10,
      createdBy: 'admin@example.com',
    })
    const second = await repo.upsertPlayerMap({
      teamCode: 'BRA',
      normalizedSourceName: 'vini jr',
      playerId: 20,
      createdBy: 'other@example.com',
    })

    expect(second.mapId).toBe(first.mapId)
    expect(second.playerId).toBe(20)
    expect(second.createdBy).toBe('admin@example.com')

    const entries = await repo.listPlayerMap('BRA')
    expect(entries).toHaveLength(1)
    expect(entries[0].playerId).toBe(20)
  })

  it('scopes the player map by team', async () => {
    const repo = new MemoryMatchMappingRepository()
    await repo.upsertPlayerMap({ teamCode: 'BRA', normalizedSourceName: 'silva', playerId: 1, createdBy: 'a@example.com' })
    await repo.upsertPlayerMap({ teamCode: 'ARG', normalizedSourceName: 'silva', playerId: 2, createdBy: 'a@example.com' })

    expect(await repo.listPlayerMap('BRA')).toHaveLength(1)
    expect((await repo.listPlayerMap('ARG'))[0].playerId).toBe(2)
  })
})

describe('MemoryMatchMappingRepository skip names', () => {
  it('adds a skip name idempotently and scopes it by team', async () => {
    const repo = new MemoryMatchMappingRepository()
    const first = await repo.addSkipName({ teamCode: 'BRA', normalizedSourceName: 'team doctor', createdBy: 'a@example.com' })
    const second = await repo.addSkipName({ teamCode: 'BRA', normalizedSourceName: 'team doctor', createdBy: 'b@example.com' })

    expect(second.skipId).toBe(first.skipId)
    expect(await repo.listSkipNames('BRA')).toHaveLength(1)
    expect(await repo.listSkipNames('ARG')).toHaveLength(0)
  })

  it('removes a skip name', async () => {
    const repo = new MemoryMatchMappingRepository()
    await repo.addSkipName({ teamCode: 'BRA', normalizedSourceName: 'team doctor', createdBy: 'a@example.com' })
    await repo.removeSkipName('BRA', 'team doctor')
    expect(await repo.listSkipNames('BRA')).toHaveLength(0)
  })
})
