import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import type { SlotClass, SoccerversePlayerRecord } from '../domain/types.js'
import { MemoryConfigRepository } from '../repositories/configRepository.js'
import { MemoryFixtureRepository } from '../repositories/fixtureRepository.js'
import { MemoryLandingAnalyticsRepository } from '../repositories/landingAnalyticsRepository.js'
import { MemoryParticipantInfluenceSnapshotRepository } from '../repositories/participantInfluenceSnapshotRepository.js'
import { MemoryRegistrationRepository } from '../repositories/registrationRepository.js'
import { MemoryScoringRepository } from '../repositories/scoringRepository.js'
import { MemorySquadRepository } from '../repositories/squadRepository.js'
import { MemoryTeamPoolRepository } from '../repositories/teamPoolRepository.js'
import { createPublicRouter } from './public.js'

const slotPlayers: Array<{ playerId: number; slotKey: string; position: string; teamCode: string; slotClass: SlotClass }> = [
  { playerId: 101, slotKey: 'starter-gk-1', position: 'GK', teamCode: 'GER', slotClass: 'GK' },
  { playerId: 102, slotKey: 'starter-def-1', position: 'CB', teamCode: 'ESP', slotClass: 'DEF' },
  { playerId: 103, slotKey: 'starter-def-2', position: 'CB', teamCode: 'ESP', slotClass: 'DEF' },
  { playerId: 104, slotKey: 'starter-def-3', position: 'CB', teamCode: 'ESP', slotClass: 'DEF' },
  { playerId: 105, slotKey: 'starter-def-4', position: 'CB', teamCode: 'ESP', slotClass: 'DEF' },
  { playerId: 106, slotKey: 'starter-mid-1', position: 'CM', teamCode: 'FRA', slotClass: 'MID' },
  { playerId: 107, slotKey: 'starter-mid-2', position: 'CM', teamCode: 'FRA', slotClass: 'MID' },
  { playerId: 108, slotKey: 'starter-mid-3', position: 'CM', teamCode: 'FRA', slotClass: 'MID' },
  { playerId: 109, slotKey: 'starter-fwd-1', position: 'ST', teamCode: 'BRA', slotClass: 'FWD' },
  { playerId: 110, slotKey: 'starter-fwd-2', position: 'ST', teamCode: 'BRA', slotClass: 'FWD' },
  { playerId: 111, slotKey: 'starter-fwd-3', position: 'ST', teamCode: 'BRA', slotClass: 'FWD' },
  { playerId: 112, slotKey: 'sub-gk-1', position: 'GK', teamCode: 'GER', slotClass: 'GK' },
  { playerId: 113, slotKey: 'sub-def-1', position: 'CB', teamCode: 'GER', slotClass: 'DEF' },
  { playerId: 114, slotKey: 'sub-mid-1', position: 'CM', teamCode: 'FRA', slotClass: 'MID' },
  { playerId: 115, slotKey: 'sub-fwd-1', position: 'ST', teamCode: 'BRA', slotClass: 'FWD' },
]

function player(playerId: number, position: string): SoccerversePlayerRecord {
  return {
    playerId,
    displayName: `Player ${playerId}`,
    nationalityCode: 'FRA',
    rating: 50 + (playerId % 10),
    clubId: 1,
    positions: [position],
    positionMain: position,
  }
}

async function seedSquadPools(pools: MemoryTeamPoolRepository) {
  const byTeam = new Map<string, SoccerversePlayerRecord[]>()
  for (const slotPlayer of slotPlayers) {
    const bucket = byTeam.get(slotPlayer.teamCode) ?? []
    bucket.push(player(slotPlayer.playerId, slotPlayer.position))
    byTeam.set(slotPlayer.teamCode, bucket)
  }
  byTeam.set('GER', [...(byTeam.get('GER') ?? []), player(201, 'GK')])
  for (const [teamCode, bucket] of byTeam) {
    await pools.replaceTeamPlayers(teamCode, bucket)
  }
}

async function createLockedSquad(input: {
  registrations: MemoryRegistrationRepository
  squads: MemorySquadRepository
  email: string
  displayName: string
  revealSquad: boolean
  replaceFirstPlayerId?: number
}) {
  const created = await input.registrations.createPending(
    { email: input.email, displayName: input.displayName, primaryTeamCode: 'FRA', marketingOptIn: false },
    `${input.email}-token`,
  )
  await input.registrations.verifyByPlainToken(`${input.email}-token`)
  const participantId = created.record.participantId
  for (const slotPlayer of slotPlayers) {
    const playerId = slotPlayer.slotKey === 'starter-gk-1' && input.replaceFirstPlayerId ? input.replaceFirstPlayerId : slotPlayer.playerId
    await input.squads.assignPlayer(participantId, { slotKey: slotPlayer.slotKey, playerId })
  }
  await input.squads.lockSquad(participantId)
  if (input.revealSquad) {
    await input.registrations.revealParticipant(participantId, true)
  }
  return participantId
}

describe('public squad usage', () => {
  it('aggregates revealed active locked squads by player presence', async () => {
    const config = new MemoryConfigRepository()
    const pools = new MemoryTeamPoolRepository()
    await seedSquadPools(pools)

    const registrations = new MemoryRegistrationRepository()
    const squads = new MemorySquadRepository(pools)
    await createLockedSquad({ registrations, squads, email: 'one@example.com', displayName: 'One Manager', revealSquad: true })
    await createLockedSquad({
      registrations,
      squads,
      email: 'two@example.com',
      displayName: 'Two Manager',
      revealSquad: true,
      replaceFirstPlayerId: 201,
    })
    await createLockedSquad({ registrations, squads, email: 'hidden@example.com', displayName: 'Hidden Manager', revealSquad: false })

    const app = express()
    app.use(
      '/api/public',
      createPublicRouter({
        configRepository: config,
        registrationRepository: registrations,
        fixtureRepository: new MemoryFixtureRepository(),
        teamPoolRepository: pools,
        scoringRepository: new MemoryScoringRepository(config, registrations, squads, new MemoryParticipantInfluenceSnapshotRepository()),
        squadRepository: squads,
        landingAnalyticsRepository: new MemoryLandingAnalyticsRepository(),
        participantInfluenceSnapshotRepository: new MemoryParticipantInfluenceSnapshotRepository(),
      }),
    )

    const response = await request(app).get('/api/public/squad-usage')
    expect(response.status).toBe(200)
    expect(response.body.summary.visibleSquadCount).toBe(2)
    expect(response.body.summary.visibleManagerCount).toBe(2)

    const sharedPlayer = response.body.items.find((item: { playerId: number }) => item.playerId === 102)
    expect(sharedPlayer).toMatchObject({ usageCount: 2, starterCount: 2, subCount: 0, presenceRate: 100 })

    const splitPlayer = response.body.items.find((item: { playerId: number }) => item.playerId === 101)
    expect(splitPlayer).toMatchObject({ usageCount: 1, starterCount: 1, presenceRate: 50 })
  })
})
