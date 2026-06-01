import { describe, expect, it, vi } from 'vitest'
import { LeaderboardCache } from './leaderboardCache.js'
import { MemoryConfigRepository } from './configRepository.js'
import { MemoryParticipantInfluenceSnapshotRepository } from './participantInfluenceSnapshotRepository.js'
import { MemoryRegistrationRepository } from './registrationRepository.js'
import { MemoryScoringRepository } from './scoringRepository.js'
import { MemorySquadRepository } from './squadRepository.js'
import { MemoryTeamPoolRepository } from './teamPoolRepository.js'
import type { SoccerversePlayerRecord, SlotClass } from '../domain/types.js'

// Mirrors the 15-slot squad shape used in scoringRepository.test.ts, spread across four teams so the
// per-team cap (4) is never breached.
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

// Inject an active participant directly into the registration repo's byEmail map — the same shortcut
// the scoring tests use. This deliberately bypasses createPending so it does NOT itself invalidate;
// each test then triggers a specific write to assert the invalidation hook.
function activate(registrations: MemoryRegistrationRepository, participantId: string, leagueType: 'rookie' | 'veteran' = 'rookie') {
  const byEmail = (registrations as unknown as { byEmail: Map<string, Record<string, unknown>> }).byEmail
  byEmail.set(`${participantId}@example.com`, {
    participantId,
    displayName: `Manager ${participantId}`,
    leagueType,
    primaryTeamCode: 'BRA',
    status: 'active',
    createdAt: new Date().toISOString(),
  })
}

interface Harness {
  cache: LeaderboardCache
  pools: MemoryTeamPoolRepository
  registrations: MemoryRegistrationRepository
  squads: MemorySquadRepository
  config: MemoryConfigRepository
  snapshots: MemoryParticipantInfluenceSnapshotRepository
  scoring: MemoryScoringRepository
}

function makeHarness(): Harness {
  // Long TTL so any recompute observed in these tests is caused by an invalidate(), never by expiry.
  const cache = new LeaderboardCache(60_000)
  const pools = new MemoryTeamPoolRepository(cache)
  const registrations = new MemoryRegistrationRepository(cache)
  const squads = new MemorySquadRepository(pools, undefined, cache)
  const config = new MemoryConfigRepository(cache)
  const snapshots = new MemoryParticipantInfluenceSnapshotRepository(cache)
  const scoring = new MemoryScoringRepository(config, registrations, squads, snapshots, cache)
  return { cache, pools, registrations, squads, config, snapshots, scoring }
}

async function seedLockedSquad(h: Harness, participantId: string) {
  const byTeam = new Map<string, SoccerversePlayerRecord[]>()
  for (const slot of slotPlayers) {
    const teamCode = slotTeam[slot.slotKey]
    const list = byTeam.get(teamCode) ?? []
    list.push(player(slot.playerId, slot.position))
    byTeam.set(teamCode, list)
  }
  for (const [teamCode, teamPlayers] of byTeam) {
    await h.pools.replaceTeamPlayers(teamCode, teamPlayers)
  }
  for (const slot of slotPlayers) {
    await h.squads.assignPlayer(participantId, { slotKey: slot.slotKey, playerId: slot.playerId })
  }
  await h.squads.lockSquad(participantId)
}

describe('leaderboard cache invalidation (integration)', () => {
  it('computes once across reads, then recomputes after a match-entry write', async () => {
    const h = makeHarness()
    const participantId = 'p-1'
    activate(h.registrations, participantId)
    await seedLockedSquad(h, participantId)

    // getScoringConfig runs exactly once per underlying calculateRows; spying on it counts computes.
    // (The ranked output array differs every call — rankParticipants rebuilds it — so the cache hit
    // must be observed at the compute layer, not by array identity.)
    const computeSpy = vi.spyOn(h.config, 'getScoringConfig')

    const first = await h.scoring.getLeagueLeaderboard('rookie')
    const second = await h.scoring.getLeagueLeaderboard('rookie')
    const nations = await h.scoring.getNationLeaderboard()
    // Three public reads (rookie + veteran-shaped + nations) share one compute — compute-once-per-payload.
    expect(computeSpy).toHaveBeenCalledTimes(1)
    expect(first).toHaveLength(1)
    expect(second).toHaveLength(1)
    void nations

    await h.scoring.upsertMatchEntry({
      fixtureId: 'GROUP-1',
      playerId: 109,
      inOfficialSquad: true,
      minutes: 90,
      goals: 1,
      assists: 0,
      cleanSheetEligible: false,
      sourceNote: 'test',
    })

    const afterWrite = await h.scoring.getLeagueLeaderboard('rookie')
    // The write invalidated, so this read recomputes (second compute) and reflects the new entry.
    expect(computeSpy).toHaveBeenCalledTimes(2)
    expect(afterWrite[0]?.totalScore).toBeGreaterThan(0)
  })

  it('invalidates when a squad locks', async () => {
    const h = makeHarness()
    const participantId = 'p-lock'
    activate(h.registrations, participantId)

    // Prime the cache while the participant has no locked squad (board is empty).
    const before = await h.scoring.getLeagueLeaderboard('rookie')
    expect(before).toHaveLength(0)

    await seedLockedSquad(h, participantId)

    const after = await h.scoring.getLeagueLeaderboard('rookie')
    expect(after).toHaveLength(1)
    expect(after[0]?.participantId).toBe(participantId)
  })

  it('invalidates on snapshot upsert (closes the ordering trap)', async () => {
    const h = makeHarness()
    const participantId = 'p-vet'
    activate(h.registrations, participantId, 'veteran')
    await seedLockedSquad(h, participantId)
    await h.scoring.upsertMatchEntry({
      fixtureId: 'GROUP-1',
      playerId: 109,
      inOfficialSquad: true,
      minutes: 90,
      goals: 1,
      assists: 0,
      cleanSheetEligible: false,
      sourceNote: 'test',
    })

    // Prime: veteran board computed BEFORE the influence snapshot lands (bonus not yet applied).
    const beforeSnapshot = await h.scoring.getLeagueLeaderboard('veteran')
    const baseScore = beforeSnapshot[0]?.totalScore ?? 0

    // The late, fire-and-forget snapshot write must invalidate so the next read includes the bonus.
    await h.snapshots.upsert({ participantId, fixtureId: 'GROUP-1', playerId: 109, netShares: 100, bonusPercent: 10 })

    const afterSnapshot = await h.scoring.getLeagueLeaderboard('veteran')
    expect(afterSnapshot).not.toBe(beforeSnapshot)
    expect(afterSnapshot[0]?.totalScore).toBeGreaterThan(baseScore)
  })

  it('invalidates on scoring config change', async () => {
    const h = makeHarness()
    const participantId = 'p-cfg'
    activate(h.registrations, participantId)
    await seedLockedSquad(h, participantId)
    await h.scoring.upsertMatchEntry({
      fixtureId: 'GROUP-1',
      playerId: 109,
      inOfficialSquad: true,
      minutes: 90,
      goals: 1,
      assists: 0,
      cleanSheetEligible: false,
      sourceNote: 'test',
    })

    const before = await h.scoring.getLeagueLeaderboard('rookie')
    const baseScore = before[0]?.totalScore ?? 0

    const config = await h.config.getScoringConfig()
    await h.config.updateScoringConfig({ ...config, goal: config.goal * 2 })

    const after = await h.scoring.getLeagueLeaderboard('rookie')
    expect(after).not.toBe(before)
    expect(after[0]?.totalScore).toBeGreaterThan(baseScore)
  })
})
