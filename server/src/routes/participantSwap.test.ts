import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { participantSessionCookieName } from '../config/auth.js'
import type { FixtureSeed, SlotClass, SoccerversePlayerRecord } from '../domain/types.js'
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

const slotPlayers: Array<{ playerId: number; slotKey: string; position: string; slotClass: SlotClass }> = [
  { playerId: 101, slotKey: 'starter-gk-1', position: 'GK', slotClass: 'GK' },
  { playerId: 102, slotKey: 'starter-def-1', position: 'CB', slotClass: 'DEF' },
  { playerId: 103, slotKey: 'starter-def-2', position: 'CB', slotClass: 'DEF' },
  { playerId: 104, slotKey: 'starter-def-3', position: 'CB', slotClass: 'DEF' },
  { playerId: 105, slotKey: 'starter-def-4', position: 'CB', slotClass: 'DEF' },
  { playerId: 106, slotKey: 'starter-mid-1', position: 'CM', slotClass: 'MID' },
  { playerId: 107, slotKey: 'starter-mid-2', position: 'CM', slotClass: 'MID' },
  { playerId: 108, slotKey: 'starter-mid-3', position: 'CM', slotClass: 'MID' },
  { playerId: 109, slotKey: 'starter-fwd-1', position: 'ST', slotClass: 'FWD' },
  { playerId: 110, slotKey: 'starter-fwd-2', position: 'ST', slotClass: 'FWD' },
  { playerId: 111, slotKey: 'starter-fwd-3', position: 'ST', slotClass: 'FWD' },
  { playerId: 112, slotKey: 'sub-gk-1', position: 'GK', slotClass: 'GK' },
  { playerId: 113, slotKey: 'sub-def-1', position: 'CB', slotClass: 'DEF' },
  { playerId: 114, slotKey: 'sub-mid-1', position: 'CM', slotClass: 'MID' },
  { playerId: 115, slotKey: 'sub-fwd-1', position: 'ST', slotClass: 'FWD' },
]

function player(playerId: number, position: string): SoccerversePlayerRecord {
  return { playerId, displayName: `Player ${playerId}`, nationalityCode: 'FRA', rating: 50, clubId: 1, positions: [position], positionMain: position }
}

const roundTwoEarlierFixture: FixtureSeed = {
  fixtureId: '2026-06-18-a-cze-rsa',
  groupKey: 'A',
  kickoffDate: '2026-06-18',
  kickoffTimeUtc: '12:00:00',
  homeTeamCode: 'CZE',
  awayTeamCode: 'RSA',
}

const SESSION_TOKEN = 'test-session-token'
const LOCK_TIME = new Date('2026-06-01T00:00:00Z').getTime()
const W1_TIME = new Date('2026-06-18T08:00:00Z').getTime()
const BETWEEN_WINDOWS = new Date('2026-06-20T00:00:00Z').getTime()

async function setup() {
  const pools = new MemoryTeamPoolRepository()
  await pools.replaceTeamPlayers('FRA', slotPlayers.map((slotPlayer) => player(slotPlayer.playerId, slotPlayer.position)))

  const registrations = new MemoryRegistrationRepository()
  const created = await registrations.createPending(
    { email: 'manager@example.com', displayName: 'Manager', primaryTeamCode: 'FRA', marketingOptIn: false },
    'verify-token',
  )
  await registrations.verifyByPlainToken('verify-token')
  const participantId = created.record.participantId

  const clock = { value: LOCK_TIME }
  const squads = new MemorySquadRepository(pools, () => clock.value)
  for (const slotPlayer of slotPlayers) {
    await squads.assignPlayer(participantId, { slotKey: slotPlayer.slotKey, playerId: slotPlayer.playerId })
  }
  await squads.lockSquad(participantId)

  const sessions = new MemoryParticipantSessionRepository(registrations)
  await sessions.createSession(participantId, SESSION_TOKEN, 3600)
  const audit = new MemoryAuditRepository()
  const fixtureRepository = new MemoryFixtureRepository()

  const app = express()
  app.use(express.json())
  app.use('/api/participant', createParticipantRouter(sessions, squads, fixtureRepository, registrations, audit, new MemoryParticipantRiskRepository()))
  app.use(errorHandler)

  const cookie = `${participantSessionCookieName}=${SESSION_TOKEN}`
  const csrf = createCsrfToken(SESSION_TOKEN, 'participant')
  const getSwaps = () => request(app).get('/api/participant/squad/swaps').set('Cookie', cookie)
  const postSwap = (body: unknown) => request(app).post('/api/participant/squad/swap').set('Cookie', cookie).set('x-csrf-token', csrf).send(body)

  return { app, audit, clock, fixtureRepository, getSwaps, postSwap }
}

