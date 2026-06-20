import { describe, expect, it } from 'vitest'
import { MemoryConfigRepository } from '../repositories/configRepository.js'
import { MemoryRegistrationRepository } from '../repositories/registrationRepository.js'
import { MemoryScoringRepository } from '../repositories/scoringRepository.js'
import { MemorySquadRepository } from '../repositories/squadRepository.js'
import { MemoryTeamPoolRepository } from '../repositories/teamPoolRepository.js'
import { MemoryParticipantInfluenceSnapshotRepository } from '../repositories/participantInfluenceSnapshotRepository.js'
import type { SlotClass, SoccerversePlayerRecord } from '../domain/types.js'

// A legal 15-man squad shape (1+4+3+3 starters, 1/1/1/1 reserves). Distinct managers get distinct
// player-id sets via an offset (0 / 100 / 200 / 300) so a match entry scores for exactly one manager.
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

// Spread the squad across four pools so no squad holds more than 4 from one nation (the cap).
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

const OFFSETS = [0, 100, 200, 300]

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

// Map any offset player id back to its base slot to find the pool team it belongs to.
function teamForPlayer(record: SoccerversePlayerRecord): string {
  const baseId = ((record.playerId - 101) % 100) + 101
  const slot = slotPlayers.find((slotPlayer) => slotPlayer.playerId === baseId)
  return slot ? slotTeam[slot.slotKey] : 'FRA'
}

