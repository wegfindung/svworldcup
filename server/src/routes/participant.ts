import { Router } from 'express'
import { z } from 'zod'
import { createRequireParticipant } from '../middleware/participantAuth.js'
import type { ParticipantSessionRepository } from '../repositories/participantSessionRepository.js'
import { SquadValidationError, type SquadRepository } from '../repositories/squadRepository.js'

const assignPlayerSchema = z.object({
  slotKey: z.string().trim().min(1),
  playerId: z.coerce.number().int().positive(),
})

export function createParticipantRouter(
  participantSessionRepository: ParticipantSessionRepository,
  squadRepository: SquadRepository,
) {
  const router = Router()
  const requireParticipant = createRequireParticipant(participantSessionRepository)

  router.use(requireParticipant)

  router.get('/squad', async (_req, res) => {
    const participantId = res.locals.participant.participantId as string
    const squad = await squadRepository.getOrCreate(participantId)
    res.json({ squad })
  })

  router.post('/squad/assign', async (req, res) => {
    const participantId = res.locals.participant.participantId as string
    const parsed = assignPlayerSchema.parse(req.body)

    try {
      const squad = await squadRepository.assignPlayer(participantId, parsed)
      res.json({ squad })
    } catch (error) {
      if (error instanceof SquadValidationError) {
        return res.status(422).json({ error: error.message })
      }
      throw error
    }
  })

  router.delete('/squad/slots/:slotKey', async (req, res) => {
    const participantId = res.locals.participant.participantId as string
    try {
      const squad = await squadRepository.removePlayer(participantId, String(req.params.slotKey ?? ''))
      res.json({ squad })
    } catch (error) {
      if (error instanceof SquadValidationError) {
        return res.status(422).json({ error: error.message })
      }
      throw error
    }
  })

  router.post('/squad/reset', async (_req, res) => {
    const participantId = res.locals.participant.participantId as string
    try {
      const squad = await squadRepository.resetSquad(participantId)
      res.json({ squad })
    } catch (error) {
      if (error instanceof SquadValidationError) {
        return res.status(422).json({ error: error.message })
      }
      throw error
    }
  })

  router.post('/squad/lock', async (_req, res) => {
    const participantId = res.locals.participant.participantId as string
    try {
      const squad = await squadRepository.lockSquad(participantId)
      res.json({ squad })
    } catch (error) {
      if (error instanceof SquadValidationError) {
        return res.status(422).json({ error: error.message })
      }
      throw error
    }
  })

  return router
}
