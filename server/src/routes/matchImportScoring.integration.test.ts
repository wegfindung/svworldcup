import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { fixtures as seedFixtures } from '../data/worldCupSeed.js'
import { REAL_FEED_CSV } from '../lib/matchImportFeedCsv.testdata.js'
import { errorHandler } from '../middleware/errorHandler.js'
import { MemoryAuditRepository } from '../repositories/auditRepository.js'
import { MemoryConfigRepository } from '../repositories/configRepository.js'
import { MemoryFixtureRepository } from '../repositories/fixtureRepository.js'
import { MemoryMatchImportRepository } from '../repositories/matchImportRepository.js'
import { MemoryMatchMappingRepository } from '../repositories/matchMappingRepository.js'
import { MemoryRegistrationRepository } from '../repositories/registrationRepository.js'
import { MemoryScoringRepository } from '../repositories/scoringRepository.js'
import { MemorySquadRepository } from '../repositories/squadRepository.js'
import { MemoryTeamPoolRepository } from '../repositories/teamPoolRepository.js'
import { MemoryParticipantInfluenceSnapshotRepository } from '../repositories/participantInfluenceSnapshotRepository.js'
import { MemorySnapshotJobRepository } from '../repositories/snapshotJobRepository.js'
import { scoringDefaults } from '../data/scoringDefaults.js'
import { buildPublicFixtureResults } from '../services/matchResults.js'
import { createMatchImportRouter } from './matchImport.js'
import type { ParticipantSquad, SoccerversePlayerRecord } from '../domain/types.js'

// End-to-end pipeline check with the REAL provider feed file for the opening fixture:
// upload (CSV auto-detect) -> two-admin confirm -> promote -> admin_match_entries ->
// public /match-results derivation -> participant leaderboard points. The public match
// score defaults to the SUM OF PROMOTED PLAYER GOALS (matchResults.ts) — so it reads 2-0
// here because both scorers (Quiñones, Jiménez) are resolved against the MEX pool. A skipped
// scorer or an own goal makes that sum read low; the admin-entered final score is captured as
// a per-fixture override on promote and corrects the displayed scoreline. Both the raw
// derivation and the override correction are asserted at the bottom.

const FIXTURE_ID = '2026-06-11-a-mex-rsa'
const KICKOFF_EPOCH = Date.parse('2026-06-11T19:00:00Z')

function poolPlayer(
  playerId: number,
  displayName: string,
  position: string,
  nationalityCode: string,
): SoccerversePlayerRecord {
  // rating 50 = cheapest salary tier, so 15 players stay far under the default budget.
  return { playerId, displayName, nationalityCode, rating: 50, clubId: 0, positions: [position], positionMain: position }
}

// Played names NOT curated into a pool — each needs an explicit skip in the resolve stage,
// exactly like a real import where only pool-relevant players are mapped.
const SKIPPED_MEX = [
  'Israel Reyes', 'Jesús Gallardo', 'Johan Vásquez', 'Roberto Alvarado', 'Brian Gutiérrez',
  'Álvaro Fidalgo', 'Gilberto Mora', 'Luis Chávez', 'Armando González', 'Edson Álvarez', 'Alexis Vega',
]
const SKIPPED_RSA = [
  'Ime Okon', 'Khuliso Mudau', 'Mbekezeli Mbokazi', 'Nkosinathi Sibisi', 'Teboho Mokoena',
  'Aubrey Modiba', 'Iqraam Rayners', 'Jayden Adams', 'Siphephelo Sithole', 'Thalente Mbatha',
  'Themba Zwane', 'Evidence Makgopa', 'Oswin Appollis',
]

