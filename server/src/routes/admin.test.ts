import express from 'express'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import { adminSessionCookieName } from '../config/auth.js'
import { createCsrfToken } from '../lib/csrf.js'
import { sendMultiAccountInquiryMail } from '../lib/mailer.js'
import { errorHandler } from '../middleware/errorHandler.js'
import type { AdminRepository } from '../repositories/adminRepository.js'
import { MemoryAuditRepository } from '../repositories/auditRepository.js'
import { MemoryConfigRepository } from '../repositories/configRepository.js'
import { MemoryEmailMarketingRepository } from '../repositories/emailMarketingRepository.js'
import { MemoryFixtureRepository } from '../repositories/fixtureRepository.js'
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

vi.mock('../lib/mailer.js', () => ({
  sendVerificationMail: vi.fn(async () => ({ accepted: ['test@example.com'], rejected: [] })),
  sendMultiAccountInquiryMail: vi.fn(async (input: { recipient: string }) => ({ accepted: [input.recipient], rejected: [] })),
}))

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
  const participantRisk = new MemoryParticipantRiskRepository()

  const app = express()
  app.use(express.json())
  app.use(
    '/api/admin',
    createAdminRouter(
      createTestAdminRepository(),
      registrations,
      config,
      new MemoryFixtureRepository(),
      teamPool,
      scoring,
      new MemoryMatchImportRepository(),
      new MemoryMatchMappingRepository(),
      audit,
      new MemoryEmailMarketingRepository(),
      new MemorySnapshotJobRepository(),
      participantRisk,
      squads,
      new MemoryLandingAnalyticsRepository(),
    ),
  )
  app.use(errorHandler)

  return { app, audit, registrations, participantRisk }
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

describe('POST /api/admin/risk-cases/:caseId/members/:participantId/inquiry-email', () => {
  it('sends the multi-account inquiry email and marks the member as tagged', async () => {
    const { app, audit, registrations, participantRisk } = setup()
    vi.mocked(sendMultiAccountInquiryMail).mockClear()

    const first = await registrations.createPending(
      {
        email: 'friend.one@example.com',
        displayName: 'Friend One',
        primaryTeamCode: 'FRA',
        marketingOptIn: false,
      },
      'friend-one-token',
    )
    const second = await registrations.createPending(
      {
        email: 'friend.two@example.com',
        displayName: 'Friend Two',
        primaryTeamCode: 'GER',
        marketingOptIn: false,
      },
      'friend-two-token',
    )
    const firstProfile = await registrations.verifyByPlainToken('friend-one-token')
    const secondProfile = await registrations.verifyByPlainToken('friend-two-token')

    if (!firstProfile || !secondProfile) {
      throw new Error('Expected verified test profiles.')
    }

    await participantRisk.recordSignal({
      participant: firstProfile,
      eventType: 'registration',
      emailCanonicalHash: 'shared-canonical-email',
    })
    await participantRisk.recordSignal({
      participant: secondProfile,
      eventType: 'registration',
      emailCanonicalHash: 'shared-canonical-email',
    })
    await participantRisk.refreshCasesForParticipant(second.record.participantId)

    const riskCase = (await participantRisk.listCases())[0]
    if (!riskCase) {
      throw new Error('Expected a risk case.')
    }
    expect(riskCase.members.map((member) => member.participantId).sort()).toEqual(
      [first.record.participantId, second.record.participantId].sort(),
    )

    const response = await adminRequest(
      request(app).post(`/api/admin/risk-cases/${riskCase.caseId}/members/${first.record.participantId}/inquiry-email`),
    ).send({})

    expect(response.status).toBe(200)
    expect(sendMultiAccountInquiryMail).toHaveBeenCalledWith({
      recipient: firstProfile.email,
      displayName: firstProfile.displayName,
    })
    expect(response.body.inquiry).toMatchObject({
      participantId: first.record.participantId,
      sentBy: 'admin@example.com',
      sentCount: 1,
    })
    expect(
      response.body.item.members.find((member: { participantId: string }) => member.participantId === first.record.participantId),
    ).toMatchObject({
      inquiryEmailSentBy: 'admin@example.com',
      inquiryEmailSentCount: 1,
    })

    const entries = await audit.list()
    expect(entries.at(-1)).toMatchObject({
      actorEmail: 'admin@example.com',
      actionKey: 'admin.risk_inquiry_email_sent',
      entityType: 'participant_risk_case',
      entityId: riskCase.caseId,
      detail: {
        participantId: first.record.participantId,
        email: firstProfile.email,
        sentCount: 1,
      },
    })
  })
})

describe('participant account trash admin routes', () => {
  it('moves a participant to trash and restores the previous account status', async () => {
    const { app, audit, registrations } = setup()
    const { record } = await registrations.createPending(
      {
        email: 'trashable@example.com',
        displayName: 'Trashable Manager',
        primaryTeamCode: 'FRA',
        marketingOptIn: false,
      },
      'trashable-token',
    )
    await registrations.verifyByPlainToken('trashable-token')

    const trashResponse = await adminRequest(request(app).post(`/api/admin/participants/${record.participantId}/trash`)).send({
      reason: 'multi-account cleanup',
    })

    expect(trashResponse.status).toBe(200)
    expect(trashResponse.body.item).toMatchObject({
      participantId: record.participantId,
      email: 'trashable@example.com',
      previousStatus: 'active',
      currentStatus: 'withdrawn',
      deletedBy: 'admin@example.com',
      reason: 'multi-account cleanup',
    })
    expect(new Date(trashResponse.body.item.deleteAfter).getTime()).toBeGreaterThan(Date.now() + 89 * 24 * 60 * 60 * 1000)
    expect((await registrations.getByParticipantId(record.participantId))?.status).toBe('withdrawn')

    const listResponse = await adminRequest(request(app).get('/api/admin/participant-trash')).send()
    expect(listResponse.status).toBe(200)
    expect(listResponse.body.items).toHaveLength(1)
    expect(listResponse.body.items[0]).toMatchObject({ participantId: record.participantId, currentStatus: 'withdrawn' })

    const restoreResponse = await adminRequest(request(app).post(`/api/admin/participants/${record.participantId}/restore`)).send({})
    expect(restoreResponse.status).toBe(200)
    expect(restoreResponse.body.item).toMatchObject({
      participantId: record.participantId,
      previousStatus: 'active',
      currentStatus: 'active',
      restoredBy: 'admin@example.com',
    })
    expect((await registrations.getByParticipantId(record.participantId))?.status).toBe('active')

    const afterRestoreList = await adminRequest(request(app).get('/api/admin/participant-trash')).send()
    expect(afterRestoreList.body.items).toHaveLength(0)

    const entries = await audit.list()
    expect(entries.map((entry) => entry.actionKey)).toEqual(['admin.participant_trash', 'admin.participant_restore'])
  })
})
