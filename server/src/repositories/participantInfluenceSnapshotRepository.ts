import { Pool } from 'pg'
import type { ParticipantInfluenceSnapshotRecord } from '../domain/types.js'

export interface ParticipantInfluenceSnapshotInput {
  participantId: string
  fixtureId: string
  playerId: number
  netShares: number
  bonusPercent: number
}

export interface SnapshotWorkItem {
  participantId: string
  soccerverseUsername: string
  cutoffUnix: number
  playerId: number
}

export interface ParticipantInfluenceSnapshotRepository {
  storageKind: 'memory' | 'postgres'
  upsert(input: ParticipantInfluenceSnapshotInput): Promise<ParticipantInfluenceSnapshotRecord>
  getBonusPercent(participantId: string, fixtureId: string, playerId: number): Promise<number>
  listAll(): Promise<ParticipantInfluenceSnapshotRecord[]>
  listSnapshotWorkForFixture(fixtureId: string): Promise<SnapshotWorkItem[]>
}

function snapshotKey(participantId: string, fixtureId: string, playerId: number) {
  return `${participantId}|${fixtureId}|${playerId}`
}

export class MemoryParticipantInfluenceSnapshotRepository implements ParticipantInfluenceSnapshotRepository {
  storageKind: 'memory' = 'memory'
  private readonly snapshots = new Map<string, ParticipantInfluenceSnapshotRecord>()
  private readonly workQueueByFixture = new Map<string, SnapshotWorkItem[]>()

  setWorkForFixture(fixtureId: string, work: SnapshotWorkItem[]) {
    this.workQueueByFixture.set(fixtureId, work)
  }

  async upsert(input: ParticipantInfluenceSnapshotInput): Promise<ParticipantInfluenceSnapshotRecord> {
    const record: ParticipantInfluenceSnapshotRecord = {
      participantId: input.participantId,
      fixtureId: input.fixtureId,
      playerId: input.playerId,
      netShares: input.netShares,
      bonusPercent: input.bonusPercent,
      snapshotAt: new Date().toISOString(),
    }
    this.snapshots.set(snapshotKey(input.participantId, input.fixtureId, input.playerId), record)
    return record
  }

  async getBonusPercent(participantId: string, fixtureId: string, playerId: number): Promise<number> {
    return this.snapshots.get(snapshotKey(participantId, fixtureId, playerId))?.bonusPercent ?? 0
  }

  async listAll(): Promise<ParticipantInfluenceSnapshotRecord[]> {
    return [...this.snapshots.values()]
  }

  async listSnapshotWorkForFixture(fixtureId: string): Promise<SnapshotWorkItem[]> {
    return this.workQueueByFixture.get(fixtureId) ?? []
  }
}

export class PostgresParticipantInfluenceSnapshotRepository implements ParticipantInfluenceSnapshotRepository {
  storageKind: 'postgres' = 'postgres'

  constructor(private readonly pool: Pool) {}

  async upsert(input: ParticipantInfluenceSnapshotInput): Promise<ParticipantInfluenceSnapshotRecord> {
    const result = await this.pool.query<{
      participant_id: string
      fixture_id: string
      player_id: string
      net_shares: number
      bonus_percent: number
      snapshot_at: string
    }>(
      `
        INSERT INTO participant_influence_snapshot (participant_id, fixture_id, player_id, net_shares, bonus_percent, snapshot_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (participant_id, fixture_id, player_id)
        DO UPDATE SET
          net_shares = EXCLUDED.net_shares,
          bonus_percent = EXCLUDED.bonus_percent,
          snapshot_at = NOW()
        RETURNING participant_id, fixture_id, player_id, net_shares, bonus_percent, snapshot_at
      `,
      [input.participantId, input.fixtureId, input.playerId, input.netShares, input.bonusPercent],
    )
    const row = result.rows[0]
    return {
      participantId: row.participant_id,
      fixtureId: row.fixture_id,
      playerId: Number(row.player_id),
      netShares: row.net_shares,
      bonusPercent: row.bonus_percent,
      snapshotAt: row.snapshot_at,
    }
  }

  async getBonusPercent(participantId: string, fixtureId: string, playerId: number): Promise<number> {
    const result = await this.pool.query<{ bonus_percent: number }>(
      `SELECT bonus_percent FROM participant_influence_snapshot
       WHERE participant_id = $1 AND fixture_id = $2 AND player_id = $3`,
      [participantId, fixtureId, playerId],
    )
    return result.rows[0]?.bonus_percent ?? 0
  }

  async listAll(): Promise<ParticipantInfluenceSnapshotRecord[]> {
    const result = await this.pool.query<{
      participant_id: string
      fixture_id: string
      player_id: string
      net_shares: number
      bonus_percent: number
      snapshot_at: string
    }>(
      `SELECT participant_id, fixture_id, player_id, net_shares, bonus_percent, snapshot_at
       FROM participant_influence_snapshot`,
    )
    return result.rows.map((row) => ({
      participantId: row.participant_id,
      fixtureId: row.fixture_id,
      playerId: Number(row.player_id),
      netShares: row.net_shares,
      bonusPercent: row.bonus_percent,
      snapshotAt: row.snapshot_at,
    }))
  }

  async listSnapshotWorkForFixture(fixtureId: string): Promise<SnapshotWorkItem[]> {
    const result = await this.pool.query<{
      participant_id: string
      soccerverse_username: string
      cutoff_unix: string
      player_id: string
    }>(
      `
        SELECT DISTINCT
          p.participant_id,
          p.soccerverse_username,
          EXTRACT(EPOCH FROM GREATEST(p.created_at, COALESCE(p.soccerverse_linked_at, p.created_at)))::bigint AS cutoff_unix,
          ame.player_id
        FROM admin_match_entries ame
        JOIN squad_slots ss ON ss.player_id = ame.player_id
        JOIN squads sq ON sq.squad_id = ss.squad_id AND sq.is_locked = TRUE
        JOIN participants p ON p.participant_id = sq.participant_id
        WHERE ame.fixture_id = $1
          AND p.soccerverse_username IS NOT NULL
          AND p.status = 'active'
      `,
      [fixtureId],
    )
    return result.rows.map((row) => ({
      participantId: row.participant_id,
      soccerverseUsername: row.soccerverse_username,
      cutoffUnix: Number(row.cutoff_unix),
      playerId: Number(row.player_id),
    }))
  }
}