async function setup() {
  const teamPoolRepository = new MemoryTeamPoolRepository()
  // MEX pool: five real names from the feed (exact spelling, accents included) so they
  // auto-resolve. Quiñones stays pool-only (resolved + promoted, but not drafted).
  await teamPoolRepository.replaceTeamPlayers('MEX', [
    poolPlayer(1001, 'César Montes', 'CB', 'MEX'),
    poolPlayer(1002, 'Raúl Rangel', 'GK', 'MEX'),
    poolPlayer(1003, 'Julián Quiñones', 'CM', 'MEX'),
    poolPlayer(1004, 'Raúl Jiménez', 'ST', 'MEX'),
    poolPlayer(1005, 'Erik Lira', 'DMC', 'MEX'),
  ])
  await teamPoolRepository.replaceTeamPlayers('RSA', [
    poolPlayer(2001, 'Ronwen Williams', 'GK', 'RSA'),
    poolPlayer(2002, 'Lyle Foster', 'ST', 'RSA'),
  ])
  // Filler pools so the squad reaches 15 slots without breaching the 4-per-team cap.
  await teamPoolRepository.replaceTeamPlayers('ESP', [
    poolPlayer(3001, 'Filler Esp One', 'CB', 'ESP'),
    poolPlayer(3002, 'Filler Esp Two', 'CB', 'ESP'),
    poolPlayer(3003, 'Filler Esp Three', 'CB', 'ESP'),
  ])
  await teamPoolRepository.replaceTeamPlayers('FRA', [
    poolPlayer(3004, 'Filler Fra One', 'CM', 'FRA'),
    poolPlayer(3005, 'Filler Fra Two', 'CM', 'FRA'),
    poolPlayer(3006, 'Filler Fra Three', 'CM', 'FRA'),
  ])
  await teamPoolRepository.replaceTeamPlayers('BRA', [
    poolPlayer(3007, 'Filler Bra One', 'ST', 'BRA'),
    poolPlayer(3008, 'Filler Bra Two', 'ST', 'BRA'),
    poolPlayer(3009, 'Filler Bra Three', 'ST', 'BRA'),
  ])
  await teamPoolRepository.replaceTeamPlayers('GER', [
    poolPlayer(3010, 'Filler Ger One', 'GK', 'GER'),
    poolPlayer(3011, 'Filler Ger Two', 'CB', 'GER'),
  ])

  const registrations = new MemoryRegistrationRepository()
  const created = await registrations.createPending(
    { email: 'feed-manager@example.com', displayName: 'Feed Manager', primaryTeamCode: 'MEX', marketingOptIn: false },
    'feed-token',
  )
  await registrations.verifyByPlainToken('feed-token')
  const participantId = created.record.participantId

  const squads = new MemorySquadRepository(teamPoolRepository)
  const assignments: Array<{ slotKey: string; playerId: number }> = [
    { slotKey: 'starter-gk-1', playerId: 1002 }, // Rangel — GK, 92', CS
    { slotKey: 'starter-def-1', playerId: 1001 }, // Montes — DEF, 92', CS
    { slotKey: 'starter-def-2', playerId: 3001 },
    { slotKey: 'starter-def-3', playerId: 3002 },
    { slotKey: 'starter-def-4', playerId: 3003 },
    { slotKey: 'starter-mid-1', playerId: 1005 }, // Lira — DM-eligible MID, 76', assist, CS
    { slotKey: 'starter-mid-2', playerId: 3004 },
    { slotKey: 'starter-mid-3', playerId: 3005 },
    { slotKey: 'starter-fwd-1', playerId: 1004 }, // Jiménez — FWD, 76', goal
    { slotKey: 'starter-fwd-2', playerId: 3007 },
    { slotKey: 'starter-fwd-3', playerId: 3008 },
    { slotKey: 'sub-gk-1', playerId: 3010 },
    { slotKey: 'sub-def-1', playerId: 3011 },
    { slotKey: 'sub-mid-1', playerId: 3006 },
    { slotKey: 'sub-fwd-1', playerId: 3009 },
  ]
  for (const assignment of assignments) {
    await squads.assignPlayer(participantId, assignment)
  }
  await squads.lockSquad(participantId)

  const configRepository = new MemoryConfigRepository()
  const scoringRepository = new MemoryScoringRepository(
    configRepository,
    registrations,
    squads,
    new MemoryParticipantInfluenceSnapshotRepository(),
  )

  const deps = {
    fixtureRepository: new MemoryFixtureRepository(),
    matchImportRepository: new MemoryMatchImportRepository(),
    matchMappingRepository: new MemoryMatchMappingRepository(),
    teamPoolRepository,
    scoringRepository,
    auditRepository: new MemoryAuditRepository(),
    snapshotJobRepository: new MemorySnapshotJobRepository(),
    configRepository,
  }

  const app = express()
  app.use(express.json())
  app.use((req, res, next) => {
    res.locals.admin = {
      adminId: 'test-admin',
      email: String(req.header('x-test-admin-email') ?? 'importer@example.com'),
      isActive: true,
    }
    next()
  })
  app.use('/match-import', createMatchImportRouter(deps))
  app.use(errorHandler)

  return { app, deps, squads, scoringRepository, teamPoolRepository, configRepository, participantId }
}

