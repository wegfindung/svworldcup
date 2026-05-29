import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import type { SlotClass, SoccerversePlayerRecord } from '../domain/types.js'
import { MemoryConfigRepository } from '../repositories/configRepository.js'
import { MemoryFixtureRepository } from '../repositories/fixtureRepository.js'
import { MemoryParticipantInfluenceSnapshotRepository } from '../repositories/participantInfluenceSnapshotRepository.js'
import { MemoryRegistrationRepository, publicProfileSlug } from '../repositories/registrationRepository.js'
import { MemoryScoringRepository } from '../repositories/scoringRepository.js'
import { MemorySquadRepository } from '../repositories/squadRepository.js'
import { MemoryTeamPoolRepository } from '../repositories/teamPoolRepository.js'
import { createPublicRouter } from './public.js'

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

// Spread the 15-player squad across four Grand Tournament teams so no team holds more than 4 of them
// (the per-team cap is 4). Same-class swap pairs (e.g. MID 106/114) share a team.
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

// Seed the standard squad players into their mapped team pools, one pool per team.
async function seedSquadPools(pools: MemoryTeamPoolRepository) {
  const byTeam = new Map<string, SoccerversePlayerRecord[]>()
  for (const slotPlayer of slotPlayers) {
    const teamCode = slotTeam[slotPlayer.slotKey]
    const bucket = byTeam.get(teamCode) ?? []
    bucket.push(player(slotPlayer.playerId, slotPlayer.position))
    byTeam.set(teamCode, bucket)
  }
  for (const [teamCode, bucket] of byTeam) {
    await pools.replaceTeamPlayers(teamCode, bucket)
  }
}

const LOCK_TIME = new Date('2026-06-01T00:00:00Z').getTime()
const W1_TIME = new Date('2026-06-18T08:00:00Z').getTime()
const DISPLAY_NAME = 'Demo Manager'

describe('public profile reflects swaps', () => {
  it('shows the post-swap lineup and the swap log on a revealed squad', async () => {
    const pools = new MemoryTeamPoolRepository()
    await seedSquadPools(pools)

    const registrations = new MemoryRegistrationRepository()
    const created = await registrations.createPending(
      { email: 'manager@example.com', displayName: DISPLAY_NAME, primaryTeamCode: 'FRA', marketingOptIn: false },
      'token',
    )
    await registrations.verifyByPlainToken('token')
    const participantId = created.record.participantId

    const clock = { value: LOCK_TIME }
    const squads = new MemorySquadRepository(pools, () => clock.value)
    for (const slotPlayer of slotPlayers) {
      await squads.assignPlayer(participantId, { slotKey: slotPlayer.slotKey, playerId: slotPlayer.playerId })
    }
    await squads.lockSquad(participantId)

    clock.value = W1_TIME
    await squads.swapPlayers(participantId, { playerInId: 114, playerOutId: 106 })
    await registrations.revealParticipant(participantId, true)

    const app = express()
    app.use(
      '/api/public',
      createPublicRouter({
        configRepository: new MemoryConfigRepository(),
        registrationRepository: registrations,
        fixtureRepository: new MemoryFixtureRepository(),
        teamPoolRepository: pools,
        scoringRepository: new MemoryScoringRepository(new MemoryConfigRepository(), registrations, squads, new MemoryParticipantInfluenceSnapshotRepository()),
        squadRepository: squads,
      }),
    )

    const slug = publicProfileSlug(DISPLAY_NAME, participantId)
    const response = await request(app).get(`/api/public/profiles/${slug}`)
    expect(response.status).toBe(200)

    const slots = response.body.item.squad.slots as Array<{ key: string; player: { playerId: number } | null }>
    // Post-swap: reserve 114 now occupies the starter slot; demoted 106 is on the bench.
    expect(slots.find((slot) => slot.key === 'starter-mid-1')?.player?.playerId).toBe(114)
    expect(slots.find((slot) => slot.key === 'sub-mid-1')?.player?.playerId).toBe(106)

    // The swap log is public.
    expect(response.body.item.swaps).toHaveLength(1)
    expect(response.body.item.swaps[0].playerInId).toBe(114)
    expect(response.body.item.swaps[0].playerOutId).toBe(106)
  })
})
