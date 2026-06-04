import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { adminSessionCookieName } from '../config/auth.js'
import { createCsrfToken } from '../lib/csrf.js'
import { errorHandler } from '../middleware/errorHandler.js'
import type { AdminRepository } from '../repositories/adminRepository.js'
import { MemoryAuditRepository } from '../repositories/auditRepository.js'
import { MemoryConfigRepository } from '../repositories/configRepository.js'
import { MemoryEmailMarketingRepository } from '../repositories/emailMarketingRepository.js'
import { MemoryLandingAnalyticsRepository } from '../repositories/landingAnalyticsRepository.js'
import { MemoryMatchImportRepository } from '../repositories/matchImportRepository.js'
import { MemoryMatchMappingRepository } from '../repositories/matchMappingRepository.js'
import { MemoryParticipantInfluenceSnapshotRepository } from '../repositories/participantInfluenceSnapshotRepository.js'
import { MemoryParticipantRiskRepository } from '../repositories/participantRiskRepository.js'
import { MemoryRegistrationRepository } from '../repositories/registrationRepository.js'
import { MemoryScoringRepository } from '../repositories/scoringRepository.js'
import { MemorySnapshotJobRepository } from '../repositories/snapshotJobRepository.js'
import { MemorySquadRepository } from '../repositories/squadRepository.js'
import { MemoryTeamPoolRepository } from '../repositories/teamPoolRepository.js'
import { createAdminRouter } from './admin.js'

const adminSessionToken = 'admin-test-session'

function createTestAdminRepository(): AdminRepository {
  return {
    storageKind: 'memory',
    authenticate: async () => null,
    createSession: async () => undefined,
    getAdminBySessionToken: async (token) =>
      token === adminSessionToken
        ? {
            adminId: 'admin-test-id',
            email: 'admin@example.com',
            isActive: true,
          }
        : null,
    revokeSession: async () => undefined,
  }
}

function adminRequest(requestBuilder: request.Test) {
  return requestBuilder
    .set('Cookie', `${adminSessionCookieName}=${adminSessionToken}`)
    .set('x-csrf-token', createCsrfToken(adminSessionToken, 'admin'))
}

function setup() {
  const registrations = new MemoryRegistrationRepository()
  const config = new MemoryConfigRepository()
  const teamPool = new MemoryTeamPoolRepository()
  const squads = new MemorySquadRepository(teamPool)
  const snapshotRepository = new MemoryParticipantInfluenceSnapshotRepository()
  const scoring = new MemoryScoringRepository(config, registrations, squads, snapshotRepository)
  const audit = new MemoryAuditRepository()

  const app = express()
  app.use(express.json())
  app.use(
    '/api/admin',
    createAdminRouter(
      createTestAdminRepository(),
      registrations,
      config,
      teamPool,
      scoring,
      new MemoryMatchImportRepository(),
      new MemoryMatchMappingRepository(),
      audit,
      new MemoryEmailMarketingRepository(),
      new MemorySnapshotJobRepository(),
      new MemoryParticipantRiskRepository(),
      squads,
      new MemoryLandingAnalyticsRepository(),
    ),
  )
  app.use(errorHandler)

  return { app, audit, registrations }
}

describe('POST /api/admin/participants/:participantId/soccerverse-username', () => {
  it('lets admins add a username when the account currently has Soccerverse: None', async () => {
    const { app, audit, registrations } = setup()
    const { record } = await registrations.createPending(
      {
        email: 'rookie@example.com',
        displayName: 'Rookie One',
        primaryTeamCode: 'FRA',
        marketingOptIn: false,
      },
      'rookie-token',
    )
    await registrations.verifyByPlainToken('rookie-token')

    expect((await registrations.getByParticipantId(record.participantId))?.soccerverseUsername).toBeUndefined()

    const response = await adminRequest(
      request(app).post(`/api/admin/participants/${record.participantId}/soccerverse-username`),
    ).send({ soccerverseUsername: '  Libertaerx  ' })

    expect(response.status).toBe(200)
    expect(response.body.participant).toMatchObject({
      participantId: record.participantId,
      leagueType: 'rookie',
      soccerverseUsername: 'Libertaerx',
    })
    expect(response.body.participant.soccerverseLinkedAt).toBeTruthy()

    const entries = await audit.list()
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      actorEmail: 'admin@example.com',
      actionKey: 'admin.participant_soccerverse_correction',
      entityType: 'participant',
      entityId: record.participantId,
      detail: {
        mode: 'link',
        to: 'Libertaerx',
      },
    })
  })
})
