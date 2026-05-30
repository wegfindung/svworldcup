import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import { fixtureKickoffEpoch } from '../data/competitionWindow.js'
import { STARTING_BUDGET, getScoreMultiplierForBudget } from '../data/formation.js'
import { isMidCleanSheetEligible } from '../data/positionClasses.js'
import { fixtures as seedFixtures } from '../data/worldCupSeed.js'
import { buildFixtureRoundMap } from '../lib/tournamentRounds.js'
import type {
  FixtureSeed,
  LeagueType,
  MatchEntryInput,
  MatchEntryRecord,
  NationScoreRow,
  ParticipantScoreBreakdown,
  ParticipantScoreFixtureDetail,
  ParticipantScorePlayerDetail,
  ParticipantScoreRow,
  PerformanceCurveAnchor,
  RoundLineupSlot,
  ScoringConfig,
  SlotClass,
  SlotGroup,
} from '../domain/types.js'
import type { ConfigRepository } from './configRepository.js'
import type { RegistrationRepository } from './registrationRepository.js'
import type { SquadRepository } from './squadRepository.js'
import type { ParticipantInfluenceSnapshotRepository } from './participantInfluenceSnapshotRepository.js'
import type { CacheableRow, LeaderboardCache } from './leaderboardCache.js'

interface ScoreParticipant {
  participantId: string
  displayName: string
  leagueType: LeagueType
  primaryTeamCode: string
  secondaryTeamCode?: string
  registeredAt: string
  lockedAt: string | null
  budgetLimit: number
}

// kickoffDate + kickoffTimeUtc describe a UTC instant. Frontends format into the viewer's
// local timezone — this function returns the absolute epoch millis for time math.
function buildKickoffByFixture(fixtures: Array<Pick<FixtureSeed, 'fixtureId' | 'kickoffDate' | 'kickoffTimeUtc'>>) {
  const map = new Map<string, number>()
  for (const fixture of fixtures) {
    const epoch = fixtureKickoffEpoch(fixture)
    if (epoch !== null) {
      map.set(fixture.fixtureId, epoch)
    }
  }
  return map
}

interface ScoreSlot {
  participantId: string
  slotKey: string
  slotGroup: SlotGroup
  slotClass: SlotClass
  playerId: number
  displayName: string
  teamCode: string
  imageUrl?: string
  // Snapshot of the player's Soccerverse position codes at slot-write time. Drives the
  // conditional MID clean-sheet bonus (only paid when this list contains a DM variant).
  positionCodes: string[]
}

type RankableParticipantRow = Omit<ParticipantScoreRow, 'rank'> & {
  registeredAt: string
}

export interface ScoringRepository {
  storageKind: 'memory' | 'postgres'
  upsertMatchEntry(input: MatchEntryInput): Promise<MatchEntryRecord>
  listMatchEntries(fixtureId?: string): Promise<MatchEntryRecord[]>
  getLeagueLeaderboard(leagueType: LeagueType): Promise<ParticipantScoreRow[]>
  getNationLeaderboard(): Promise<NationScoreRow[]>
  // Runs fn while holding a fixture-scoped advisory lock so two concurrent promotions of the same
  // fixture can't both proceed. Returns null WITHOUT running fn when the lock is already held. The
  // Memory impl has no real lock and always runs fn.
  withFixtureLock<T>(fixtureId: string, fn: () => Promise<T>): Promise<T | null>
}

function derivePerformancePoints(rating: number | undefined, curve: PerformanceCurveAnchor[]) {
  if (rating === undefined || Number.isNaN(rating)) {
    return 0
  }
  if (curve.length === 0) {
    return 0
  }
  if (rating < curve[0].rating) {
    return 0
  }
  const lastIndex = curve.length - 1
  if (rating >= curve[lastIndex].rating) {
    return curve[lastIndex].points
  }
  for (let i = 0; i < lastIndex; i += 1) {
    const lower = curve[i]
    const upper = curve[i + 1]
    if (rating >= lower.rating && rating <= upper.rating) {
      const span = upper.rating - lower.rating
      const t = span === 0 ? 0 : (rating - lower.rating) / span
      return lower.points + t * (upper.points - lower.points)
    }
  }
  return 0
}

function toTimestamp(value: string) {
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : Number.MAX_SAFE_INTEGER
}

function scoreEntry(entry: MatchEntryRecord, scoring: ScoringConfig) {
  return scoreEntryComponents(entry, scoring).total
}

