import { Router } from 'express'
import { z } from 'zod'
import {
  participantSessionCookieName,
  participantSessionTtlSeconds,
  shouldUseSecureCookies,
} from '../config/auth.js'
import { env } from '../config/env.js'
import { STARTING_BUDGET } from '../data/formation.js'
import { isKnownTeamCode } from '../data/worldCupSeed.js'
import { clearCookie, createCookie, parseCookies } from '../lib/cookies.js'
import { sendVerificationMail } from '../lib/mailer.js'
import { generatePlainToken } from '../lib/tokens.js'
import type { ParticipantSessionRepository } from '../repositories/participantSessionRepository.js'
import {
  ActiveRegistrationExistsError,
  type RegistrationRepository,
} from '../repositories/registrationRepository.js'

const registrationSchema = z
  .object({
    email: z.string().trim().email(),
    displayName: z.string().trim().min(2).max(40),
    soccerverseUsername: z.string().trim().max(60).optional(),
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
    if (!value.soccerverseUsername?.trim()) {
      return
    }
  })

const resendSchema = z.object({
  email: z.string().trim().email(),
})

export function createAuthRouter(
  registrationRepository: RegistrationRepository,
  participantSessionRepository: ParticipantSessionRepository,
) {
  const router = Router()

  router.post('/register', async (req, res) => {
    const parsed = registrationSchema.parse(req.body)
    const plainToken = generatePlainToken()

    try {
      const result = await registrationRepository.createPending(parsed, plainToken)
      const verificationUrl = `${env.PUBLIC_WEB_URL}/verify?token=${plainToken}`
      const delivery = await sendVerificationMail(parsed.email, verificationUrl)

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

  router.get('/verify', async (req, res) => {
    const token = String(req.query.token ?? '')
    if (!token) {
      return res.status(400).json({ error: 'Verification token is required.' })
    }

    const verified = await registrationRepository.verifyByPlainToken(token)
    if (!verified) {
      return res.status(404).json({ error: 'Verification token is invalid or expired.' })
    }

    const sessionToken = generatePlainToken()
    await participantSessionRepository.createSession(verified.participantId, sessionToken, participantSessionTtlSeconds)
    res.setHeader(
      'Set-Cookie',
      createCookie(participantSessionCookieName, sessionToken, {
        httpOnly: true,
        secure: shouldUseSecureCookies(),
        sameSite: 'Lax',
        maxAge: participantSessionTtlSeconds,
      }),
    )

    res.json({
      participantId: verified.participantId,
      email: verified.email,
      displayName: verified.displayName,
      leagueType: verified.leagueType,
      status: verified.status,
      verifiedAt: verified.verifiedAt,
      budgetLimit: STARTING_BUDGET,
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

    res.json({
      participant,
      budgetLimit: STARTING_BUDGET,
    })
  })

  router.post('/logout', async (req, res) => {
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
    const delivery = await sendVerificationMail(parsed.email, verificationUrl)

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

  return router
}
