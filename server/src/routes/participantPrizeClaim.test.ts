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
import { MemoryPrizeClaimRepository } from '../repositories/prizeClaimRepository.js'
import { MemoryRegistrationRepository } from '../repositories/registrationRepository.js'
import { MemorySquadRepository } from '../repositories/squadRepository.js'
import { MemoryTeamPoolRepository } from '../repositories/teamPoolRepository.js'
import { createParticipantRouter } from './participant.js'

const SESSION_TOKEN = 'prize-claim-session-token'

async function setup(correctionEligible: boolean) {
  const pools = new MemoryTeamPoolRepository()
  const registrations = new MemoryRegistrationRepository()
  const created = await registrations.createPending(
    {
      email: 'winner@example.com',
      displayName: 'Prize Winner',
      primaryTeamCode: 'FRA',
      soccerverseUsername: 'UnregisteredName',
      marketingOptIn: false,
    },
    'verify-token',
  )
  await registrations.verifyByPlainToken('verify-token')
  const participantId = created.record.participantId

  const squads = new MemorySquadRepository(pools)
  const sessions = new MemoryParticipantSessionRepository(registrations)
  await sessions.createSession(participantId, SESSION_TOKEN, 3600)
  const audit = new MemoryAuditRepository()
  const prizeClaims = new MemoryPrizeClaimRepository(
    correctionEligible ? new Set([participantId]) : new Set(),
  )

  const app = express()
  app.use(express.json())
  app.use(
    '/api/participant',
    createParticipantRouter(
      sessions,
      squads,
      new MemoryFixtureRepository(),
      registrations,
      audit,
      new MemoryParticipantRiskRepository(),
      prizeClaims,
    ),
  )
  app.use(errorHandler)

  return {
    app,
    audit,
    registrations,
    participantId,
    cookie: `${participantSessionCookieName}=${SESSION_TOKEN}`,
    csrf: createCsrfToken(SESSION_TOKEN, 'participant'),
  }
}

describe('participant prize username correction', () => {
  it('lets an eligible winner replace an unregistered Soccerverse username and audits the change', async () => {
    const { app, audit, registrations, participantId, cookie, csrf } = await setup(true)

    const response = await request(app)
      .put('/api/participant/prize-claim/soccerverse-username')
      .set('Cookie', cookie)
      .set('x-csrf-token', csrf)
      .send({ soccerverseUsername: 'RegisteredName' })

    expect(response.status).toBe(200)
    expect(response.body.participant.soccerverseUsername).toBe('RegisteredName')
    expect((await registrations.getByParticipantId(participantId))?.soccerverseUsername).toBe(
      'RegisteredName',
    )

    const entry = (await audit.list()).find(
      (item) => item.actionKey === 'participant.prize_soccerverse_username_correction',
    )
    expect(entry).toMatchObject({
      actorEmail: 'winner@example.com',
      entityType: 'participant',
      entityId: participantId,
      detail: { from: 'UnregisteredName', to: 'RegisteredName' },
    })
  })

  it('rejects a username correction from a participant outside the configured payout list', async () => {
    const { app, registrations, participantId, cookie, csrf } = await setup(false)

    const response = await request(app)
      .put('/api/participant/prize-claim/soccerverse-username')
      .set('Cookie', cookie)
      .set('x-csrf-token', csrf)
      .send({ soccerverseUsername: 'RegisteredName' })

    expect(response.status).toBe(403)
    expect((await registrations.getByParticipantId(participantId))?.soccerverseUsername).toBe(
      'UnregisteredName',
    )
  })
})
