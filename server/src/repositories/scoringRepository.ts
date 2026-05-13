import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import type {
  LeagueType,
  MatchEntryInput,
  MatchEntryRecord,
  NationScoreRow,
  ParticipantScoreRow,
  ScoringConfig,
  SlotClass,
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
}

interface ScoreSlot {
  participantId: string
  slotKey: string
  slotGroup: 'starter' | 'sub'
  slotClass: SlotClass
  playerId: number
}

export interface ScoringRepository {
  storageKind: 'memory' | 'postgres'
  upsertMatchEntry(input: MatchEntryInput): Promise<MatchEntryRecord>
  listMatchEntries(fixtureId?: string): Promise<MatchEntryRecord[]>
  getLeagueLeaderboard(leagueType: LeagueType): Promise<ParticipantScoreRow[]>
  getNationLeaderboard(): Promise<NationScoreRow[]>
}

function clampPerformancePoints(value: number | undefined, scoring: ScoringConfig) {
  if (value === undefined || Number.isNaN(value)) {
    return 0
  }

  return Math.min(scoring.performancePointsMax, Math.max(scoring.performancePointsMin, value))
}

function scoreEntry(entry: MatchEntryRecord, scoring: ScoringConfig) {
  return (
    entry.goals * scoring.goal +
    entry.assists * scoring.assist +
    (entry.cleanSheetEligible ? scoring.cleanSheet : 0) +
    (entry.minutes > 0 ? scoring.appearance : 0) +
    (entry.minutes > 0 ? scoring.minutes : 0) +
    clampPerformancePoints(entry.performancePoints, scoring)
  )
}

function buildEntryScoreMap(entries: MatchEntryRecord[], scoring: ScoringConfig) {
  const scores = new Map<number, { score: number; inOfficialSquad: boolean }>()

  for (const entry of entries) {
    const current = scores.get(entry.playerId) ?? { score: 0, inOfficialSquad: false }
    scores.set(entry.playerId, {
      score: current.score + scoreEntry(entry, scoring),
      inOfficialSquad: current.inOfficialSquad || entry.inOfficialSquad,
    })
  }

  return scores
}

function calculateParticipantRows(
  participants: ScoreParticipant[],
  slots: ScoreSlot[],
  entries: MatchEntryRecord[],
  scoring: ScoringConfig,
) {
  const entryScores = buildEntryScoreMap(entries, scoring)
  const slotsByParticipant = new Map<string, ScoreSlot[]>()

  for (const slot of slots) {
    const current = slotsByParticipant.get(slot.participantId) ?? []
    current.push(slot)
    slotsByParticipant.set(slot.participantId, current)
  }

  return participants.map((participant) => {
    const participantSlots = slotsByParticipant.get(participant.participantId) ?? []
    const starterSlots = participantSlots.filter((slot) => slot.slotGroup === 'starter')
    const starterAbsences = new Map<SlotClass, number>()

    for (const slot of starterSlots) {
      const playerState = entryScores.get(slot.playerId)
      if (playerState && !playerState.inOfficialSquad) {
        starterAbsences.set(slot.slotClass, (starterAbsences.get(slot.slotClass) ?? 0) + 1)
      }
    }

    let baseScore = 0
    for (const slot of participantSlots) {
      const playerState = entryScores.get(slot.playerId)
      if (!playerState) {
        continue
      }

      if (slot.slotGroup === 'starter') {
        baseScore += playerState.score
        continue
      }

      const missingStarters = starterAbsences.get(slot.slotClass) ?? 0
      if (missingStarters > 0) {
        baseScore += playerState.score
        starterAbsences.set(slot.slotClass, missingStarters - 1)
      }
    }

    const bonusPercent = participant.leagueType === 'veteran' ? 0 : 0
    const totalScore = baseScore * (1 + bonusPercent / 100)

    return {
      participantId: participant.participantId,
      displayName: participant.displayName,
      leagueType: participant.leagueType,
      primaryTeamCode: participant.primaryTeamCode,
      secondaryTeamCode: participant.secondaryTeamCode,
      baseScore,
      bonusPercent,
      totalScore,
      rank: 0,
    }
  })
}

function rankParticipants(rows: Omit<ParticipantScoreRow, 'rank'>[]): ParticipantScoreRow[] {
  return rows
    .sort((left, right) => right.totalScore - left.totalScore || left.displayName.localeCompare(right.displayName))
    .map((row, index) => ({ ...row, rank: index + 1 }))
}