async function seedAllPools(pools: MemoryTeamPoolRepository) {
  const players = OFFSETS.flatMap((offset) => slotPlayers.map((slotPlayer) => player(slotPlayer.playerId + offset, slotPlayer.position)))
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

async function registerManager(
  registrations: MemoryRegistrationRepository,
  squads: MemorySquadRepository,
  options: { email: string; displayName: string; primaryTeamCode: string; token: string; offset: number },
) {
  const created = await registrations.createPending(
    { email: options.email, displayName: options.displayName, primaryTeamCode: options.primaryTeamCode, marketingOptIn: false },
    options.token,
  )
  await registrations.verifyByPlainToken(options.token)
  for (const slotPlayer of slotPlayers) {
    await squads.assignPlayer(created.record.participantId, { slotKey: slotPlayer.slotKey, playerId: slotPlayer.playerId + options.offset })
  }
  await squads.lockSquad(created.record.participantId)
  return created.record.participantId
}

// Two UTC matchdays. The ids are NOT seed fixtures, so the late-entry kickoff cutoff is bypassed
// (every entry scores) and the UTC day is taken from the id's `YYYY-MM-DD` prefix.
const DAY_1 = '2026-06-11'
const DAY_2 = '2026-06-13'
const FIXTURE_DAY_1 = `${DAY_1}-d1`
const FIXTURE_DAY_2 = `${DAY_2}-d2`

// Four rookies: A,B on FRA and C,D on BRA. Day 1 FRA leads; day 2 BRA's pair surges past.
async function buildFourManagerBoard() {
  const pools = new MemoryTeamPoolRepository()
  await seedAllPools(pools)
  const registrations = new MemoryRegistrationRepository()
  const squads = new MemorySquadRepository(pools)

  const a = await registerManager(registrations, squads, { email: 'a@example.com', displayName: 'Manager A', primaryTeamCode: 'FRA', token: 'tok-a', offset: 0 })
  const b = await registerManager(registrations, squads, { email: 'b@example.com', displayName: 'Manager B', primaryTeamCode: 'FRA', token: 'tok-b', offset: 100 })
  const c = await registerManager(registrations, squads, { email: 'c@example.com', displayName: 'Manager C', primaryTeamCode: 'BRA', token: 'tok-c', offset: 200 })
  const d = await registerManager(registrations, squads, { email: 'd@example.com', displayName: 'Manager D', primaryTeamCode: 'BRA', token: 'tok-d', offset: 300 })

  const scoring = new MemoryScoringRepository(new MemoryConfigRepository(), registrations, squads, new MemoryParticipantInfluenceSnapshotRepository())

  // Day 1: A scores big (4 goals = 22), C medium (1 goal = 7), B and D just appear (2 each).
  await scoring.upsertMatchEntry({ fixtureId: FIXTURE_DAY_1, playerId: 101, inOfficialSquad: true, minutes: 90, goals: 4, assists: 0, cleanSheetEligible: false })
  await scoring.upsertMatchEntry({ fixtureId: FIXTURE_DAY_1, playerId: 201, inOfficialSquad: true, minutes: 90, goals: 0, assists: 0, cleanSheetEligible: false })
  await scoring.upsertMatchEntry({ fixtureId: FIXTURE_DAY_1, playerId: 301, inOfficialSquad: true, minutes: 90, goals: 1, assists: 0, cleanSheetEligible: false })
  await scoring.upsertMatchEntry({ fixtureId: FIXTURE_DAY_1, playerId: 401, inOfficialSquad: true, minutes: 90, goals: 0, assists: 0, cleanSheetEligible: false })
  // Day 2: C and D each add 10 goals (52 each) — BRA's average rockets past FRA's.
  await scoring.upsertMatchEntry({ fixtureId: FIXTURE_DAY_2, playerId: 301, inOfficialSquad: true, minutes: 90, goals: 10, assists: 0, cleanSheetEligible: false })
  await scoring.upsertMatchEntry({ fixtureId: FIXTURE_DAY_2, playerId: 401, inOfficialSquad: true, minutes: 90, goals: 10, assists: 0, cleanSheetEligible: false })

  return { scoring, a, b, c, d }
}

describe('rank history — participant boards', () => {
  it('tracks a manager climbing then being overtaken across UTC matchdays', async () => {
    const { scoring, a, c } = await buildFourManagerBoard()

    const historyA = await scoring.getRankHistory('rookie', a)
    expect(historyA).not.toBeNull()
    expect(historyA?.boardSize).toBe(4)
    expect(historyA?.points.map((point) => point.date)).toEqual([DAY_1, DAY_2])
    expect(historyA?.points.map((point) => point.rank)).toEqual([1, 3])
    expect(historyA?.points[0].score).toBeCloseTo(22, 5)
    expect(historyA?.points[1].score).toBeCloseTo(22, 5)

    const historyC = await scoring.getRankHistory('rookie', c)
    expect(historyC?.points.map((point) => point.rank)).toEqual([2, 1])
    expect(historyC?.points[1].score).toBeCloseTo(59, 5)
  })

  it('returns null for an entity absent from the requested board', async () => {
    const { scoring, a } = await buildFourManagerBoard()
    expect(await scoring.getRankHistory('rookie', 'no-such-id')).toBeNull()
    // A is a rookie, so it must not appear on the veteran board.
    expect(await scoring.getRankHistory('veteran', a)).toBeNull()
  })

  it('agrees with the live league board on the final matchday', async () => {
    const { scoring, a } = await buildFourManagerBoard()
    const liveBoard = await scoring.getLeagueLeaderboard('rookie')
    const liveRankA = liveBoard.find((row) => row.participantId === a)?.rank
    const history = await scoring.getRankHistory('rookie', a)
    expect(history?.points.at(-1)?.rank).toBe(liveRankA)
  })
})

describe('rank history — nations board', () => {
  it('tracks two nations swapping the lead across matchdays', async () => {
    const { scoring } = await buildFourManagerBoard()

    const fra = await scoring.getRankHistory('nations', 'FRA')
    const bra = await scoring.getRankHistory('nations', 'BRA')

    expect(fra?.boardSize).toBe(2)
    expect(fra?.points.map((point) => point.rank)).toEqual([1, 2])
    expect(bra?.points.map((point) => point.rank)).toEqual([2, 1])
    // FRA average is (22 + 2) / 2 = 12 on both days; BRA day 2 is (59 + 54) / 2 = 56.5.
    expect(fra?.points[0].score).toBeCloseTo(12, 5)
    expect(bra?.points[1].score).toBeCloseTo(56.5, 5)
  })

  it('returns null for a nation that does not qualify for the public table', async () => {
    const { scoring } = await buildFourManagerBoard()
    expect(await scoring.getRankHistory('nations', 'ZZZ')).toBeNull()
  })

  it('agrees with the live nation board on the final matchday', async () => {
    const { scoring } = await buildFourManagerBoard()
    const liveNations = await scoring.getNationLeaderboard()
    const liveBraRank = liveNations.find((row) => row.teamCode === 'BRA')?.rank
    const history = await scoring.getRankHistory('nations', 'BRA')
    expect(history?.points.at(-1)?.rank).toBe(liveBraRank)
  })
})

describe('rank history — boost attribution', () => {
  it('includes per-fixture ownership boost in the cumulative score, matching the live total', async () => {
    const pools = new MemoryTeamPoolRepository()
    await seedAllPools(pools)
    const registrations = new MemoryRegistrationRepository()
    const squads = new MemorySquadRepository(pools)
    const participantId = await registerManager(registrations, squads, {
      email: 'boost@example.com',
      displayName: 'Boosted',
      primaryTeamCode: 'FRA',
      token: 'tok-boost',
      offset: 0,
    })

    const snapshots = new MemoryParticipantInfluenceSnapshotRepository()
    const scoring = new MemoryScoringRepository(new MemoryConfigRepository(), registrations, squads, snapshots)

    const fixtureId = '2026-06-12-boost'
    // Base = 2 goals (10) + appearance (1) + 60' (1) = 12; +10% boost = 1.2 → total 13.2.
    await scoring.upsertMatchEntry({ fixtureId, playerId: 101, inOfficialSquad: true, minutes: 90, goals: 2, assists: 0, cleanSheetEligible: false })
    await snapshots.upsert({ participantId, fixtureId, playerId: 101, netShares: 100, bonusPercent: 10 })

    const history = await scoring.getRankHistory('rookie', participantId)
    const liveTotal = (await scoring.getLeagueLeaderboard('rookie')).find((row) => row.participantId === participantId)?.totalScore

    expect(history?.points).toHaveLength(1)
    expect(history?.points[0].score).toBeCloseTo(13.2, 5)
    expect(history?.points[0].score).toBeCloseTo(liveTotal ?? 0, 5)
  })
})
