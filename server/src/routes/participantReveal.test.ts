import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { participantSessionCookieName } from '../config/auth.js'
import { createCsrfToken } from '../lib/csrf.js'
import { errorHandler } from '../middleware/errorHandler.js'
import { MemoryAuditRepository } from '../repositories/auditRepository.js'
import { MemoryFixtureRepository } from '../repositories/fixtureRepository.js'
import { MemoryParticipantRiskRepository } from '../repositories/participantRiskRepository.js'
import { MemoryParticipantSessionRepository } from '../repositories/participantSessionRepository.js'
import { MemoryRegistrationRepository } from '../repositories/registrationRepository.js'
import { MemorySquadRepository } from '../repositories/squadRepository.js'
import { MemoryTeamPoolRepository } from '../repositories/teamPoolRepository.js'
import { createParticipantRouter } from './participant.js'

const SESSION_TOKEN = 'reveal-session-token'

async function setup() {
  const pools = new MemoryTeamPoolRepository()
  const registrations = new MemoryRegistrationRepository()
  const created = await registrations.createPending(
    { email: 'reveal@example.com', displayName: 'Reveal Manager', primaryTeamCode: 'FRA', marketingOptIn: false },
    'verify-token',
  )
  await registrations.verifyByPlainToken('verify-token')
  const participantId = created.record.participantId

  const squads = new MemorySquadRepository(pools)
  const sessions = new MemoryParticipantSessionRepository(registrations)
  await sessions.createSession(participantId, SESSION_TOKEN, 3600)
  const audit = new MemoryAuditRepository()

  const app = express()
  app.use(express.json())
  app.use('/api/participant', createParticipantRouter(sessions, squads, new MemoryFixtureRepository(), registrations, audit, new MemoryParticipantRiskRepository()))
  app.use(errorHandler)

  const cookie = `${participantSessionCookieName}=${SESSION_TOKEN}`
  const csrf = createCsrfToken(SESSION_TOKEN, 'participant')
  return { app, audit, cookie, csrf, participantId }
}

describe('participant reveal audit (SOP "reveal actions")', () => {
  it('POST /reveal writes a participant.reveal audit entry scoped to the actor', async () => {
    const { app, audit, cookie, csrf, participantId } = await setup()

    const response = await request(app)
      .post('/api/participant/reveal')
      .set('Cookie', cookie)
      .set('x-csrf-token', csrf)
      .send({ revealSquad: false })

    expect(response.status).toBe(200)

    const reveal = (await audit.list()).find((entry) => entry.actionKey === 'participant.reveal')
    expect(reveal).toBeDefined()
    expect(reveal?.actorEmail).toBe('reveal@example.com')
    expect(reveal?.entityType).toBe('participant')
    expect(reveal?.entityId).toBe(participantId)
    expect(reveal?.detail).toMatchObject({ revealSquad: false })
  })
})