function scoreEntryComponents(entry: MatchEntryRecord, scoring: ScoringConfig) {
  const goals = entry.goals * scoring.goal
  const assists = entry.assists * scoring.assist
  const appearance = entry.minutes > 0 ? scoring.appearance : 0
  const minutes = entry.minutes >= 60 ? scoring.minutes : 0
  const performance = derivePerformancePoints(entry.rating, scoring.performanceCurve)

  return {
    goals,
    assists,
    appearance,
    minutes,
    performance,
    total: goals + assists + appearance + minutes + performance,
  }
}

function createEmptyBreakdown(): ParticipantScoreBreakdown {
  return {
    goals: { count: 0, points: 0 },
    assists: { count: 0, points: 0 },
    appearances: { count: 0, points: 0 },
    minutes: { count: 0, points: 0 },
    cleanSheets: { count: 0, points: 0 },
    performance: { points: 0 },
  }
}

function sortFixtureDetails(fixtures: ParticipantScoreFixtureDetail[]) {
  return fixtures
    .map((fixture) => ({
      ...fixture,
      players: [...fixture.players].sort(
        (left, right) =>
          right.totalPoints - left.totalPoints ||
          right.goals - left.goals ||
          right.assists - left.assists ||
          right.minutes - left.minutes ||
          left.displayName.localeCompare(right.displayName),
      ),
    }))
    .sort((left, right) => left.fixtureId.localeCompare(right.fixtureId))
}

interface FixtureEntryScore {
  score: number
  inOfficialSquad: boolean
  cleanSheetEligible: boolean
  entry: MatchEntryRecord
}

function buildFixtureEntryScoreMap(entries: MatchEntryRecord[], scoring: ScoringConfig) {
  const fixtures = new Map<string, Map<number, FixtureEntryScore>>()

  for (const entry of entries) {
    const fixtureEntries = fixtures.get(entry.fixtureId) ?? new Map<number, FixtureEntryScore>()
    fixtureEntries.set(entry.playerId, {
      score: scoreEntry(entry, scoring),
      inOfficialSquad: entry.inOfficialSquad,
      cleanSheetEligible: entry.cleanSheetEligible,
      entry,
    })
    fixtures.set(entry.fixtureId, fixtureEntries)
  }

  return fixtures
}

function bonusKey(participantId: string, fixtureId: string, playerId: number) {
  return `${participantId}|${fixtureId}|${playerId}`
}

// RoundLineupSlot (domain/types) is a per-round lineup snapshot row (squad_round_lineup). For the
// round a fixture belongs to, it overrides a player's starter/sub status and frozen position codes.
// The set of 15 players never changes after lock — a swap only flips starter<->sub within a class —
// so the snapshot overrides by playerId; player identity (name/team/image) still comes from the live
// squad slot.
const BASELINE_ROUND_KEY = 1

interface ParticipantRoundLineups {
  sortedRoundKeys: number[]
  byRound: Map<number, Map<number, RoundLineupSlot>>
}

function buildRoundLineupsByParticipant(roundLineups: RoundLineupSlot[]): Map<string, ParticipantRoundLineups> {
  const result = new Map<string, ParticipantRoundLineups>()
  for (const row of roundLineups) {
    let entry = result.get(row.participantId)
    if (!entry) {
      entry = { sortedRoundKeys: [], byRound: new Map() }
      result.set(row.participantId, entry)
    }
    let playerMap = entry.byRound.get(row.roundKey)
    if (!playerMap) {
      playerMap = new Map()
      entry.byRound.set(row.roundKey, playerMap)
    }
    playerMap.set(row.playerId, row)
  }
  for (const entry of result.values()) {
    entry.sortedRoundKeys = [...entry.byRound.keys()].sort((left, right) => left - right)
  }
  return result
}

// As-of-round lookup: the snapshot with the greatest round_key <= the fixture's round. Returns null
// when the participant has no snapshot at or before this round (legacy / never-swapped squads) — the
// caller then falls back to the live squad slot, keeping scoring byte-identical to pre-feature.
function resolveAsOfRoundLineup(
  lineups: ParticipantRoundLineups | undefined,
  fixtureRound: number | null,
): Map<number, RoundLineupSlot> | null {
  if (!lineups || fixtureRound === null) {
    return null
  }
  let chosen: number | null = null
  for (const roundKey of lineups.sortedRoundKeys) {
    if (roundKey <= fixtureRound) {
      chosen = roundKey
    } else {
      break
    }
  }
  return chosen === null ? null : lineups.byRound.get(chosen) ?? null
}

// Substitutes are not auto-activated on starter absence. Instead every reserve always contributes a
// reduced share of the points it actually earns. This is a deliberate failsafe: it removes the need
// for a live player-availability/injury feed and avoids per-matchday activation bookkeeping while a
// Grand Tournament "round" spans almost a week of staggered kickoffs. Adjust or remove when the full
// availability mechanic lands — see SOP_scoring_and_leagues.md.
const SUBSTITUTE_POINT_WEIGHT = 0.5

