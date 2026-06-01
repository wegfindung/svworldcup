import { describe, expect, it, vi } from 'vitest'
import express from 'express'
import request from 'supertest'
import { createPublicRouter } from './public.js'
import { LeaderboardCache } from '../repositories/leaderboardCache.js'
import { MemoryConfigRepository } from '../repositories/configRepository.js'
import { MemoryRegistrationRepository } from '../repositories/registrationRepository.js'
import { MemoryScoringRepository } from '../repositories/scoringRepository.js'
import { MemorySquadRepository } from '../repositories/squadRepository.js'
import { MemoryTeamPoolRepository } from '../repositories/teamPoolRepository.js'
import { MemoryParticipantInfluenceSnapshotRepository } from '../repositories/participantInfluenceSnapshotRepository.js'
import { publicProfileSlug } from '../repositories/registrationRepository.js'
import { fixtures as seedFixtures } from '../data/worldCupSeed.js'
import type { SoccerversePlayerRecord, SlotClass } from '../domain/types.js'

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

const slotTeam: Record<string, string> = {
  'starter-gk-1': 'GER',
  'starter-def-1': 'ESP',
  'starter-def-2': 'ESP',
  'starter-def-3': 'ESP',
  'starter-def-4': 'ESP',
  'starter-mid-1': 'FRA',
  'starter-mid-2': 'FRA',
  'starter-mid-3': 'FRA',
  'starter-fwd-1': 'BRA',
  'starter-fwd-2': 'BRA',
  'starter-fwd-3': 'BRA',
  'sub-gk-1': 'GER',
  'sub-def-1': 'GER',
  'sub-mid-1': 'FRA',
  'sub-fwd-1': 'BRA',
}

function player(playerId: number, position: string): SoccerversePlayerRecord {
  return { playerId, displayName: `Player ${playerId}`, nationalityCode: 'FRA', rating: 50, clubId: 1, positions: [position], positionMain: position }
}

async function seedSquadPools(pools: MemoryTeamPoolRepository) {
  const byTeam = new Map<string, SoccerversePlayerRecord[]>()
  for (const slot of slotPlayers) {
    const teamCode = slotTeam[slot.slotKey]
    const bucket = byTeam.get(teamCode) ?? []
    bucket.push(player(slot.playerId, slot.position))
    byTeam.set(teamCode, bucket)
  }
  for (const [teamCode, bucket] of byTeam) {
    await pools.replaceTeamPlayers(teamCode, bucket)
  }
}

function makeApp() {
  // One shared cache wired into every repo, exactly as repos.ts does in production.
  const cache = new LeaderboardCache(60_000)
  const config = new MemoryConfigRepository(cache)
  const pools = new MemoryTeamPoolRepository(cache)
  const registrations = new MemoryRegistrationRepository(cache)
  const squads = new MemorySquadRepository(pools, undefined, cache)
  const snapshots = new MemoryParticipantInfluenceSnapshotRepository(cache)
  const scoring = new MemoryScoringRepository(config, registrations, squads, snapshots, cache)
  const fixtureRepository = { async listFixtures() { return seedFixtures } }

  const app = express()
  app.use(express.json())
  app.use(
    '/api/public',
    createPublicRouter({
      configRepository: config,
      registrationRepository: registrations,
      fixtureRepository: fixtureRepository as never,
      teamPoolRepository: pools,
      scoringRepository: scoring,
      squadRepository: squads,
    } as never),
  )
  return { app, config, registrations, squads, scoring }
}

describe('public profile score (A2 cached read)', () => {
  it('serves profile score from the same cached board as the leaderboard (no extra recompute)', async () => {
    const { app, config, registrations, squads, scoring } = makeApp()
    await seedSquadPools((squads as unknown as { teamPoolRepository: MemoryTeamPoolRepository }).teamPoolRepository)

    const created = await registrations.createPending(
      { email: 'rank@example.com', displayName: 'Rank Manager', primaryTeamCode: 'FRA', marketingOptIn: false },
      'rank-token',
    )
    await registrations.verifyByPlainToken('rank-token')
    const participantId = created.record.participantId
    for (const slot of slotPlayers) {
      await squads.assignPlayer(participantId, { slotKey: slot.slotKey, playerId: slot.playerId })
    }
    await squads.lockSquad(participantId)
    await registrations.revealParticipant(participantId, false)
    await scoring.upsertMatchEntry({
      fixtureId: 'fixture-1',
      playerId: 109,
      inOfficialSquad: true,
      minutes: 90,
      goals: 1,
      assists: 0,
      cleanSheetEligible: false,
    })

    // getScoringConfig runs exactly once per calculateRows, so it counts computes. After this point no
    // write occurs, so the leaderboard read + the profile read must share a single compute.
    const computeSpy = vi.spyOn(config, 'getScoringConfig')

    const leaderboard = await request(app).get('/api/public/leaderboards/rookie')
    expect(leaderboard.status).toBe(200)
    const leaderboardRow = leaderboard.body.items.find((row: { participantId: string }) => row.participantId === participantId)
    expect(leaderboardRow).toBeDefined()

    const slug = publicProfileSlug(created.record.displayName, participantId)
    const profile = await request(app).get(`/api/public/profiles/${slug}`)
    expect(profile.status).toBe(200)

    // A2: the profile read reuses the cached board rather than recomputing a whole league per view.
    expect(computeSpy).toHaveBeenCalledTimes(1)

    // The profile's score row is exactly the participant's leaderboard row — one source, never diverging.
    expect(profile.body.item.score).toMatchObject({
      participantId,
      rank: leaderboardRow.rank,
      totalScore: leaderboardRow.totalScore,
    })
  })
})
