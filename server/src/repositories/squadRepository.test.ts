import { describe, expect, it } from 'vitest'
import { competitionStartEpoch, registrationCloseEpoch } from '../data/competitionWindow.js'
import type { SoccerversePlayerRecord, SlotClass } from '../domain/types.js'
import { MemorySquadRepository } from './squadRepository.js'
import { MemoryTeamPoolRepository } from './teamPoolRepository.js'

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

// Spread the 15-player squad across four Grand Tournament teams so no team holds more than 4 of them
// (the per-team cap is 4). Each base player and its +100 alternate share the slot's team.
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

function teamForPlayer(record: SoccerversePlayerRecord): string {
  const baseId = record.playerId >= 200 ? record.playerId - 100 : record.playerId
  const slot = slotPlayers.find((slotPlayer) => slotPlayer.playerId === baseId)
  return slot ? slotTeam[slot.slotKey] : 'FRA'
}

// Seed the given squad players into their mapped team pools (replacing the single-FRA-pool pattern
// that now trips the per-team cap). Buckets by teamForPlayer and seeds one pool per team.
async function seedSquadPools(pools: MemoryTeamPoolRepository, players: SoccerversePlayerRecord[]) {
  const byTeam = new Map<string, SoccerversePlayerRecord[]>()
  for (const record of players) {
    const teamCode = teamForPlayer(record)
    const bucket = byTeam.get(teamCode) ?? []
    bucket.push(record)
    byTeam.set(teamCode, bucket)
  }
  for (const [teamCode, bucket] of byTeam) {
    await pools.replaceTeamPlayers(teamCode, bucket)
  }
}

async function createLockedSquad(now: () => number) {
  const pools = new MemoryTeamPoolRepository()
  await seedSquadPools(
    pools,
    slotPlayers.flatMap((slotPlayer) => [player(slotPlayer.playerId, slotPlayer.position), player(slotPlayer.playerId + 100, slotPlayer.position)]),
  )

  const squads = new MemorySquadRepository(pools, now)
  const participantId = 'participant-1'
  for (const slotPlayer of slotPlayers) {
    await squads.assignPlayer(participantId, { slotKey: slotPlayer.slotKey, playerId: slotPlayer.playerId })
  }
  await squads.lockSquad(participantId)

  return { squads, participantId }
}

describe('MemorySquadRepository competition edit window', () => {
  it('allows submitted squads to be edited before the competition starts', async () => {
    const beforeKickoff = (competitionStartEpoch() ?? Date.now()) - 1_000
    const { squads, participantId } = await createLockedSquad(() => beforeKickoff)

    const afterRemove = await squads.removePlayer(participantId, 'starter-gk-1')
    expect(afterRemove.slots.find((slot) => slot.key === 'starter-gk-1')?.player).toBeNull()

    const afterAssign = await squads.assignPlayer(participantId, { slotKey: 'starter-gk-1', playerId: 201 })
    expect(afterAssign.slots.find((slot) => slot.key === 'starter-gk-1')?.player?.playerId).toBe(201)

    const afterBudgetChange = await squads.setBudget(participantId, 6_000_000)
    expect(afterBudgetChange.budgetLimit).toBe(6_000_000)

    const afterReset = await squads.resetSquad(participantId)
    expect(afterReset.slots.every((slot) => !slot.player)).toBe(true)
    expect(await squads.listRoundLineupSlots(participantId)).toEqual([])

    const afterReassign = await squads.assignPlayer(participantId, { slotKey: 'starter-def-1', playerId: 105 })
    expect(afterReassign.slots.find((slot) => slot.key === 'starter-def-1')?.player?.playerId).toBe(105)
    expect(afterReassign.slots.find((slot) => slot.key === 'starter-def-4')?.player).toBeNull()
    expect(await squads.listRoundLineupSlots(participantId)).toEqual([])
  })

  it('blocks submitted squad edits after the competition starts', async () => {
    const start = competitionStartEpoch() ?? Date.now()
    let now = start - 1_000
    const { squads, participantId } = await createLockedSquad(() => now)

    now = start + 1_000

    await expect(squads.removePlayer(participantId, 'starter-gk-1')).rejects.toThrow('competition has started')
  })
})

