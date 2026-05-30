import type { ParticipantScoreRow } from '../domain/types.js'

// The cached unit is the full, unranked per-participant row set (the output of calculateRows). All
// three public boards (rookie/veteran/nations) derive from this one payload — "compute once per
// payload". The board is a pure function of stored rows, so write-triggered invalidation is the
// correctness mechanism; the TTL is only a backstop. See SOP_scoring_and_leagues.md
// "Leaderboard Read Cache".
export type CacheableRow = Omit<ParticipantScoreRow, 'rank'> & { registeredAt: string }

// Backstop only — write-invalidation is the primary correctness mechanism. Kept short so a missed
// trigger self-heals within seconds. See SOP_scoring_and_leagues.md "Leaderboard Read Cache".
const DEFAULT_TTL_MS = 10_000

export class LeaderboardCache {
  private entry: { rows: CacheableRow[]; expiresAt: number } | null = null
  private inFlight: Promise<CacheableRow[]> | null = null
  private generation = 0

  constructor(
    private readonly ttlMs: number = DEFAULT_TTL_MS,
    private readonly now: () => number = () => Date.now(),
  ) {}

  // Read-through with single-flight dedup: concurrent misses share one compute. A compute captures
  // the generation up front and only caches if no invalidate() bumped it meanwhile — this is the
  // snapshot-ordering-trap guard (an invalidate during compute discards that compute's result, so a
  // board computed before a late snapshot landed never gets cached).
  async getRows(compute: () => Promise<CacheableRow[]>): Promise<CacheableRow[]> {
    if (this.entry && this.entry.expiresAt > this.now()) {
      return this.entry.rows
    }
    if (this.inFlight) {
      return this.inFlight
    }

    const generation = this.generation
    this.inFlight = compute()
      .then((rows) => {
        if (this.generation === generation) {
          this.entry = { rows, expiresAt: this.now() + this.ttlMs }
        }
        return rows
      })
      .finally(() => {
        this.inFlight = null
      })
    return this.inFlight
  }

  invalidate() {
    this.entry = null
    this.generation += 1
  }
}
