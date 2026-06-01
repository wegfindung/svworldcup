import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'

// Durable queue for the veteran influence-snapshot capture. A successful promotion enqueues one job
// per fixture; the in-process worker (services/snapshotWorker.ts) drains pending jobs one at a time.
export interface SnapshotJob {
  jobId: string
  fixtureId: string
  attempts: number
}

export interface SnapshotJobRepository {
  storageKind: 'memory' | 'postgres'
  // Enqueue a pending job for a fixture; a no-op when one is already outstanding (pending/running).
  enqueue(fixtureId: string): Promise<void>
  // Atomically claim the oldest pending job: mark it running, bump attempts, return it (or null).
  claimNext(): Promise<SnapshotJob | null>
  // Remove a finished job (success).
  complete(jobId: string): Promise<void>
  // Return a job to pending for a later retry, recording the error.
  release(jobId: string, error: string): Promise<void>
  // Give up on a job: mark it failed (kept for admin visibility), recording the error.
  giveUp(jobId: string, error: string): Promise<void>
  // Recover jobs a crash left `running` (single in-process worker) → pending. Returns the count.
  requeueRunning(): Promise<number>
}

interface MemoryJob {
  jobId: string
  fixtureId: string
  status: 'pending' | 'running' | 'failed'
  attempts: number
  lastError: string | null
  seq: number
}

export class MemorySnapshotJobRepository implements SnapshotJobRepository {
  storageKind: 'memory' = 'memory'
  private readonly jobs: MemoryJob[] = []
  // Monotonic insertion order — stand-in for created_at so claim order is deterministic without a clock.
  private nextSeq = 0

  async enqueue(fixtureId: string): Promise<void> {
    const outstanding = this.jobs.some(
      (job) => job.fixtureId === fixtureId && (job.status === 'pending' || job.status === 'running'),
    )
    if (outstanding) {
      return
    }
    this.jobs.push({
      jobId: randomUUID(),
      fixtureId,
      status: 'pending',
      attempts: 0,
      lastError: null,
      seq: this.nextSeq++,
    })
  }

  async claimNext(): Promise<SnapshotJob | null> {
    const job = this.jobs
      .filter((candidate) => candidate.status === 'pending')
      .sort((left, right) => left.seq - right.seq)[0]
    if (!job) {
      return null
    }
    job.status = 'running'
    job.attempts += 1
    return { jobId: job.jobId, fixtureId: job.fixtureId, attempts: job.attempts }
  }

  async complete(jobId: string): Promise<void> {
    const index = this.jobs.findIndex((job) => job.jobId === jobId)
    if (index >= 0) {
      this.jobs.splice(index, 1)
    }
  }

  async release(jobId: string, error: string): Promise<void> {
    const job = this.jobs.find((candidate) => candidate.jobId === jobId)
    if (job) {
      job.status = 'pending'
      job.lastError = error
    }
  }

  async giveUp(jobId: string, error: string): Promise<void> {
    const job = this.jobs.find((candidate) => candidate.jobId === jobId)
    if (job) {
      job.status = 'failed'
      job.lastError = error
    }
  }

  async requeueRunning(): Promise<number> {
    let count = 0
    for (const job of this.jobs) {
      if (job.status === 'running') {
        job.status = 'pending'
        count += 1
      }
    }
    return count
  }
}

export class PostgresSnapshotJobRepository implements SnapshotJobRepository {
  storageKind: 'postgres' = 'postgres'

  constructor(private readonly pool: Pool) {}

  async enqueue(fixtureId: string): Promise<void> {
    // The partial unique index (status IN pending/running) turns a second outstanding job into a
    // conflict → DO NOTHING. A failed job does not block a fresh enqueue (not covered by the index).
    await this.pool.query(
      `INSERT INTO participant_influence_snapshot_jobs (fixture_id) VALUES ($1) ON CONFLICT DO NOTHING`,
      [fixtureId],
    )
  }

  async claimNext(): Promise<SnapshotJob | null> {
    // FOR UPDATE SKIP LOCKED makes the claim safe even if more than one drainer ever runs: each picks
    // a different pending row instead of blocking.
    const result = await this.pool.query<{ job_id: string; fixture_id: string; attempts: number }>(
      `
        UPDATE participant_influence_snapshot_jobs
        SET status = 'running', attempts = attempts + 1, updated_at = NOW()
        WHERE job_id = (
          SELECT job_id FROM participant_influence_snapshot_jobs
          WHERE status = 'pending'
          ORDER BY created_at
          FOR UPDATE SKIP LOCKED
          LIMIT 1
        )
        RETURNING job_id, fixture_id, attempts
      `,
    )
    const row = result.rows[0]
    return row ? { jobId: row.job_id, fixtureId: row.fixture_id, attempts: row.attempts } : null
  }

  async complete(jobId: string): Promise<void> {
    await this.pool.query(`DELETE FROM participant_influence_snapshot_jobs WHERE job_id = $1`, [jobId])
  }

  async release(jobId: string, error: string): Promise<void> {
    await this.pool.query(
      `UPDATE participant_influence_snapshot_jobs SET status = 'pending', last_error = $2, updated_at = NOW() WHERE job_id = $1`,
      [jobId, error],
    )
  }

  async giveUp(jobId: string, error: string): Promise<void> {
    await this.pool.query(
      `UPDATE participant_influence_snapshot_jobs SET status = 'failed', last_error = $2, updated_at = NOW() WHERE job_id = $1`,
      [jobId, error],
    )
  }

  async requeueRunning(): Promise<number> {
    const result = await this.pool.query(
      `UPDATE participant_influence_snapshot_jobs SET status = 'pending', updated_at = NOW() WHERE status = 'running'`,
    )
    return result.rowCount ?? 0
  }
}
