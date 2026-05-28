import { describe, expect, it } from 'vitest'
import { fixtureKickoffEpoch } from '../data/competitionWindow.js'
import { MemoryConfigRepository } from './configRepository.js'
import { MemoryRegistrationRepository } from './registrationRepository.js'
import { MemoryScoringRepository } from './scoringRepository.js'
import { MemorySquadRepository } from './squadRepository.js'
import { MemoryTeamPoolRepository } from './teamPoolRepository.js'
import { MemoryParticipantInfluenceSnapshotRepository } from './participantInfluenceSnapshotRepository.js'
import type { ParticipantSquad, SoccerversePlayerRecord, SlotClass } from '../domain/types.js'
import { fixtures as seedFixtures } from '../data/worldCupSeed.js'

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

describe('MemoryScoringRepository competition squad scoring', () => {
  it('scores the one locked competition squad across fixtures', async () => {
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
    for (const slotPlayer of slotPlayers) {
      await squads.assignPlayer(created.record.participantId, { slotKey: slotPlayer.slotKey, playerId: slotPlayer.playerId })
    }
    await squads.lockSquad(created.record.participantId)

    const scoring = new MemoryScoringRepository(new MemoryConfigRepository(), registrations, squads, new MemoryParticipantInfluenceSnapshotRepository())
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
      playerId: 102,
      inOfficialSquad: true,
      minutes: 90,
      goals: 0,
      assists: 0,
      cleanSheetEligible: false,
    })

    const leaderboard = await scoring.getLeagueLeaderboard('rookie')
    expect(leaderboard[0].baseScore).toBe(4)
  })

  it('scores reserves at half their earned points, with no auto-activation', async () => {
    const pools = new MemoryTeamPoolRepository()
    await pools.replaceTeamPlayers(
      'FRA',
      slotPlayers.map((slotPlayer) => player(slotPlayer.playerId, slotPlayer.position)),
    )
    const registrations = new MemoryRegistrationRepository()
    const created = await registrations.createPending(
      { email: 'reserve@example.com', displayName: 'Reserve Manager', primaryTeamCode: 'FRA', marketingOptIn: false },
      'reserve-token',
    )
    await registrations.verifyByPlainToken('reserve-token')

    const squads = new MemorySquadRepository(pools)
    for (const slotPlayer of slotPlayers) {
      await squads.assignPlayer(created.record.participantId, { slotKey: slotPlayer.slotKey, playerId: slotPlayer.playerId })
    }
    await squads.lockSquad(created.record.participantId)

    const scoring = new MemoryScoringRepository(new MemoryConfigRepository(), registrations, squads, new MemoryParticipantInfluenceSnapshotRepository())
    // Reserve forward (sub-fwd-1, playerId 115) plays 90' and scores: full = goal 5 + appearance 1 + 60' 1 = 7.
    await scoring.upsertMatchEntry({
      fixtureId: 'fixture-1',
      playerId: 115,
      inOfficialSquad: true,
      minutes: 90,
      goals: 1,
      assists: 0,
      cleanSheetEligible: false,
    })

    const leaderboard = await scoring.getLeagueLeaderboard('rookie')
    expect(leaderboard[0].baseScore).toBeCloseTo(3.5, 5)
  })

  it('applies the selected budget multiplier to the final score', async () => {
    const pools = new MemoryTeamPoolRepository()
    await pools.replaceTeamPlayers(
      'FRA',
      slotPlayers.map((slotPlayer) => player(slotPlayer.playerId, slotPlayer.position)),
    )
    const registrations = new MemoryRegistrationRepository()
    const created = await registrations.createPending(
      {
        email: 'budget@example.com',
        displayName: 'Budget Manager',
        primaryTeamCode: 'FRA',
        marketingOptIn: false,
      },
      'budget-token',
    )
    await registrations.verifyByPlainToken('budget-token')

    const squads = new MemorySquadRepository(pools)
    await squads.setBudget(created.record.participantId, 1_500_000)
    for (const slotPlayer of slotPlayers) {
      await squads.assignPlayer(created.record.participantId, { slotKey: slotPlayer.slotKey, playerId: slotPlayer.playerId })
    }
    await squads.lockSquad(created.record.participantId)

    const scoring = new MemoryScoringRepository(new MemoryConfigRepository(), registrations, squads, new MemoryParticipantInfluenceSnapshotRepository())
    await scoring.upsertMatchEntry({
      fixtureId: 'fixture-1',
      playerId: 109,
      inOfficialSquad: true,
      minutes: 90,
      goals: 1,
      assists: 0,
      cleanSheetEligible: false,
    })

    const leaderboard = await scoring.getLeagueLeaderboard('rookie')
    expect(leaderboard[0].baseScore).toBe(7)
    expect(leaderboard[0].scoreMultiplier).toBe(1.3)
    expect(leaderboard[0].totalScore).toBeCloseTo(9.1)
  })

  it('exposes fixture and player scoring details for public table drilldowns', async () => {
    const pools = new MemoryTeamPoolRepository()
    await pools.replaceTeamPlayers(
      'FRA',
      slotPlayers.map((slotPlayer) => player(slotPlayer.playerId, slotPlayer.position)),
    )
    const registrations = new MemoryRegistrationRepository()
    const created = await registrations.createPending(
      {
        email: 'details@example.com',
        displayName: 'Details Manager',
        primaryTeamCode: 'FRA',
        marketingOptIn: false,
      },
      'details-token',
    )
    await registrations.verifyByPlainToken('details-token')

    const squads = new MemorySquadRepository(pools)
    for (const slotPlayer of slotPlayers) {
      await squads.assignPlayer(created.record.participantId, { slotKey: slotPlayer.slotKey, playerId: slotPlayer.playerId })
    }
    await squads.lockSquad(created.record.participantId)

    const scoring = new MemoryScoringRepository(new MemoryConfigRepository(), registrations, squads, new MemoryParticipantInfluenceSnapshotRepository())
    await scoring.upsertMatchEntry({
      fixtureId: 'fixture-1',
      playerId: 109,
      inOfficialSquad: true,
      minutes: 88,
      goals: 2,
      assists: 1,
      cleanSheetEligible: false,
      rating: 8,
    })
    await scoring.upsertMatchEntry({
      fixtureId: 'fixture-1',
      playerId: 101,
      inOfficialSquad: true,
      minutes: 90,
      goals: 0,
      assists: 0,
      cleanSheetEligible: true,
    })

    const leaderboard = await scoring.getLeagueLeaderboard('rookie')
    const row = leaderboard[0] as any

    expect(row.fixtures).toHaveLength(1)
    expect(row.fixtures[0]).toMatchObject({
      fixtureId: 'fixture-1',
      totalPoints: 22,
    })
    expect(row.fixtures[0].players).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          playerId: 109,
          displayName: 'Player 109',
          teamCode: 'FRA',
          slotKey: 'starter-fwd-1',
          goals: 2,
          assists: 1,
          minutes: 88,
          performancePoints: 1,
          totalPoints: 16,
        }),
        expect.objectContaining({
          playerId: 101,
          displayName: 'Player 101',
          teamCode: 'FRA',
          slotKey: 'starter-gk-1',
          cleanSheetPoints: 4,
          totalPoints: 6,
        }),
      ]),
    )
  })

  it('exposes nation leaderboard contributors for country rankings', async () => {
    const pools = new MemoryTeamPoolRepository()
    await pools.replaceTeamPlayers(
      'FRA',
      slotPlayers.map((slotPlayer) => player(slotPlayer.playerId, slotPlayer.position)),
    )
    const registrations = new MemoryRegistrationRepository()
    const first = await registrations.createPending(
      {
        email: 'nation-one@example.com',
        displayName: 'Nation One',
        primaryTeamCode: 'FRA',
        marketingOptIn: false,
      },
      'nation-one-token',
    )
    const second = await registrations.createPending(
      {
        email: 'nation-two@example.com',
        displayName: 'Nation Two',
        primaryTeamCode: 'FRA',
        secondaryTeamCode: 'BRA',
        marketingOptIn: false,
      },
      'nation-two-token',
    )
    await registrations.verifyByPlainToken('nation-one-token')
    await registrations.verifyByPlainToken('nation-two-token')

    const squads = new MemorySquadRepository(pools)
    for (const participantId of [first.record.participantId, second.record.participantId]) {
      for (const slotPlayer of slotPlayers) {
        await squads.assignPlayer(participantId, { slotKey: slotPlayer.slotKey, playerId: slotPlayer.playerId })
      }
      await squads.lockSquad(participantId)
    }

    const scoring = new MemoryScoringRepository(new MemoryConfigRepository(), registrations, squads, new MemoryParticipantInfluenceSnapshotRepository())
    await scoring.upsertMatchEntry({
      fixtureId: 'fixture-1',
      playerId: 109,
      inOfficialSquad: true,
      minutes: 90,
      goals: 1,
      assists: 0,
      cleanSheetEligible: false,
    })

    const nationRows = await scoring.getNationLeaderboard()
    const france = nationRows.find((row) => row.teamCode === 'FRA')
    expect(france).toBeDefined()
    if (!france) {
      throw new Error('Expected FRA to be present in the nation leaderboard.')
    }

    expect(france).toMatchObject({
      teamCode: 'FRA',
      participantCount: 2,
      averageScore: 7,
      topScore: 7,
    })
    expect(france.contributors).toEqual([
      expect.objectContaining({
        participantId: first.record.participantId,
        displayName: 'Nation One',
        primaryTeamCode: 'FRA',
        totalScore: 7,
      }),
      expect.objectContaining({
        participantId: second.record.participantId,
        displayName: 'Nation Two',
        primaryTeamCode: 'FRA',
        secondaryTeamCode: 'BRA',
        totalScore: 7,
      }),
    ])
  })

  it('excludes countries with a single active manager', async () => {
    const pools = new MemoryTeamPoolRepository()
    await pools.replaceTeamPlayers(
      'FRA',
      slotPlayers.map((slotPlayer) => player(slotPlayer.playerId, slotPlayer.position)),
    )
    const registrations = new MemoryRegistrationRepository()
    const created = await registrations.createPending(
      {
        email: 'solo-france@example.com',
        displayName: 'Solo France',
        primaryTeamCode: 'FRA',
        marketingOptIn: false,
      },
      'solo-france-token',
    )
    await registrations.verifyByPlainToken('solo-france-token')

    const squads = new MemorySquadRepository(pools)
    for (const slotPlayer of slotPlayers) {
      await squads.assignPlayer(created.record.participantId, { slotKey: slotPlayer.slotKey, playerId: slotPlayer.playerId })
    }
    await squads.lockSquad(created.record.participantId)

    const scoring = new MemoryScoringRepository(new MemoryConfigRepository(), registrations, squads, new MemoryParticipantInfluenceSnapshotRepository())
    await scoring.upsertMatchEntry({
      fixtureId: 'fixture-1',
      playerId: 109,
      inOfficialSquad: true,
      minutes: 90,
      goals: 1,
      assists: 0,
      cleanSheetEligible: false,
    })

    const nationRows = await scoring.getNationLeaderboard()

    expect(nationRows).toEqual([])
  })
})

