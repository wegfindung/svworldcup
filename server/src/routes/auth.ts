import { Router } from 'express'
import rateLimit, { ipKeyGenerator } from 'express-rate-limit'
import { z } from 'zod'
import { canonicalizeEmail } from '../lib/emailCanonicalization.js'
import {
  participantSessionCookieName,
  participantSessionTtlSeconds,
  shouldUseSecureCookies,
} from '../config/auth.js'
import { env } from '../config/env.js'
import { hasRegistrationClosed } from '../data/competitionWindow.js'
import { isKnownNationCode } from '../data/soccerverseNations.js'
import { clearCookie, createCookie, parseCookies } from '../lib/cookies.js'
import { logger } from '../lib/logger.js'
import { createCsrfToken, createRequireCookieCsrf } from '../lib/csrf.js'
import { resolveBrowserLocale } from '../lib/locale.js'
import { sendPasswordResetMail, sendVerificationMail } from '../lib/mailer.js'
import { hashPassword } from '../lib/passwords.js'
import { generatePlainToken } from '../lib/tokens.js'
import type { ParticipantSquadSummary } from '../domain/types.js'
import type { ParticipantSessionRepository } from '../repositories/participantSessionRepository.js'
import {
  ActiveRegistrationExistsError,
  type RegistrationRepository,
} from '../repositories/registrationRepository.js'
import type { SquadRepository } from '../repositories/squadRepository.js'
import type { EmailMarketingRepository } from '../repositories/emailMarketingRepository.js'
import type { ParticipantRiskRepository } from '../repositories/participantRiskRepository.js'
import type { AuditRepository } from '../repositories/auditRepository.js'
import { recordParticipantRiskEventAsync } from '../services/participantRisk.js'

const registrationSchema = z
  .object({
    email: z.string().trim().email(),
    displayName: z.string().trim().min(2).max(40),
    soccerverseUsername: z.string().trim().max(60).optional(),
    referrerSoccerverseUsername: z.string().trim().max(60).optional(),
    marketingOptIn: z.boolean().optional().default(false),
    browserLocale: z.enum(['en', 'es', 'it', 'de', 'fr', 'pt', 'ru', 'zh', 'ja']).optional(),
    primaryTeamCode: z.string().trim().toLowerCase().max(6),
    secondaryTeamCode: z.string().trim().toLowerCase().max(6).optional(),
  })
  .superRefine((value, context) => {
    if (!isKnownNationCode(value.primaryTeamCode)) {
      context.addIssue({
        code: 'custom',
        path: ['primaryTeamCode'],
        message: 'Unknown primary nation.',
      })
    }
    if (value.secondaryTeamCode && !isKnownNationCode(value.secondaryTeamCode)) {
      context.addIssue({
        code: 'custom',
        path: ['secondaryTeamCode'],
        message: 'Unknown secondary nation.',
      })
    }
    if (value.secondaryTeamCode && value.secondaryTeamCode === value.primaryTeamCode) {
      context.addIssue({
        code: 'custom',
        path: ['secondaryTeamCode'],
        message: 'Secondary nation must be different from primary nation.',
      })
    }
  })

const resendSchema = z.object({
  email: z.string().trim().email(),
})

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(120),
})

const passwordSchema = z.object({
  password: z.string().min(8).max(120),
})

const passwordResetSchema = z.object({
  token: z.string().trim().min(12),
  password: z.string().min(8).max(120),
})

function buildSessionCookie(plainToken: string) {
  return createCookie(participantSessionCookieName, plainToken, {
    httpOnly: true,
    secure: shouldUseSecureCookies(),
    sameSite: 'Lax',
    maxAge: participantSessionTtlSeconds,
  })
}

function normalizeReferrerSoccerverseUsername(value?: string) {
  const trimmed = value?.trim().replace(/^@+/, '') ?? ''
  if (!trimmed) {
    return undefined
  }

  return trimmed.replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 60) || undefined
}

