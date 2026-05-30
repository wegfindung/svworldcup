import { Router } from 'express'
import { z } from 'zod'
import { fixtures, teams } from '../data/worldCupSeed.js'
import { parseMatchImportCsv } from '../lib/matchImportCsv.js'
import { MatchImportValidationError } from '../lib/matchImportError.js'
import { assertMatchImportSemantics, assertStarterCap, parseMatchImportJson } from '../lib/matchImportJson.js'
import { finalizeSubmission } from '../lib/matchImportSubmission.js'
import { normalizeName } from '../lib/normalizeName.js'
import { promoteBatchIfReady } from '../services/matchPromotion.js'
import { JsonMatchStatsImporter } from '../services/matchStatsImporter.js'
import { captureParticipantInfluenceSnapshotForFixture } from '../services/participantInfluenceSnapshot.js'
import { logger } from '../lib/logger.js'
import type { MatchImportJson } from '../domain/types.js'
import type { AuditRepository } from '../repositories/auditRepository.js'
import type { MatchImportRepository } from '../repositories/matchImportRepository.js'
import type { MatchMappingRepository } from '../repositories/matchMappingRepository.js'
import type { ScoringRepository } from '../repositories/scoringRepository.js'
import type { TeamPoolRepository } from '../repositories/teamPoolRepository.js'
import type { ParticipantInfluenceSnapshotRepository } from '../repositories/participantInfluenceSnapshotRepository.js'

export interface MatchImportRouterDeps {
  matchImportRepository: MatchImportRepository
  matchMappingRepository: MatchMappingRepository
  teamPoolRepository: TeamPoolRepository
  scoringRepository: ScoringRepository
  auditRepository: AuditRepository
  participantInfluenceSnapshotRepository: ParticipantInfluenceSnapshotRepository
}

// A fixture's data is submitted as either JSON or CSV/TSV (Fix 12). CSV/TSV is a pure
// player-rows table; its match-level fields (score, source URL) come from form values.
const jsonInputSchema = z.object({
  format: z.literal('json'),
  json: z.unknown(),
  // Optional: a source URL supplied via the import panel's form field — an alternative to
  // putting it in the JSON's match block. Resolved in buildMatchImportJson.
  sourceUrl: z.string().trim().url().max(500).optional(),
})
const csvInputSchema = z.object({
  format: z.literal('csv'),
  text: z.string().trim().min(1).max(20_000),
  homeGoals: z.coerce.number().int().min(0).max(99),
  awayGoals: z.coerce.number().int().min(0).max(99),
  sourceUrl: z.string().trim().url().max(500),
})
// Fix B (future): a third input mode will be added here — e.g. a 'feed-url' variant where
// the server fetches the CSV from wcup.soccerverse.io (host hard-allowlisted) and parses it
// via a dedicated feed parser. Blocked until the SV team confirms the feed format; see the
// note in lib/matchImportCsv.ts.
const matchInputSchema = z.discriminatedUnion('format', [jsonInputSchema, csvInputSchema])

const parseSchema = z.object({
  fixtureId: z.string().trim().min(1).max(120),
  input: matchInputSchema,
})

// Fix 7 + Fix A: the admin's pre-persist choices for one row, keyed by (teamCode, sourceName)
// — a resolve (playerId) or skip choice, plus optional stat edits. clean-sheet eligibility is
// deliberately not here: it stays a review-screen judgement (D11). Stat field ranges mirror
// matchImportJsonSchema / rowEditSchema.
const overrideSchema = z.object({
  sourceName: z.string().trim().min(1).max(120),
  teamCode: z.string().trim().length(3),
  playerId: z.coerce.number().int().positive().optional(),
  skip: z.literal(true).optional(),
  minutes: z.coerce.number().int().min(0).max(130).optional(),
  goals: z.coerce.number().int().min(0).max(20).optional(),
  assists: z.coerce.number().int().min(0).max(20).optional(),
  rating: z.coerce.number().min(0).max(10).optional(),
  lineupStatus: z.enum(['starter', 'substitute']).optional(),
})

