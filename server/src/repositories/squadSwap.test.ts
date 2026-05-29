import { describe, expect, it } from 'vitest'
import type { FixtureSeed, SlotClass, SoccerversePlayerRecord } from '../domain/types.js'
import { MemoryConfigRepository } from './configRepository.js'
import { MemoryParticipantInfluenceSnapshotRepository } from './participantInfluenceSnapshotRepository.js'
import { MemoryRegistrationRepository } from './registrationRepository.js'
import { MemoryScoringRepository } from './scoringRepository.js'
import { MemorySquadRepository, SquadValidationError } from './squadRepository.js'
import { MemoryTeamPoolRepository } from './teamPoolRepository.js'
import { SwapValidationError } from '../lib/swapGate.js'

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

function player(playerId: number, position: string, nationalityCode = 'FRA'): SoccerversePlayerRecord {
  return { playerId, displayName: `Player ${playerId}`, nationalityCode, rating: 50, clubId: 1, positions: [position], positionMain: position }
}

// Spread the 15-player squad across four Grand Tournament teams so no team holds more than 4 of them
// (the per-team cap is 4). Same-class swap pairs (e.g. MID 106/114) share a team, so the in-match
// lock and clean-sheet swap scenarios still operate within one team.
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

// Seed the standard squad into its mapped team pools, one pool per team. `make` builds each player
// record from its slot, preserving any per-player customization (nationality, position) the caller needs.
async function seedSquadPools(
  pools: MemoryTeamPoolRepository,
  make: (slotPlayer: (typeof slotPlayers)[number]) => SoccerversePlayerRecord,
) {
  const byTeam = new Map<string, SoccerversePlayerRecord[]>()
  for (const slotPlayer of slotPlayers) {
    const teamCode = slotTeam[slotPlayer.slotKey]
    const bucket = byTeam.get(teamCode) ?? []
    bucket.push(make(slotPlayer))
    byTeam.set(teamCode, bucket)
  }
  for (const [teamCode, bucket] of byTeam) {
    await pools.replaceTeamPlayers(teamCode, bucket)
  }
}

const LOCK_TIME = new Date('2026-06-01T00:00:00Z').getTime() // before the tournament starts
const W1_TIME = new Date('2026-06-18T08:00:00Z').getTime() // inside swap window 1 (targets round 2)
const W3_LIVE_TIME = new Date('2026-07-08T12:30:00Z').getTime()
const ROUND_1_FIXTURE = '2026-06-11-a-mex-rsa' // round 1
const ROUND_2_FIXTURE = '2026-06-18-a-cze-rsa' // round 2
const liveFranceFixture: FixtureSeed = {
  fixtureId: '2026-07-08-fra-ger',
  groupKey: 'KO',
  kickoffDate: '2026-07-08',
  kickoffTimeUtc: '12:00:00',
  homeTeamCode: 'FRA',
  awayTeamCode: 'GER',
}

async function setup() {
  const pools = new MemoryTeamPoolRepository()
  await seedSquadPools(pools, (slotPlayer) => player(slotPlayer.playerId, slotPlayer.position))
  const registrations = new MemoryRegistrationRepository()
  const created = await registrations.createPending(
    { email: 'manager@example.com', displayName: 'Manager', primaryTeamCode: 'FRA', marketingOptIn: false },
    'token',
  )
  await registrations.verifyByPlainToken('token')

  const clock = { value: LOCK_TIME }
  const squads = new MemorySquadRepository(pools, () => clock.value)
  for (const slotPlayer of slotPlayers) {
    await squads.assignPlayer(created.record.participantId, { slotKey: slotPlayer.slotKey, playerId: slotPlayer.playerId })
  }
  await squads.lockSquad(created.record.participantId)

  const scoring = new MemoryScoringRepository(new MemoryConfigRepository(), registrations, squads, new MemoryParticipantInfluenceSnapshotRepository())
  // Starting MID 106 scores a goal in both round 1 and round 2.
  await scoring.upsertMatchEntry({ fixtureId: ROUND_1_FIXTURE, playerId: 106, inOfficialSquad: true, minutes: 90, goals: 1, assists: 0, cleanSheetEligible: false })
  await scoring.upsertMatchEntry({ fixtureId: ROUND_2_FIXTURE, playerId: 106, inOfficialSquad: true, minutes: 90, goals: 1, assists: 0, cleanSheetEligible: false })
  // Reserve MID 114 scores a goal in round 2.
  await scoring.upsertMatchEntry({ fixtureId: ROUND_2_FIXTURE, playerId: 114, inOfficialSquad: true, minutes: 90, goals: 1, assists: 0, cleanSheetEligible: false })

  return { participantId: created.record.participantId, squads, scoring, clock }
}

