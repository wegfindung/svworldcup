import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import { fixtureKickoffEpoch } from '../data/competitionWindow.js'
import { STARTING_BUDGET, getScoreMultiplierForBudget } from '../data/formation.js'
import { fixtures as seedFixtures } from '../data/worldCupSeed.js'
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
  ScoringConfig,
  SlotClass,
  SlotGroup,
} from '../domain/types.js'
import type { ConfigRepository } from './configRepository.js'
import type { RegistrationRepository } from './registrationRepository.js'
import type { SquadRepository } from './squadRepository.js'

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

function calculateParticipantRows(
  participants: ScoreParticipant[],
  slots: ScoreSlot[],
  entries: MatchEntryRecord[],
  scoring: ScoringConfig,
  kickoffByFixture: Map<string, number>,
): RankableParticipantRow[] {
  const fixtureEntryScores = buildFixtureEntryScoreMap(entries, scoring)
  const slotsByParticipant = new Map<string, ScoreSlot[]>()

  for (const slot of slots) {
    const current = slotsByParticipant.get(slot.participantId) ?? []
    current.push(slot)
    slotsByParticipant.set(slot.participantId, current)
  }

  return participants.map((participant) => {
    const participantSlots = slotsByParticipant.get(participant.participantId) ?? []
    const lockEpoch = participant.lockedAt ? new Date(participant.lockedAt).getTime() : null
    const hasLockCutoff = lockEpoch !== null && Number.isFinite(lockEpoch)

    let baseScore = 0
    const breakdown = createEmptyBreakdown()
    const fixtureDetailsById = new Map<string, ParticipantScoreFixtureDetail>()

    function addPlayerState(fixtureId: string, slot: ScoreSlot, playerState: FixtureEntryScore) {
      const components = scoreEntryComponents(playerState.entry, scoring)
      baseScore += components.total
      breakdown.goals.count += playerState.entry.goals
      breakdown.goals.points += components.goals
      breakdown.assists.count += playerState.entry.assists
      breakdown.assists.points += components.assists
      if (playerState.entry.minutes > 0) {
        breakdown.appearances.count += 1
        breakdown.appearances.points += components.appearance
      }
      if (playerState.entry.minutes >= 60) {
        breakdown.minutes.count += 1
        breakdown.minutes.points += components.minutes
      }
      breakdown.performance.points += components.performance

      let cleanSheetPoints = 0
      if (playerState.cleanSheetEligible) {
        cleanSheetPoints = scoring.cleanSheet[slot.slotClass]
        baseScore += cleanSheetPoints
        breakdown.cleanSheets.count += 1
        breakdown.cleanSheets.points += cleanSheetPoints
      }

      const totalPoints = components.total + cleanSheetPoints
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
          goalPoints: components.goals,
          assistPoints: components.assists,
          appearancePoints: components.appearance,
          minutesPoints: components.minutes,
          cleanSheetPoints,
          performancePoints: components.performance,
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
      const starterSlots = participantSlots.filter((slot) => slot.slotGroup === 'starter')
      const subSlots = participantSlots.filter((slot) => slot.slotGroup === 'sub')
      const starterAbsences = new Map<SlotClass, number>()

      for (const slot of starterSlots) {
        const playerState = entryScores.get(slot.playerId)
        if (!playerState) {
          continue
        }

        if (!playerState.inOfficialSquad) {
          starterAbsences.set(slot.slotClass, (starterAbsences.get(slot.slotClass) ?? 0) + 1)
        }

        addPlayerState(fixtureId, slot, playerState)
      }

      for (const slot of subSlots) {
        const missingStarters = starterAbsences.get(slot.slotClass) ?? 0
        if (missingStarters < 1) {
          continue
        }

        const playerState = entryScores.get(slot.playerId)
        if (playerState) {
          addPlayerState(fixtureId, slot, playerState)
        }

        starterAbsences.set(slot.slotClass, missingStarters - 1)
      }
    }

    const bonusPercent = participant.leagueType === 'veteran' ? 0 : 0
    const scoreMultiplier = getScoreMultiplierForBudget(participant.budgetLimit)
    const totalScore = baseScore * scoreMultiplier * (1 + bonusPercent / 100)

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
      }),
  )
}

export class MemoryScoringRepository implements ScoringRepository {
  storageKind: 'memory' = 'memory'
  private readonly entries = new Map<string, MatchEntryRecord>()

  constructor(
    private readonly configRepository: ConfigRepository,
    private readonly registrationRepository: RegistrationRepository,
    private readonly squadRepository: SquadRepository,
  ) {}

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
    return entry
  }

  async listMatchEntries(fixtureId?: string) {
    const entries = [...this.entries.values()]
    return fixtureId ? entries.filter((entry) => entry.fixtureId === fixtureId) : entries
  }

  async getLeagueLeaderboard(leagueType: LeagueType) {
    const participants = await this.listMemoryParticipants()
    const rows = await this.calculateRows(participants.filter((participant) => participant.leagueType === leagueType))
    return rankParticipants(rows)
  }

  async getNationLeaderboard() {
    return buildNationLeaderboard(rankParticipants(await this.calculateRows(await this.listMemoryParticipants())))
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
          })
        }
      }
    }

    const kickoffByFixture = buildKickoffByFixture(seedFixtures)
    return calculateParticipantRows(lockedParticipants, slots, entries, scoring, kickoffByFixture)
  }
}

export class PostgresScoringRepository implements ScoringRepository {
  storageKind: 'postgres' = 'postgres'

  constructor(
    private readonly pool: Pool,
    private readonly configRepository: ConfigRepository,
  ) {}

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

  async getLeagueLeaderboard(leagueType: LeagueType) {
    const rows = await this.calculateRows()
    return rankParticipants(rows.filter((row) => row.leagueType === leagueType))
  }

  async getNationLeaderboard() {
    return buildNationLeaderboard(rankParticipants(await this.calculateRows()))
  }

  private async calculateRows() {
    const scoring = await this.configRepository.getScoringConfig()
    const [participants, legacySlots, entries, kickoffByFixture] = await Promise.all([
      this.listParticipants(),
      this.listSlots(),
      this.listMatchEntries(),
      this.listFixtureKickoffs(),
    ])
    return calculateParticipantRows(participants, legacySlots, entries, scoring, kickoffByFixture)
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

  private async listFixtureKickoffs(): Promise<Map<string, number>> {
    const result = await this.pool.query<{
      fixture_id: string
      kickoff_date: string
      kickoff_time_utc: string
    }>('SELECT fixture_id, kickoff_date, kickoff_time_utc FROM fixtures')
    return buildKickoffByFixture(
      result.rows.map((row) => ({
        fixtureId: row.fixture_id,
        kickoffDate: typeof row.kickoff_date === 'string' ? row.kickoff_date : new Date(row.kickoff_date).toISOString().slice(0, 10),
        kickoffTimeUtc: row.kickoff_time_utc,
      })),
    )
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
    }>(
      `
        SELECT s.participant_id, ss.slot_key, ss.slot_group, ss.slot_class, ss.player_id,
               p.display_name, COALESCE(ts.team_code, p.nationality_code) AS team_code, p.image_url
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
