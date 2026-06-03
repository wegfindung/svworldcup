import express from 'express'
import request from 'supertest'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Control the mailer so we can prove registration is decoupled from the verification send.
const sendVerificationMail = vi.fn()
vi.mock('../lib/mailer.js', () => ({
  sendVerificationMail: (...args: unknown[]) => sendVerificationMail(...args),
  sendPasswordResetMail: vi.fn(),
}))
// The risk event does a background MX check; stub it out so the test stays offline/deterministic.
vi.mock('../services/participantRisk.js', () => ({
  recordParticipantRiskEventAsync: vi.fn(),
}))

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

const validRegistration = { email: 'newuser@example.com', displayName: 'New User', primaryTeamCode: 'br' }

afterEach(() => {
  sendVerificationMail.mockReset()
})

describe('POST /register — verification mail is off the response path', () => {
  it('returns 201 even when the verification send fails, and still attempts the send', async () => {
    sendVerificationMail.mockRejectedValue(new Error('smtp down'))
    const { app } = setup()

    const response = await request(app).post('/api/auth/register').send(validRegistration)

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({ nextStep: 'verify_email', email: 'newuser@example.com' })
    expect(response.body.participantId).toBeTruthy()
    expect(sendVerificationMail).toHaveBeenCalledOnce()
  })

  it('no longer exposes inline mailer delivery in the response (send result is not awaited)', async () => {
    sendVerificationMail.mockResolvedValue({ accepted: ['newuser@example.com'], rejected: [] })
    const { app } = setup()

    const response = await request(app).post('/api/auth/register').send(validRegistration)

    expect(response.status).toBe(201)
    expect(response.body.mailer).toBeUndefined()
    expect(response.body.verificationPreviewUrl).toContain('/verify?token=')
  })

  it('rejects a soccerverseUsername that contains @ (an email pasted by mistake)', async () => {
    const { app } = setup()

    const response = await request(app)
      .post('/api/auth/register')
      .send({ ...validRegistration, soccerverseUsername: 'newuser@example.com' })

    expect(response.status).toBe(400)
    expect(sendVerificationMail).not.toHaveBeenCalled()
  })
})