describe('participant swap routes', () => {
  it('GET /squad/swaps returns the window list and the locked baseline lineup', async () => {
    const { getSwaps } = await setup()
    const response = await getSwaps()
    expect(response.status).toBe(200)
    expect(response.body.windows.map((window: { key: string }) => window.key)).toEqual(['W1', 'W2', 'W3'])
    expect(response.body.history).toEqual([])
    expect(response.body.currentLineup).toHaveLength(15)
  })

  it('POST /squad/swap rejects a swap outside any window with 422', async () => {
    const { clock, postSwap } = await setup()
    clock.value = BETWEEN_WINDOWS
    const response = await postSwap({ playerInId: 114, playerOutId: 106 })
    expect(response.status).toBe(422)
    expect(response.body.error).toMatch(/No swap window/)
  })

  it('POST /squad/swap uses fixture-repository windows instead of the static seed calendar', async () => {
    const { clock, fixtureRepository, getSwaps, postSwap } = await setup()
    await fixtureRepository.upsertFixtures([roundTwoEarlierFixture])
    clock.value = new Date('2026-06-18T14:00:00Z').getTime()

    const state = await getSwaps()
    expect(state.body.windows.find((window: { key: string }) => window.key === 'W1')?.closesAt).toBe(
      new Date('2026-06-18T12:00:00Z').getTime(),
    )

    const response = await postSwap({ playerInId: 114, playerOutId: 106 })
    expect(response.status).toBe(422)
    expect(response.body.error).toMatch(/No swap window/)
  })

  it('POST /squad/swap commits a valid swap, writes an audit entry, and updates state', async () => {
    const { audit, clock, getSwaps, postSwap } = await setup()
    clock.value = W1_TIME

    const response = await postSwap({ playerInId: 114, playerOutId: 106 })
    expect(response.status).toBe(200)
    expect(response.body.swap.windowKey).toBe('W1')
    expect(response.body.swap.targetRound).toBe(2)
    expect(response.body.swap.swapsUsedInWindow).toBe(1)

    const auditActions = (await audit.list()).map((entry) => entry.actionKey)
    expect(auditActions).toContain('participant.squad_swap')

    const state = await getSwaps()
    expect(state.body.history).toHaveLength(1)
    expect(state.body.swapsUsedByWindow.W1).toBe(1)
    // The reserve we brought on is now a starter in the effective lineup.
    const promoted = state.body.currentLineup.find((slot: { playerId: number }) => slot.playerId === 114)
    expect(promoted.slotGroup).toBe('starter')
  })

  it('POST /squad/swap rejects a cross-class swap with 422', async () => {
    const { clock, postSwap } = await setup()
    clock.value = W1_TIME
    const response = await postSwap({ playerInId: 114, playerOutId: 109 }) // reserve MID for a starting FWD
    expect(response.status).toBe(422)
  })

  it('POST /squad/swap requires a CSRF token', async () => {
    const { app, clock } = await setup()
    clock.value = W1_TIME
    const response = await request(app)
      .post('/api/participant/squad/swap')
      .set('Cookie', `${participantSessionCookieName}=${SESSION_TOKEN}`)
      .send({ playerInId: 114, playerOutId: 106 })
    expect(response.status).toBe(403)
  })
})
