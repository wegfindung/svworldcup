import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import type { SoccerversePlayerRecord } from '../domain/types.js'
import { errorHandler } from '../middleware/errorHandler.js'
import { MemoryAuditRepository } from '../repositories/auditRepository.js'
import { MemoryConfigRepository } from '../repositories/configRepository.js'
import { MemoryMatchImportRepository } from '../repositories/matchImportRepository.js'
import { MemoryMatchMappingRepository } from '../repositories/matchMappingRepository.js'
import { MemoryRegistrationRepository } from '../repositories/registrationRepository.js'
import { MemoryScoringRepository } from '../repositories/scoringRepository.js'
import { MemorySquadRepository } from '../repositories/squadRepository.js'
import { MemoryTeamPoolRepository } from '../repositories/teamPoolRepository.js'
import { createMatchImportRouter } from './matchImport.js'

const BRA_MAR_FIXTURE = '2026-06-13-c-bra-mar'

function svPlayer(playerId: number, displayName: string): SoccerversePlayerRecord {
  return { playerId, displayName, nationalityCode: 'BRA', rating: 80, clubId: 0, positions: ['MID'] }
}

function uploadBody(overrides: Record<string, unknown> = {}) {
  return {
    fixtureId: BRA_MAR_FIXTURE,
    json: {
      match: { homeTeam: 'Brazil', awayTeam: 'Morocco', homeGoals: 1, awayGoals: 0, sourceUrl: 'https://sofascore.com/m' },
      players: [
        { name: 'Vinicius Junior', team: 'Brazil', lineupStatus: 'starter', minutes: 90, goals: 1, assists: 0, rating: 8.4 },
        { name: 'Achraf Hakimi', team: 'Morocco', lineupStatus: 'starter', minutes: 90, goals: 0, assists: 0, rating: 7.0 },
      ],
    },
    ...overrides,
  }
}

async function setup() {
  const teamPoolRepository = new MemoryTeamPoolRepository()
  await teamPoolRepository.replaceTeamPlayers('BRA', [svPlayer(10, 'Vinicius Junior'), svPlayer(11, 'Rodrygo')])
  await teamPoolRepository.replaceTeamPlayers('MAR', [svPlayer(20, 'Achraf Hakimi')])

  const deps = {
    matchImportRepository: new MemoryMatchImportRepository(),
    matchMappingRepository: new MemoryMatchMappingRepository(),
    teamPoolRepository,
    scoringRepository: new MemoryScoringRepository(
      new MemoryConfigRepository(),
      new MemoryRegistrationRepository(),
      new MemorySquadRepository(teamPoolRepository),
    ),
    auditRepository: new MemoryAuditRepository(),
  }

  const app = express()
  app.use(express.json())
  app.use((req, res, next) => {
    res.locals.admin = {
      adminId: 'test-admin',
      email: String(req.header('x-test-admin-email') ?? 'importer@example.com'),
      isActive: true,
    }
    next()
  })
  app.use('/match-import', createMatchImportRouter(deps))
  app.use(errorHandler)

  return { app, deps }
}

describe('match import routes', () => {
  it('runs the full upload -> confirm x2 -> promote path', async () => {
    const { app, deps } = await setup()

    const upload = await request(app)
      .post('/match-import/upload')
      .set('x-test-admin-email', 'importer@example.com')
      .send(uploadBody())
    expect(upload.status).toBe(201)
    expect(upload.body.batch.rows).toHaveLength(2)
    expect(upload.body.batch.confirmations).toHaveLength(1)

    const batchId = upload.body.batch.batchId
    const confirm = await request(app)
      .post(`/match-import/batches/${batchId}/confirm`)
      .set('x-test-admin-email', 'reviewer@example.com')
      .send({})
    expect(confirm.status).toBe(200)
    expect(confirm.body.promotion.promoted).toBe(true)
    expect(confirm.body.promotion.promotedRowCount).toBe(2)

    const promoted = await deps.scoringRepository.listMatchEntries(BRA_MAR_FIXTURE)
    expect(promoted).toHaveLength(2)
    expect(promoted.every((entry) => entry.inOfficialSquad)).toBe(true)

    const auditActions = (await deps.auditRepository.list()).map((entry) => entry.actionKey)
    expect(auditActions).toEqual(['match_import.upload', 'match_import.confirm', 'match_import.promote'])

    expect(await deps.matchImportRepository.listBatches()).toHaveLength(0)
  })

  it('rejects a second confirmation from the same admin', async () => {
    const { app } = await setup()
    const upload = await request(app)
      .post('/match-import/upload')
      .set('x-test-admin-email', 'importer@example.com')
      .send(uploadBody())
    const batchId = upload.body.batch.batchId

    const confirm = await request(app)
      .post(`/match-import/batches/${batchId}/confirm`)
      .set('x-test-admin-email', 'importer@example.com')
      .send({})
    expect(confirm.status).toBe(422)
  })

  it('rejects JSON describing a different fixture than selected (D10)', async () => {
    const { app } = await setup()
    const upload = await request(app)
      .post('/match-import/upload')
      .set('x-test-admin-email', 'importer@example.com')
      .send(uploadBody({ fixtureId: '2026-06-13-d-usa-par' }))
    expect(upload.status).toBe(422)
  })

  it('rejects a duplicate player in the payload (D4)', async () => {
    const { app } = await setup()
    const body = uploadBody()
    body.json.players.push({ ...body.json.players[0] })
    const upload = await request(app)
      .post('/match-import/upload')
      .set('x-test-admin-email', 'importer@example.com')
      .send(body)
    expect(upload.status).toBe(422)
  })

  it('rejects a malformed JSON payload with 400', async () => {
    const { app } = await setup()
    const body = uploadBody()
    delete (body.json.match as Partial<typeof body.json.match>).sourceUrl
    const upload = await request(app)
      .post('/match-import/upload')
      .set('x-test-admin-email', 'importer@example.com')
      .send(body)
    expect(upload.status).toBe(400)
  })

  it('lists, fetches, and discards a pending batch', async () => {
    const { app } = await setup()
    const upload = await request(app)
      .post('/match-import/upload')
      .set('x-test-admin-email', 'importer@example.com')
      .send(uploadBody())
    const batchId = upload.body.batch.batchId

    const list = await request(app).get('/match-import/batches')
    expect(list.body.items).toHaveLength(1)

    const fetched = await request(app).get(`/match-import/batches/${batchId}`)
    expect(fetched.status).toBe(200)
    expect(fetched.body.batch.batchId).toBe(batchId)

    const discarded = await request(app).delete(`/match-import/batches/${batchId}`)
    expect(discarded.status).toBe(204)

    const afterList = await request(app).get('/match-import/batches')
    expect(afterList.body.items).toHaveLength(0)
  })
})
