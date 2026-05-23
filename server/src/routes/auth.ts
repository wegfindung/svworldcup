import { Router } from 'express'
import { z } from 'zod'
import {
  participantSessionCookieName,
  participantSessionTtlSeconds,
  shouldUseSecureCookies,
} from '../config/auth.js'
import { env } from '../config/env.js'
import { isKnownTeamCode } from '../data/worldCupSeed.js'
import { clearCookie, createCookie, parseCookies } from '../lib/cookies.js'
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
import { recordParticipantRiskEventAsync } from '../services/participantRisk.js'

const registrationSchema = z
  .object({
    email: z.string().trim().email(),
    displayName: z.string().trim().min(2).max(40),
    soccerverseUsername: z.string().trim().max(60).optional(),
    referrerSoccerverseUsername: z.string().trim().max(60).optional(),
    marketingOptIn: z.boolean().optional().default(false),
    browserLocale: z.enum(['en', 'es', 'de', 'fr', 'pt', 'ru', 'zh']).optional(),
    primaryTeamCode: z.string().trim().toUpperCase().length(3),
    secondaryTeamCode: z.string().trim().toUpperCase().length(3).optional(),
  })
  .superRefine((value, context) => {
    if (!isKnownTeamCode(value.primaryTeamCode)) {
      context.addIssue({
        code: 'custom',
        path: ['primaryTeamCode'],
        message: 'Unknown primary team code.',
      })
    }
    if (value.secondaryTeamCode && !isKnownTeamCode(value.secondaryTeamCode)) {
      context.addIssue({
        code: 'custom',
        path: ['secondaryTeamCode'],
        message: 'Unknown secondary team code.',
      })
    }
    if (value.secondaryTeamCode && value.secondaryTeamCode === value.primaryTeamCode) {
      context.addIssue({
        code: 'custom',
        path: ['secondaryTeamCode'],
        message: 'Secondary team must be different from primary team.',
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
) {
  const router = Router()
  const requireParticipantCsrf = createRequireCookieCsrf(participantSessionCookieName, 'participant')

  router.post('/register', async (req, res) => {
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
      const delivery = await sendVerificationMail(registrationInput.email, verificationUrl, registrationInput.browserLocale)
      void emailMarketingRepository.queueAutoresponders('registration_created', result.record).catch((error) => {
        console.error('Failed to queue registration autoresponder', error)
      })

      res.status(201).json({
        participantId: result.record.participantId,
        email: result.record.email,
        leagueType: result.record.leagueType,
        status: result.record.status,
        nextStep: 'verify_email',
        mailer: {
          accepted: delivery.accepted,
          rejected: delivery.rejected,
        },
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

  router.post('/resend-verification', async (req, res) => {
    const parsed = resendSchema.parse(req.body)
    const plainToken = generatePlainToken()
    const result = await registrationRepository.resendVerification(parsed.email, plainToken)

    if (!result) {
      return res.status(404).json({ error: 'Participant not found.' })
    }

    const verificationUrl = `${env.PUBLIC_WEB_URL}/verify?token=${plainToken}`
    const delivery = await sendVerificationMail(parsed.email, verificationUrl, result.record.browserLocale)

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

  router.post('/request-password-reset', async (req, res) => {
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
