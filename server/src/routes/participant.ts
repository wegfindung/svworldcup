import { Router } from 'express'
import { z } from 'zod'
import { createRequireParticipant } from '../middleware/participantAuth.js'
import { participantSessionCookieName } from '../config/auth.js'
import { createRequireCookieCsrf } from '../lib/csrf.js'
import { parseShareSnapshotPayload } from '../lib/sharePayload.js'
import { createSignedShareSnapshot } from '../lib/shareSignature.js'
import type { AuditRepository } from '../repositories/auditRepository.js'
import type { FixtureRepository } from '../repositories/fixtureRepository.js'
import type { ParticipantSessionRepository } from '../repositories/participantSessionRepository.js'
import {
  SoccerverseLinkError,
  publicProfileSlug,
  type RegistrationRepository,
} from '../repositories/registrationRepository.js'
import { SquadValidationError, type SquadRepository } from '../repositories/squadRepository.js'
import type { ParticipantRiskRepository } from '../repositories/participantRiskRepository.js'
import { recordParticipantRiskEventAsync } from '../services/participantRisk.js'
import { SwapValidationError } from '../lib/swapGate.js'
import { buildSwapWindows, getOpenSwapWindow, hasSwapHardStopPassed, swapHardStopEpoch } from '../data/swapWindows.js'
import { getParticipantBoost, type BoostDraftedPlayer } from '../services/participantBoost.js'
import { isEmailLikeUsername, SOCCERVERSE_USERNAME_EMAIL_MESSAGE } from '../lib/soccerverseUsername.js'

const assignPlayerSchema = z.object({
  slotKey: z.string().trim().min(1),
  playerId: z.coerce.number().int().positive(),
})

const budgetSchema = z.object({
  budgetLimit: z.coerce.number().int().positive(),
})

const linkSoccerverseSchema = z.object({
  soccerverseUsername: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .refine((value) => !isEmailLikeUsername(value), { message: SOCCERVERSE_USERNAME_EMAIL_MESSAGE }),
})

const swapSchema = z.object({
  playerInId: z.coerce.number().int().positive(),
  playerOutId: z.coerce.number().int().positive(),
})