async function issueParticipantSession(participantId: string, participantSessionRepository: ParticipantSessionRepository) {
  const sessionToken = generatePlainToken()
  await participantSessionRepository.createSession(participantId, sessionToken, participantSessionTtlSeconds)
  return buildSessionCookie(sessionToken)
}

async function buildSquadSummary(participantId: string, squadRepository: SquadRepository): Promise<ParticipantSquadSummary> {
  const squad = await squadRepository.getOrCreate(participantId)

  return {
    budgetLimit: squad.budgetLimit,
    scoreMultiplier: squad.scoreMultiplier,
    budgetUsed: squad.budgetUsed,
    budgetRemaining: squad.budgetRemaining,
    draftedCount: squad.slots.filter((slot) => slot.player).length,
    isLocked: squad.isLocked,
  }
}

export function createAuthRouter(
  registrationRepository: RegistrationRepository,
  participantSessionRepository: ParticipantSessionRepository,
  squadRepository: SquadRepository,
  emailMarketingRepository: EmailMarketingRepository,
  participantRiskRepository: ParticipantRiskRepository,
  auditRepository: AuditRepository,
) {
  const router = Router()
  const requireParticipantCsrf = createRequireCookieCsrf(participantSessionCookieName, 'participant')

  // Dedicated throttle for the email-trigger endpoints (verification resend + password-reset request).
  // Both re-send an email to a caller-supplied address, so the abuse vector is inbox-bombing — far
  // stricter than the shared /api/auth limiter. Keyed by the canonical target inbox (gmail dot/plus
  // aliases collapse to one bucket), falling back to IP when no email is supplied. Defined per-router
  // so the store is fresh per app instance (no cross-test bleed). SOP_registration_and_auth.md:
  // "Resend should be rate limited."
  const emailTriggerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const raw = typeof (req.body as { email?: unknown } | undefined)?.email === 'string' ? (req.body as { email: string }).email : ''
      const canonical = raw.trim() ? canonicalizeEmail(raw).canonicalEmail : ''
      return canonical ? `email:${canonical}` : `ip:${ipKeyGenerator(req.ip ?? '')}`
    },
  })

  const registrationClosedMessage = 'Registration has closed for this event.'

  router.post('/register', async (req, res) => {
    if (hasRegistrationClosed()) {
      return res.status(403).json({ error: registrationClosedMessage })
    }

    const parsed = registrationSchema.parse(req.body)
    const registrationInput = {
      ...parsed,
      referrerSoccerverseUsername: normalizeReferrerSoccerverseUsername(parsed.referrerSoccerverseUsername),
      browserLocale: resolveBrowserLocale(parsed.browserLocale, req.header('accept-language')),
    }
    const plainToken = generatePlainToken()

    try {
      const result = await registrationRepository.createPending(registrationInput, plainToken)
      recordParticipantRiskEventAsync({
        repository: participantRiskRepository,
        participant: result.record,
        eventType: 'registration',
        request: req,
        checkMx: true,
      })
      const verificationUrl = `${env.PUBLIC_WEB_URL}/verify?token=${plainToken}`
      // Send the verification mail OFF the response path: during the registration rush a slow or throttled
      // SMTP must not delay (or fail) the 201. /resend-verification is the recovery path if a background
      // send misses. See SOP_registration_and_auth.md step 8.
      void sendVerificationMail(registrationInput.email, verificationUrl, registrationInput.browserLocale).catch((error) => {
        logger.error({ participantId: result.record.participantId, err: error }, 'failed to send verification mail')
      })
      void emailMarketingRepository.queueAutoresponders('registration_created', result.record).catch((error) => {
        console.error('Failed to queue registration autoresponder', error)
      })

      res.status(201).json({
        participantId: result.record.participantId,
        email: result.record.email,
        leagueType: result.record.leagueType,
        status: result.record.status,
        nextStep: 'verify_email',
        verificationPreviewUrl: verificationUrl,
      })
    } catch (error) {
      if (error instanceof ActiveRegistrationExistsError) {
        return res.status(409).json({ error: error.message })
      }
      throw error
    }
  })

  router.post('/login', async (req, res) => {
    const parsed = loginSchema.parse(req.body)
    const participant = await registrationRepository.authenticateWithPassword(parsed.email, parsed.password)

    if (!participant) {
      return res.status(401).json({ error: 'Email or password is invalid.' })
    }

    recordParticipantRiskEventAsync({
      repository: participantRiskRepository,
      participant,
      eventType: 'login',
      request: req,
    })
    const squadSummary = await buildSquadSummary(participant.participantId, squadRepository)
    const sessionCookie = await issueParticipantSession(participant.participantId, participantSessionRepository)
    const sessionToken = sessionCookie.match(new RegExp(`${participantSessionCookieName}=([^;]+)`))?.[1] ?? ''
    res.setHeader('Set-Cookie', sessionCookie)
    res.json({
      participant,
      budgetLimit: squadSummary.budgetLimit,
      squadSummary,
      csrfToken: createCsrfToken(decodeURIComponent(sessionToken), 'participant'),
    })
  })

  router.get('/verify', async (req, res) => {
    if (hasRegistrationClosed()) {
      return res.status(403).json({ error: registrationClosedMessage })
    }

    const token = String(req.query.token ?? '')
    if (!token) {
      return res.status(400).json({ error: 'Verification token is required.' })
    }

    const verified = await registrationRepository.verifyByPlainToken(token)
    if (!verified) {
      return res.status(404).json({ error: 'Verification token is invalid or expired.' })
    }

    const squadSummary = await buildSquadSummary(verified.participantId, squadRepository)
    recordParticipantRiskEventAsync({
      repository: participantRiskRepository,
      participant: verified,
      eventType: 'verify',
      request: req,
    })
    void emailMarketingRepository.queueAutoresponders('registration_verified', verified).catch((error) => {
      console.error('Failed to queue verification autoresponder', error)
    })
    const sessionCookie = await issueParticipantSession(verified.participantId, participantSessionRepository)
    const sessionToken = sessionCookie.match(new RegExp(`${participantSessionCookieName}=([^;]+)`))?.[1] ?? ''
    res.setHeader('Set-Cookie', sessionCookie)
    res.json({
      participantId: verified.participantId,
      email: verified.email,
      displayName: verified.displayName,
      leagueType: verified.leagueType,
      status: verified.status,
      verifiedAt: verified.verifiedAt,
      budgetLimit: squadSummary.budgetLimit,
      squadSummary,
      hasPassword: verified.hasPassword,
      csrfToken: createCsrfToken(decodeURIComponent(sessionToken), 'participant'),
    })
  })

  router.get('/me', async (req, res) => {
    const cookies = parseCookies(req.header('cookie'))
    const sessionToken = cookies[participantSessionCookieName]

    if (!sessionToken) {
      return res.status(401).json({ error: 'Participant session is required.' })
    }

    const participant = await participantSessionRepository.getParticipantBySessionToken(sessionToken)
    if (!participant) {
      return res.status(401).json({ error: 'Participant session is invalid or expired.' })
    }

    const squadSummary = await buildSquadSummary(participant.participantId, squadRepository)
    res.json({
      participant,
      budgetLimit: squadSummary.budgetLimit,
      squadSummary,
      csrfToken: createCsrfToken(sessionToken, 'participant'),
    })
  })

  router.post('/set-password', requireParticipantCsrf, async (req, res) => {
    const parsed = passwordSchema.parse(req.body)
    const cookies = parseCookies(req.header('cookie'))
    const sessionToken = cookies[participantSessionCookieName]

    if (!sessionToken) {
      return res.status(401).json({ error: 'Participant session is required.' })
    }

    const participant = await participantSessionRepository.getParticipantBySessionToken(sessionToken)
    if (!participant) {
      return res.status(401).json({ error: 'Participant session is invalid or expired.' })
    }

    const updated = await registrationRepository.setPassword(participant.participantId, hashPassword(parsed.password))
    if (!updated) {
      return res.status(404).json({ error: 'Participant not found.' })
    }

    await auditRepository.record({
      actorEmail: participant.email,
      actionKey: 'participant.password_set',
      entityType: 'participant',
      entityId: updated.participantId,
      detail: {},
    })

    const squadSummary = await buildSquadSummary(updated.participantId, squadRepository)
    res.json({
      participant: updated,
      budgetLimit: squadSummary.budgetLimit,
      squadSummary,
      csrfToken: createCsrfToken(sessionToken, 'participant'),
    })
  })

  router.post('/logout', requireParticipantCsrf, async (req, res) => {
    const cookies = parseCookies(req.header('cookie'))
    const sessionToken = cookies[participantSessionCookieName]
    if (sessionToken) {
      await participantSessionRepository.revokeSession(sessionToken)
    }

    res.setHeader(
      'Set-Cookie',
      clearCookie(participantSessionCookieName, {
        httpOnly: true,
        secure: shouldUseSecureCookies(),
        sameSite: 'Lax',
      }),
    )
    res.status(204).end()
  })

  router.post('/resend-verification', emailTriggerLimiter, async (req, res) => {
    if (hasRegistrationClosed()) {
      return res.status(403).json({ error: registrationClosedMessage })
    }

    const parsed = resendSchema.parse(req.body)
    const plainToken = generatePlainToken()
    const result = await registrationRepository.resendVerification(parsed.email, plainToken)

    if (!result) {
      return res.status(404).json({ error: 'Participant not found.' })
    }

    const verificationUrl = `${env.PUBLIC_WEB_URL}/verify?token=${plainToken}`
    const delivery = await sendVerificationMail(parsed.email, verificationUrl, result.record.browserLocale)

    await auditRepository.record({
      actorEmail: parsed.email,
      actionKey: 'participant.verification_resend',
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
      verificationPreviewUrl: verificationUrl,
    })
  })

  router.post('/request-password-reset', emailTriggerLimiter, async (req, res) => {
    const parsed = resendSchema.parse(req.body)
    const plainToken = generatePlainToken()
    const participant = await registrationRepository.createPasswordReset(parsed.email, plainToken)

    if (participant) {
      const resetUrl = `${env.PUBLIC_WEB_URL}/reset-password?token=${plainToken}`
      await sendPasswordResetMail(parsed.email, resetUrl, participant.browserLocale)
    }

    res.json({
      status: 'accepted',
    })
  })

  router.post('/reset-password', async (req, res) => {
    const parsed = passwordResetSchema.parse(req.body)
    const participant = await registrationRepository.resetPasswordByPlainToken(parsed.token, hashPassword(parsed.password))

    if (!participant) {
      return res.status(404).json({ error: 'Reset token is invalid or expired.' })
    }

    await auditRepository.record({
      actorEmail: participant.email,
      actionKey: 'participant.password_reset',
      entityType: 'participant',
      entityId: participant.participantId,
      detail: {},
    })

    const squadSummary = await buildSquadSummary(participant.participantId, squadRepository)
    const sessionCookie = await issueParticipantSession(participant.participantId, participantSessionRepository)
    const sessionToken = sessionCookie.match(new RegExp(`${participantSessionCookieName}=([^;]+)`))?.[1] ?? ''
    res.setHeader('Set-Cookie', sessionCookie)
    res.json({
      participant,
      budgetLimit: squadSummary.budgetLimit,
      squadSummary,
      csrfToken: createCsrfToken(decodeURIComponent(sessionToken), 'participant'),
    })
  })

  return router
}
