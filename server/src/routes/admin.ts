import { Router } from 'express'
import { z } from 'zod'
import { adminSessionCookieName, adminSessionTtlSeconds, shouldUseSecureCookies } from '../config/auth.js'
import { env } from '../config/env.js'
import { isKnownTeamCode, teams } from '../data/worldCupSeed.js'
import { isKnownNationCode } from '../data/soccerverseNations.js'
import { clearCookie, createCookie } from '../lib/cookies.js'
import { createCsrfToken, createRequireCookieCsrf } from '../lib/csrf.js'
import { sendMultiAccountInquiryMail, sendVerificationMail } from '../lib/mailer.js'
import { generatePlainToken } from '../lib/tokens.js'
import { createRequireAdmin } from '../middleware/adminAuth.js'
import type { ConfigRepository } from '../repositories/configRepository.js'
import type { RegistrationRepository } from '../repositories/registrationRepository.js'
import type { AdminRepository } from '../repositories/adminRepository.js'
import type { TeamPoolRepository } from '../repositories/teamPoolRepository.js'
import type { ScoringRepository } from '../repositories/scoringRepository.js'
import type { MatchImportRepository } from '../repositories/matchImportRepository.js'
import type { MatchMappingRepository } from '../repositories/matchMappingRepository.js'
import type { AuditRepository } from '../repositories/auditRepository.js'
import { LeagueChangeError, NationUpdateError, SoccerverseLinkError } from '../repositories/registrationRepository.js'
import { clearParticipantBoostCache } from '../services/participantBoost.js'
import { getCommunityPlayerName } from '../services/communityPack.js'
import type { EmailMarketingRepository } from '../repositories/emailMarketingRepository.js'
import type { SnapshotJobRepository } from '../repositories/snapshotJobRepository.js'
import type { ParticipantRiskRepository } from '../repositories/participantRiskRepository.js'
import type { SquadRepository } from '../repositories/squadRepository.js'
import type { LandingAnalyticsRepository } from '../repositories/landingAnalyticsRepository.js'
import type { LandingPageConversionStats } from '../domain/types.js'
import { createMatchImportRouter } from './matchImport.js'
import { scoringDefaults } from '../data/scoringDefaults.js'
import { getSoccerverseCountryId } from '../data/teamCountryMap.js'
import {
  findSuspiciousTeamPoolCountryMismatch,
  formatSuspiciousTeamPoolCountryMismatch,
} from '../lib/teamPoolCountryGuard.js'
import { searchPlayersByCountryAndName, withImageUrl } from '../services/soccerverse.js'
import { listOperationEvents } from '../services/operationsMonitor.js'

const scoringSchema = z.object({
  goal: z.coerce.number().min(0).max(20),
  assist: z.coerce.number().min(0).max(20),
  appearance: z.coerce.number().min(0).max(20),
  minutes: z.coerce.number().min(0).max(20),
  cleanSheet: z.object({
    GK: z.coerce.number().min(0).max(20),
    DEF: z.coerce.number().min(0).max(20),
    MID: z.coerce.number().min(0).max(20),
    FWD: z.coerce.number().min(0).max(20),
  }),
  performanceCurve: z
    .array(
      z.object({
        rating: z.coerce.number().min(0).max(10),
        points: z.coerce.number().min(0).max(5),
      }),
    )
    .length(4)
    .refine(
      (curve) => curve.every((anchor, i) => i === 0 || curve[i - 1].rating < anchor.rating),
      { message: 'Performance curve anchors must be in strictly ascending order by rating' },
    ),
})

const resendSchema = z.object({
  email: z.string().trim().email(),
})

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(200),
})

const teamPlayersSchema = z.object({
  players: z.array(
    z.object({
      playerId: z.coerce.number().int().positive(),
      displayName: z.string().trim().min(1).max(120),
      nationalityCode: z.string().trim().min(3).max(3),
      rating: z.coerce.number().int().min(0).max(99),
      clubId: z.coerce.number().int().min(0).default(0),
      positions: z.array(z.string().trim().min(1).max(8)).default([]),
      positionMain: z.string().trim().max(8).optional(),
      imageUrl: z.string().trim().url().optional(),
    }),
  ),
})

const globalRevealSchema = z.object({
  revealProfiles: z.boolean().default(true),
  revealSquads: z.boolean().default(true),
})

