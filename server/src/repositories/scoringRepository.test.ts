import { describe, expect, it } from 'vitest'
import { fixtureKickoffEpoch } from '../data/competitionWindow.js'
import { MemoryConfigRepository } from './configRepository.js'
import { MemoryRegistrationRepository } from './registrationRepository.js'
import { MemoryScoringRepository } from './scoringRepository.js'
import { MemorySquadRepository } from './squadRepository.js'
import { MemoryTeamPoolRepository } from './teamPoolRepository.js'
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

    const scoring = new MemoryScoringRepository(new MemoryConfigRepository(), registrations, squads)
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

    const scoring = new MemoryScoringRepository(new MemoryConfigRepository(), registrations, squads)
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

    const scoring = new MemoryScoringRepository(new MemoryConfigRepository(), registrations, squads)
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

    const scoring = new MemoryScoringRepository(new MemoryConfigRepository(), registrations, squads)
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
    const france = nationRows.find((row) => row.teamCode === 'FRA') as any

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

  it('includes countries with a single active manager', async () => {
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

    const scoring = new MemoryScoringRepository(new MemoryConfigRepository(), registrations, squads)
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

    expect(nationRows).toEqual([
      expect.objectContaining({
        teamCode: 'FRA',
        participantCount: 1,
        averageScore: 7,
        topScore: 7,
      }),
    ])
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

    const scoring = new MemoryScoringRepository(new MemoryConfigRepository(), registrations, squads)
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