function calculateParticipantRows(
  participants: ScoreParticipant[],
  slots: ScoreSlot[],
  entries: MatchEntryRecord[],
  scoring: ScoringConfig,
  kickoffByFixture: Map<string, number>,
  bonusByEntry: Map<string, number>,
  fixtureRoundByFixture: Map<string, number>,
  roundLineups: RoundLineupSlot[],
): RankableParticipantRow[] {
  const fixtureEntryScores = buildFixtureEntryScoreMap(entries, scoring)
  const slotsByParticipant = new Map<string, ScoreSlot[]>()
  const roundLineupsByParticipant = buildRoundLineupsByParticipant(roundLineups)

  for (const slot of slots) {
    const current = slotsByParticipant.get(slot.participantId) ?? []
    current.push(slot)
    slotsByParticipant.set(slot.participantId, current)
  }

  return participants.map((participant) => {
    const participantSlots = slotsByParticipant.get(participant.participantId) ?? []
    const participantLineups = roundLineupsByParticipant.get(participant.participantId)
    const lockEpoch = participant.lockedAt ? new Date(participant.lockedAt).getTime() : null
    const hasLockCutoff = lockEpoch !== null && Number.isFinite(lockEpoch)

    let baseScore = 0
    let bonusScore = 0
    const breakdown = createEmptyBreakdown()
    const fixtureDetailsById = new Map<string, ParticipantScoreFixtureDetail>()

    // weight is 1 for starters and SUBSTITUTE_POINT_WEIGHT for reserves. It scales every point
    // contribution (event counts stay truthful) so a reserve banks a fraction of what it earned.
    function addPlayerState(fixtureId: string, slot: ScoreSlot, playerState: FixtureEntryScore, weight: number) {
      const components = scoreEntryComponents(playerState.entry, scoring)
      baseScore += components.total * weight
      breakdown.goals.count += playerState.entry.goals
      breakdown.goals.points += components.goals * weight
      breakdown.assists.count += playerState.entry.assists
      breakdown.assists.points += components.assists * weight
      if (playerState.entry.minutes > 0) {
        breakdown.appearances.count += 1
        breakdown.appearances.points += components.appearance * weight
      }
      if (playerState.entry.minutes >= 60) {
        breakdown.minutes.count += 1
        breakdown.minutes.points += components.minutes * weight
      }
      breakdown.performance.points += components.performance * weight

      let cleanSheetPoints = 0
      if (playerState.cleanSheetEligible) {
        // MID slots only earn the configured clean-sheet bonus when the snapshot positions
        // include a defensive midfielder code (DML/DMR/DMC/DM). Other slot classes pay flat.
        const slotEarnsCleanSheet = slot.slotClass !== 'MID' || isMidCleanSheetEligible(slot.positionCodes)
        if (slotEarnsCleanSheet) {
          cleanSheetPoints = scoring.cleanSheet[slot.slotClass] * weight
          baseScore += cleanSheetPoints
          breakdown.cleanSheets.count += 1
          breakdown.cleanSheets.points += cleanSheetPoints
        }
      }

      const totalPoints = components.total * weight + cleanSheetPoints

      const entryBonus = bonusByEntry.get(bonusKey(participant.participantId, fixtureId, playerState.entry.playerId)) ?? 0
      if (entryBonus > 0) {
        bonusScore += totalPoints * (entryBonus / 100)
      }

      if (totalPoints !== 0 || playerState.entry.minutes > 0 || playerState.entry.goals > 0 || playerState.entry.assists > 0) {
        const fixtureDetail = fixtureDetailsById.get(fixtureId) ?? { fixtureId, totalPoints: 0, players: [] }
        const playerDetail: ParticipantScorePlayerDetail = {
          fixtureId,
          playerId: slot.playerId,
          displayName: slot.displayName,
          teamCode: slot.teamCode,
          imageUrl: slot.imageUrl,
          slotKey: slot.slotKey,
          slotGroup: slot.slotGroup,
          slotClass: slot.slotClass,
          minutes: playerState.entry.minutes,
          goals: playerState.entry.goals,
          assists: playerState.entry.assists,
          cleanSheetEligible: playerState.cleanSheetEligible,
          rating: playerState.entry.rating,
          sourceNote: playerState.entry.sourceNote,
          goalPoints: components.goals * weight,
          assistPoints: components.assists * weight,
          appearancePoints: components.appearance * weight,
          minutesPoints: components.minutes * weight,
          cleanSheetPoints,
          performancePoints: components.performance * weight,
          totalPoints,
        }
        fixtureDetail.players.push(playerDetail)
        fixtureDetail.totalPoints += totalPoints
        fixtureDetailsById.set(fixtureId, fixtureDetail)
      }
    }

    for (const [fixtureId, entryScores] of fixtureEntryScores) {
      if (hasLockCutoff) {
        const fixtureKickoff = kickoffByFixture.get(fixtureId)
        if (fixtureKickoff !== undefined && fixtureKickoff <= (lockEpoch as number)) {
          continue
        }
      }
      const fixtureRound = fixtureRoundByFixture.get(fixtureId) ?? null
      const roundOverrides = resolveAsOfRoundLineup(participantLineups, fixtureRound)

      for (const slot of participantSlots) {
        const playerState = entryScores.get(slot.playerId)
        if (!playerState) {
          continue
        }

        // Per-round freeze: starter/sub status + position codes come from the round snapshot when one
        // exists for this round; otherwise fall back to the live squad slot (unchanged behavior).
        const override = roundOverrides?.get(slot.playerId)
        const effectiveSlot: ScoreSlot = override
          ? { ...slot, slotGroup: override.slotGroup, slotKey: override.slotKey, slotClass: override.slotClass, positionCodes: override.positionCodes }
          : slot

        const weight = effectiveSlot.slotGroup === 'sub' ? SUBSTITUTE_POINT_WEIGHT : 1
        addPlayerState(fixtureId, effectiveSlot, playerState, weight)
      }
    }

    const bonusPercent = baseScore > 0 ? (bonusScore / baseScore) * 100 : 0
    const scoreMultiplier = getScoreMultiplierForBudget(participant.budgetLimit)
    const totalScore = (baseScore + bonusScore) * scoreMultiplier

    return {
      participantId: participant.participantId,
      displayName: participant.displayName,
      leagueType: participant.leagueType,
      primaryTeamCode: participant.primaryTeamCode,
      secondaryTeamCode: participant.secondaryTeamCode,
      baseScore,
      bonusPercent,
      scoreMultiplier,
      totalScore,
      breakdown,
      fixtures: sortFixtureDetails([...fixtureDetailsById.values()]),
      registeredAt: participant.registeredAt,
    }
  })
}

