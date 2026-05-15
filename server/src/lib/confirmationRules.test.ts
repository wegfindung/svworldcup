import { describe, expect, it } from 'vitest'
import type { PendingMatchBatch, PendingMatchConfirmation } from '../domain/types.js'
import { canConfirm, countsTowardPromotion, isPromotable, validConfirmerEmails } from './confirmationRules.js'

function conf(adminEmail: string, dataVersion: number): PendingMatchConfirmation {
  return {
    confirmationId: `${adminEmail}-v${dataVersion}`,
    batchId: 'batch-1',
    adminEmail,
    dataVersion,
    createdAt: '2026-05-14T00:00:00.000Z',
  }
}

function makeBatch(overrides: Partial<PendingMatchBatch> = {}): PendingMatchBatch {
  return {
    batchId: 'batch-1',
    fixtureId: 'wc-2026-001',
    sourceUrl: 'https://sofascore.com/match',
    dataVersion: 1,
    createdBy: 'importer@example.com',
    lastEditedBy: undefined,
    createdAt: '2026-05-14T00:00:00.000Z',
    updatedAt: '2026-05-14T00:00:00.000Z',
    rows: [],
    confirmations: [],
    ...overrides,
  }
}

describe('countsTowardPromotion', () => {
  it('counts a confirmation only on the current data version', () => {
    const batch = makeBatch({ dataVersion: 2 })
    expect(countsTowardPromotion(conf('a@example.com', 2), batch)).toBe(true)
    expect(countsTowardPromotion(conf('a@example.com', 1), batch)).toBe(false)
  })
})

describe('validConfirmerEmails', () => {
  it('returns distinct emails confirmed on the current version', () => {
    const batch = makeBatch({
      dataVersion: 2,
      confirmations: [conf('a@example.com', 1), conf('a@example.com', 2), conf('b@example.com', 2)],
    })
    expect(validConfirmerEmails(batch).sort()).toEqual(['a@example.com', 'b@example.com'])
  })
})

describe('canConfirm', () => {
  it('allows a fresh distinct admin', () => {
    const batch = makeBatch({ confirmations: [conf('importer@example.com', 1)] })
    expect(canConfirm(batch, 'reviewer@example.com')).toEqual({ allowed: true })
  })

  it('blocks the editor of the current state — they are already counted via the edit', () => {
    const batch = makeBatch({
      dataVersion: 2,
      lastEditedBy: 'editor@example.com',
      confirmations: [conf('editor@example.com', 2)],
    })
    expect(canConfirm(batch, 'editor@example.com').allowed).toBe(false)
  })

  it('allows one other distinct admin to confirm an edited batch — no third admin needed', () => {
    const batch = makeBatch({
      dataVersion: 2,
      lastEditedBy: 'editor@example.com',
      confirmations: [conf('editor@example.com', 2)],
    })
    expect(canConfirm(batch, 'reviewer@example.com')).toEqual({ allowed: true })
  })

  it('blocks an admin who already confirmed the current version', () => {
    const batch = makeBatch({ confirmations: [conf('importer@example.com', 1)] })
    expect(canConfirm(batch, 'importer@example.com').allowed).toBe(false)
  })

  it('re-allows an admin once an edit bumps the version past their stale confirmation', () => {
    const batch = makeBatch({
      dataVersion: 2,
      lastEditedBy: 'someone-else@example.com',
      confirmations: [conf('importer@example.com', 1)],
    })
    expect(canConfirm(batch, 'importer@example.com').allowed).toBe(true)
  })
})

describe('isPromotable', () => {
  it('needs two distinct confirmers on the current version', () => {
    expect(isPromotable(makeBatch({ confirmations: [conf('a@example.com', 1)] }))).toBe(false)
    expect(
      isPromotable(makeBatch({ confirmations: [conf('a@example.com', 1), conf('b@example.com', 1)] })),
    ).toBe(true)
  })

  it('does not count stale confirmations from before an edit', () => {
    const batch = makeBatch({
      dataVersion: 2,
      confirmations: [conf('a@example.com', 1), conf('b@example.com', 1)],
    })
    expect(isPromotable(batch)).toBe(false)
  })
})