const emailCampaignSchema = z.object({
  campaignId: z.string().trim().uuid().optional(),
  kind: z.enum(['newsletter', 'autoresponder']),
  status: z.enum(['draft', 'scheduled', 'active', 'paused']).optional(),
  triggerKey: z.enum(['manual', 'registration_created', 'registration_verified']).optional(),
  subject: z.string().trim().min(1).max(255),
  bodyHtml: z.string().trim().min(1).max(100_000),
  subjectByLocale: z.record(z.string(), z.string().trim().min(1).max(255)).optional(),
  bodyHtmlByLocale: z.record(z.string(), z.string().trim().min(1).max(100_000)).optional(),
  audienceStatus: z.enum(['all', 'pending_verification', 'active']).default('active'),
  audienceLeague: z.enum(['all', 'rookie', 'veteran']).optional(),
  audienceTeamCode: z.string().trim().toUpperCase().length(3).optional(),
  audienceReferrer: z.string().trim().max(60).optional(),
  scheduledAt: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((value) => value || undefined),
  delayMinutes: z.coerce.number().int().min(0).max(60 * 24 * 30).optional(),
  batchSize: z.coerce.number().int().min(1).max(500).optional(),
  requiresMarketingOptIn: z.boolean().optional(),
})

const emailTestSchema = emailCampaignSchema.extend({
  recipient: z.string().trim().email(),
})

const riskCaseStatusSchema = z.object({
  status: z.enum(['open', 'reviewing', 'confirmed', 'dismissed']),
  note: z.string().trim().max(1000).optional(),
})

const participantTrashSchema = z.object({
  reason: z.string().trim().max(500).optional(),
})

// True once the tournament has kicked off (first match). The scoring config and admin nation edits
// both lock on this same instant — see SOP_scoring_and_leagues.md "Score Configuration" and
// SOP_registration_and_auth.md "Correcting nation selections".
function isAfterKickoff(): boolean {
  if (!env.TOURNAMENT_KICKOFF_AT) {
    return false
  }

  return Date.now() >= env.TOURNAMENT_KICKOFF_AT.getTime()
}

function conversionRate(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : 0
}

function buildLandingConversionStats(input: {
  pendingRegistrations: number
  activeRegistrations: number
  squadSubmissions: number
  uniqueVisitors: number
  totalVisits: number
  reloadCount: number
}): LandingPageConversionStats {
  const registrations = input.pendingRegistrations + input.activeRegistrations
  return {
    uniqueVisitors: input.uniqueVisitors,
    totalVisits: input.totalVisits,
    reloadCount: input.reloadCount,
    registrations,
    activeRegistrations: input.activeRegistrations,
    pendingRegistrations: input.pendingRegistrations,
    squadSubmissions: input.squadSubmissions,
    unsubmittedRegistrations: Math.max(0, registrations - input.squadSubmissions),
    visitorToRegistrationRate: conversionRate(registrations, input.uniqueVisitors),
    registrationToSquadSubmissionRate: conversionRate(input.squadSubmissions, registrations),
    activeToSquadSubmissionRate: conversionRate(input.squadSubmissions, input.activeRegistrations),
  }
}