const uploadSchema = z.object({
  fixtureId: z.string().trim().min(1).max(120),
  input: matchInputSchema,
  overrides: z.array(overrideSchema).max(80).default([]),
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

type MatchInput = z.infer<typeof matchInputSchema>

// Turn a submitted JSON or CSV/TSV payload into the shared MatchImportJson shape, so the
// rest of the pipeline stays format-agnostic. For CSV/TSV the match-level fields come from
// the form values and the selected fixture's two teams.
function buildMatchImportJson(fixtureId: string, input: MatchInput): MatchImportJson {
  if (input.format === 'json') {
    const json = parseMatchImportJson(input.json)
    // The source URL may come from the JSON's match block or the panel's form field; the
    // form field wins when both are present. A source URL is still always required — it is
    // the provenance link the second confirming admin checks the data against.
    const sourceUrl = input.sourceUrl ?? json.match.sourceUrl
    if (!sourceUrl) {
      throw new MatchImportValidationError(
        'A source URL is required — provide it in the JSON or in the source URL field.',
      )
    }
    return { ...json, match: { ...json.match, sourceUrl } }
  }
  const fixture = fixtures.find((candidate) => candidate.fixtureId === fixtureId)
  if (!fixture) {
    throw new MatchImportValidationError('Unknown fixture.')
  }
  const homeTeam = teams.find((team) => team.code === fixture.homeTeamCode)
  const awayTeam = teams.find((team) => team.code === fixture.awayTeamCode)
  if (!homeTeam || !awayTeam) {
    throw new MatchImportValidationError('The selected fixture has unknown teams.')
  }
  return parseMatchImportCsv(input.text, {
    homeTeamCode: fixture.homeTeamCode,
    awayTeamCode: fixture.awayTeamCode,
    homeTeamName: homeTeam.nameEn,
    awayTeamName: awayTeam.nameEn,
    homeGoals: input.homeGoals,
    awayGoals: input.awayGoals,
    sourceUrl: input.sourceUrl,
  })
}

// Match data import lifecycle: parse -> resolve -> review -> confirm -> promote.
// Mounted under /api/admin/match-import, inheriting admin authentication from the admin router.
export function createMatchImportRouter(deps: MatchImportRouterDeps) {
  const router = Router()
  const importer = new JsonMatchStatsImporter(deps.matchMappingRepository, deps.teamPoolRepository)

  // Fix 7: parse + auto-resolve without persisting anything. The admin uses the returned
  // resolution to resolve or skip every outstanding row before calling /upload.
  router.post('/parse', async (req, res) => {
    const parsed = parseSchema.parse(req.body)
    const json = buildMatchImportJson(parsed.fixtureId, parsed.input)
    assertMatchImportSemantics(json)
    const resolution = await importer.resolveMatch({ fixtureId: parsed.fixtureId, json })
    res.json({ resolution })
  })

  router.post('/upload', async (req, res) => {
    const adminEmail = res.locals.admin.email as string
    const parsed = uploadSchema.parse(req.body)
    const json = buildMatchImportJson(parsed.fixtureId, parsed.input)
    assertMatchImportSemantics(json)

    const resolution = await importer.resolveMatch({ fixtureId: parsed.fixtureId, json })
    // Fix 7: rejects loudly if any row is still unresolved with no resolve/skip choice.
    const finalized = finalizeSubmission(resolution, parsed.overrides, adminEmail)
    // Fix 8 + Fix A: re-assert the 11-starter cap on the finalized rows. assertMatchImportSemantics
    // checked it at parse time, but resolve-stage lineupStatus edits are applied in
    // finalizeSubmission, after that — so a substitute->starter edit could otherwise slip past.
    assertStarterCap(finalized.batchInput.rows)

    // D9/D12: persist the admin's manual resolve/skip choices first. These are idempotent
    // ON CONFLICT upserts and are meant to persist regardless of the batch outcome, so an
    // orphaned write from a rejected upload is harmless. Doing them before the batch keeps
    // the only post-batch-creation step the audit row — so a mid-route failure cannot
    // strand a committed batch the way it could when the batch was created first.
    for (const write of finalized.mappingWrites) {
      await deps.matchMappingRepository.upsertPlayerMap({ ...write, createdBy: adminEmail })
    }
    for (const write of finalized.skipWrites) {
      await deps.matchMappingRepository.addSkipName({ ...write, createdBy: adminEmail })
    }

    // D14: replace an existing batch only when explicitly asked; otherwise createBatch fails
    // loudly if one already exists for the fixture.
    const existing = await deps.matchImportRepository.getBatchByFixture(parsed.fixtureId)
    const replaced = Boolean(existing && parsed.replace)
    const batch = replaced
      ? await deps.matchImportRepository.replaceBatch(parsed.fixtureId, finalized.batchInput)
      : await deps.matchImportRepository.createBatch(finalized.batchInput)

    await deps.auditRepository.record({
      actorEmail: adminEmail,
      actionKey: 'match_import.upload',
      entityType: 'fixture',
      entityId: batch.fixtureId,
      detail: {
        batchId: batch.batchId,
        rowCount: batch.rows.length,
        skippedNames: resolution.skippedNames,
        manualResolutions: finalized.mappingWrites.length,
        manualSkips: finalized.skipWrites.length,
        replaced,
      },
    })

    res.status(201).json({ batch, skippedNames: resolution.skippedNames })
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

    if (promotion.promoted) {
      // Fire-and-forget: snapshot Veteran ownership boost for this fixture so scoring uses
      // the holdings as of stats-promotion time. Failures here must not block promotion —
      // missing snapshot rows simply yield bonusPercent = 0, matching the SOP fallback.
      void captureParticipantInfluenceSnapshotForFixture(batch.fixtureId, {
        snapshotRepository: deps.participantInfluenceSnapshotRepository,
      }).catch((error: Error) => {
        logger.warn({ fixtureId: batch.fixtureId, err: error }, 'veteran influence snapshot capture failed')
      })
    }

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
