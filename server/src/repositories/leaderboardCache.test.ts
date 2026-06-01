import { describe, expect, it } from 'vitest'
import { LeaderboardCache, type CacheableRow } from './leaderboardCache.js'

// Minimal stand-in rows — the cache treats the payload as opaque, so the shape only needs to satisfy
// the type. Only the participantId is asserted on.
function rows(...ids: string[]): CacheableRow[] {
  return ids.map(
    (participantId) =>
      ({
        participantId,
        displayName: participantId,
        leagueType: 'rookie',
        primaryTeamCode: 'BRA',
        baseScore: 0,
        bonusPercent: 0,
        scoreMultiplier: 1,
        totalScore: 0,
        breakdown: {
          goals: { count: 0, points: 0 },
          assists: { count: 0, points: 0 },
          appearances: { count: 0, points: 0 },
          minutes: { count: 0, points: 0 },
          cleanSheets: { count: 0, points: 0 },
          performance: { points: 0 },
        },
        fixtures: [],
        registeredAt: '2026-01-01T00:00:00.000Z',
      }) as CacheableRow,
  )
}

describe('LeaderboardCache', () => {
  it('computes once then serves from cache within the TTL', async () => {
    let calls = 0
    const cache = new LeaderboardCache(10_000, () => 1_000)
    const compute = async () => {
      calls += 1
      return rows('a')
    }

    const first = await cache.getRows(compute)
    const second = await cache.getRows(compute)

    expect(calls).toBe(1)
    expect(second).toBe(first)
  })

  it('recomputes after the TTL expires', async () => {
    let calls = 0
    let now = 1_000
    const cache = new LeaderboardCache(10_000, () => now)
    const compute = async () => {
      calls += 1
      return rows(`call-${calls}`)
    }

    await cache.getRows(compute)
    now = 1_000 + 10_001
    const second = await cache.getRows(compute)

    expect(calls).toBe(2)
    expect(second[0].participantId).toBe('call-2')
  })

  it('dedupes concurrent misses into a single in-flight compute', async () => {
    let calls = 0
    const cache = new LeaderboardCache(10_000, () => 1_000)
    let resolve!: (value: CacheableRow[]) => void
    const compute = () => {
      calls += 1
      return new Promise<CacheableRow[]>((res) => {
        resolve = res
      })
    }

    const a = cache.getRows(compute)
    const b = cache.getRows(compute)
    resolve(rows('shared'))
    const [resultA, resultB] = await Promise.all([a, b])

    expect(calls).toBe(1)
    expect(resultA).toBe(resultB)
  })

  it('invalidate() forces the next read to recompute', async () => {
    let calls = 0
    const cache = new LeaderboardCache(10_000, () => 1_000)
    const compute = async () => {
      calls += 1
      return rows(`call-${calls}`)
    }

    await cache.getRows(compute)
    cache.invalidate()
    const second = await cache.getRows(compute)

    expect(calls).toBe(2)
    expect(second[0].participantId).toBe('call-2')
  })

  it('does not cache a compute that was invalidated while in flight (snapshot ordering trap)', async () => {
    let calls = 0
    const cache = new LeaderboardCache(10_000, () => 1_000)
    let resolveFirst!: (value: CacheableRow[]) => void
    const firstCompute = () => {
      calls += 1
      return new Promise<CacheableRow[]>((res) => {
        resolveFirst = res
      })
    }

    // Start the stale compute, invalidate mid-flight (the late snapshot landing), then let it resolve.
    const inFlight = cache.getRows(firstCompute)
    cache.invalidate()
    resolveFirst(rows('stale'))
    await inFlight

    // The next read must recompute rather than serve the stale (pre-invalidation) result.
    const fresh = await cache.getRows(async () => {
      calls += 1
      return rows('fresh')
    })

    expect(calls).toBe(2)
    expect(fresh[0].participantId).toBe('fresh')
  })
})