export function createParticipantRouter(
  participantSessionRepository: ParticipantSessionRepository,
  squadRepository: SquadRepository,
  fixtureRepository: FixtureRepository,
  registrationRepository: RegistrationRepository,
  auditRepository: AuditRepository,
  participantRiskRepository: ParticipantRiskRepository,
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

  router.post('/squad/lock', async (req, res) => {
    const participantId = res.locals.participant.participantId as string
    try {
      const squad = await squadRepository.lockSquad(participantId)
      await auditRepository.record({
        actorEmail: res.locals.participant.email,
        actionKey: 'participant.squad_lock',
        entityType: 'squad',
        entityId: squad.squadId,
        detail: { budgetLimit: squad.budgetLimit, lockedAt: squad.lockedAt },
      })
      recordParticipantRiskEventAsync({
        repository: participantRiskRepository,
        participant: res.locals.participant,
        eventType: 'squad_lock',
        request: req,
      })
      res.json({ squad })
    } catch (error) {
      if (error instanceof SquadValidationError) {
        return res.status(422).json({ error: error.message })
      }
      throw error
    }
  })

  // Mid-tournament player swap (separate mutation path — bypasses assertSquadEditable, gated by
  // assertSwapAllowed). See SOP_scoring_and_leagues.md "Player Swaps".
  router.post('/squad/swap', async (req, res) => {
    const participant = res.locals.participant
    const parsed = swapSchema.parse(req.body)

    try {
      const fixtures = await fixtureRepository.listFixtures()
      const result = await squadRepository.swapPlayers(participant.participantId, parsed, fixtures)
      await auditRepository.record({
        actorEmail: participant.email,
        actionKey: 'participant.squad_swap',
        entityType: 'squad',
        entityId: result.swap.squadId,
        detail: {
          windowKey: result.windowKey,
          roundKey: result.targetRound,
          slotClass: result.swap.slotClass,
          playerIn: result.swap.playerInId,
          playerOut: result.swap.playerOutId,
        },
      })
      const squad = await squadRepository.getOrCreate(participant.participantId)
      res.json({ swap: result, squad })
    } catch (error) {
      if (error instanceof SwapValidationError || error instanceof SquadValidationError) {
        return res.status(422).json({ error: error.message })
      }
      throw error
    }
  })

  // Swap state for the UI: the window list, the open window (if any), per-window usage, the hard
  // stop, and this participant's swap history.
  router.get('/squad/swaps', async (_req, res) => {
    const participantId = res.locals.participant.participantId as string
    const [history, fixtures] = await Promise.all([squadRepository.listSwaps(participantId), fixtureRepository.listFixtures()])
    const windows = buildSwapWindows(fixtures)
    const now = Date.now()
    const swapsUsedByWindow: Record<string, number> = {}
    for (const window of windows) {
      swapsUsedByWindow[window.key] = history.filter((record) => record.windowKey === window.key).length
    }

    // The effective lineup the next swap operates on: the most forward-looking round snapshot, or the
    // lock-time squad if none exists yet. squad_slots stays the immutable lock-time draft, so the UI
    // must read the current starter/reserve split from here, not from /squad. Player display info is
    // joined client-side by playerId against the squad slots.
    const roundSlots = await squadRepository.listRoundLineupSlots(participantId)
    let currentLineup: Array<{ slotKey: string; slotGroup: 'starter' | 'sub'; slotClass: 'GK' | 'DEF' | 'MID' | 'FWD'; playerId: number }>
    if (roundSlots.length > 0) {
      const maxRound = Math.max(...roundSlots.map((slot) => slot.roundKey))
      currentLineup = roundSlots
        .filter((slot) => slot.roundKey === maxRound)
        .map((slot) => ({ slotKey: slot.slotKey, slotGroup: slot.slotGroup, slotClass: slot.slotClass, playerId: slot.playerId }))
    } else {
      const squad = await squadRepository.getOrCreate(participantId)
      currentLineup = squad.slots
        .filter((slot) => slot.player)
        .map((slot) => ({ slotKey: slot.key, slotGroup: slot.slotGroup, slotClass: slot.slotClass, playerId: slot.player!.playerId }))
    }

    res.json({
      history,
      windows,
      openWindow: getOpenSwapWindow(now, fixtures),
      swapsUsedByWindow,
      hardStopAt: swapHardStopEpoch(fixtures),
      hasHardStopPassed: hasSwapHardStopPassed(now, fixtures),
      currentLineup,
    })
  })

  // Live ownership-boost standing per drafted player (current net influence since the event-link cutoff
  // up to now). Linked accounts only; computed on demand + cached per participant. See
  // SOP_scoring_and_leagues.md "Participant boost view (live, on-demand)".
  router.get('/boost', async (req, res) => {
    const participantId = res.locals.participant.participantId as string
    const profile = await registrationRepository.getByParticipantId(participantId)
    if (!profile?.soccerverseUsername) {
      return res.json({ linked: false })
    }

    // Cutoff = event-link date: the link timestamp when the account was linked after registering, else
    // (Veteran who registered already carrying a username, no link timestamp stored) registration time.
    // This matches the cutoff scoring uses, so the live view agrees with the points actually scored.
    const cutoffIso = profile.soccerverseLinkedAt ?? profile.createdAt
    const cutoffUnix = cutoffIso ? Math.floor(new Date(cutoffIso).getTime() / 1000) : 0

    const squad = await squadRepository.getOrCreate(participantId)
    const players: BoostDraftedPlayer[] = squad.slots
      .filter((slot) => slot.player)
      .map((slot) => ({
        playerId: slot.player!.playerId,
        displayName: slot.player!.displayName,
        teamCode: slot.player!.teamCode,
        imageUrl: slot.player!.imageUrl,
      }))

    const refresh = req.query.refresh === '1' || req.query.refresh === 'true'
    const { computedAt, players: rows } = await getParticipantBoost(participantId, profile.soccerverseUsername, cutoffUnix, players, {
      refresh,
    })
    res.json({ linked: true, computedAt, players: rows })
  })

  router.post('/link-soccerverse', async (req, res) => {
    const participantId = res.locals.participant.participantId as string
    const participant = res.locals.participant
    const parsed = linkSoccerverseSchema.parse(req.body)

    try {
      const profile = await registrationRepository.linkSoccerverseAccount(participantId, parsed.soccerverseUsername)
      await auditRepository.record({
        actorEmail: profile.email,
        actionKey: 'participant.link_soccerverse',
        entityType: 'participant',
        entityId: participantId,
        detail: { soccerverseUsername: profile.soccerverseUsername, fromLeagueType: participant.leagueType, toLeagueType: profile.leagueType },
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

    await auditRepository.record({
      actorEmail: res.locals.participant.email,
      actionKey: 'participant.reveal',
      entityType: 'participant',
      entityId: participantId,
      detail: { revealSquad: parsed.revealSquad },
    })

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
