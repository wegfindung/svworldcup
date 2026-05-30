import { env } from '../config/env.js'
import { logger } from '../lib/logger.js'
import { recordOperationEvent } from './operationsMonitor.js'
import { captureParticipantInfluenceSnapshotForFixture } from './participantInfluenceSnapshot.js'
import type { fetchPlayerShareTrades } from './soccerverse.js'
import type { ParticipantInfluenceSnapshotRepository } from '../repositories/participantInfluenceSnapshotRepository.js'
import type { SnapshotJobRepository } from '../repositories/snapshotJobRepository.js'

export interface SnapshotWorkerDeps {
  jobRepository: SnapshotJobRepository
  snapshotRepository: ParticipantInfluenceSnapshotRepository
  fetchTrades?: typeof fetchPlayerShareTrades
}

// A job is retried this many times — each attempt is a full fixture capture — before the worker gives
// up and marks it failed for admin visibility. The per-trade-fetch retry inside the capture is separate.
const MAX_JOB_ATTEMPTS = 3
const POLL_INTERVAL_MS = 15_000

let started = false
let draining = false

// Drain every currently-pending job, one fixture at a time, so concurrent promotions can't pile
// parallel ~100s captures onto the paced Soccerverse gate. Exported for tests and called on each tick;
// re-entrancy is guarded so a slow capture can't be overlapped by the next interval fire.
export async function drainSnapshotJobs(deps: SnapshotWorkerDeps): Promise<void> {
  if (draining) {
    return
  }
  draining = true
  try {
    for (;;) {
      const job = await deps.jobRepository.claimNext()
      if (!job) {
        break
      }
      try {
        await captureParticipantInfluenceSnapshotForFixture(job.fixtureId, {
          snapshotRepository: deps.snapshotRepository,
          fetchTrades: deps.fetchTrades,
        })
        await deps.jobRepository.complete(job.jobId)
      } catch (error) {
        const message = (error instanceof Error ? error.message : String(error)).slice(0, 1000)
        if (job.attempts >= MAX_JOB_ATTEMPTS) {
          await deps.jobRepository.giveUp(job.jobId, message)
          recordOperationEvent({
            type: 'influence_snapshot',
            status: 'error',
            message: `Snapshot job for fixture ${job.fixtureId} failed after ${job.attempts} attempts; giving up.`,
            detail: { fixtureId: job.fixtureId, attempts: job.attempts, error: message },
          })
          logger.error({ fixtureId: job.fixtureId, attempts: job.attempts, err: error }, 'snapshot job gave up')
        } else {
          await deps.jobRepository.release(job.jobId, message)
          logger.warn({ fixtureId: job.fixtureId, attempts: job.attempts, err: error }, 'snapshot job failed; will retry')
          // Stop this pass rather than re-claiming the just-released job back-to-back: the next poll
          // retries it, so the poll interval spaces out retries (and a flapping backend isn't hammered).
          break
        }
      }
    }
  } finally {
    draining = false
  }
}

// Start the background worker: recover crash-orphaned `running` jobs, then poll on an interval. No-op
// under test (tests drive drainSnapshotJobs directly). Mirrors startEmailMarketingScheduler — the
// timer is unref'd so it never keeps the process alive on its own.
export function startSnapshotWorker(deps: SnapshotWorkerDeps): void {
  if (started || env.NODE_ENV === 'test') {
    return
  }
  started = true

  void deps.jobRepository
    .requeueRunning()
    .then((count) => {
      if (count > 0) {
        logger.info({ requeued: count }, 'requeued orphaned snapshot jobs on startup')
      }
    })
    .catch((error) => {
      logger.error({ err: error }, 'failed to requeue orphaned snapshot jobs')
    })

  const tick = () => {
    void drainSnapshotJobs(deps).catch((error) => {
      logger.error({ err: error }, 'snapshot worker drain failed')
    })
  }
  tick()
  const timer = setInterval(tick, POLL_INTERVAL_MS)
  timer.unref()
}
