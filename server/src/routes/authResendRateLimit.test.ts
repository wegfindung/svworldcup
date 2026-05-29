import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { errorHandler } from '../middleware/errorHandler.js'
import { MemoryAuditRepository } from '../repositories/auditRepository.js'
import { MemoryEmailMarketingRepository } from '../repositories/emailMarketingRepository.js'
import { MemoryParticipantRiskRepository } from '../repositories/participantRiskRepository.js'
import { MemoryParticipantSessionRepository } from '../repositories/participantSessionRepository.js'
import { MemoryRegistrationRepository } from '../repositories/registrationRepository.js'
import { MemorySquadRepository } from '../repositories/squadRepository.js'
import { MemoryTeamPoolRepository } from '../repositories/teamPoolRepository.js'
import { createAuthRouter } from './auth.js'

function setup() {
  const registrations = new MemoryRegistrationRepository()
  const sessions = new MemoryParticipantSessionRepository(registrations)
  const squads = new MemorySquadRepository(new MemoryTeamPoolRepository())
  const app = express()
  app.use(express.json())
  app.use(
    '/api/auth',
    createAuthRouter(registrations, sessions, squads, new MemoryEmailMarketingRepository(), new MemoryParticipantRiskRepository(), new MemoryAuditRepository()),
  )
  app.use(errorHandler)
  return { app }
}

describe('verification-resend rate limiting (SOP "Resend should be rate limited")', () => {
  it('throttles repeated resend requests for the same target email', async () => {
    const { app } = setup()
    // An unregistered email reaches the handler and 404s without touching the mailer; the limiter
    // increments on every request and blocks once the per-email budget (5) is exceeded.
    const statuses: number[] = []
    for (let i = 0; i < 6; i += 1) {
      const response = await request(app).post('/api/auth/resend-verification').send({ email: 'nobody@example.com' })
      statuses.push(response.status)
    }

    expect(statuses.slice(0, 5)).toEqual([404, 404, 404, 404, 404])
    expect(statuses[5]).toBe(429)
  })

  it('keeps a separate budget per target inbox', async () => {
    const { app } = setup()
    // Exhaust one inbox's budget, then a different inbox must still be served.
    for (let i = 0; i < 6; i += 1) {
      await request(app).post('/api/auth/resend-verification').send({ email: 'first@example.com' })
    }
    const other = await request(app).post('/api/auth/resend-verification').send({ email: 'second@example.com' })
    expect(other.status).toBe(404)
  })
})
