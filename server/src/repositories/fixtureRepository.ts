import { Pool } from 'pg'
import { fixtures as seedFixtures } from '../data/worldCupSeed.js'
import type { FixtureSeed } from '../domain/types.js'

export interface FixtureRepository {
  storageKind: 'memory' | 'postgres'
  listFixtures(): Promise<FixtureSeed[]>
  upsertFixtures(fixtures: FixtureSeed[]): Promise<void>
}

function sortFixtures(fixtures: FixtureSeed[]) {
  return [...fixtures].sort(
    (left, right) =>
      left.kickoffDate.localeCompare(right.kickoffDate) ||
      left.kickoffTimeUtc.localeCompare(right.kickoffTimeUtc) ||
      left.fixtureId.localeCompare(right.fixtureId),
  )
}

export class MemoryFixtureRepository implements FixtureRepository {
  storageKind: 'memory' = 'memory'
  private readonly fixturesById = new Map<string, FixtureSeed>(seedFixtures.map((fixture) => [fixture.fixtureId, fixture]))

  async listFixtures() {
    return sortFixtures([...this.fixturesById.values()])
  }

  async upsertFixtures(fixtures: FixtureSeed[]) {
    for (const fixture of fixtures) {
      this.fixturesById.set(fixture.fixtureId, fixture)
    }
  }
}

export class PostgresFixtureRepository implements FixtureRepository {
  storageKind: 'postgres' = 'postgres'

  constructor(private readonly pool: Pool) {}

  async listFixtures() {
    const result = await this.pool.query<{
      fixture_id: string
      group_key: string
      kickoff_date: string
      kickoff_time_utc: string
      home_team_code: string
      away_team_code: string
    }>(
      `
        SELECT fixture_id, group_key, kickoff_date, kickoff_time_utc, home_team_code, away_team_code
        FROM fixtures
        ORDER BY kickoff_date, kickoff_time_utc, fixture_id
      `,
    )

    return result.rows.map((row) => ({
      fixtureId: row.fixture_id,
      groupKey: row.group_key,
      kickoffDate: typeof row.kickoff_date === 'string' ? row.kickoff_date : new Date(row.kickoff_date).toISOString().slice(0, 10),
      kickoffTimeUtc: row.kickoff_time_utc,
      homeTeamCode: row.home_team_code,
      awayTeamCode: row.away_team_code,
    }))
  }

  async upsertFixtures(fixtures: FixtureSeed[]) {
    for (const fixture of fixtures) {
      await this.pool.query(
        `
          INSERT INTO fixtures (fixture_id, group_key, kickoff_date, kickoff_time_utc, home_team_code, away_team_code, source)
          VALUES ($1, $2, $3, $4, $5, $6, 'simulated-knockout')
          ON CONFLICT (fixture_id)
          DO UPDATE SET
            group_key = EXCLUDED.group_key,
            kickoff_date = EXCLUDED.kickoff_date,
            kickoff_time_utc = EXCLUDED.kickoff_time_utc,
            home_team_code = EXCLUDED.home_team_code,
            away_team_code = EXCLUDED.away_team_code,
            source = EXCLUDED.source
        `,
        [fixture.fixtureId, fixture.groupKey, fixture.kickoffDate, fixture.kickoffTimeUtc, fixture.homeTeamCode, fixture.awayTeamCode],
      )
    }
  }
}
