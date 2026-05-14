import { Router } from 'express'
import { z } from 'zod'
import { assertMatchImportSemantics, parseMatchImportJson } from '../lib/matchImportJson.js'
import { normalizeName } from '../lib/normalizeName.js'
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
  // D14: re-submission. When true and a batch already exists for the fixture, the batch is
  // wholesale-replaced; when false (default) an existing batch makes the upload fail loudly.
  replace: z.boolean().optional(),
})

// Stat-only edit of a pending row (D17). playerId is deliberately excluded — changing the
// resolved player goes through the dedicated resolve route so the mapping write-back happens.
const rowEditSchema = z.object({
  minutes: z.coerce.number().int().min(0).max(130).optional(),
  goals: z.coerce.number().int().min(0).max(20).optional(),
  assists: z.coerce.number().int().min(0).max(20).optional(),
  rating: z.coerce.number().min(0).max(10).optional(),
  lineupStatus: z.enum(['starter', 'substitute']).optional(),
  cleanSheetEligible: z.boolean().optional(),
})

const resolveRowSchema = z.object({
  playerId: z.coerce.number().int().positive(),
})

const skipNameSchema = z.object({
  teamCode: z.string().trim().min(3).max(3),
  sourceName: z.string().trim().min(1).max(120),
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

    // D14: replace an existing batch only when explicitly asked; otherwise createBatch fails
    // loudly if one already exists for the fixture.
    const existing = await deps.matchImportRepository.getBatchByFixture(parsed.fixtureId)
    const replaced = Boolean(existing && parsed.replace)
    const batch = replaced
      ? await deps.matchImportRepository.replaceBatch(parsed.fixtureId, imported.batchInput)
      : await deps.matchImportRepository.createBatch(imported.batchInput)

    await deps.auditRepository.record({
      actorEmail: adminEmail,
      actionKey: 'match_import.upload',
      entityType: 'fixture',
      entityId: batch.fixtureId,
      detail: {
        batchId: batch.batchId,
        rowCount: batch.rows.length,
        skippedNames: imported.skippedNames,
        replaced,
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

  router.put('/batches/:batchId/rows/:rowId', async (req, res) => {
    const adminEmail = res.locals.admin.email as string
    const edits = rowEditSchema.parse(req.body)
    const batch = await deps.matchImportRepository.updateRow(String(req.params.rowId), edits, adminEmail)

    await deps.auditRepository.record({
      actorEmail: adminEmail,
      actionKey: 'match_import.row_edit',
      entityType: 'fixture',
      entityId: batch.fixtureId,
      detail: { batchId: batch.batchId, rowId: req.params.rowId, dataVersion: batch.dataVersion },
    })

    res.json({ batch })
  })

  router.post('/batches/:batchId/rows/:rowId/resolve', async (req, res) => {
    const adminEmail = res.locals.admin.email as string
    const rowId = String(req.params.rowId)
    const { playerId } = resolveRowSchema.parse(req.body)
    const batch = await deps.matchImportRepository.updateRow(rowId, { playerId }, adminEmail)

    // D9: a manual resolution writes back to the mapping table so the same source name never
    // needs re-resolving for that team.
    const row = batch.rows.find((candidate) => candidate.rowId === rowId)
    if (row) {
      await deps.matchMappingRepository.upsertPlayerMap({
        teamCode: row.teamCode,
        normalizedSourceName: normalizeName(row.sourceName),
        playerId,
        createdBy: adminEmail,
      })
    }

    await deps.auditRepository.record({
      actorEmail: adminEmail,
      actionKey: 'match_import.player_map_correction',
      entityType: 'fixture',
      entityId: batch.fixtureId,
      detail: { batchId: batch.batchId, rowId, playerId, teamCode: row?.teamCode },
    })

    res.json({ batch })
  })

  router.delete('/batches/:batchId', async (req, res) => {
    const adminEmail = res.locals.admin.email as string
    const batch = await deps.matchImportRepository.getBatch(String(req.params.batchId))
    if (!batch) {
      return res.status(404).json({ error: 'Pending batch not found.' })
    }
    await deps.matchImportRepository.deleteBatch(batch.batchId)

    await deps.auditRepository.record({
      actorEmail: adminEmail,
      actionKey: 'match_import.discard',
      entityType: 'fixture',
      entityId: batch.fixtureId,
      detail: { batchId: batch.batchId },
    })

    res.status(204).end()
  })

  router.post('/skip-names', async (req, res) => {
    const adminEmail = res.locals.admin.email as string
    const parsed = skipNameSchema.parse(req.body)
    const entry = await deps.matchMappingRepository.addSkipName({
      teamCode: parsed.teamCode,
      normalizedSourceName: normalizeName(parsed.sourceName),
      createdBy: adminEmail,
    })

    await deps.auditRepository.record({
      actorEmail: adminEmail,
      actionKey: 'match_import.skip_name_add',
      entityType: 'team',
      entityId: entry.teamCode,
      detail: { normalizedSourceName: entry.normalizedSourceName },
    })

    res.status(201).json({ item: entry })
  })

  router.delete('/skip-names', async (req, res) => {
    const adminEmail = res.locals.admin.email as string
    const parsed = skipNameSchema.parse(req.query)
    const normalizedSourceName = normalizeName(parsed.sourceName)
    await deps.matchMappingRepository.removeSkipName(parsed.teamCode, normalizedSourceName)

    await deps.auditRepository.record({
      actorEmail: adminEmail,
      actionKey: 'match_import.skip_name_remove',
      entityType: 'team',
      entityId: parsed.teamCode,
      detail: { normalizedSourceName },
    })

    res.status(204).end()
  })

  return router
}
