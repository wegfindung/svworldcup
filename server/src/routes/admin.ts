import { Router } from 'express'
import { z } from 'zod'
import { env } from '../config/env.js'
import { scoringDefaults } from '../data/scoringDefaults.js'
import { requireAdmin } from '../middleware/adminAuth.js'
import { sendVerificationMail } from '../lib/mailer.js'
import { generatePlainToken } from '../lib/tokens.js'
import type { ConfigRepository } from '../repositories/configRepository.js'
import type { RegistrationRepository } from '../repositories/registrationRepository.js'

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

function isScoringLocked(): boolean {
  if (!env.TOURNAMENT_KICKOFF_AT) {
    return false
  }

  return Date.now() >= env.TOURNAMENT_KICKOFF_AT.getTime()
}

export function createAdminRouter(
  registrationRepository: RegistrationRepository,
  configRepository: ConfigRepository,
) {
  const router = Router()

  router.use(requireAdmin)

  router.get('/overview', async (_req, res) => {
    const counts = await registrationRepository.getCounts()
    const scoring = await configRepository.getScoringConfig()
    res.json({
      counts,
      scoring,
      scoringLocked: isScoringLocked(),
      defaults: scoringDefaults,
    })
  })

  router.put('/scoring', async (req, res) => {
    if (isScoringLocked()) {
      return res.status(423).json({ error: 'Scoring configuration is locked after kickoff.' })
    }

    const parsed = scoringSchema.parse(req.body)
    const updated = await configRepository.updateScoringConfig(parsed)
    res.json({ item: updated })
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
