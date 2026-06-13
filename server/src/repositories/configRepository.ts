import { Pool } from 'pg'
import { scoringDefaults } from '../data/scoringDefaults.js'
import type { EventControls, FixtureScoreOverride, FixtureScoreOverrides, ScoringConfig } from '../domain/types.js'
import type { LeaderboardCache } from './leaderboardCache.js'

const defaultEventControls: EventControls = {
  globalRevealProfiles: false,
  globalRevealSquads: false,
}

// tournament_config key holding the per-fixture public-scoreline overrides map.
const FIXTURE_SCORE_OVERRIDES_KEY = 'fixture_score_overrides'

export interface ConfigRepository {
  storageKind: 'memory' | 'postgres'
  getScoringConfig(): Promise<ScoringConfig>
  updateScoringConfig(nextConfig: ScoringConfig): Promise<ScoringConfig>
  getEventControls(): Promise<EventControls>
  updateEventControls(nextControls: EventControls): Promise<EventControls>
  // Public-results scoreline overrides (display-only; see SOP "Official Scoreline Override").
  getFixtureScoreOverrides(): Promise<FixtureScoreOverrides>
  setFixtureScoreOverride(fixtureId: string, score: FixtureScoreOverride): Promise<void>
  clearFixtureScoreOverride(fixtureId: string): Promise<void>
}

export class MemoryConfigRepository implements ConfigRepository {
  storageKind: 'memory' = 'memory'
  private scoringConfig = scoringDefaults
  private eventControls = defaultEventControls
  private fixtureScoreOverrides: FixtureScoreOverrides = {}

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

  async getFixtureScoreOverrides(): Promise<FixtureScoreOverrides> {
    return { ...this.fixtureScoreOverrides }
  }

  async setFixtureScoreOverride(fixtureId: string, score: FixtureScoreOverride): Promise<void> {
    this.fixtureScoreOverrides[fixtureId] = { home: score.home, away: score.away }
  }

  async clearFixtureScoreOverride(fixtureId: string): Promise<void> {
    delete this.fixtureScoreOverrides[fixtureId]
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

  async getFixtureScoreOverrides(): Promise<FixtureScoreOverrides> {
    const result = await this.pool.query<{ value_json: FixtureScoreOverrides }>(
      'SELECT value_json FROM tournament_config WHERE key = $1',
      [FIXTURE_SCORE_OVERRIDES_KEY],
    )
    return result.rows[0]?.value_json ?? {}
  }

  async setFixtureScoreOverride(fixtureId: string, score: FixtureScoreOverride): Promise<void> {
    // Merge this one fixture's entry into the JSONB map atomically (`||` replaces the key if it
    // already exists), so two fixtures' overrides written concurrently can't clobber each other.
    await this.pool.query(
      `
        INSERT INTO tournament_config (key, value_json, updated_at)
        VALUES ($1, $2::jsonb, NOW())
        ON CONFLICT (key)
        DO UPDATE SET value_json = tournament_config.value_json || EXCLUDED.value_json, updated_at = NOW()
      `,
      [FIXTURE_SCORE_OVERRIDES_KEY, JSON.stringify({ [fixtureId]: { home: score.home, away: score.away } })],
    )
  }

  async clearFixtureScoreOverride(fixtureId: string): Promise<void> {
    // `value_json - key` drops just this fixture's entry; a no-op when the map or key is absent.
    await this.pool.query(
      `
        UPDATE tournament_config
        SET value_json = value_json - $2, updated_at = NOW()
        WHERE key = $1
      `,
      [FIXTURE_SCORE_OVERRIDES_KEY, fixtureId],
    )
  }
}