export function createAdminRouter(
  adminRepository: AdminRepository,
  registrationRepository: RegistrationRepository,
  configRepository: ConfigRepository,
  teamPoolRepository: TeamPoolRepository,
  scoringRepository: ScoringRepository,
  matchImportRepository: MatchImportRepository,
  matchMappingRepository: MatchMappingRepository,
  auditRepository: AuditRepository,
  emailMarketingRepository: EmailMarketingRepository,
  snapshotJobRepository: SnapshotJobRepository,
  participantRiskRepository: ParticipantRiskRepository,
  squadRepository: SquadRepository,
  landingAnalyticsRepository: LandingAnalyticsRepository,
) {
  const router = Router()
  const requireAdmin = createRequireAdmin(adminRepository)
  const requireAdminCsrf = createRequireCookieCsrf(adminSessionCookieName, 'admin')

  router.post('/login', async (req, res) => {
    const parsed = loginSchema.parse(req.body)
    const admin = await adminRepository.authenticate(parsed.email, parsed.password)
    if (!admin) {
      return res.status(401).json({ error: 'Invalid admin credentials.' })
    }

    const sessionToken = generatePlainToken()
    await adminRepository.createSession(admin.adminId, sessionToken, adminSessionTtlSeconds)
    res.setHeader(
      'Set-Cookie',
      createCookie(adminSessionCookieName, sessionToken, {
        httpOnly: true,
        secure: shouldUseSecureCookies(),
        sameSite: 'Lax',
        maxAge: adminSessionTtlSeconds,
      }),
    )

    await auditRepository.record({
      actorEmail: admin.email,
      actionKey: 'admin.login',
      entityType: 'admin',
      entityId: admin.adminId,
      detail: {},
    })

    res.json({
      admin: {
        adminId: admin.adminId,
        email: admin.email,
      },
      csrfToken: createCsrfToken(sessionToken, 'admin'),
    })
  })

  router.get('/session', requireAdmin, async (_req, res) => {
    const csrfToken = res.locals.adminSessionToken ? createCsrfToken(res.locals.adminSessionToken, 'admin') : undefined
    res.json({ admin: res.locals.admin, csrfToken })
  })

  router.post('/logout', requireAdmin, requireAdminCsrf, async (req, res) => {
    const cookie = req.header('cookie') ?? ''
    const match = cookie
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${adminSessionCookieName}=`))
    const token = match ? decodeURIComponent(match.slice(`${adminSessionCookieName}=`.length)) : ''
    if (token) {
      await adminRepository.revokeSession(token)
    }

    await auditRepository.record({
      actorEmail: res.locals.admin.email,
      actionKey: 'admin.logout',
      entityType: 'admin',
      entityId: res.locals.admin.adminId,
      detail: {},
    })

    res.setHeader(
      'Set-Cookie',
      clearCookie(adminSessionCookieName, {
        httpOnly: true,
        secure: shouldUseSecureCookies(),
        sameSite: 'Lax',
      }),
    )
    res.status(204).end()
  })

  router.use(requireAdmin)
  router.use(requireAdminCsrf)

  router.use(
    '/match-import',
    createMatchImportRouter({
      matchImportRepository,
      matchMappingRepository,
      teamPoolRepository,
      scoringRepository,
      auditRepository,
      snapshotJobRepository,
      configRepository,
      packNameLookup: getCommunityPlayerName,
    }),
  )

  router.get('/email-marketing/campaigns', async (_req, res) => {
    const campaigns = await emailMarketingRepository.listCampaigns()
    res.json({ campaigns })
  })

  router.post('/email-marketing/campaigns', async (req, res) => {
    const parsed = emailCampaignSchema.parse(req.body)
    const campaign = await emailMarketingRepository.saveCampaign(parsed, res.locals.admin.email)
    await auditRepository.record({
      actorEmail: res.locals.admin.email,
      actionKey: 'admin.email_campaign_save',
      entityType: 'email_campaign',
      entityId: campaign.campaignId,
      detail: {
        mode: parsed.campaignId ? 'update' : 'create',
        kind: campaign.kind,
        status: campaign.status,
        subject: campaign.subject,
      },
    })
    res.status(parsed.campaignId ? 200 : 201).json({ campaign })
  })

  router.delete('/email-marketing/campaigns/:campaignId', async (req, res) => {
    const campaignId = String(req.params.campaignId)
    const deleted = await emailMarketingRepository.deleteCampaign(campaignId)
    if (!deleted) {
      return res.status(404).json({ error: 'Campaign not found.' })
    }
    await auditRepository.record({
      actorEmail: res.locals.admin.email,
      actionKey: 'admin.email_campaign_delete',
      entityType: 'email_campaign',
      entityId: campaignId,
      detail: {},
    })
    res.status(204).end()
  })

  router.get('/email-marketing/campaigns/:campaignId/recipients', async (req, res) => {
    const recipients = await emailMarketingRepository.listRecipients(String(req.params.campaignId))
    res.json({ recipients })
  })

  router.post('/email-marketing/campaigns/:campaignId/send-now', async (req, res) => {
    const campaignId = String(req.params.campaignId)
    const result = await emailMarketingRepository.sendNow(campaignId)
    await auditRepository.record({
      actorEmail: res.locals.admin.email,
      actionKey: 'admin.email_campaign_send',
      entityType: 'email_campaign',
      entityId: campaignId,
      detail: {
        sent: result.sent,
        failed: result.failed,
        skipped: result.skipped,
        pending: result.pending,
        status: result.status,
      },
    })
    res.json({ result })
  })

  router.post('/email-marketing/test', async (req, res) => {
    const parsed = emailTestSchema.parse(req.body)
    await emailMarketingRepository.sendTestMail(parsed, res.locals.admin.email)
    await auditRepository.record({
      actorEmail: res.locals.admin.email,
      actionKey: 'admin.email_campaign_test',
      entityType: 'email_campaign',
      entityId: parsed.campaignId ?? 'unsaved',
      detail: { recipient: parsed.recipient, subject: parsed.subject },
    })
    res.json({ status: 'sent' })
  })

  router.post('/email-marketing/run-due', async (req, res) => {
    const limit = z.object({ limit: z.coerce.number().int().min(1).max(50).default(10) }).parse(req.body).limit
    const results = await emailMarketingRepository.runDueCampaigns(limit)
    await auditRepository.record({
      actorEmail: res.locals.admin.email,
      actionKey: 'admin.email_campaign_run_due',
      entityType: 'email_campaign',
      entityId: 'due-batch',
      detail: {
        processed: results.length,
        campaigns: results.map((summary) => ({
          campaignId: summary.campaignId,
          sent: summary.sent,
          failed: summary.failed,
        })),
      },
    })
    res.json({ results })
  })

  router.get('/overview', async (_req, res) => {
    const [counts, scoring, eventControls, selectionCounts, landingVisitStats, squadSubmissions] = await Promise.all([
      registrationRepository.getCounts(),
      configRepository.getScoringConfig(),
      configRepository.getEventControls(),
      teamPoolRepository.getTeamSelectionCounts(),
      landingAnalyticsRepository.getLandingPageVisitStats(),
      squadRepository.countLockedSquads(),
    ])
    res.json({
      counts,
      scoring,
      eventControls,
      scoringLocked: isAfterKickoff(),
      defaults: scoringDefaults,
      teamSelectionCounts: selectionCounts,
      landingConversion: buildLandingConversionStats({
        pendingRegistrations: counts.pending,
        activeRegistrations: counts.active,
        squadSubmissions,
        ...landingVisitStats,
      }),
    })
  })

  router.get('/audit', async (req, res) => {
    const limit = z.coerce.number().int().min(1).max(200).default(50).parse(req.query.limit)
    const items = (await auditRepository.list()).slice().reverse().slice(0, limit)
    res.json({ items })
  })

  router.get('/operations/events', async (req, res) => {
    const limit = z.coerce.number().int().min(1).max(200).default(50).parse(req.query.limit)
    res.json({ items: listOperationEvents(limit) })
  })

  router.get('/participants', async (_req, res) => {
    const items = await registrationRepository.listForAdmin()
    const summaries = await participantRiskRepository.summarizeParticipants(items.map((item) => item.participantId))
    res.json({
      items: items.map((item) => ({
        ...item,
        riskSummary: summaries[item.participantId],
      })),
    })
  })

  router.get('/risk-cases', async (_req, res) => {
    const items = await participantRiskRepository.listCases()
    res.json({ items })
  })

  router.post('/risk-cases/:caseId/status', async (req, res) => {
    const caseId = String(req.params.caseId ?? '').trim()
    const parsed = riskCaseStatusSchema.parse(req.body)
    const updated = await participantRiskRepository.updateCaseStatus(caseId, parsed.status, parsed.note)
    if (!updated) {
      return res.status(404).json({ error: 'Risk case not found.' })
    }

    await auditRepository.record({
      actorEmail: res.locals.admin.email,
      actionKey: 'admin.risk_case_status_change',
      entityType: 'participant_risk_case',
      entityId: caseId,
      detail: { status: parsed.status, note: parsed.note },
    })
    res.json({ item: updated })
  })

  router.post('/risk-cases/:caseId/members/:participantId/inquiry-email', async (req, res) => {
    const caseId = String(req.params.caseId ?? '').trim()
    const participantId = String(req.params.participantId ?? '').trim()
    const riskCases = await participantRiskRepository.listCases()
    const riskCase = riskCases.find((candidate) => candidate.caseId === caseId)
    const member = riskCase?.members.find((candidate) => candidate.participantId === participantId)

    if (!riskCase || !member) {
      return res.status(404).json({ error: 'Risk case member not found.' })
    }

    const delivery = await sendMultiAccountInquiryMail({
      recipient: member.email,
      displayName: member.displayName,
    })
    const inquiry = await participantRiskRepository.markInquiryEmailSent(participantId, res.locals.admin.email)
    const refreshedCase = (await participantRiskRepository.listCases()).find((candidate) => candidate.caseId === caseId) ?? riskCase

    await auditRepository.record({
      actorEmail: res.locals.admin.email,
      actionKey: 'admin.risk_inquiry_email_sent',
      entityType: 'participant_risk_case',
      entityId: caseId,
      detail: {
        participantId,
        email: member.email,
        score: riskCase.score,
        reasonKeys: [...new Set([...riskCase.reasonKeys, ...member.reasonKeys])],
        accepted: delivery.accepted,
        rejected: delivery.rejected,
        sentCount: inquiry.sentCount,
      },
    })

    res.json({
      item: refreshedCase,
      inquiry,
      mailer: {
        accepted: delivery.accepted,
        rejected: delivery.rejected,
      },
    })
  })

  router.get('/participant-trash', async (_req, res) => {
    const items = await registrationRepository.listParticipantTrash()
    res.json({ items })
  })

  router.post('/participants/:participantId/trash', async (req, res) => {
    const participantId = String(req.params.participantId ?? '').trim()
    const parsed = participantTrashSchema.parse(req.body)
    const before = await registrationRepository.getByParticipantId(participantId)
    if (!before) {
      return res.status(404).json({ error: 'Participant not found.', reason: 'not_found' })
    }

    const item = await registrationRepository.moveParticipantToTrash(participantId, res.locals.admin.email, parsed.reason)
    if (!item) {
      return res.status(404).json({ error: 'Participant not found.', reason: 'not_found' })
    }
    clearParticipantBoostCache(participantId)
    await auditRepository.record({
      actorEmail: res.locals.admin.email,
      actionKey: 'admin.participant_trash',
      entityType: 'participant',
      entityId: participantId,
      detail: {
        email: before.email,
        displayName: before.displayName,
        previousStatus: item.previousStatus,
        deleteAfter: item.deleteAfter,
        reason: parsed.reason,
      },
    })
    res.json({ item })
  })

  router.post('/participants/:participantId/restore', async (req, res) => {
    const participantId = String(req.params.participantId ?? '').trim()
    const item = await registrationRepository.restoreParticipantFromTrash(participantId, res.locals.admin.email)
    if (!item) {
      return res.status(404).json({ error: 'Trash entry not found.', reason: 'not_found' })
    }
    clearParticipantBoostCache(participantId)
    await auditRepository.record({
      actorEmail: res.locals.admin.email,
      actionKey: 'admin.participant_restore',
      entityType: 'participant',
      entityId: participantId,
      detail: {
        email: item.email,
        displayName: item.displayName,
        restoredStatus: item.currentStatus,
        deletedAt: item.deletedAt,
      },
    })
    res.json({ item })
  })

  const participantLeagueSchema = z.object({
    leagueType: z.enum(['rookie', 'veteran']),
  })

  router.post('/participants/:participantId/league', async (req, res) => {
    const participantId = String(req.params.participantId ?? '').trim()
    const parsed = participantLeagueSchema.parse(req.body)
    const before = await registrationRepository.getByParticipantId(participantId)
    if (!before) {
      return res.status(404).json({ error: 'Participant not found.', reason: 'not_found' })
    }
    try {
      const profile = await registrationRepository.setParticipantLeague(participantId, parsed.leagueType)
      await auditRepository.record({
        actorEmail: res.locals.admin.email,
        actionKey: 'admin.participant_league_change',
        entityType: 'participant',
        entityId: participantId,
        detail: { from: before.leagueType, to: profile.leagueType },
      })
      res.json({ participant: profile })
    } catch (error) {
      if (error instanceof LeagueChangeError) {
        const status = error.reason === 'invalid_league' ? 422 : error.reason === 'not_found' ? 404 : 409
        return res.status(status).json({ error: error.message, reason: error.reason })
      }
      throw error
    }
  })

  const correctUsernameSchema = z.object({
    soccerverseUsername: z.string().trim().min(1).max(60),
  })

  // Set or correct a participant's Soccerverse username from the admin panel. Existing links preserve
  // soccerverse_linked_at; empty links use the normal linking path and stamp the link date.
  router.post('/participants/:participantId/soccerverse-username', async (req, res) => {
    const participantId = String(req.params.participantId ?? '').trim()
    const parsed = correctUsernameSchema.parse(req.body)
    const before = await registrationRepository.getByParticipantId(participantId)
    if (!before) {
      return res.status(404).json({ error: 'Participant not found.', reason: 'not_found' })
    }
    try {
      const hadUsername = Boolean(before.soccerverseUsername?.trim())
      const profile = hadUsername
        ? await registrationRepository.correctSoccerverseUsername(participantId, parsed.soccerverseUsername)
        : await registrationRepository.linkSoccerverseAccount(participantId, parsed.soccerverseUsername)
      clearParticipantBoostCache(participantId)
      await auditRepository.record({
        actorEmail: res.locals.admin.email,
        actionKey: 'admin.participant_soccerverse_correction',
        entityType: 'participant',
        entityId: participantId,
        detail: { from: before.soccerverseUsername, to: profile.soccerverseUsername, mode: hadUsername ? 'correct' : 'link' },
      })
      res.json({ participant: profile })
    } catch (error) {
      if (error instanceof SoccerverseLinkError) {
        const status =
          error.reason === 'invalid_username' ? 422 : error.reason === 'not_found' ? 404 : 409
        return res.status(status).json({ error: error.message, reason: error.reason })
      }
      throw error
    }
  })

  const updateNationsSchema = z.object({
    primaryTeamCode: z.string().trim().toLowerCase().min(1).max(6),
    secondaryTeamCode: z.string().trim().toLowerCase().max(6).optional().nullable(),
  })

  // Edit a participant's nation picks (e.g. they skipped the optional secondary at registration and now
  // want one assigned, or picked the wrong nation). Updates only the picks, not league/boost/squad.
  // Locked once the tournament kicks off — see SOP_registration_and_auth.md "Correcting nation
  // selections (admin-initiated)".
  router.post('/participants/:participantId/nations', async (req, res) => {
    if (isAfterKickoff()) {
      return res.status(423).json({ error: 'Nation picks are locked after the tournament starts.', reason: 'locked' })
    }

    const participantId = String(req.params.participantId ?? '').trim()
    const parsed = updateNationsSchema.parse(req.body)
    const secondary = parsed.secondaryTeamCode?.trim() ? parsed.secondaryTeamCode.trim() : null

    if (!isKnownNationCode(parsed.primaryTeamCode)) {
      return res.status(422).json({ error: 'Unknown primary nation.', reason: 'invalid_primary' })
    }
    if (secondary && !isKnownNationCode(secondary)) {
      return res.status(422).json({ error: 'Unknown secondary nation.', reason: 'invalid_secondary' })
    }
    if (secondary && secondary === parsed.primaryTeamCode) {
      return res.status(422).json({ error: 'Secondary nation must differ from primary.', reason: 'same_nation' })
    }

    const before = await registrationRepository.getByParticipantId(participantId)
    if (!before) {
      return res.status(404).json({ error: 'Participant not found.', reason: 'not_found' })
    }

    try {
      const profile = await registrationRepository.updateParticipantNations(participantId, parsed.primaryTeamCode, secondary)
      await auditRepository.record({
        actorEmail: res.locals.admin.email,
        actionKey: 'admin.participant_nation_correction',
        entityType: 'participant',
        entityId: participantId,
        detail: {
          primaryFrom: before.primaryTeamCode,
          primaryTo: profile.primaryTeamCode,
          secondaryFrom: before.secondaryTeamCode ?? null,
          secondaryTo: profile.secondaryTeamCode ?? null,
        },
      })
      res.json({ participant: profile })
    } catch (error) {
      if (error instanceof NationUpdateError) {
        return res.status(404).json({ error: error.message, reason: error.reason })
      }
      throw error
    }
  })

  router.get('/referrals', async (_req, res) => {
    const items = await registrationRepository.getReferralAnalytics()
    res.json({ items })
  })

  router.get('/teams', async (_req, res) => {
    const selectionCounts = await teamPoolRepository.getTeamSelectionCounts()
    res.json({
      items: teams.map((team) => ({
        ...team,
        selectedCount: selectionCounts[team.code] ?? 0,
      })),
    })
  })

  router.get('/teams/:teamCode/selections', async (req, res) => {
    const teamCode = String(req.params.teamCode ?? '').trim().toUpperCase()
    if (!isKnownTeamCode(teamCode)) {
      return res.status(404).json({ error: 'Unknown team.' })
    }

    const items = await teamPoolRepository.listByTeam(teamCode)
    res.json({ items })
  })

  router.put('/teams/:teamCode/selections', async (req, res) => {
    const teamCode = String(req.params.teamCode ?? '').trim().toUpperCase()
    if (!isKnownTeamCode(teamCode)) {
      return res.status(404).json({ error: 'Unknown team.' })
    }

    const parsed = teamPlayersSchema.parse(req.body)
    const countryMismatch = findSuspiciousTeamPoolCountryMismatch(teamCode, parsed.players)
    if (countryMismatch) {
      return res.status(422).json({
        error: formatSuspiciousTeamPoolCountryMismatch(teamCode, countryMismatch),
        reason: 'suspicious_country_mismatch',
        expectedCountryId: countryMismatch.expectedCountryId,
        mismatchCount: countryMismatch.mismatchCount,
        playerCount: countryMismatch.playerCount,
        sample: countryMismatch.sample,
      })
    }

    const items = await teamPoolRepository.replaceTeamPlayers(teamCode, parsed.players)
    await auditRepository.record({
      actorEmail: res.locals.admin.email,
      actionKey: 'admin.team_pool_edit',
      entityType: 'team',
      entityId: teamCode,
      detail: { playerCount: items.length },
    })
    res.json({ items })
  })

  router.get('/teams/:teamCode/candidates', async (req, res) => {
    const teamCode = String(req.params.teamCode ?? '').trim().toUpperCase()
    const query = String(req.query.query ?? '').trim()
    // Opt-in: widen the search to the full player database, ignoring the team's nation filter.
    // Soccerverse stores one nationality per player, so a player who really belongs to this nation
    // but is stored under a different country can only be found via a full-database search.
    const allCountries = String(req.query.allCountries ?? '') === 'true'

    if (!isKnownTeamCode(teamCode)) {
      return res.status(404).json({ error: 'Unknown team.' })
    }
    if (query.length < 2 && !/^\d+$/.test(query)) {
      return res.json({ items: [] })
    }

    let countryId: string | undefined
    if (!allCountries) {
      countryId = getSoccerverseCountryId(teamCode)
      if (!countryId) {
        return res.status(422).json({ error: 'No Soccerverse country mapping exists for this team.' })
      }
    }

    const items = (await searchPlayersByCountryAndName(countryId, query)).map(withImageUrl)
    res.json({ items })
  })

  router.put('/scoring', async (req, res) => {
    if (isAfterKickoff()) {
      return res.status(423).json({ error: 'Scoring configuration is locked after kickoff.' })
    }

    const parsed = scoringSchema.parse(req.body)
    const updated = await configRepository.updateScoringConfig(parsed)
    await auditRepository.record({
      actorEmail: res.locals.admin.email,
      actionKey: 'admin.score_config_change',
      entityType: 'scoring_config',
      entityId: 'scoring',
      detail: { config: updated },
    })
    res.json({ item: updated })
  })

  router.post('/reveal/global', async (req, res) => {
    const parsed = globalRevealSchema.parse(req.body)
    const eventControls = await configRepository.updateEventControls({
      globalRevealProfiles: parsed.revealProfiles,
      globalRevealSquads: parsed.revealSquads,
    })
    await auditRepository.record({
      actorEmail: res.locals.admin.email,
      actionKey: 'admin.reveal_global',
      entityType: 'event_controls',
      entityId: 'global',
      detail: { revealProfiles: parsed.revealProfiles, revealSquads: parsed.revealSquads },
    })
    res.json({ eventControls })
  })

  router.post('/participants/resend-verification', async (req, res) => {
    const parsed = resendSchema.parse(req.body)
    const plainToken = generatePlainToken()
    const result = await registrationRepository.resendVerification(parsed.email, plainToken)

    if (!result) {
      return res.status(404).json({ error: 'Participant not found.' })
    }

    const verificationUrl = `${env.PUBLIC_WEB_URL}/verify?token=${plainToken}`
    const delivery = await sendVerificationMail(parsed.email, verificationUrl)

    await auditRepository.record({
      actorEmail: res.locals.admin.email,
      actionKey: 'admin.verification_resend',
      entityType: 'participant',
      entityId: result.record.participantId,
      detail: { email: parsed.email },
    })

    res.json({
      participantId: result.record.participantId,
      status: result.record.status,
      mailer: {
        accepted: delivery.accepted,
        rejected: delivery.rejected,
      },
    })
  })

  return router
}