function rankParticipants(rows: RankableParticipantRow[]): ParticipantScoreRow[] {
  return rows
    .sort(
      (left, right) =>
        right.totalScore - left.totalScore ||
        toTimestamp(left.registeredAt) - toTimestamp(right.registeredAt) ||
        left.displayName.localeCompare(right.displayName),
    )
    .map(({ registeredAt: _registeredAt, ...row }, index) => ({ ...row, rank: index + 1 }))
}

function rankNations(rows: Omit<NationScoreRow, 'rank'>[]): NationScoreRow[] {
  return rows
    .sort((left, right) => right.averageScore - left.averageScore || right.topScore - left.topScore || left.teamCode.localeCompare(right.teamCode))
    .map((row, index) => ({ ...row, rank: index + 1 }))
}

function buildNationLeaderboard(rows: ParticipantScoreRow[]) {
  const contributorsByNation = new Map<string, NationScoreRow['contributors']>()

  for (const row of rows) {
    for (const teamCode of [row.primaryTeamCode, row.secondaryTeamCode].filter(Boolean) as string[]) {
      const contributors = contributorsByNation.get(teamCode) ?? []
      contributors.push({
        participantId: row.participantId,
        displayName: row.displayName,
        leagueType: row.leagueType,
        primaryTeamCode: row.primaryTeamCode,
        secondaryTeamCode: row.secondaryTeamCode,
        totalScore: row.totalScore,
        rank: row.rank,
      })
      contributorsByNation.set(teamCode, contributors)
    }
  }

  return rankNations(
    [...contributorsByNation.entries()]
      .map(([teamCode, contributors]) => {
        const sortedContributors = contributors.sort((left, right) => right.totalScore - left.totalScore || left.displayName.localeCompare(right.displayName))
        const scores = sortedContributors.map((contributor) => contributor.totalScore)
        return {
          teamCode,
          participantCount: sortedContributors.length,
          averageScore: scores.reduce((sum, score) => sum + score, 0) / scores.length,
          topScore: Math.max(...scores),
          contributors: sortedContributors,
        }
      })
      // A nation needs at least two members before its average competes on the public table.
      .filter((nation) => nation.participantCount >= 2),
  )
}

export class MemoryScoringRepository implements ScoringRepository {
  storageKind: 'memory' = 'memory'
  private readonly entries = new Map<string, MatchEntryRecord>()

