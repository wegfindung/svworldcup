import { Pool } from 'pg'
import type { LandingPageVisitInput, LandingPageVisitStats } from '../domain/types.js'

export interface LandingAnalyticsRepository {
  storageKind: 'memory' | 'postgres'
  recordLandingPageVisit(input: LandingPageVisitInput): Promise<void>
  getLandingPageVisitStats(): Promise<LandingPageVisitStats>
}

interface MemoryLandingPageVisit {
  ipHash: string
  userAgentHash?: string
  firstLandingPath?: string
  lastLandingPath?: string
  firstSeenAt: string
  lastSeenAt: string
  hitCount: number
}

function normalizeLandingPath(value?: string) {
  const trimmed = value?.trim()
  return trimmed ? trimmed.slice(0, 300) : undefined
}

export class MemoryLandingAnalyticsRepository implements LandingAnalyticsRepository {
  storageKind: 'memory' = 'memory'
  private readonly visitsByIpHash = new Map<string, MemoryLandingPageVisit>()

  async recordLandingPageVisit(input: LandingPageVisitInput) {
    const ipHash = input.ipHash.trim()
    if (!ipHash) {
      return
    }

    const now = new Date().toISOString()
    const landingPath = normalizeLandingPath(input.landingPath)
    const existing = this.visitsByIpHash.get(ipHash)
    if (existing) {
      this.visitsByIpHash.set(ipHash, {
        ...existing,
        userAgentHash: existing.userAgentHash ?? input.userAgentHash,
        lastLandingPath: landingPath ?? existing.lastLandingPath,
        lastSeenAt: now,
        hitCount: existing.hitCount + 1,
      })
      return
    }

    this.visitsByIpHash.set(ipHash, {
      ipHash,
      userAgentHash: input.userAgentHash,
      firstLandingPath: landingPath,
      lastLandingPath: landingPath,
      firstSeenAt: now,
      lastSeenAt: now,
      hitCount: 1,
    })
  }

  async getLandingPageVisitStats(): Promise<LandingPageVisitStats> {
    const visits = [...this.visitsByIpHash.values()]
    const uniqueVisitors = visits.length
    const totalVisits = visits.reduce((sum, visit) => sum + visit.hitCount, 0)
    return {
      uniqueVisitors,
      totalVisits,
      reloadCount: Math.max(0, totalVisits - uniqueVisitors),
    }
  }
}

export class PostgresLandingAnalyticsRepository implements LandingAnalyticsRepository {
  storageKind: 'postgres' = 'postgres'

  constructor(private readonly pool: Pool) {}

  async recordLandingPageVisit(input: LandingPageVisitInput) {
    const ipHash = input.ipHash.trim()
    if (!ipHash) {
      return
    }

    const landingPath = normalizeLandingPath(input.landingPath) ?? null

    await this.pool.query(
      `
        INSERT INTO landing_page_visits (
          visitor_key,
          ip_hash,
          user_agent_hash,
          first_landing_path,
          last_landing_path
        )
        VALUES ($1, $2, $3, $4, $4)
        ON CONFLICT (visitor_key)
        DO UPDATE SET
          user_agent_hash = COALESCE(landing_page_visits.user_agent_hash, EXCLUDED.user_agent_hash),
          last_landing_path = COALESCE(EXCLUDED.last_landing_path, landing_page_visits.last_landing_path),
          last_seen_at = NOW(),
          hit_count = landing_page_visits.hit_count + 1
      `,
      [`ip:${ipHash}`, ipHash, input.userAgentHash ?? null, landingPath],
    )
  }

  async getLandingPageVisitStats(): Promise<LandingPageVisitStats> {
    const result = await this.pool.query<{
      unique_visitors: number | string
      total_visits: number | string
    }>(
      `
        SELECT
          COUNT(*)::int AS unique_visitors,
          COALESCE(SUM(hit_count), 0)::int AS total_visits
        FROM landing_page_visits
      `,
    )
    const row = result.rows[0]
    const uniqueVisitors = Number(row?.unique_visitors ?? 0)
    const totalVisits = Number(row?.total_visits ?? 0)
    return {
      uniqueVisitors,
      totalVisits,
      reloadCount: Math.max(0, totalVisits - uniqueVisitors),
    }
  }
}