describe('MemoryScoringRepository late-entry rule', () => {
  function lateEntryFixture() {
    const fixture = seedFixtures[0]
    if (!fixture) {
      throw new Error('worldCupSeed fixtures must be populated for late-entry tests.')
    }
    return fixture
  }

  function fixtureKickoffIso(fixture: { kickoffDate: string; kickoffTimeUtc: string }) {
    const epoch = fixtureKickoffEpoch(fixture)
    if (epoch === null) {
      throw new Error('fixture is missing a parseable kickoff')
    }
    return new Date(epoch).toISOString()
  }

  function overrideLockedAt(repo: MemorySquadRepository, participantId: string, lockedAt: string | null) {
    const internal = (repo as unknown as { squads: Map<string, ParticipantSquad> }).squads
    const squad = internal.get(participantId)
    if (!squad) {
      throw new Error('squad missing for participant')
    }
    internal.set(participantId, { ...squad, lockedAt })
  }

  async function buildScenario() {
    const pools = new MemoryTeamPoolRepository()
    await pools.replaceTeamPlayers(
      'FRA',
      slotPlayers.map((slotPlayer) => player(slotPlayer.playerId, slotPlayer.position)),
    )
    const registrations = new MemoryRegistrationRepository()
    const created = await registrations.createPending(
      {
        email: 'late@example.com',
        displayName: 'Late Manager',
        primaryTeamCode: 'FRA',
        marketingOptIn: false,
      },
      'late-token',
    )
    await registrations.verifyByPlainToken('late-token')

    const squads = new MemorySquadRepository(pools)
    for (const slotPlayer of slotPlayers) {
      await squads.assignPlayer(created.record.participantId, { slotKey: slotPlayer.slotKey, playerId: slotPlayer.playerId })
    }
    await squads.lockSquad(created.record.participantId)

    const scoring = new MemoryScoringRepository(new MemoryConfigRepository(), registrations, squads, new MemoryParticipantInfluenceSnapshotRepository())
    return { participantId: created.record.participantId, squads, scoring }
  }

  it('grandfathers a NULL lockedAt: every fixture counts', async () => {
    const { participantId, squads, scoring } = await buildScenario()
    const fixture = lateEntryFixture()
    overrideLockedAt(squads, participantId, null)

    await scoring.upsertMatchEntry({
      fixtureId: fixture.fixtureId,
      playerId: slotPlayers[0].playerId,
      inOfficialSquad: true,
      minutes: 90,
      goals: 1,
      assists: 0,
      cleanSheetEligible: false,
    })

    const leaderboard = await scoring.getLeagueLeaderboard('rookie')
    expect(leaderboard[0].baseScore).toBeGreaterThan(0)
  })

  it('skips a fixture whose kickoff predates the squad lock', async () => {
    const { participantId, squads, scoring } = await buildScenario()
    const fixture = lateEntryFixture()
    const lockEpoch = new Date(fixtureKickoffIso(fixture)).getTime()
    const lockedAfterFixture = new Date(lockEpoch + 60_000).toISOString()
    overrideLockedAt(squads, participantId, lockedAfterFixture)

    await scoring.upsertMatchEntry({
      fixtureId: fixture.fixtureId,
      playerId: slotPlayers[0].playerId,
      inOfficialSquad: true,
      minutes: 90,
      goals: 1,
      assists: 0,
      cleanSheetEligible: false,
    })

    const leaderboard = await scoring.getLeagueLeaderboard('rookie')
    expect(leaderboard[0].baseScore).toBe(0)
  })

  it('uses strict greater-than: lock at the exact kickoff instant excludes that fixture', async () => {
    const { participantId, squads, scoring } = await buildScenario()
    const fixture = lateEntryFixture()
    overrideLockedAt(squads, participantId, fixtureKickoffIso(fixture))

    await scoring.upsertMatchEntry({
      fixtureId: fixture.fixtureId,
      playerId: slotPlayers[0].playerId,
      inOfficialSquad: true,
      minutes: 90,
      goals: 1,
      assists: 0,
      cleanSheetEligible: false,
    })

    const leaderboard = await scoring.getLeagueLeaderboard('rookie')
    expect(leaderboard[0].baseScore).toBe(0)
  })
})

