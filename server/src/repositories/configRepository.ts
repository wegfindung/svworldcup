import { Pool } from 'pg'
import { scoringDefaults } from '../data/scoringDefaults.js'
import type { EventControls, ScoringConfig } from '../domain/types.js'
import type { LeaderboardCache } from './leaderboardCache.js'

const defaultEventControls: EventControls = {
  globalRevealProfiles: false,
  globalRevealSquads: false,
}

export interface ConfigRepository {
  storageKind: 'memory' | 'postgres'
  getScoringConfig(): Promise<ScoringConfig>
  updateScoringConfig(nextConfig: ScoringConfig): Promise<ScoringConfig>
  getEventControls(): Promise<EventControls>
  updateEventControls(nextControls: EventControls): Promise<EventControls>
}

export class MemoryConfigRepository implements ConfigRepository {
  storageKind: 'memory' = 'memory'
  private scoringConfig = scoringDefaults
  private eventControls = defaultEventControls

  constructor(private readonly leaderboardCache?: LeaderboardCache) {}

  async getScoringConfig(): Promise<ScoringConfig> {
    return this.scoringConfig
  }

  async updateScoringConfig(nextConfig: ScoringConfig): Promise<ScoringConfig> {
    this.scoringConfig = nextConfig
    this.leaderboardCache?.invalidate()
    return nextConfig
  }

  async getEventControls(): Promise<EventControls> {
    return this.eventControls
  }

  async updateEventControls(nextControls: EventControls): Promise<EventControls> {
    this.eventControls = nextControls
    return nextControls
  }
}

export class PostgresConfigRepository implements ConfigRepository {
  storageKind: 'postgres' = 'postgres'

  constructor(
    private readonly pool: Pool,
    private readonly leaderboardCache?: LeaderboardCache,
  ) {}

  async getScoringConfig(): Promise<ScoringConfig> {
    const result = await this.pool.query<{ value_json: ScoringConfig }>(
      'SELECT value_json FROM tournament_config WHERE key = $1',
      ['scoring'],
    )
    return result.rows[0]?.value_json ?? scoringDefaults
  }

  async updateScoringConfig(nextConfig: ScoringConfig): Promise<ScoringConfig> {
    await this.pool.query(
      `
        INSERT INTO tournament_config (key, value_json, updated_at)
        VALUES ('scoring', $1::jsonb, NOW())
        ON CONFLICT (key)
        DO UPDATE SET value_json = EXCLUDED.value_json, updated_at = NOW()
      `,
      [JSON.stringify(nextConfig)],
    )
    this.leaderboardCache?.invalidate()
    return nextConfig
  }

  async getEventControls(): Promise<EventControls> {
    const result = await this.pool.query<{ value_json: Partial<EventControls> }>(
      'SELECT value_json FROM tournament_config WHERE key = $1',
      ['event_controls'],
    )
    return {
      ...defaultEventControls,
      ...(result.rows[0]?.value_json ?? {}),
    }
  }

  async updateEventControls(nextControls: EventControls): Promise<EventControls> {
    await this.pool.query(
      `
        INSERT INTO tournament_config (key, value_json, updated_at)
        VALUES ('event_controls', $1::jsonb, NOW())
        ON CONFLICT (key)
        DO UPDATE SET value_json = EXCLUDED.value_json, updated_at = NOW()
      `,
      [JSON.stringify(nextControls)],
    )
    return nextControls
  }
}