function rankNations(rows: Omit<NationScoreRow, 'rank'>[]): NationScoreRow[] {
  return rows
    .sort((left, right) => right.averageScore - left.averageScore || right.topScore - left.topScore || left.teamCode.localeCompare(right.teamCode))
    .map((row, index) => ({ ...row, rank: index + 1 }))
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
    const rows = await this.calculateRows(await this.listMemoryParticipants())
    const nationScores = new Map<string, number[]>()

    for (const row of rows) {
      for (const teamCode of [row.primaryTeamCode, row.secondaryTeamCode].filter(Boolean) as string[]) {
        const scores = nationScores.get(teamCode) ?? []
        scores.push(row.totalScore)
        nationScores.set(teamCode, scores)
      }
    }

    return rankNations(
      [...nationScores.entries()]
        .filter(([, scores]) => scores.length >= 2)
        .map(([teamCode, scores]) => ({
          teamCode,
          participantCount: scores.length,
          averageScore: scores.reduce((sum, score) => sum + score, 0) / scores.length,
          topScore: Math.max(...scores),
        })),
    )
  }

  private async listMemoryParticipants(): Promise<ScoreParticipant[]> {
    const anyRepository = this.registrationRepository as unknown as {
      byEmail?: Map<string, { participantId: string; displayName: string; leagueType: LeagueType; primaryTeamCode: string; secondaryTeamCode?: string; status: string }>
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
      }))
  }

  private async calculateRows(participants: ScoreParticipant[]) {
    const scoring = await this.configRepository.getScoringConfig()
    const entries = await this.listMatchEntries()
    const slots: ScoreSlot[] = []

    for (const participant of participants) {
      const squad = await this.squadRepository.getOrCreate(participant.participantId)
      if (!squad.isLocked) {
        continue
      }

      for (const slot of squad.slots) {
        if (slot.player) {
          slots.push({
            participantId: participant.participantId,
            slotKey: slot.key,
            slotGroup: slot.slotGroup,
            slotClass: slot.slotClass,
            playerId: slot.player.playerId,
          })
        }
      }
    }

    return calculateParticipantRows(participants, slots, entries, scoring).filter((row) =>
      slots.some((slot) => slot.participantId === row.participantId),
    )
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
      source_note: string
    }>(
      `
        INSERT INTO admin_match_entries (
          fixture_id, player_id, in_official_squad, minutes, goals, assists, clean_sheet_eligible, performance_points, source_note
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, 'manual admin entry'))
        ON CONFLICT (fixture_id, player_id)
        DO UPDATE SET
          in_official_squad = EXCLUDED.in_official_squad,
          minutes = EXCLUDED.minutes,
          goals = EXCLUDED.goals,
          assists = EXCLUDED.assists,
          clean_sheet_eligible = EXCLUDED.clean_sheet_eligible,
          performance_points = EXCLUDED.performance_points,
          source_note = EXCLUDED.source_note
        RETURNING entry_id, fixture_id, player_id, in_official_squad, minutes, goals, assists, clean_sheet_eligible, performance_points, source_note
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
      source_note: string
    }>(
      `
        SELECT entry_id, fixture_id, player_id, in_official_squad, minutes, goals, assists, clean_sheet_eligible, performance_points, source_note
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
    const rows = await this.calculateRows()
    const nationScores = new Map<string, number[]>()

    for (const row of rows) {
      for (const teamCode of [row.primaryTeamCode, row.secondaryTeamCode].filter(Boolean) as string[]) {
        const scores = nationScores.get(teamCode) ?? []
        scores.push(row.totalScore)
        nationScores.set(teamCode, scores)
      }
    }

    return rankNations(
      [...nationScores.entries()]
        .filter(([, scores]) => scores.length >= 2)
        .map(([teamCode, scores]) => ({
          teamCode,
          participantCount: scores.length,
          averageScore: scores.reduce((sum, score) => sum + score, 0) / scores.length,
          topScore: Math.max(...scores),
        })),
    )
  }

  private async calculateRows() {
    const scoring = await this.configRepository.getScoringConfig()
    const [participants, slots, entries] = await Promise.all([this.listParticipants(), this.listSlots(), this.listMatchEntries()])
    return calculateParticipantRows(participants, slots, entries, scoring)
  }

  private async listParticipants(): Promise<ScoreParticipant[]> {
    const result = await this.pool.query<{
      participant_id: string
      display_name: string
      league_type: LeagueType
      primary_team_code: string
      secondary_team_code: string | null
    }>(
      `
        SELECT p.participant_id, p.display_name, p.league_type, p.primary_team_code, p.secondary_team_code
        FROM participants p
        JOIN squads s ON s.participant_id = p.participant_id
        WHERE p.status = 'active'
          AND s.is_locked = TRUE
      `,
    )
    return result.rows.map((row) => ({
      participantId: row.participant_id,
      displayName: row.display_name,
      leagueType: row.league_type,
      primaryTeamCode: row.primary_team_code,
      secondaryTeamCode: row.secondary_team_code ?? undefined,
    }))
  }

  private async listSlots(): Promise<ScoreSlot[]> {
    const result = await this.pool.query<{
      participant_id: string
      slot_key: string
      slot_group: 'starter' | 'sub'
      slot_class: SlotClass
      player_id: string
    }>(
      `
        SELECT s.participant_id, ss.slot_key, ss.slot_group, ss.slot_class, ss.player_id
        FROM squads s
        JOIN squad_slots ss ON ss.squad_id = s.squad_id
        WHERE s.is_locked = TRUE
      `,
    )
    return result.rows.map((row) => ({
      participantId: row.participant_id,
      slotKey: row.slot_key,
      slotGroup: row.slot_group,
      slotClass: row.slot_class,
      playerId: Number(row.player_id),
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
    sourceNote: row.source_note,
  }
}