// The leaderboard only scores fixtures whose kickoff is AFTER the squad's lock instant.
// lockSquad stamps "now" (after the real 2026-06-11 kickoff), so tests reach into the
// Memory repository to set the lock instant — same pattern as scoringRepository.test.ts.
function overrideLockedAt(repo: MemorySquadRepository, participantId: string, lockedAt: string) {
  const internal = (repo as unknown as { squads: Map<string, ParticipantSquad> }).squads
  const squad = internal.get(participantId)
  if (!squad) {
    throw new Error('squad missing for participant')
  }
  internal.set(participantId, { ...squad, lockedAt })
}

async function importRealFeed(app: express.Express) {
  const overrides = [
    ...SKIPPED_MEX.map((sourceName) => ({ sourceName, teamCode: 'MEX', skip: true })),
    ...SKIPPED_RSA.map((sourceName) => ({ sourceName, teamCode: 'RSA', skip: true })),
  ]
  const upload = await request(app)
    .post('/match-import/upload')
    .set('x-test-admin-email', 'importer@example.com')
    .send({
      fixtureId: FIXTURE_ID,
      input: { format: 'csv', text: REAL_FEED_CSV, homeGoals: 2, awayGoals: 0, sourceUrl: 'https://feed.example/m/1489369.csv' },
      overrides,
    })
  expect(upload.status).toBe(201)
  const confirm = await request(app)
    .post(`/match-import/batches/${upload.body.batch.batchId}/confirm`)
    .set('x-test-admin-email', 'reviewer@example.com')
    .send({})
  expect(confirm.status).toBe(200)
  expect(confirm.body.promotion.promoted).toBe(true)
  return { upload, confirm }
}