function fixtureDetail(row: { fixtures: Array<{ fixtureId: string; players: Array<{ playerId: number; slotGroup: string; totalPoints: number }> }> }, fixtureId: string) {
  return row.fixtures.find((fixture) => fixture.fixtureId === fixtureId)
}

describe('player swaps — per-round freeze scoring', () => {
  it('baseline: starter 106 scores full in both rounds; reserve 114 scores half', async () => {
    const { scoring } = await setup()
    const [row] = await scoring.getLeagueLeaderboard('rookie')
    // goal = 5; appearance = 1; minutes(>=60) = 1 -> 7 per full entry, 3.5 per reserve entry.
    // 106 full round1 (7) + 106 full round2 (7) + 114 half round2 (3.5) = 17.5
    expect(row.baseScore).toBe(17.5)
    expect(fixtureDetail(row, ROUND_2_FIXTURE)?.players.find((p) => p.playerId === 114)?.slotGroup).toBe('sub')
  })

  it('after swapping 114 in for 106 in W1, round 2 flips weights but round 1 is untouched', async () => {
    const { participantId, squads, scoring, clock } = await setup()
    clock.value = W1_TIME
    const result = await squads.swapPlayers(participantId, { playerInId: 114, playerOutId: 106 })
    expect(result.windowKey).toBe('W1')
    expect(result.targetRound).toBe(2)
    expect(result.swapsUsedInWindow).toBe(1)

    const [row] = await scoring.getLeagueLeaderboard('rookie')
    // Round 1 baseline unchanged: 106 still a full-weight starter (7, no retroactive recompute).
    const round1 = fixtureDetail(row, ROUND_1_FIXTURE)
    expect(round1?.players.find((p) => p.playerId === 106)?.slotGroup).toBe('starter')
    expect(round1?.players.find((p) => p.playerId === 106)?.totalPoints).toBe(7)
    // Round 2 snapshot: 114 now a full starter (7), 106 now a half-weight reserve (3.5).
    const round2 = fixtureDetail(row, ROUND_2_FIXTURE)
    expect(round2?.players.find((p) => p.playerId === 114)?.slotGroup).toBe('starter')
    expect(round2?.players.find((p) => p.playerId === 114)?.totalPoints).toBe(7)
    expect(round2?.players.find((p) => p.playerId === 106)?.slotGroup).toBe('sub')
    expect(round2?.players.find((p) => p.playerId === 106)?.totalPoints).toBe(3.5)
    // Total: round1 106 full (7) + round2 106 sub (3.5) + round2 114 starter (7) = 17.5
    expect(row.baseScore).toBe(17.5)
  })
})

