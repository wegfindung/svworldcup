import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import type {
  AddSkipNameInput,
  MatchImportPlayerMapEntry,
  MatchImportSkipNameEntry,
  UpsertPlayerMapInput,
} from '../domain/types.js'

// Persisted resolution memory for the match import engine (D9 player map + D12 skip list).
// Kept separate from the batch lifecycle repository: this memory is consumed independently
// by the D9 player-resolution pure functions.
export interface MatchMappingRepository {
  storageKind: 'memory' | 'postgres'
  listPlayerMap(teamCode: string): Promise<MatchImportPlayerMapEntry[]>
  upsertPlayerMap(input: UpsertPlayerMapInput): Promise<MatchImportPlayerMapEntry>
  listSkipNames(teamCode: string): Promise<MatchImportSkipNameEntry[]>
  addSkipName(input: AddSkipNameInput): Promise<MatchImportSkipNameEntry>
  removeSkipName(teamCode: string, normalizedSourceName: string): Promise<void>
}

export class MemoryMatchMappingRepository implements MatchMappingRepository {
  storageKind: 'memory' = 'memory'
  private readonly playerMap = new Map<string, MatchImportPlayerMapEntry>()
  private readonly skipNames = new Map<string, MatchImportSkipNameEntry>()

  private static key(teamCode: string, normalizedSourceName: string) {
    return `${teamCode}:${normalizedSourceName}`
  }

  async listPlayerMap(teamCode: string) {
    return [...this.playerMap.values()].filter((entry) => entry.teamCode === teamCode)
  }

  async upsertPlayerMap(input: UpsertPlayerMapInput) {
    const key = MemoryMatchMappingRepository.key(input.teamCode, input.normalizedSourceName)
    const existing = this.playerMap.get(key)
    const entry: MatchImportPlayerMapEntry = {
      mapId: existing?.mapId ?? randomUUID(),
      teamCode: input.teamCode,
      normalizedSourceName: input.normalizedSourceName,
      playerId: input.playerId,
      createdBy: existing?.createdBy ?? input.createdBy,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    }
    this.playerMap.set(key, entry)
    return entry
  }

  async listSkipNames(teamCode: string) {
    return [...this.skipNames.values()].filter((entry) => entry.teamCode === teamCode)
  }

  async addSkipName(input: AddSkipNameInput) {
    const key = MemoryMatchMappingRepository.key(input.teamCode, input.normalizedSourceName)
    const existing = this.skipNames.get(key)
    if (existing) {
      return existing
    }
    const entry: MatchImportSkipNameEntry = {
      skipId: randomUUID(),
      teamCode: input.teamCode,
      normalizedSourceName: input.normalizedSourceName,
      createdBy: input.createdBy,
      createdAt: new Date().toISOString(),
    }
    this.skipNames.set(key, entry)
    return entry
  }

  async removeSkipName(teamCode: string, normalizedSourceName: string) {
    this.skipNames.delete(MemoryMatchMappingRepository.key(teamCode, normalizedSourceName))
  }
}

interface PlayerMapRow {
  map_id: string
  team_code: string
  normalized_source_name: string
  player_id: string
  created_by: string
  created_at: string
}

interface SkipNameRow {
  skip_id: string
  team_code: string
  normalized_source_name: string
  created_by: string
  created_at: string
}

function mapPlayerMapRow(row: PlayerMapRow): MatchImportPlayerMapEntry {
  return {
    mapId: row.map_id,
    teamCode: row.team_code,
    normalizedSourceName: row.normalized_source_name,
    playerId: Number(row.player_id),
    createdBy: row.created_by,
    createdAt: row.created_at,
  }
}

function mapSkipNameRow(row: SkipNameRow): MatchImportSkipNameEntry {
  return {
    skipId: row.skip_id,
    teamCode: row.team_code,
    normalizedSourceName: row.normalized_source_name,
    createdBy: row.created_by,
    createdAt: row.created_at,
  }
}

export class PostgresMatchMappingRepository implements MatchMappingRepository {
  storageKind: 'postgres' = 'postgres'

  constructor(private readonly pool: Pool) {}

  async listPlayerMap(teamCode: string) {
    const result = await this.pool.query<PlayerMapRow>(
      `
        SELECT map_id, team_code, normalized_source_name, player_id, created_by, created_at
        FROM match_import_player_map
        WHERE team_code = $1
        ORDER BY normalized_source_name
      `,
      [teamCode],
    )
    return result.rows.map(mapPlayerMapRow)
  }

  async upsertPlayerMap(input: UpsertPlayerMapInput) {
    const result = await this.pool.query<PlayerMapRow>(
      `
        INSERT INTO match_import_player_map (team_code, normalized_source_name, player_id, created_by)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (team_code, normalized_source_name)
        DO UPDATE SET player_id = EXCLUDED.player_id
        RETURNING map_id, team_code, normalized_source_name, player_id, created_by, created_at
      `,
      [input.teamCode, input.normalizedSourceName, input.playerId, input.createdBy],
    )
    return mapPlayerMapRow(result.rows[0])
  }

  async listSkipNames(teamCode: string) {
    const result = await this.pool.query<SkipNameRow>(
      `
        SELECT skip_id, team_code, normalized_source_name, created_by, created_at
        FROM match_import_skip_names
        WHERE team_code = $1
        ORDER BY normalized_source_name
      `,
      [teamCode],
    )
    return result.rows.map(mapSkipNameRow)
  }

  async addSkipName(input: AddSkipNameInput) {
    const result = await this.pool.query<SkipNameRow>(
      `
        INSERT INTO match_import_skip_names (team_code, normalized_source_name, created_by)
        VALUES ($1, $2, $3)
        ON CONFLICT (team_code, normalized_source_name)
        DO UPDATE SET team_code = EXCLUDED.team_code
        RETURNING skip_id, team_code, normalized_source_name, created_by, created_at
      `,
      [input.teamCode, input.normalizedSourceName, input.createdBy],
    )
    return mapSkipNameRow(result.rows[0])
  }

  async removeSkipName(teamCode: string, normalizedSourceName: string) {
    await this.pool.query(
      'DELETE FROM match_import_skip_names WHERE team_code = $1 AND normalized_source_name = $2',
      [teamCode, normalizedSourceName],
    )
  }
}