describe('real feed CSV: import -> promote -> match results -> leaderboard', () => {
  it('promotes only resolved rows, with stats and clean-sheet flags from the feed + form score', async () => {
    const { app, scoringRepository } = await setup()
    const { upload, confirm } = await importRealFeed(app)

    // 7 pool-resolved rows of the 31 played; the 24 skips never enter the batch.
    expect(upload.body.batch.rows).toHaveLength(7)
    expect(confirm.body.promotion.promotedRowCount).toBe(7)

    const entries = await scoringRepository.listMatchEntries(FIXTURE_ID)
    expect(entries).toHaveLength(7)
    const byPlayer = new Map(entries.map((entry) => [entry.playerId, entry]))
    // Quiñones: 79', 1 goal, rating 8.5; MEX conceded 0 and 79 >= 60 -> clean-sheet eligible.
    expect(byPlayer.get(1003)).toMatchObject({ minutes: 79, goals: 1, assists: 0, rating: 8.5, cleanSheetEligible: true })
    // Foster: 56' (< 60) and RSA conceded 2 -> not clean-sheet eligible.
    expect(byPlayer.get(2002)).toMatchObject({ minutes: 56, goals: 0, cleanSheetEligible: false })
    // Lira: the feed's empty goals cell read as 0, the assist kept.
    expect(byPlayer.get(1005)).toMatchObject({ minutes: 76, goals: 0, assists: 1, rating: 7.3 })
  })

  it('derives the public results-page score from the promoted goals', async () => {
    const { app, scoringRepository, teamPoolRepository } = await setup()
    await importRealFeed(app)

    // Mirror the GET /api/public/match-results route body (public.ts): seed fixtures +
    // per-team pools + all match entries.
    const playersByTeam = new Map([
      ['MEX', await teamPoolRepository.listByTeam('MEX')],
      ['RSA', await teamPoolRepository.listByTeam('RSA')],
    ])
    const items = buildPublicFixtureResults(seedFixtures, playersByTeam, await scoringRepository.listMatchEntries())

    const result = items.find((item) => item.fixtureId === FIXTURE_ID)
    expect(result).toBeDefined()
    // Both scorers are pool-resolved, so the summed score matches the real 2-0.
    expect(result).toMatchObject({ status: 'final', homeGoals: 2, awayGoals: 0, entryCount: 7 })
    const scorers = result?.homePlayers.filter((player) => player.goals > 0).map((player) => player.displayName)
    expect(scorers?.sort()).toEqual(['Julián Quiñones', 'Raúl Jiménez'])
    // Every other fixture stays pending with no score.
    for (const item of items) {
      if (item.fixtureId !== FIXTURE_ID) {
        expect(item.status).toBe('pending')
        expect(item.homeGoals).toBeNull()
      }
    }
  })

  it('updates the participant leaderboard with hand-computed points — and only for pre-kickoff locks', async () => {
    const { app, squads, scoringRepository, participantId } = await setup()
    await importRealFeed(app)

    // Locked AFTER the fixture's kickoff (lockSquad stamped "now"): fixture excluded.
    const lockedLate = await scoringRepository.getLeagueLeaderboard('rookie')
    expect(lockedLate[0].baseScore).toBe(0)

    // Same squad locked BEFORE kickoff: all four drafted MEX players score.
    overrideLockedAt(squads, participantId, new Date(KICKOFF_EPOCH - 24 * 3600 * 1000).toISOString())
    scoringRepository.invalidateLeaderboard()
    const [row] = await scoringRepository.getLeagueLeaderboard('rookie')

    // Hand-computed from scoringDefaults (goal 5, assist 3, appearance 1, minutes 1,
    // clean sheet GK4/DEF3/MID1(DM-only)/FWD0, curve 6.0->0.5, 8.0->1.0 linear):
    //   Rangel  GK 92' r7.2: 1+1+0.8  +4 CS = 6.8
    //   Montes  DEF 92' r7.0: 1+1+0.75 +3 CS = 5.75
    //   Lira    MID(DMC) 76' r7.3 1A: 1+1+3+0.825 +1 CS = 6.825
    //   Jiménez FWD 76' r7.9 1G: 1+1+5+0.975 +0 CS = 7.975
    expect(row.baseScore).toBeCloseTo(27.35, 6)
    // Default budget tier (3.0M) multiplies by 1.00 and no ownership boost exists here.
    expect(row.scoreMultiplier).toBe(1)
    expect(row.totalScore).toBeCloseTo(27.35, 6)
    expect(row.breakdown.cleanSheets.points).toBeCloseTo(8, 6)

    const fixtureDetail = row.fixtures.find((detail) => detail.fixtureId === FIXTURE_ID)
    expect(fixtureDetail).toBeDefined()
    const pointsByPlayer = new Map(fixtureDetail?.players.map((player) => [player.playerId, player.totalPoints]))
    expect(pointsByPlayer.get(1002)).toBeCloseTo(6.8, 6)
    expect(pointsByPlayer.get(1001)).toBeCloseTo(5.75, 6)
    expect(pointsByPlayer.get(1005)).toBeCloseTo(6.825, 6)
    expect(pointsByPlayer.get(1004)).toBeCloseTo(7.975, 6)
    // Quiñones was resolved and promoted but never drafted — no points for this squad.
    expect(pointsByPlayer?.has(1003)).toBe(false)
  })

  it('drops a skipped scorer from the public score derivation (the own-goal/skip caveat)', async () => {
    const { app, scoringRepository, teamPoolRepository } = await setup()
    // Re-run the import with Quiñones ALSO skipped: his goal never reaches match entries,
    // so the public results page would show 1-0 even though the admin typed 2-0.
    const overrides = [
      ...[...SKIPPED_MEX, 'Julián Quiñones'].map((sourceName) => ({ sourceName, teamCode: 'MEX', skip: true })),
      ...SKIPPED_RSA.map((sourceName) => ({ sourceName, teamCode: 'RSA', skip: true })),
    ]
    const upload = await request(app)
      .post('/match-import/upload')
      .set('x-test-admin-email', 'importer@example.com')
      .send({
        fixtureId: FIXTURE_ID,
        input: { format: 'csv', text: REAL_FEED_CSV, homeGoals: 2, awayGoals: 0, sourceUrl: 'https://feed.example/m/1489369.csv' },
        overrides,
      })
    expect(upload.status).toBe(201)
    const confirm = await request(app)
      .post(`/match-import/batches/${upload.body.batch.batchId}/confirm`)
      .set('x-test-admin-email', 'reviewer@example.com')
      .send({})
    expect(confirm.body.promotion.promoted).toBe(true)

    const playersByTeam = new Map([
      ['MEX', await teamPoolRepository.listByTeam('MEX')],
      ['RSA', await teamPoolRepository.listByTeam('RSA')],
    ])
    const items = buildPublicFixtureResults(seedFixtures, playersByTeam, await scoringRepository.listMatchEntries())
    const result = items.find((item) => item.fixtureId === FIXTURE_ID)
    expect(result).toMatchObject({ status: 'final', homeGoals: 1, awayGoals: 0 })
  })

  it('auto-captures the admin-entered score on promote', async () => {
    const { app, configRepository } = await setup()
    await importRealFeed(app)
    // The 2-0 the admin typed in the import form is captured as the fixture's scoreline override.
    const stored = await configRepository.getFixtureScoreOverrides()
    expect(stored[FIXTURE_ID]).toEqual({ home: 2, away: 0 })
  })

  it('shows the true scoreline via the captured override when a goal is uncredited (own-goal/skip case)', async () => {
    const { app, scoringRepository, teamPoolRepository, configRepository } = await setup()
    // Skip Quiñones so his goal never reaches a promoted player row — the per-player goal sum is
    // 1-0, standing in for the real own-goal case (USA 4-1 displaying as 3-1). The admin still
    // types the true 2-0 in the form.
    const overrides = [
      ...[...SKIPPED_MEX, 'Julián Quiñones'].map((sourceName) => ({ sourceName, teamCode: 'MEX', skip: true })),
      ...SKIPPED_RSA.map((sourceName) => ({ sourceName, teamCode: 'RSA', skip: true })),
    ]
    const upload = await request(app)
      .post('/match-import/upload')
      .set('x-test-admin-email', 'importer@example.com')
      .send({
        fixtureId: FIXTURE_ID,
        input: { format: 'csv', text: REAL_FEED_CSV, homeGoals: 2, awayGoals: 0, sourceUrl: 'https://feed.example/m/1489369.csv' },
        overrides,
      })
    expect(upload.status).toBe(201)
    const confirm = await request(app)
      .post(`/match-import/batches/${upload.body.batch.batchId}/confirm`)
      .set('x-test-admin-email', 'reviewer@example.com')
      .send({})
    expect(confirm.body.promotion.promoted).toBe(true)

    const stored = await configRepository.getFixtureScoreOverrides()
    expect(stored[FIXTURE_ID]).toEqual({ home: 2, away: 0 })

    const playersByTeam = new Map([
      ['MEX', await teamPoolRepository.listByTeam('MEX')],
      ['RSA', await teamPoolRepository.listByTeam('RSA')],
    ])
    const entries = await scoringRepository.listMatchEntries()
    // With the override applied (as the public route does) the scoreline reads the true 2-0,
    // even though only one goal is credited to a promoted player.
    const corrected = buildPublicFixtureResults(seedFixtures, playersByTeam, entries, scoringDefaults, stored)
    const correctedResult = corrected.find((item) => item.fixtureId === FIXTURE_ID)
    expect(correctedResult).toMatchObject({ status: 'final', homeGoals: 2, awayGoals: 0 })
    const creditedGoals = (correctedResult?.homePlayers ?? []).reduce((sum, player) => sum + player.goals, 0)
    expect(creditedGoals).toBe(1)

    // Clearing the override reverts to the raw under-counting derivation.
    await configRepository.clearFixtureScoreOverride(FIXTURE_ID)
    const reverted = buildPublicFixtureResults(
      seedFixtures,
      playersByTeam,
      entries,
      scoringDefaults,
      await configRepository.getFixtureScoreOverrides(),
    )
    expect(reverted.find((item) => item.fixtureId === FIXTURE_ID)).toMatchObject({ homeGoals: 1, awayGoals: 0 })
  })
})
