import { Pool } from 'pg'
import { getPositionClasses } from '../data/positionClasses.js'
import { getCapCostForRating } from '../data/salaryTable.js'
import type { SoccerversePlayerRecord, TeamPoolPlayer } from '../domain/types.js'
import { compareTeamPoolPlayersForBuilder } from '../lib/teamPoolSort.js'

function defaultPlayerImageUrl(playerId: number) {
  return `https://elrincondeldt.com/sv/photos/players/${playerId}.png`
}

function toTeamPoolPlayer(teamCode: string, player: SoccerversePlayerRecord): TeamPoolPlayer {
  return {
    teamCode,
    playerId: player.playerId,
    displayName: player.displayName,
    nationalityCode: player.nationalityCode,
    rating: player.rating,
    capCost: getCapCostForRating(player.rating),
    positions: player.positions,
    positionMain: player.positionMain,
    positionClasses: getPositionClasses(player.positions),
    imageUrl: player.imageUrl ?? defaultPlayerImageUrl(player.playerId),
  }
}

export interface TeamPoolRepository {
  storageKind: 'memory' | 'postgres'
  listByTeam(teamCode: string): Promise<TeamPoolPlayer[]>
  getTeamPlayerById(playerId: number): Promise<TeamPoolPlayer | null>
  getTeamSelectionCounts(): Promise<Record<string, number>>
  replaceTeamPlayers(teamCode: string, players: SoccerversePlayerRecord[]): Promise<TeamPoolPlayer[]>
  seedTeamPlayersIfEmpty(teamCode: string, players: SoccerversePlayerRecord[]): Promise<void>
}

export class MemoryTeamPoolRepository implements TeamPoolRepository {
  storageKind: 'memory' = 'memory'
  private readonly byTeam = new Map<string, TeamPoolPlayer[]>()

  async listByTeam(teamCode: string) {
    return [...(this.byTeam.get(teamCode) ?? [])].sort(compareTeamPoolPlayersForBuilder)
  }

  async getTeamPlayerById(playerId: number) {
    for (const players of this.byTeam.values()) {
      const found = players.find((player) => player.playerId === playerId)
      if (found) {
        return found
      }
    }
    return null
  }

  async getTeamSelectionCounts() {
    return Object.fromEntries([...this.byTeam.entries()].map(([teamCode, players]) => [teamCode, players.length]))
  }

  async replaceTeamPlayers(teamCode: string, players: SoccerversePlayerRecord[]) {
    const normalized = players.map((player) => toTeamPoolPlayer(teamCode, player))
    this.byTeam.set(teamCode, normalized)
    return this.listByTeam(teamCode)
  }

  async seedTeamPlayersIfEmpty(teamCode: string, players: SoccerversePlayerRecord[]) {
    if ((this.byTeam.get(teamCode) ?? []).length > 0) {
      return
    }
    await this.replaceTeamPlayers(teamCode, players)
  }
}

export class PostgresTeamPoolRepository implements TeamPoolRepository {
  storageKind: 'postgres' = 'postgres'

  constructor(private readonly pool: Pool) {}

  async listByTeam(teamCode: string) {
    const result = await this.pool.query<{
      team_code: string
      player_id: string
      display_name: string
      nationality_code: string | null
      rating: number | null
      position_codes: string[] | null
      position_main: string | null
      image_url: string | null
    }>(
      `
        SELECT s.team_code, p.player_id, p.display_name, p.nationality_code, p.rating, p.position_codes, p.position_main, p.image_url
        FROM world_cup_team_selections s
        JOIN world_cup_players p ON p.player_id = s.player_id
        WHERE s.team_code = $1
        ORDER BY COALESCE(p.rating, 0) DESC, p.display_name ASC
      `,
      [teamCode],
    )

    return result.rows
      .map((row) =>
        toTeamPoolPlayer(teamCode, {
          playerId: Number(row.player_id),
          displayName: row.display_name,
          nationalityCode: row.nationality_code ?? teamCode,
          rating: row.rating ?? 50,
          clubId: 0,
          positions: row.position_codes ?? [],
          positionMain: row.position_main ?? undefined,
          imageUrl: row.image_url ?? undefined,
        }),
      )
      .sort(compareTeamPoolPlayersForBuilder)
  }

  async getTeamPlayerById(playerId: number) {
    const result = await this.pool.query<{
      team_code: string
      player_id: string
      display_name: string
      nationality_code: string | null
      rating: number | null
      position_codes: string[] | null
      position_main: string | null
      image_url: string | null
    }>(
      `
        SELECT s.team_code, p.player_id, p.display_name, p.nationality_code, p.rating, p.position_codes, p.position_main, p.image_url
        FROM world_cup_team_selections s
        JOIN world_cup_players p ON p.player_id = s.player_id
        WHERE s.player_id = $1
        LIMIT 1
      `,
      [playerId],
    )
    const row = result.rows[0]
    if (!row) {
      return null
    }

    return toTeamPoolPlayer(row.team_code, {
      playerId: Number(row.player_id),
      displayName: row.display_name,
      nationalityCode: row.nationality_code ?? row.team_code,
      rating: row.rating ?? 50,
      clubId: 0,
      positions: row.position_codes ?? [],
      positionMain: row.position_main ?? undefined,
      imageUrl: row.image_url ?? undefined,
    })
  }

  async getTeamSelectionCounts() {
    const result = await this.pool.query<{ team_code: string; count: string }>(
      `
        SELECT team_code, COUNT(*)::text AS count
        FROM world_cup_team_selections
        GROUP BY team_code
      `,
    )
    return Object.fromEntries(result.rows.map((row) => [row.team_code, Number(row.count)]))
  }

  async replaceTeamPlayers(teamCode: string, players: SoccerversePlayerRecord[]) {
    const client = await this.pool.connect()

    try {
      await client.query('BEGIN')
      for (const player of players) {
        await client.query(
          `
            INSERT INTO world_cup_players (player_id, display_name, nationality_code, position_codes, rating, position_main, image_url, source, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'soccerverse', NOW())
            ON CONFLICT (player_id)
            DO UPDATE SET
              display_name = EXCLUDED.display_name,
              nationality_code = EXCLUDED.nationality_code,
              position_codes = EXCLUDED.position_codes,
              rating = EXCLUDED.rating,
              position_main = EXCLUDED.position_main,
              image_url = COALESCE(EXCLUDED.image_url, world_cup_players.image_url),
              updated_at = NOW()
          `,
          [
            player.playerId,
            player.displayName,
            player.nationalityCode,
            player.positions,
            player.rating,
            player.positionMain ?? null,
            player.imageUrl ?? null,
          ],
        )
      }

      await client.query('DELETE FROM world_cup_team_selections WHERE team_code = $1', [teamCode])

      for (const [index, player] of players.entries()) {
        await client.query(
          `
            INSERT INTO world_cup_team_selections (team_code, player_id, sort_order, updated_at)
            VALUES ($1, $2, $3, NOW())
          `,
          [teamCode, player.playerId, index + 1],
        )
      }

      await client.query('COMMIT')
      return this.listByTeam(teamCode)
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async seedTeamPlayersIfEmpty(teamCode: string, players: SoccerversePlayerRecord[]) {
    const result = await this.pool.query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM world_cup_team_selections WHERE team_code = $1',
      [teamCode],
    )
    if (Number(result.rows[0]?.count ?? '0') > 0) {
      return
    }
    await this.replaceTeamPlayers(teamCode, players)
  }
}
