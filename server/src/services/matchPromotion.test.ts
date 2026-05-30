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
  const invalidateLeaderboard = vi.fn(() => {})
  const deleteBatch = vi.fn(async () => {})
  const record = vi.fn(async () => {})
  const deps = {
    scoringRepository: { withFixtureLock, upsertMatchEntry, invalidateLeaderboard },
    matchImportRepository: { deleteBatch },
    auditRepository: { record },
    actorEmail: 'admin@example.com',
  } as unknown as PromotionDeps
  return { deps, upsertMatchEntry, invalidateLeaderboard, deleteBatch, record }
}

type ScoringLock = <T>(fixtureId: string, fn: (executor?: unknown) => Promise<T>) => Promise<T | null>

describe('promoteBatchIfReady', () => {
  it('promotes resolved rows on the lock transaction client (skips unresolved rows)', async () => {
    // Stand in for the transactional client withFixtureLock hands to fn; assert every write gets it.
    const txClient = { query: vi.fn() }
    const runLock: ScoringLock = (_id, fn) => fn(txClient)
    const { deps, upsertMatchEntry, invalidateLeaderboard, deleteBatch, record } = makeDeps(runLock)

    const result = await promoteBatchIfReady(makeBatch(), deps)

    expect(result).toEqual({ promoted: true, promotedRowCount: 1 })
    expect(upsertMatchEntry).toHaveBeenCalledTimes(1)
    // C1: rows are upserted with per-row invalidation suppressed and threaded onto the tx client...
    expect(upsertMatchEntry).toHaveBeenCalledWith(expect.anything(), {
      suppressLeaderboardInvalidation: true,
      executor: txClient,
    })
    // ...as are the batch delete and the audit row, so all three commit together.
    expect(deleteBatch).toHaveBeenCalledWith('batch-1', txClient)
    expect(record).toHaveBeenCalledWith(expect.anything(), txClient)
    // ...and the board is invalidated exactly once, after the transaction commits.
    expect(invalidateLeaderboard).toHaveBeenCalledOnce()
  })

  it('is a no-op when the fixture lock is already held by another promotion', async () => {
    const heldLock: ScoringLock = async () => null
    const { deps, upsertMatchEntry, invalidateLeaderboard, deleteBatch, record } = makeDeps(heldLock)

    const result = await promoteBatchIfReady(makeBatch(), deps)

    expect(result).toEqual({ promoted: false, promotedRowCount: 0 })
    expect(upsertMatchEntry).not.toHaveBeenCalled()
    expect(deleteBatch).not.toHaveBeenCalled()
    expect(record).not.toHaveBeenCalled()
    expect(invalidateLeaderboard).not.toHaveBeenCalled()
  })
})
