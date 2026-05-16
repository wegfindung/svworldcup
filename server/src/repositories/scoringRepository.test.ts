import { describe, expect, it } from 'vitest'
import { MemoryConfigRepository } from './configRepository.js'
import { MemoryLineupRepository } from './lineupRepository.js'
import { MemoryRegistrationRepository } from './registrationRepository.js'
import { MemoryScoringRepository } from './scoringRepository.js'
import { MemorySquadRepository } from './squadRepository.js'
import { MemoryTeamPoolRepository } from './teamPoolRepository.js'
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

function player(playerId: number, position: string): SoccerversePlayerRecord {
  return {
    playerId,
    displayName: `Player ${playerId}`,
    nationalityCode: 'FRA',
    rating: 50,
    clubId: 1,
    positions: [position],
    positionMain: position,
  }
}

describe('MemoryScoringRepository fixture lineups', () => {
  it('scores locked fixture-specific lineups instead of requiring one static locked squad', async () => {
    const pools = new MemoryTeamPoolRepository()
    await pools.replaceTeamPlayers(
      'FRA',
      slotPlayers.flatMap((slotPlayer) => [
        player(slotPlayer.playerId, slotPlayer.position),
        player(slotPlayer.playerId + 100, slotPlayer.position),
      ]),
    )
    const registrations = new MemoryRegistrationRepository()
    const created = await registrations.createPending(
      {
        email: 'manager@example.com',
        displayName: 'Manager',
        primaryTeamCode: 'FRA',
        marketingOptIn: false,
      },
      'token',
    )
    const participant = await registrations.verifyByPlainToken('token')
    expect(participant).not.toBeNull()

    const squads = new MemorySquadRepository(pools)
    const lineups = new MemoryLineupRepository(pools)
    for (const slotPlayer of slotPlayers) {
      await lineups.assignPlayer(created.record.participantId, 'fixture-1', { slotKey: slotPlayer.slotKey, playerId: slotPlayer.playerId })
      await lineups.assignPlayer(created.record.participantId, 'fixture-2', { slotKey: slotPlayer.slotKey, playerId: slotPlayer.playerId + 100 })
    }
    await lineups.lockLineup(created.record.participantId, 'fixture-1')
    await lineups.lockLineup(created.record.participantId, 'fixture-2')

    const scoring = new MemoryScoringRepository(new MemoryConfigRepository(), registrations, squads, lineups)
    await scoring.upsertMatchEntry({
      fixtureId: 'fixture-1',
      playerId: 101,
      inOfficialSquad: true,
      minutes: 90,
      goals: 0,
      assists: 0,
      cleanSheetEligible: false,
    })
    await scoring.upsertMatchEntry({
      fixtureId: 'fixture-2',
      playerId: 201,
      inOfficialSquad: true,
      minutes: 90,
      goals: 0,
      assists: 0,
      cleanSheetEligible: false,
    })

    const leaderboard = await scoring.getLeagueLeaderboard('rookie')
    expect(leaderboard[0].baseScore).toBe(4)
  })
})