  constructor(
    private readonly configRepository: ConfigRepository,
    private readonly registrationRepository: RegistrationRepository,
    private readonly squadRepository: SquadRepository,
    private readonly snapshotRepository: ParticipantInfluenceSnapshotRepository,
    private readonly leaderboardCache?: LeaderboardCache,
  ) {}

  // Read-through the cache when one is injected; otherwise compute directly (keeps every existing
  // test that constructs this repo without a cache byte-identical). See leaderboardCache.ts.
  private getCachedRows(compute: () => Promise<CacheableRow[]>): Promise<CacheableRow[]> {
    return this.leaderboardCache ? this.leaderboardCache.getRows(compute) : compute()
  }

  private async calculateAllRows() {
    return this.calculateRows(await this.listMemoryParticipants())
  }

  async upsertMatchEntry(input: MatchEntryInput) {
    const entryKey = `${input.fixtureId}:${input.playerId}`
    const current = this.entries.get(entryKey)
    const entry: MatchEntryRecord = {
      entryId: current?.entryId ?? randomUUID(),
      fixtureId: input.fixtureId,
      playerId: input.playerId,
      inOfficialSquad: input.inOfficialSquad,
      minutes: input.minutes,
      goals: input.goals,
      assists: input.assists,
      cleanSheetEligible: input.cleanSheetEligible,
      performancePoints: input.performancePoints,
      rating: input.rating,
      sourceNote: input.sourceNote ?? 'manual admin entry',
    }
    this.entries.set(entryKey, entry)
    this.leaderboardCache?.invalidate()
    return entry
  }

  async listMatchEntries(fixtureId?: string) {
    const entries = [...this.entries.values()]
    return fixtureId ? entries.filter((entry) => entry.fixtureId === fixtureId) : entries
  }

  // No cross-process locking in memory — single test process, so just run the work.
  async withFixtureLock<T>(_fixtureId: string, fn: () => Promise<T>): Promise<T | null> {
    return fn()
  }

  // Compute-once-per-payload: both boards read the same cached full row set, then filter/rank in
  // memory (each row is independent of the others, so filtering after compute is equivalent to the
  // old compute-per-league path).
  async getLeagueLeaderboard(leagueType: LeagueType) {
    const rows = await this.getCachedRows(() => this.calculateAllRows())
    return rankParticipants(rows.filter((row) => row.leagueType === leagueType))
  }

  async getNationLeaderboard() {
    const rows = await this.getCachedRows(() => this.calculateAllRows())
    return buildNationLeaderboard(rankParticipants(rows))
  }

  private async listMemoryParticipants(): Promise<ScoreParticipant[]> {
    const anyRepository = this.registrationRepository as unknown as {
      byEmail?: Map<
        string,
        {
          participantId: string
          displayName: string
          leagueType: LeagueType
          primaryTeamCode: string
          secondaryTeamCode?: string
          status: string
          createdAt?: string
          verifiedAt?: string
        }
      >
    }
    const records = anyRepository.byEmail ? [...anyRepository.byEmail.values()] : []
    return records
      .filter((record) => record.status === 'active')
      .map((record) => ({
        participantId: record.participantId,
        displayName: record.displayName,
        leagueType: record.leagueType,
        primaryTeamCode: record.primaryTeamCode,
        secondaryTeamCode: record.secondaryTeamCode,
        registeredAt: record.createdAt ?? record.verifiedAt ?? '9999-12-31T23:59:59.999Z',
        lockedAt: null,
        budgetLimit: STARTING_BUDGET,
      }))
  }

  private async calculateRows(participants: ScoreParticipant[]) {
    const scoring = await this.configRepository.getScoringConfig()
    const entries = await this.listMatchEntries()
    const slots: ScoreSlot[] = []
    const lockedParticipants: ScoreParticipant[] = []

    for (const participant of participants) {
      const squad = await this.squadRepository.getOrCreate(participant.participantId)
      if (!squad.isLocked) {
        continue
      }

      lockedParticipants.push({ ...participant, lockedAt: squad.lockedAt, budgetLimit: squad.budgetLimit })

      for (const slot of squad.slots) {
        if (slot.player) {
          slots.push({
            participantId: participant.participantId,
            slotKey: slot.key,
            slotGroup: slot.slotGroup,
            slotClass: slot.slotClass,
            playerId: slot.player.playerId,
            displayName: slot.player.displayName,
            teamCode: slot.player.teamCode,
            imageUrl: slot.player.imageUrl,
            positionCodes: slot.player.positions ?? [],
          })
        }
      }
    }

    const kickoffByFixture = buildKickoffByFixture(seedFixtures)
    const snapshots = await this.snapshotRepository.listAll()
    const bonusByEntry = new Map<string, number>()
    for (const snapshot of snapshots) {
      bonusByEntry.set(bonusKey(snapshot.participantId, snapshot.fixtureId, snapshot.playerId), snapshot.bonusPercent)
    }
    const fixtureRoundByFixture = buildFixtureRoundMap(seedFixtures)
    // Per-round snapshots come from the squad repository (written at lock + on swap-commit). Empty
    // for any squad that never swapped — scoring then falls back to the live squad slot.
    const roundLineups: RoundLineupSlot[] = []
    for (const participant of lockedParticipants) {
      roundLineups.push(...(await this.squadRepository.listRoundLineupSlots(participant.participantId)))
    }
    return calculateParticipantRows(lockedParticipants, slots, entries, scoring, kickoffByFixture, bonusByEntry, fixtureRoundByFixture, roundLineups)
  }
}