describe('player swaps — gate enforcement', () => {
  it('rejects a swap outside any window', async () => {
    const { participantId, squads, clock } = await setup()
    clock.value = new Date('2026-06-20T00:00:00Z').getTime() // between W1 and W2
    await expect(squads.swapPlayers(participantId, { playerInId: 114, playerOutId: 106 })).rejects.toBeInstanceOf(SwapValidationError)
  })

  it('rejects swapping across position classes', async () => {
    const { participantId, squads, clock } = await setup()
    clock.value = W1_TIME
    // 114 is the reserve MID, 109 is a starting FWD — different classes.
    await expect(squads.swapPlayers(participantId, { playerInId: 114, playerOutId: 109 })).rejects.toBeInstanceOf(SwapValidationError)
  })

  it('rejects bringing on a player who is already a starter', async () => {
    const { participantId, squads, clock } = await setup()
    clock.value = W1_TIME
    // 106 and 107 are both starters; 106 is not a reserve.
    await expect(squads.swapPlayers(participantId, { playerInId: 106, playerOutId: 107 })).rejects.toBeInstanceOf(SwapValidationError)
  })

  it('enforces the per-window swap limit (W1 = 2)', async () => {
    const { participantId, squads, clock } = await setup()
    clock.value = W1_TIME
    await squads.swapPlayers(participantId, { playerInId: 114, playerOutId: 106 }) // swap 1
    await squads.swapPlayers(participantId, { playerInId: 106, playerOutId: 114 }) // swap 2 (reversal counts)
    await expect(squads.swapPlayers(participantId, { playerInId: 114, playerOutId: 106 })).rejects.toThrow(/limit reached/)
  })

  it('rejects a swap on an unlocked squad', async () => {
    const pools = new MemoryTeamPoolRepository()
    await seedSquadPools(pools, (slotPlayer) => player(slotPlayer.playerId, slotPlayer.position))
    const clock = { value: W1_TIME }
    const squads = new MemorySquadRepository(pools, () => clock.value)
    await expect(squads.swapPlayers('nobody', { playerInId: 114, playerOutId: 106 })).rejects.toBeInstanceOf(SquadValidationError)
  })

  it('uses the drafted team code, not player nationality, for the in-match lock', async () => {
    const pools = new MemoryTeamPoolRepository()
    await seedSquadPools(pools, (slotPlayer) => player(slotPlayer.playerId, slotPlayer.position, 'XXX'))
    const registrations = new MemoryRegistrationRepository()
    const created = await registrations.createPending(
      { email: 'team-code@example.com', displayName: 'Team Code', primaryTeamCode: 'FRA', marketingOptIn: false },
      'team-code-token',
    )
    await registrations.verifyByPlainToken('team-code-token')

    const clock = { value: LOCK_TIME }
    const squads = new MemorySquadRepository(pools, () => clock.value)
    for (const slotPlayer of slotPlayers) {
      await squads.assignPlayer(created.record.participantId, { slotKey: slotPlayer.slotKey, playerId: slotPlayer.playerId })
    }
    await squads.lockSquad(created.record.participantId)

    clock.value = W3_LIVE_TIME
    await expect(
      squads.swapPlayers(created.record.participantId, { playerInId: 114, playerOutId: 106 }, [liveFranceFixture]),
    ).rejects.toThrow(/currently playing/)
  })
})

describe('player swaps — MID clean-sheet position codes travel with the player', () => {
  // Reserve MID 114 is a defensive midfielder (DM → earns the MID clean-sheet bonus); starting MID
  // 106 is a plain CM (no bonus). After swapping 114 in for 106, the round-2 lineup must credit the
  // clean-sheet bonus to 114 at full weight, and 106 (now a CM reserve) must earn none.
  async function setupCleanSheet() {
    const pools = new MemoryTeamPoolRepository()
    await seedSquadPools(pools, (slotPlayer) =>
      player(slotPlayer.playerId, slotPlayer.playerId === 114 ? 'DM' : slotPlayer.position),
    )
    const registrations = new MemoryRegistrationRepository()
    const created = await registrations.createPending(
      { email: 'cs@example.com', displayName: 'CS', primaryTeamCode: 'FRA', marketingOptIn: false },
      'token',
    )
    await registrations.verifyByPlainToken('token')
    const clock = { value: LOCK_TIME }
    const squads = new MemorySquadRepository(pools, () => clock.value)
    for (const slotPlayer of slotPlayers) {
      await squads.assignPlayer(created.record.participantId, { slotKey: slotPlayer.slotKey, playerId: slotPlayer.playerId })
    }
    await squads.lockSquad(created.record.participantId)
    const scoring = new MemoryScoringRepository(new MemoryConfigRepository(), registrations, squads, new MemoryParticipantInfluenceSnapshotRepository())
    for (const playerId of [106, 114]) {
      await scoring.upsertMatchEntry({ fixtureId: ROUND_2_FIXTURE, playerId, inOfficialSquad: true, minutes: 90, goals: 0, assists: 0, cleanSheetEligible: true })
    }
    return { participantId: created.record.participantId, squads, scoring, clock }
  }

  it('moves the DM clean-sheet bonus to the promoted reserve after a swap', async () => {
    const { participantId, squads, scoring, clock } = await setupCleanSheet()
    clock.value = W1_TIME
    await squads.swapPlayers(participantId, { playerInId: 114, playerOutId: 106 })

    const [row] = await scoring.getLeagueLeaderboard('rookie')
    const round2 = row.fixtures.find((fixture) => fixture.fixtureId === ROUND_2_FIXTURE)
    const promoted = round2?.players.find((p) => p.playerId === 114)
    const demoted = round2?.players.find((p) => p.playerId === 106)
    // 114 is now a full-weight starter and a DM → full MID clean-sheet bonus (1).
    expect(promoted?.slotGroup).toBe('starter')
    expect(promoted?.cleanSheetPoints).toBe(1)
    // 106 is now a reserve CM → no clean-sheet bonus regardless of weight.
    expect(demoted?.slotGroup).toBe('sub')
    expect(demoted?.cleanSheetPoints).toBe(0)
  })
})
