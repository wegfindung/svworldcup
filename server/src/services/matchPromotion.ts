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
  if (!isPromotable(batch)) {
    return { promoted: false, promotedRowCount: 0 }
  }

  const resolvedRows = batch.rows.filter((row) => row.playerId !== null)
  for (const row of resolvedRows) {
    await deps.scoringRepository.upsertMatchEntry({
      fixtureId: batch.fixtureId,
      playerId: row.playerId as number,
      inOfficialSquad: true,
      minutes: row.minutes,
      goals: row.goals,
      assists: row.assists,
      cleanSheetEligible: row.cleanSheetEligible,
      rating: row.rating,
      sourceNote: 'imported match data',
    })
  }

  await deps.matchImportRepository.deleteBatch(batch.batchId)
  await deps.auditRepository.record({
    actorEmail: deps.actorEmail,
    actionKey: 'match_import.promote',
    entityType: 'fixture',
    entityId: batch.fixtureId,
    detail: { batchId: batch.batchId, promotedRowCount: resolvedRows.length },
  })

  return { promoted: true, promotedRowCount: resolvedRows.length }
}