export class PostgresScoringRepository implements ScoringRepository {
  storageKind: 'postgres' = 'postgres'

  constructor(
    private readonly pool: Pool,
    private readonly configRepository: ConfigRepository,
    private readonly leaderboardCache?: LeaderboardCache,
  ) {}

  // Read-through the cache when one is injected; otherwise compute directly. See leaderboardCache.ts.
  private getCachedRows(compute: () => Promise<CacheableRow[]>): Promise<CacheableRow[]> {
    return this.leaderboardCache ? this.leaderboardCache.getRows(compute) : compute()
  }

  private async listBonusByEntry(): Promise<Map<string, number>> {
    const result = await this.pool.query<{
      participant_id: string
      fixture_id: string
      player_id: string
      bonus_percent: number
    }>(`SELECT participant_id, fixture_id, player_id, bonus_percent FROM participant_influence_snapshot`)
    const map = new Map<string, number>()
    for (const row of result.rows) {
      map.set(bonusKey(row.participant_id, row.fixture_id, Number(row.player_id)), row.bonus_percent)
    }
    return map
  }

  async upsertMatchEntry(input: MatchEntryInput) {
    const result = await this.pool.query<{
      entry_id: string
      fixture_id: string
      player_id: string
      in_official_squad: boolean
      minutes: number
      goals: number
      assists: number
      clean_sheet_eligible: boolean
      performance_points: string | null
      rating: string | null
      source_note: string
    }>(
      `
        INSERT INTO admin_match_entries (
          fixture_id, player_id, in_official_squad, minutes, goals, assists, clean_sheet_eligible, performance_points, rating, source_note
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10, 'manual admin entry'))
        ON CONFLICT (fixture_id, player_id)
        DO UPDATE SET
          in_official_squad = EXCLUDED.in_official_squad,
          minutes = EXCLUDED.minutes,
          goals = EXCLUDED.goals,
          assists = EXCLUDED.assists,
          clean_sheet_eligible = EXCLUDED.clean_sheet_eligible,
          performance_points = EXCLUDED.performance_points,
          rating = EXCLUDED.rating,
          source_note = EXCLUDED.source_note
        RETURNING entry_id, fixture_id, player_id, in_official_squad, minutes, goals, assists, clean_sheet_eligible, performance_points, rating, source_note
      `,
      [
        input.fixtureId,
        input.playerId,
        input.inOfficialSquad,
        input.minutes,
        input.goals,
        input.assists,
        input.cleanSheetEligible,
        input.performancePoints ?? null,
        input.rating ?? null,
        input.sourceNote ?? null,
      ],
    )

    this.leaderboardCache?.invalidate()
    return mapEntryRow(result.rows[0])
  }

  async listMatchEntries(fixtureId?: string) {
    const result = await this.pool.query<{
      entry_id: string
      fixture_id: string
      player_id: string
      in_official_squad: boolean
      minutes: number
      goals: number
      assists: number
      clean_sheet_eligible: boolean
      performance_points: string | null
      rating: string | null
      source_note: string
    }>(
      `
        SELECT entry_id, fixture_id, player_id, in_official_squad, minutes, goals, assists, clean_sheet_eligible, performance_points, rating, source_note
        FROM admin_match_entries
        WHERE ($1::text IS NULL OR fixture_id = $1)
        ORDER BY fixture_id, player_id
      `,
      [fixtureId ?? null],
    )
    return result.rows.map(mapEntryRow)
  }

