import type { RequestHandler } from 'express'
import { participantSessionCookieName } from '../config/auth.js'
import { parseCookies } from '../lib/cookies.js'
import type { ParticipantSessionRepository } from '../repositories/participantSessionRepository.js'

export function createRequireParticipant(participantSessionRepository: ParticipantSessionRepository): RequestHandler {
  return async (req, res, next) => {
    const cookies = parseCookies(req.header('cookie'))
    const sessionToken = cookies[participantSessionCookieName]

    if (!sessionToken) {
      return res.status(401).json({ error: 'Participant authentication is required.' })
    }

    const participant = await participantSessionRepository.getParticipantBySessionToken(sessionToken)
    if (!participant) {
      return res.status(401).json({ error: 'Participant session is invalid or expired.' })
    }

    res.locals.participant = participant
    res.locals.participantSessionToken = sessionToken
    next()
  }
}
