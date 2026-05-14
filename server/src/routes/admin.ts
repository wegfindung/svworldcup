import { Router } from 'express'
import { z } from 'zod'
import { adminSessionCookieName, adminSessionTtlSeconds, shouldUseSecureCookies } from '../config/auth.js'
import { env } from '../config/env.js'
import { isKnownTeamCode, teams } from '../data/worldCupSeed.js'
import { clearCookie, createCookie } from '../lib/cookies.js'
import { sendVerificationMail } from '../lib/mailer.js'
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
import type { EmailMarketingRepository } from '../repositories/emailMarketingRepository.js'
import { createMatchImportRouter } from './matchImport.js'
import { scoringDefaults } from '../data/scoringDefaults.js'
import { getSoccerverseCountryId } from '../data/teamCountryMap.js'
import { searchPlayersByCountryAndName, withImageUrl } from '../services/soccerverse.js'

const scoringSchema = z.object({
  goal: z.coerce.number().min(0).max(20),
  assist: z.coerce.number().min(0).max(20),
  cleanSheet: z.coerce.number().min(0).max(20),
  appearance: z.coerce.number().min(0).max(20),
  minutes: z.coerce.number().min(0).max(20),
  performancePointsMin: z.coerce.number().min(0).max(5),
  performancePointsMax: z.coerce.number().min(0).max(5),
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

const matchEntrySchema = z.object({
  fixtureId: z.string().trim().min(1).max(120),
  playerId: z.coerce.number().int().positive(),
  inOfficialSquad: z.boolean(),
  minutes: z.coerce.number().int().min(0).max(130),
  goals: z.coerce.number().int().min(0).max(20),
  assists: z.coerce.number().int().min(0).max(20),
  cleanSheetEligible: z.boolean().default(false),
  performancePoints: z.coerce.number().min(0).max(5).optional(),
  sourceNote: z.string().trim().max(200).optional(),
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
  audienceStatus: z.enum(['all', 'pending_verification', 'active']).default('active'),
  scheduledAt: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((value) => value || undefined),
  delayMinutes: z.coerce.number().int().min(0).max(60 * 24 * 30).optional(),
  batchSize: z.coerce.number().int().min(1).max(500).optional(),
})

const emailTestSchema = emailCampaignSchema.extend({
  recipient: z.string().trim().email(),
})

function isScoringLocked(): boolean {
  if (!env.TOURNAMENT_KICKOFF_AT) {
    return false
  }

  return Date.now() >= env.TOURNAMENT_KICKOFF_AT.getTime()
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
) {
  const router = Router()
  const requireAdmin = createRequireAdmin(adminRepository)

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

    res.json({
      admin: {
        adminId: admin.adminId,
        email: admin.email,
      },
    })
  })

  router.get('/session', requireAdmin, async (_req, res) => {
    res.json({ admin: res.locals.admin })
  })

  router.post('/logout', requireAdmin, async (req, res) => {
    const cookie = req.header('cookie') ?? ''
    const match = cookie
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${adminSessionCookieName}=`))
    const token = match ? decodeURIComponent(match.slice(`${adminSessionCookieName}=`.length)) : ''
    if (token) {
      await adminRepository.revokeSession(token)
    }

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

  router.use(
    '/match-import',
    createMatchImportRouter({
      matchImportRepository,
      matchMappingRepository,
      teamPoolRepository,
      scoringRepository,
      auditRepository,
    }),
  )

  router.get('/email-marketing/campaigns', async (_req, res) => {
    const campaigns = await emailMarketingRepository.listCampaigns()
    res.json({ campaigns })
  })

  router.post('/email-marketing/campaigns', async (req, res) => {
    const parsed = emailCampaignSchema.parse(req.body)
    const campaign = await emailMarketingRepository.saveCampaign(parsed, res.locals.admin.email)
    res.status(parsed.campaignId ? 200 : 201).json({ campaign })
  })

  router.delete('/email-marketing/campaigns/:campaignId', async (req, res) => {
    const deleted = await emailMarketingRepository.deleteCampaign(String(req.params.campaignId))
    if (!deleted) {
      return res.status(404).json({ error: 'Campaign not found.' })
    }
    res.status(204).end()
  })

  router.get('/email-marketing/campaigns/:campaignId/recipients', async (req, res) => {
    const recipients = await emailMarketingRepository.listRecipients(String(req.params.campaignId))
    res.json({ recipients })
  })

  router.post('/email-marketing/campaigns/:campaignId/send-now', async (req, res) => {
    const result = await emailMarketingRepository.sendNow(String(req.params.campaignId))
    res.json({ result })
  })

  router.post('/email-marketing/test', async (req, res) => {
    const parsed = emailTestSchema.parse(req.body)
    await emailMarketingRepository.sendTestMail(parsed, res.locals.admin.email)
    res.json({ status: 'sent' })
  })

  router.post('/email-marketing/run-due', async (req, res) => {
    const limit = z.object({ limit: z.coerce.number().int().min(1).max(50).default(10) }).parse(req.body).limit
    const results = await emailMarketingRepository.runDueCampaigns(limit)
    res.json({ results })
  })

  router.get('/overview', async (_req, res) => {
    const counts = await registrationRepository.getCounts()
    const scoring = await configRepository.getScoringConfig()
    const eventControls = await configRepository.getEventControls()
    const selectionCounts = await teamPoolRepository.getTeamSelectionCounts()
    res.json({
      counts,
      scoring,
      eventControls,
      scoringLocked: isScoringLocked(),
      defaults: scoringDefaults,
      teamSelectionCounts: selectionCounts,
    })
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
    const items = await teamPoolRepository.replaceTeamPlayers(teamCode, parsed.players)
    res.json({ items })
  })

  router.get('/teams/:teamCode/candidates', async (req, res) => {
    const teamCode = String(req.params.teamCode ?? '').trim().toUpperCase()
    const query = String(req.query.query ?? '').trim()

    if (!isKnownTeamCode(teamCode)) {
      return res.status(404).json({ error: 'Unknown team.' })
    }
    if (query.length < 2 && !/^\d+$/.test(query)) {
      return res.json({ items: [] })
    }

    const countryId = getSoccerverseCountryId(teamCode)
    if (!countryId) {
      return res.status(422).json({ error: 'No Soccerverse country mapping exists for this team.' })
    }

    const items = (await searchPlayersByCountryAndName(countryId, query)).map(withImageUrl)
    res.json({ items })
  })

  router.put('/scoring', async (req, res) => {
    if (isScoringLocked()) {
      return res.status(423).json({ error: 'Scoring configuration is locked after kickoff.' })
    }

    const parsed = scoringSchema.parse(req.body)
    const updated = await configRepository.updateScoringConfig(parsed)
    res.json({ item: updated })
  })

  router.get('/match-entries', async (req, res) => {
    const fixtureId = typeof req.query.fixtureId === 'string' ? req.query.fixtureId.trim() : undefined
    const items = await scoringRepository.listMatchEntries(fixtureId || undefined)
    res.json({ items })
  })

  router.put('/match-entries', async (req, res) => {
    const parsed = matchEntrySchema.parse(req.body)
    const item = await scoringRepository.upsertMatchEntry(parsed)
    res.json({ item })
  })

  router.post('/reveal/global', async (req, res) => {
    const parsed = globalRevealSchema.parse(req.body)
    const eventControls = await configRepository.updateEventControls({
      globalRevealProfiles: parsed.revealProfiles,
      globalRevealSquads: parsed.revealSquads,
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
