import { describe, expect, it } from 'vitest'
import { isPromotable, validConfirmerEmails } from '../lib/confirmationRules.js'
import type { CreateMatchBatchInput, CreateMatchBatchRowInput } from '../domain/types.js'
import { MatchImportValidationError, MemoryMatchImportRepository } from './matchImportRepository.js'

function row(overrides: Partial<CreateMatchBatchRowInput> = {}): CreateMatchBatchRowInput {
  return {
    sourceName: 'Player One',
    teamCode: 'BRA',
    playerId: 1,
    lineupStatus: 'starter',
    minutes: 90,
    goals: 0,
    assists: 0,
    cleanSheetEligible: false,
    ...overrides,
  }
}

function batchInput(overrides: Partial<CreateMatchBatchInput> = {}): CreateMatchBatchInput {
  return {
    fixtureId: 'wc-2026-001',
    sourceUrl: 'https://sofascore.com/match',
    homeGoals: 2,
    awayGoals: 1,
    createdBy: 'importer@example.com',
    rows: [row({ playerId: 1 }), row({ playerId: 2, sourceName: 'Player Two' })],
    ...overrides,
  }
}

describe('MemoryMatchImportRepository.createBatch', () => {
  it('creates a batch at version 1 with the importer as confirmation #1', async () => {
    const repo = new MemoryMatchImportRepository()
    const batch = await repo.createBatch(batchInput())

    expect(batch.dataVersion).toBe(1)
    expect(batch.rows).toHaveLength(2)
    expect(batch.confirmations).toHaveLength(1)
    expect(batch.homeGoals).toBe(2)
    expect(batch.awayGoals).toBe(1)
    expect(validConfirmerEmails(batch)).toEqual(['importer@example.com'])
    expect(isPromotable(batch)).toBe(false)
  })

  it('rejects a second batch for the same fixture', async () => {
    const repo = new MemoryMatchImportRepository()
    await repo.createBatch(batchInput())
    await expect(repo.createBatch(batchInput())).rejects.toBeInstanceOf(MatchImportValidationError)
  })

  it('rejects a duplicate resolved player but allows multiple unresolved rows', async () => {
    const repo = new MemoryMatchImportRepository()
    await expect(
      repo.createBatch(batchInput({ rows: [row({ playerId: 1 }), row({ playerId: 1 })] })),
    ).rejects.toBeInstanceOf(MatchImportValidationError)

    const batch = await repo.createBatch(
      batchInput({ rows: [row({ playerId: null }), row({ playerId: null })] }),
    )
    expect(batch.rows).toHaveLength(2)
  })
})

describe('MemoryMatchImportRepository lookups', () => {
  it('finds a batch by id and by fixture', async () => {
    const repo = new MemoryMatchImportRepository()
    const created = await repo.createBatch(batchInput())

    expect((await repo.getBatch(created.batchId))?.batchId).toBe(created.batchId)
    expect((await repo.getBatchByFixture('wc-2026-001'))?.batchId).toBe(created.batchId)
    expect(await repo.getBatchByFixture('wc-2026-999')).toBeNull()
  })

  it('isolates returned snapshots from stored state', async () => {
    const repo = new MemoryMatchImportRepository()
    const created = await repo.createBatch(batchInput())
    created.rows[0].goals = 999

    const reloaded = await repo.getBatch(created.batchId)
    expect(reloaded?.rows[0].goals).toBe(0)
  })
})

describe('MemoryMatchImportRepository.updateRow', () => {
  it('bumps the version, records the editor, and voids prior confirmations', async () => {
    const repo = new MemoryMatchImportRepository()
    let batch = await repo.createBatch(batchInput())
    batch = await repo.addConfirmation(batch.batchId, 'reviewer@example.com')
    expect(isPromotable(batch)).toBe(true)

    batch = await repo.updateRow(batch.rows[0].rowId, { goals: 1 }, 'editor@example.com')

    expect(batch.dataVersion).toBe(2)
    expect(batch.lastEditedBy).toBe('editor@example.com')
    expect(validConfirmerEmails(batch)).toEqual([])
    expect(isPromotable(batch)).toBe(false)
  })

  it('rejects an edit that would duplicate a resolved player', async () => {
    const repo = new MemoryMatchImportRepository()
    const batch = await repo.createBatch(batchInput())
    await expect(
      repo.updateRow(batch.rows[0].rowId, { playerId: 2 }, 'editor@example.com'),
    ).rejects.toBeInstanceOf(MatchImportValidationError)
  })
})

describe('MemoryMatchImportRepository.addConfirmation', () => {
  it('reaches promotable with the importer plus one distinct admin', async () => {
    const repo = new MemoryMatchImportRepository()
    const created = await repo.createBatch(batchInput())
    const batch = await repo.addConfirmation(created.batchId, 'reviewer@example.com')
    expect(isPromotable(batch)).toBe(true)
  })

  it('blocks the same admin confirming twice', async () => {
    const repo = new MemoryMatchImportRepository()
    const created = await repo.createBatch(batchInput())
    await expect(
      repo.addConfirmation(created.batchId, 'importer@example.com'),
    ).rejects.toBeInstanceOf(MatchImportValidationError)
  })

  it('blocks the most recent editor from confirming their own edit', async () => {
    const repo = new MemoryMatchImportRepository()
    let batch = await repo.createBatch(batchInput())
    batch = await repo.updateRow(batch.rows[0].rowId, { goals: 2 }, 'editor@example.com')
    await expect(
      repo.addConfirmation(batch.batchId, 'editor@example.com'),
    ).rejects.toBeInstanceOf(MatchImportValidationError)
  })
})

describe('MemoryMatchImportRepository.replaceBatch and deleteBatch', () => {
  it('replaceBatch wholesale-replaces and resets to a fresh version 1', async () => {
    const repo = new MemoryMatchImportRepository()
    let batch = await repo.createBatch(batchInput())
    batch = await repo.addConfirmation(batch.batchId, 'reviewer@example.com')
    batch = await repo.updateRow(batch.rows[0].rowId, { goals: 3 }, 'editor@example.com')
    expect(batch.dataVersion).toBe(2)

    const replaced = await repo.replaceBatch('wc-2026-001', batchInput({ createdBy: 'importer2@example.com' }))
    expect(replaced.dataVersion).toBe(1)
    expect(replaced.batchId).not.toBe(batch.batchId)
    expect(validConfirmerEmails(replaced)).toEqual(['importer2@example.com'])
  })

  it('deleteBatch removes the batch', async () => {
    const repo = new MemoryMatchImportRepository()
    const batch = await repo.createBatch(batchInput())
    await repo.deleteBatch(batch.batchId)
    expect(await repo.getBatch(batch.batchId)).toBeNull()
  })
})
