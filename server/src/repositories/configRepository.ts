import { Pool } from 'pg'
import { scoringDefaults } from '../data/scoringDefaults.js'
import type { ScoringConfig } from '../domain/types.js'

export interface ConfigRepository {
  storageKind: 'memory' | 'postgres'
  getScoringConfig(): Promise<ScoringConfig>
  updateScoringConfig(nextConfig: ScoringConfig): Promise<ScoringConfig>
}

export class MemoryConfigRepository implements ConfigRepository {
  storageKind: 'memory' = 'memory'
  private scoringConfig = scoringDefaults

  async getScoringConfig(): Promise<ScoringConfig> {
    return this.scoringConfig
  }

  async updateScoringConfig(nextConfig: ScoringConfig): Promise<ScoringConfig> {
    this.scoringConfig = nextConfig
    return nextConfig
  }
}

export class PostgresConfigRepository implements ConfigRepository {
  storageKind: 'postgres' = 'postgres'

  constructor(private readonly pool: Pool) {}

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
    return nextConfig
  }
}
