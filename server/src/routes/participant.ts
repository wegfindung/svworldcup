import { Router } from 'express'
import { z } from 'zod'
import { createRequireParticipant } from '../middleware/participantAuth.js'
import { participantSessionCookieName } from '../config/auth.js'
import { createRequireCookieCsrf } from '../lib/csrf.js'
import { parseShareSnapshotPayload } from '../lib/sharePayload.js'
import { createSignedShareSnapshot } from '../lib/shareSignature.js'
import type { AuditRepository } from '../repositories/auditRepository.js'
import type { ParticipantSessionRepository } from '../repositories/participantSessionRepository.js'
import {
  SoccerverseLinkError,
  publicProfileSlug,
  type RegistrationRepository,
} from '../repositories/registrationRepository.js'
import { SquadValidationError, type SquadRepository } from '../repositories/squadRepository.js'

const assignPlayerSchema = z.object({
  slotKey: z.string().trim().min(1),
  playerId: z.coerce.number().int().positive(),
})

const budgetSchema = z.object({
  budgetLimit: z.coerce.number().int().positive(),
})

const linkSoccerverseSchema = z.object({
  soccerverseUsername: z.string().trim().min(1).max(60),
})

export function createParticipantRouter(
  participantSessionRepository: ParticipantSessionRepository,
  squadRepository: SquadRepository,
  registrationRepository: RegistrationRepository,
  auditRepository: AuditRepository,
) {
  const router = Router()
  const requireParticipant = createRequireParticipant(participantSessionRepository)
  const requireParticipantCsrf = createRequireCookieCsrf(participantSessionCookieName, 'participant')

  router.use(requireParticipant)
  router.use(requireParticipantCsrf)

  router.get('/squad', async (_req, res) => {
    const participantId = res.locals.participant.participantId as string
    const squad = await squadRepository.getOrCreate(participantId)
    res.json({ squad })
  })

  router.post('/squad/budget', async (req, res) => {
    const participantId = res.locals.participant.participantId as string
    const parsed = budgetSchema.parse(req.body)

    try {
      const squad = await squadRepository.setBudget(participantId, parsed.budgetLimit)
      res.json({ squad })
    } catch (error) {
      if (error instanceof SquadValidationError) {
        return res.status(422).json({ error: error.message })
      }
      throw error
    }
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

  router.post('/link-soccerverse', async (req, res) => {
    const participantId = res.locals.participant.participantId as string
    const parsed = linkSoccerverseSchema.parse(req.body)

    try {
      const profile = await registrationRepository.linkSoccerverseAccount(participantId, parsed.soccerverseUsername)
      await auditRepository.record({
        actorEmail: profile.email,
        actionKey: 'participant.link_soccerverse',
        entityType: 'participant',
        entityId: participantId,
        detail: { soccerverseUsername: profile.soccerverseUsername },
      })
      res.json({ participant: profile })
    } catch (error) {
      if (error instanceof SoccerverseLinkError) {
        const status = error.reason === 'invalid_username' ? 422 : error.reason === 'not_found' ? 404 : 409
        return res.status(status).json({ error: error.message, reason: error.reason })
      }
      throw error
    }
  })

  router.post('/reveal', async (req, res) => {
    const participantId = res.locals.participant.participantId as string
    const parsed = z.object({ revealSquad: z.boolean().default(false) }).parse(req.body)
    if (parsed.revealSquad) {
      const squad = await squadRepository.getOrCreate(participantId)
      if (!squad.isLocked) {
        return res.status(409).json({ error: 'Lock your squad before revealing it publicly.' })
      }
    }

    const profile = await registrationRepository.revealParticipant(participantId, parsed.revealSquad)
    if (!profile) {
      return res.status(404).json({ error: 'Participant not found.' })
    }

    res.json({
      participant: profile,
      publicProfileUrl: `/profiles/${publicProfileSlug(profile.displayName, profile.participantId)}`,
    })
  })

  router.post('/share-snapshot', async (req, res) => {
    const participantId = res.locals.participant.participantId as string
    const participant = res.locals.participant
    const payload = parseShareSnapshotPayload(req.body)

    if (payload.managerName !== participant.displayName) {
      return res.status(422).json({ error: 'Share payload manager does not match the active account.' })
    }

    const squad = await squadRepository.getOrCreate(participantId)
    if (!squad.isLocked) {
      return res.status(409).json({ error: 'Lock your squad before creating a signed share preview.' })
    }

    const draftedPlayerIds = new Set(squad.slots.map((slot) => slot.player?.playerId).filter((playerId): playerId is number => Boolean(playerId)))
    const containsOnlyDraftedPlayers = payload.featuredPlayers.every((player) => draftedPlayerIds.has(player.playerId))
    if (!containsOnlyDraftedPlayers) {
      return res.status(422).json({ error: 'Share payload contains players outside the submitted squad.' })
    }

    const signed = createSignedShareSnapshot(payload)
    res.json({
      sharePath: signed.snapshotPath,
      cardPath: signed.cardPath,
    })
  })

  return router
}
