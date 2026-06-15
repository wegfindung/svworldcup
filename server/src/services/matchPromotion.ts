import { isPromotable } from '../lib/confirmationRules.js'
import type { PendingMatchBatch } from '../domain/types.js'
import type { AuditRepository } from '../repositories/auditRepository.js'
import type { MatchImportRepository } from '../repositories/matchImportRepository.js'
import type { ScoringRepository } from '../repositories/scoringRepository.js'

export interface PromotionResult {
  promoted: boolean
  promotedRowCount: number
}

export interface PromotionDeps {
  matchImportRepository: MatchImportRepository
  scoringRepository: ScoringRepository
  auditRepository: AuditRepository
  actorEmail: string
}

// D2: on the 2nd valid confirmation, upsert each resolved row of the batch into
// admin_match_entries, then clear the batch. Unresolved rows (null playerId) are skipped —
// they cannot affect scoring. All promoted rows get in_official_squad = true (the
// substitution-rule absence-row flag in the SOP). performance_points is left untouched;
// its rating-derivation is parked scoring work.
export async function promoteBatchIfReady(
  batch: PendingMatchBatch,
  deps: PromotionDeps,
): Promise<PromotionResult> {
  // C2: hold a fixture-scoped advisory lock for the whole promotion so two admins confirming the
  // same batch concurrently can't both pass isPromotable and double-promote. A null result means
  // another promotion already holds the lock — treat as a no-op for this caller.
  // C1: withFixtureLock also wraps fn in a BEGIN/COMMIT transaction and hands it the transactional
  // client as `executor`. Threading that executor through all three writes makes the promotion
  // all-or-nothing: a failure anywhere rolls back the upserts, the batch delete, AND the audit row,
  // leaving the pending batch intact for an idempotent re-promote.
  const result = await deps.scoringRepository.withFixtureLock(batch.fixtureId, async (executor) => {
    if (!isPromotable(batch)) {
      return { promoted: false, promotedRowCount: 0 }
    }

    const resolvedRows = batch.rows.filter((row) => row.playerId !== null)
    for (const row of resolvedRows) {
      // Suppress per-row invalidation; the board is invalidated once below, after the transaction
      // COMMITs (invalidating mid-transaction would let a concurrent read re-cache pre-commit rows).
      await deps.scoringRepository.upsertMatchEntry(
        {
          fixtureId: batch.fixtureId,
          playerId: row.playerId as number,
          inOfficialSquad: true,
          minutes: row.minutes,
          goals: row.goals,
          assists: row.assists,
          cleanSheetEligible: row.cleanSheetEligible,
          lineupStatus: row.lineupStatus,
          rating: row.rating,
          sourceNote: 'imported match data',
        },
        { suppressLeaderboardInvalidation: true, executor },
      )
    }

    await deps.matchImportRepository.deleteBatch(batch.batchId, executor)
    await deps.auditRepository.record(
      {
        actorEmail: deps.actorEmail,
        actionKey: 'match_import.promote',
        entityType: 'fixture',
        entityId: batch.fixtureId,
        detail: { batchId: batch.batchId, promotedRowCount: resolvedRows.length },
      },
      executor,
    )

    return { promoted: true, promotedRowCount: resolvedRows.length }
  })

  // Flip the board once, AFTER the transaction has committed (never inside it).
  if (result?.promoted) {
    deps.scoringRepository.invalidateLeaderboard()
  }

  return result ?? { promoted: false, promotedRowCount: 0 }
}
