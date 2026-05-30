import { describe, expect, it, vi } from 'vitest'

vi.mock('../lib/confirmationRules.js', () => ({ isPromotable: () => true }))
import { promoteBatchIfReady, type PromotionDeps } from './matchPromotion.js'

function makeBatch() {
  return {
    fixtureId: 'fixture-1',
    batchId: 'batch-1',
    rows: [
      { playerId: 101, minutes: 90, goals: 1, assists: 0, cleanSheetEligible: true, rating: 7 },
      { playerId: null, minutes: 0, goals: 0, assists: 0, cleanSheetEligible: false, rating: null },
    ],
  } as never
}

function makeDeps(withFixtureLock: ScoringLock) {
  const upsertMatchEntry = vi.fn(async () => ({}))
  const deleteBatch = vi.fn(async () => {})
  const record = vi.fn(async () => {})
  const deps = {
    scoringRepository: { withFixtureLock, upsertMatchEntry },
    matchImportRepository: { deleteBatch },
    auditRepository: { record },
    actorEmail: 'admin@example.com',
  } as unknown as PromotionDeps
  return { deps, upsertMatchEntry, deleteBatch, record }
}

type ScoringLock = <T>(fixtureId: string, fn: () => Promise<T>) => Promise<T | null>

describe('promoteBatchIfReady', () => {
  it('promotes resolved rows when the fixture lock is acquired (skips unresolved rows)', async () => {
    const runLock: ScoringLock = (_id, fn) => fn()
    const { deps, upsertMatchEntry, deleteBatch, record } = makeDeps(runLock)

    const result = await promoteBatchIfReady(makeBatch(), deps)

    expect(result).toEqual({ promoted: true, promotedRowCount: 1 })
    expect(upsertMatchEntry).toHaveBeenCalledTimes(1)
    expect(deleteBatch).toHaveBeenCalledOnce()
    expect(record).toHaveBeenCalledOnce()
  })

  it('is a no-op when the fixture lock is already held by another promotion', async () => {
    const heldLock: ScoringLock = async () => null
    const { deps, upsertMatchEntry, deleteBatch, record } = makeDeps(heldLock)

    const result = await promoteBatchIfReady(makeBatch(), deps)

    expect(result).toEqual({ promoted: false, promotedRowCount: 0 })
    expect(upsertMatchEntry).not.toHaveBeenCalled()
    expect(deleteBatch).not.toHaveBeenCalled()
    expect(record).not.toHaveBeenCalled()
  })
})