describe('MemorySquadRepository registration close edit window', () => {
  it('blocks squad edits once registration has closed, even for an unlocked squad', async () => {
    // Build before both the competition start and registration close, so assignment is allowed.
    let now = (competitionStartEpoch() ?? Date.now()) - 1_000
    const pools = new MemoryTeamPoolRepository()
    await seedSquadPools(
      pools,
      slotPlayers.flatMap((slotPlayer) => [player(slotPlayer.playerId, slotPlayer.position), player(slotPlayer.playerId + 100, slotPlayer.position)]),
    )
    const squads = new MemorySquadRepository(pools, () => now)
    const participantId = 'participant-1'
    await squads.assignPlayer(participantId, { slotKey: 'starter-gk-1', playerId: 101 })

    // Soccerverse season transition: ratings (and therefore wages) change. The squad is never
    // locked, but edits must still be refused so no one builds against the new wage table.
    now = registrationCloseEpoch() + 1_000

    await expect(
      squads.assignPlayer(participantId, { slotKey: 'starter-def-1', playerId: 102 }),
    ).rejects.toThrow('registration has closed')
  })

  it('blocks final squad submission once registration has closed', async () => {
    let now = (competitionStartEpoch() ?? Date.now()) - 1_000
    const pools = new MemoryTeamPoolRepository()
    await seedSquadPools(
      pools,
      slotPlayers.flatMap((slotPlayer) => [player(slotPlayer.playerId, slotPlayer.position), player(slotPlayer.playerId + 100, slotPlayer.position)]),
    )
    const squads = new MemorySquadRepository(pools, () => now)
    const participantId = 'participant-1'
    for (const slotPlayer of slotPlayers) {
      await squads.assignPlayer(participantId, { slotKey: slotPlayer.slotKey, playerId: slotPlayer.playerId })
    }

    now = registrationCloseEpoch() + 1_000

    await expect(squads.lockSquad(participantId)).rejects.toThrow('registration has closed')
  })
})

describe('MemorySquadRepository position snapshot', () => {
  it('captures the pool positions on the slot at assign time and ignores later pool rewrites', async () => {
    // Mirror of the post-2026-07-04 SV concern: after we lock our MID-DM eligibility, SV could
    // rewrite world_cup_players.position_codes and try to flip which slots earn the MID bonus.
    // Slot must hold the snapshot. The Postgres repo persists this in squad_slots.position_codes;
    // the Memory repo keeps the captured TeamPoolPlayer on the slot, which is functionally the same.
    const pools = new MemoryTeamPoolRepository()
    await pools.replaceTeamPlayers('FRA', [
      { ...player(106, 'CM'), positions: ['CM', 'DM'] },
    ])
    const squads = new MemorySquadRepository(pools)
    await squads.assignPlayer('participant-1', { slotKey: 'starter-mid-1', playerId: 106 })

    const beforeRewrite = await squads.getOrCreate('participant-1')
    expect(beforeRewrite.slots.find((slot) => slot.key === 'starter-mid-1')?.player?.positions).toEqual(['CM', 'DM'])

    // Simulate the SV season transition: replace the same player with a different position list.
    await pools.replaceTeamPlayers('FRA', [{ ...player(106, 'CM'), positions: ['CM'] }])

    const afterRewrite = await squads.getOrCreate('participant-1')
    expect(afterRewrite.slots.find((slot) => slot.key === 'starter-mid-1')?.player?.positions).toEqual(['CM', 'DM'])
  })
})

describe('MemorySquadRepository per-team cap', () => {
  it('allows up to 4 players from one team and rejects a 5th from the same team', async () => {
    // Five DEF-eligible players, all seeded into team FRA. Four fit the four starter DEF slots;
    // the fifth (going to the reserve DEF slot) breaches the at-most-4-per-team cap.
    const pools = new MemoryTeamPoolRepository()
    await pools.replaceTeamPlayers(
      'FRA',
      [301, 302, 303, 304, 305].map((playerId) => player(playerId, 'CB')),
    )
    const squads = new MemorySquadRepository(pools)
    const participantId = 'participant-cap'

    await squads.assignPlayer(participantId, { slotKey: 'starter-def-1', playerId: 301 })
    await squads.assignPlayer(participantId, { slotKey: 'starter-def-2', playerId: 302 })
    await squads.assignPlayer(participantId, { slotKey: 'starter-def-3', playerId: 303 })
    await squads.assignPlayer(participantId, { slotKey: 'starter-def-4', playerId: 304 })

    await expect(
      squads.assignPlayer(participantId, { slotKey: 'sub-def-1', playerId: 305 }),
    ).rejects.toThrow(/at most 4 players from the same team/)
  })
})