describe('MemoryScoringRepository ownership boost', () => {
  async function buildVeteranScenario() {
    const pools = new MemoryTeamPoolRepository()
    await pools.replaceTeamPlayers(
      'FRA',
      slotPlayers.map((slotPlayer) => player(slotPlayer.playerId, slotPlayer.position)),
    )
    const registrations = new MemoryRegistrationRepository()
    const created = await registrations.createPending(
      {
        email: 'vet@example.com',
        displayName: 'Veteran',
        primaryTeamCode: 'FRA',
        marketingOptIn: false,
        soccerverseUsername: 'vet-sv',
      },
      'vet-token',
    )
    await registrations.verifyByPlainToken('vet-token')

    const squads = new MemorySquadRepository(pools)
    for (const slotPlayer of slotPlayers) {
      await squads.assignPlayer(created.record.participantId, { slotKey: slotPlayer.slotKey, playerId: slotPlayer.playerId })
    }
    await squads.lockSquad(created.record.participantId)

    const snapshots = new MemoryParticipantInfluenceSnapshotRepository()
    const scoring = new MemoryScoringRepository(new MemoryConfigRepository(), registrations, squads, snapshots)

    return { participantId: created.record.participantId, scoring, snapshots }
  }

  it('applies the snapshot bonus per (fixture, player) and derives a positive bonusPercent', async () => {
    const { participantId, scoring, snapshots } = await buildVeteranScenario()

    // Player 101 scores 5 (goal) + 1 (appearance) + 1 (minutes) = 7 base points.
    await scoring.upsertMatchEntry({
      fixtureId: 'fx-boost',
      playerId: 101,
      inOfficialSquad: true,
      minutes: 90,
      goals: 1,
      assists: 0,
      cleanSheetEligible: false,
    })
    await snapshots.upsert({
      participantId,
      fixtureId: 'fx-boost',
      playerId: 101,
      netShares: 100,
      bonusPercent: 10,
    })

    const board = await scoring.getLeagueLeaderboard('veteran')
    expect(board[0].baseScore).toBe(7)
    expect(board[0].totalScore).toBeCloseTo(7.7, 5)
    expect(board[0].bonusPercent).toBeCloseTo(10, 5)
  })

  it('treats a missing snapshot row as bonusPercent=0 (no boost)', async () => {
    const { scoring } = await buildVeteranScenario()
    await scoring.upsertMatchEntry({
      fixtureId: 'fx-noboost',
      playerId: 101,
      inOfficialSquad: true,
      minutes: 90,
      goals: 1,
      assists: 0,
      cleanSheetEligible: false,
    })

    const board = await scoring.getLeagueLeaderboard('veteran')
    expect(board[0].baseScore).toBe(7)
    expect(board[0].totalScore).toBe(7)
    expect(board[0].bonusPercent).toBe(0)
  })

  it('only boosts the fixture+player with a snapshot row, leaving other fixtures untouched', async () => {
    const { participantId, scoring, snapshots } = await buildVeteranScenario()

    // Two fixtures, same player. Snapshot exists only for the first fixture.
    await scoring.upsertMatchEntry({
      fixtureId: 'fx-A',
      playerId: 101,
      inOfficialSquad: true,
      minutes: 90,
      goals: 1,
      assists: 0,
      cleanSheetEligible: false,
    })
    await scoring.upsertMatchEntry({
      fixtureId: 'fx-B',
      playerId: 101,
      inOfficialSquad: true,
      minutes: 90,
      goals: 1,
      assists: 0,
      cleanSheetEligible: false,
    })
    await snapshots.upsert({
      participantId,
      fixtureId: 'fx-A',
      playerId: 101,
      netShares: 50,
      bonusPercent: 5,
    })

    const board = await scoring.getLeagueLeaderboard('veteran')
    // base = 7 + 7 = 14; boost = 7 * 0.05 = 0.35; total = 14.35
    expect(board[0].baseScore).toBe(14)
    expect(board[0].totalScore).toBeCloseTo(14.35, 5)
  })

  it('applies the boost to a linked Rookie on the Rookie leaderboard (boost is not league-gated)', async () => {
    const pools = new MemoryTeamPoolRepository()
    await pools.replaceTeamPlayers(
      'FRA',
      slotPlayers.map((slotPlayer) => player(slotPlayer.playerId, slotPlayer.position)),
    )
    const registrations = new MemoryRegistrationRepository()
    const created = await registrations.createPending(
      {
        email: 'rookie@example.com',
        displayName: 'Linked Rookie',
        primaryTeamCode: 'FRA',
        marketingOptIn: false,
        // No soccerverseUsername at registration — registers as Rookie.
      },
      'rookie-token',
    )
    await registrations.verifyByPlainToken('rookie-token')
    // Link a Soccerverse account post-registration; linking does NOT move the
    // participant into the Veteran league. They stay on the Rookie leaderboard.
    await registrations.linkSoccerverseAccount(created.record.participantId, 'rookie-sv')

    const squads = new MemorySquadRepository(pools)
    for (const slotPlayer of slotPlayers) {
      await squads.assignPlayer(created.record.participantId, { slotKey: slotPlayer.slotKey, playerId: slotPlayer.playerId })
    }
    await squads.lockSquad(created.record.participantId)

    const snapshots = new MemoryParticipantInfluenceSnapshotRepository()
    const scoring = new MemoryScoringRepository(new MemoryConfigRepository(), registrations, squads, snapshots)

    await scoring.upsertMatchEntry({
      fixtureId: 'fx-rookie-boost',
      playerId: 101,
      inOfficialSquad: true,
      minutes: 90,
      goals: 1,
      assists: 0,
      cleanSheetEligible: false,
    })
    await snapshots.upsert({
      participantId: created.record.participantId,
      fixtureId: 'fx-rookie-boost',
      playerId: 101,
      netShares: 80,
      bonusPercent: 8,
    })

    const rookieBoard = await scoring.getLeagueLeaderboard('rookie')
    expect(rookieBoard).toHaveLength(1)
    expect(rookieBoard[0].leagueType).toBe('rookie')
    expect(rookieBoard[0].baseScore).toBe(7)
    expect(rookieBoard[0].totalScore).toBeCloseTo(7.56, 5)
    expect(rookieBoard[0].bonusPercent).toBeCloseTo(8, 5)

    const veteranBoard = await scoring.getLeagueLeaderboard('veteran')
    expect(veteranBoard).toHaveLength(0)
  })

  it('pays DEF 3 and the conditional MID 1 per the 2026-05-28 clean-sheet rules', async () => {
    // Slot mid-1 (playerId 106) is given DM as a Soccerverse alt position; mid-2 (107) is a plain
    // CM with no DM alt. After both register a clean sheet, mid-1 should bank the +1 and mid-2 0.
    // DEF starter (102) banks the new flat 3. GK (101) still banks 4. Reserve MID-DM (114) banks 0.5.
    const pools = new MemoryTeamPoolRepository()
    const players: SoccerversePlayerRecord[] = slotPlayers.map((slotPlayer) => {
      if (slotPlayer.playerId === 106 || slotPlayer.playerId === 114) {
        return { ...player(slotPlayer.playerId, slotPlayer.position), positions: [slotPlayer.position, 'DM'] }
      }
      return player(slotPlayer.playerId, slotPlayer.position)
    })
    await pools.replaceTeamPlayers('FRA', players)

    const registrations = new MemoryRegistrationRepository()
    const created = await registrations.createPending(
      { email: 'cs-rule@example.com', displayName: 'Clean Sheet Rule', primaryTeamCode: 'FRA', marketingOptIn: false },
      'cs-rule-token',
    )
    await registrations.verifyByPlainToken('cs-rule-token')

    const squads = new MemorySquadRepository(pools)
    for (const slotPlayer of slotPlayers) {
      await squads.assignPlayer(created.record.participantId, { slotKey: slotPlayer.slotKey, playerId: slotPlayer.playerId })
    }
    await squads.lockSquad(created.record.participantId)

    const scoring = new MemoryScoringRepository(
      new MemoryConfigRepository(),
      registrations,
      squads,
      new MemoryParticipantInfluenceSnapshotRepository(),
    )

    const cleanSheetEntry = {
      inOfficialSquad: true,
      minutes: 90,
      goals: 0,
      assists: 0,
      cleanSheetEligible: true,
    }
    await scoring.upsertMatchEntry({ ...cleanSheetEntry, fixtureId: 'fixture-1', playerId: 101 }) // GK starter → +4
    await scoring.upsertMatchEntry({ ...cleanSheetEntry, fixtureId: 'fixture-1', playerId: 102 }) // DEF starter → +3
    await scoring.upsertMatchEntry({ ...cleanSheetEntry, fixtureId: 'fixture-1', playerId: 106 }) // MID-DM starter → +1
    await scoring.upsertMatchEntry({ ...cleanSheetEntry, fixtureId: 'fixture-1', playerId: 107 }) // MID-no-DM → 0
    await scoring.upsertMatchEntry({ ...cleanSheetEntry, fixtureId: 'fixture-1', playerId: 114 }) // sub MID-DM → 0.5

    const leaderboard = await scoring.getLeagueLeaderboard('rookie')
    const row = leaderboard[0] as any
    // appearance(1) + 60+(1) = 2 from each entry → 5 entries × 2 = 10 base appearance/minute points.
    // Plus clean sheets: 4 + 3 + 1 + 0 = 8 for starters, plus 0.5 for the reserve MID-DM.
    // Reserve also banks half of its appearance+minutes (2 × 0.5 = 1). Starters bank 2 × 4 = 8.
    // Total = 8 (starter appear+min) + 8 (CS) + 1 (sub appear+min × 0.5) + 0.5 (sub CS) = 17.5.
    expect(row.baseScore).toBeCloseTo(17.5, 5)
    expect(row.breakdown.cleanSheets.count).toBe(4) // GK + DEF + MID-DM starter + MID-DM sub. MID-no-DM excluded.
    expect(row.breakdown.cleanSheets.points).toBeCloseTo(8.5, 5)
  })
})
