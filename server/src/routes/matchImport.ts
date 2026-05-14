import { Router } from 'express'
import { z } from 'zod'
import { assertMatchImportSemantics, parseMatchImportJson } from '../lib/matchImportJson.js'
import { promoteBatchIfReady } from '../services/matchPromotion.js'
import { JsonMatchStatsImporter } from '../services/matchStatsImporter.js'
import type { AuditRepository } from '../repositories/auditRepository.js'
import type { MatchImportRepository } from '../repositories/matchImportRepository.js'
import type { MatchMappingRepository } from '../repositories/matchMappingRepository.js'
import type { ScoringRepository } from '../repositories/scoringRepository.js'
import type { TeamPoolRepository } from '../repositories/teamPoolRepository.js'

export interface MatchImportRouterDeps {
  matchImportRepository: MatchImportRepository
  matchMappingRepository: MatchMappingRepository
  teamPoolRepository: TeamPoolRepository
  scoringRepository: ScoringRepository
  auditRepository: AuditRepository
}

const uploadSchema = z.object({
  fixtureId: z.string().trim().min(1).max(120),
  json: z.unknown(),
})

// Match data import lifecycle (D18 step 2 tracer bullet): upload -> review -> confirm -> promote.
// Mounted under /api/admin/match-import, inheriting admin authentication from the admin router.
export function createMatchImportRouter(deps: MatchImportRouterDeps) {
  const router = Router()
  const importer = new JsonMatchStatsImporter(deps.matchMappingRepository, deps.teamPoolRepository)

  router.post('/upload', async (req, res) => {
    const adminEmail = res.locals.admin.email as string
    const parsed = uploadSchema.parse(req.body)
    const json = parseMatchImportJson(parsed.json)
    assertMatchImportSemantics(json)

    const imported = await importer.importMatch({
      fixtureId: parsed.fixtureId,
      createdBy: adminEmail,
      json,
    })
    const batch = await deps.matchImportRepository.createBatch(imported.batchInput)

    await deps.auditRepository.record({
      actorEmail: adminEmail,
      actionKey: 'match_import.upload',
      entityType: 'fixture',
      entityId: batch.fixtureId,
      detail: {
        batchId: batch.batchId,
        rowCount: batch.rows.length,
        skippedNames: imported.skippedNames,
      },
    })

    res.status(201).json({ batch, skippedNames: imported.skippedNames })
  })

  router.get('/batches', async (_req, res) => {
    const items = await deps.matchImportRepository.listBatches()
    res.json({ items })
  })

  router.get('/batches/:batchId', async (req, res) => {
    const batch = await deps.matchImportRepository.getBatch(String(req.params.batchId))
    if (!batch) {
      return res.status(404).json({ error: 'Pending batch not found.' })
    }
    res.json({ batch })
  })

  router.post('/batches/:batchId/confirm', async (req, res) => {
    const adminEmail = res.locals.admin.email as string
    const batch = await deps.matchImportRepository.addConfirmation(String(req.params.batchId), adminEmail)

    await deps.auditRepository.record({
      actorEmail: adminEmail,
      actionKey: 'match_import.confirm',
      entityType: 'fixture',
      entityId: batch.fixtureId,
      detail: { batchId: batch.batchId, dataVersion: batch.dataVersion },
    })

    const promotion = await promoteBatchIfReady(batch, {
      matchImportRepository: deps.matchImportRepository,
      scoringRepository: deps.scoringRepository,
      auditRepository: deps.auditRepository,
      actorEmail: adminEmail,
    })

    // When promoted, the pending batch no longer exists — the confirmed rows are in
    // admin_match_entries. Otherwise the batch is returned with its new confirmation.
    res.json({ batch: promotion.promoted ? null : batch, promotion })
  })

  router.delete('/batches/:batchId', async (req, res) => {
    const batch = await deps.matchImportRepository.getBatch(String(req.params.batchId))
    if (!batch) {
      return res.status(404).json({ error: 'Pending batch not found.' })
    }
    await deps.matchImportRepository.deleteBatch(batch.batchId)
    res.status(204).end()
  })

  return router
}