  // Session-level advisory lock keyed by a stable hash of the fixture id (hashtext). Held on a
  // dedicated connection for the duration of fn, then released. pg_try_advisory_lock returns
  // false immediately when another connection already holds it → we skip rather than block.
  async withFixtureLock<T>(fixtureId: string, fn: () => Promise<T>): Promise<T | null> {
    const client = await this.pool.connect()
    try {
      const lockResult = await client.query<{ locked: boolean }>(
        'SELECT pg_try_advisory_lock(hashtext($1)) AS locked',
        [fixtureId],
      )
      if (!lockResult.rows[0]?.locked) {
        return null
      }
      try {
        return await fn()
      } finally {
        await client.query('SELECT pg_advisory_unlock(hashtext($1))', [fixtureId])
      }
    } finally {
      client.release()
    }
  }

  async getLeagueLeaderboard(leagueType: LeagueType) {
    const rows = await this.getCachedRows(() => this.calculateRows())
    return rankParticipants(rows.filter((row) => row.leagueType === leagueType))
  }

  async getNationLeaderboard() {
    return buildNationLeaderboard(rankParticipants(await this.getCachedRows(() => this.calculateRows())))
  }

  private async calculateRows() {
    const scoring = await this.configRepository.getScoringConfig()
    const [participants, legacySlots, entries, dbFixtures, bonusByEntry, roundLineups] = await Promise.all([
      this.listParticipants(),
      this.listSlots(),
      this.listMatchEntries(),
      this.listFixtureSeeds(),
      this.listBonusByEntry(),
      this.listRoundLineupSlots(),
    ])
    const kickoffByFixture = buildKickoffByFixture(dbFixtures)
    const fixtureRoundByFixture = buildFixtureRoundMap(dbFixtures)
    return calculateParticipantRows(participants, legacySlots, entries, scoring, kickoffByFixture, bonusByEntry, fixtureRoundByFixture, roundLineups)
  }

  private async listParticipants(): Promise<ScoreParticipant[]> {
    const result = await this.pool.query<{
      participant_id: string
      display_name: string
      league_type: LeagueType
      primary_team_code: string
      secondary_team_code: string | null
      created_at: string
      locked_at: string | null
      budget_limit: number
    }>(
      `
        SELECT p.participant_id, p.display_name, p.league_type, p.primary_team_code, p.secondary_team_code, p.created_at,
               s.locked_at, COALESCE(s.budget_limit, $1)::integer AS budget_limit
        FROM participants p
        LEFT JOIN squads s ON s.participant_id = p.participant_id AND s.is_locked = TRUE
        WHERE p.status = 'active'
      `,
      [STARTING_BUDGET],
    )
    return result.rows.map((row) => ({
      participantId: row.participant_id,
      displayName: row.display_name,
      leagueType: row.league_type,
      primaryTeamCode: row.primary_team_code,
      secondaryTeamCode: row.secondary_team_code ?? undefined,
      registeredAt: row.created_at,
      lockedAt: row.locked_at,
      budgetLimit: row.budget_limit,
    }))
  }

  // Fixtures from the DB (the live, admin-editable source) including team codes, so both the kickoff
  // map and the fixture->round map derive from the same rows (round = a team's Nth chronological
  // fixture — see lib/tournamentRounds.ts).
  private async listFixtureSeeds(): Promise<FixtureSeed[]> {
    const result = await this.pool.query<{
      fixture_id: string
      group_key: string
      kickoff_date: string
      kickoff_time_utc: string
      home_team_code: string
      away_team_code: string
    }>('SELECT fixture_id, group_key, kickoff_date, kickoff_time_utc, home_team_code, away_team_code FROM fixtures')
    return result.rows.map((row) => ({
      fixtureId: row.fixture_id,
      groupKey: row.group_key,
      kickoffDate: typeof row.kickoff_date === 'string' ? row.kickoff_date : new Date(row.kickoff_date).toISOString().slice(0, 10),
      kickoffTimeUtc: row.kickoff_time_utc,
      homeTeamCode: row.home_team_code,
      awayTeamCode: row.away_team_code,
    }))
  }

  private async listRoundLineupSlots(): Promise<RoundLineupSlot[]> {
    const [currentSlotResult, result] = await Promise.all([
      this.pool.query<{
        squad_id: string
        participant_id: string
        slot_key: string
        player_id: string
      }>(
        `
          SELECT s.squad_id, s.participant_id, ss.slot_key, ss.player_id
          FROM squads s
          JOIN squad_slots ss ON ss.squad_id = s.squad_id
          WHERE s.is_locked = TRUE
        `,
      ),
      this.pool.query<{
        squad_id: string
        participant_id: string
        round_key: number
        player_id: string
        slot_key: string
        slot_group: 'starter' | 'sub'
        slot_class: SlotClass
        position_codes: string[] | null
      }>(
        `
          SELECT rl.squad_id, s.participant_id, rl.round_key, rl.player_id, rl.slot_key, rl.slot_group, rl.slot_class, rl.position_codes
          FROM squad_round_lineup rl
          JOIN squads s ON s.squad_id = rl.squad_id
          WHERE s.is_locked = TRUE
        `,
      ),
    ])
    const currentBySquad = new Map<string, Array<{ slotKey: string; playerId: number }>>()
    for (const row of currentSlotResult.rows) {
      const current = currentBySquad.get(row.squad_id) ?? []
      current.push({ slotKey: row.slot_key, playerId: Number(row.player_id) })
      currentBySquad.set(row.squad_id, current)
    }

    const rowsByRound = new Map<string, typeof result.rows>()
    for (const row of result.rows) {
      const key = `${row.squad_id}:${Number(row.round_key)}`
      const rows = rowsByRound.get(key) ?? []
      rows.push(row)
      rowsByRound.set(key, rows)
    }

    const validRows: typeof result.rows = []
    for (const rows of rowsByRound.values()) {
      const firstRow = rows[0]
      const current = currentBySquad.get(firstRow.squad_id)
      if (!current) {
        continue
      }
      const currentPlayerIds = new Set(current.map((slot) => slot.playerId))
      const currentPlayerBySlot = new Map(current.map((slot) => [slot.slotKey, slot.playerId]))
      const rowPlayerIds = new Set(rows.map((row) => Number(row.player_id)))
      const roundKey = Number(firstRow.round_key)
      const hasSamePlayerSet =
        rows.length === current.length &&
        rowPlayerIds.size === rows.length &&
        currentPlayerIds.size === current.length &&
        rowPlayerIds.size === currentPlayerIds.size &&
        [...rowPlayerIds].every((playerId) => currentPlayerIds.has(playerId))
      const baselineMatchesCurrentSlots =
        roundKey !== BASELINE_ROUND_KEY || rows.every((row) => currentPlayerBySlot.get(row.slot_key) === Number(row.player_id))

      if (hasSamePlayerSet && baselineMatchesCurrentSlots) {
        validRows.push(...rows)
      }
    }

    return validRows.map((row) => ({
      participantId: row.participant_id,
      roundKey: Number(row.round_key),
      playerId: Number(row.player_id),
      slotKey: row.slot_key,
      slotGroup: row.slot_group,
      slotClass: row.slot_class,
      positionCodes: row.position_codes ?? [],
    }))
  }

  private async listSlots(): Promise<ScoreSlot[]> {
    const result = await this.pool.query<{
      participant_id: string
      slot_key: string
      slot_group: 'starter' | 'sub'
      slot_class: SlotClass
      player_id: string
      display_name: string
      team_code: string | null
      image_url: string | null
      position_codes: string[] | null
    }>(
      `
        SELECT s.participant_id, ss.slot_key, ss.slot_group, ss.slot_class, ss.player_id,
               p.display_name, COALESCE(ts.team_code, p.nationality_code) AS team_code, p.image_url,
               ss.position_codes
        FROM squads s
        JOIN squad_slots ss ON ss.squad_id = s.squad_id
        JOIN world_cup_players p ON p.player_id = ss.player_id
        LEFT JOIN world_cup_team_selections ts ON ts.player_id = ss.player_id
        WHERE s.is_locked = TRUE
      `,
    )
    return result.rows.map((row) => ({
      participantId: row.participant_id,
      slotKey: row.slot_key,
      slotGroup: row.slot_group,
      slotClass: row.slot_class,
      playerId: Number(row.player_id),
      displayName: row.display_name,
      teamCode: row.team_code ?? '',
      imageUrl: row.image_url ?? undefined,
      positionCodes: row.position_codes ?? [],
    }))
  }
}

function mapEntryRow(row: {
  entry_id: string
  fixture_id: string
  player_id: string
  in_official_squad: boolean
  minutes: number
  goals: number
  assists: number
  clean_sheet_eligible: boolean
  performance_points: string | null
  rating: string | null
  source_note: string
}): MatchEntryRecord {
  return {
    entryId: row.entry_id,
    fixtureId: row.fixture_id,
    playerId: Number(row.player_id),
    inOfficialSquad: row.in_official_squad,
    minutes: row.minutes,
    goals: row.goals,
    assists: row.assists,
    cleanSheetEligible: row.clean_sheet_eligible,
    performancePoints: row.performance_points === null ? undefined : Number(row.performance_points),
    rating: row.rating === null ? undefined : Number(row.rating),
    sourceNote: row.source_note,
  }
}
