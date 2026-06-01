import { describe, expect, it, vi } from 'vitest'
import { MemoryParticipantInfluenceSnapshotRepository } from '../repositories/participantInfluenceSnapshotRepository.js'
import { MemorySnapshotJobRepository } from '../repositories/snapshotJobRepository.js'
import type { ParticipantInfluenceSnapshotRepository } from '../repositories/participantInfluenceSnapshotRepository.js'
import { listOperationEvents } from './operationsMonitor.js'
import { drainSnapshotJobs } from './snapshotWorker.js'

describe('MemorySnapshotJobRepository', () => {
  it('enqueue is a no-op while a job for the fixture is still outstanding', async () => {
    const jobs = new MemorySnapshotJobRepository()
    await jobs.enqueue('fx-dup')
    await jobs.enqueue('fx-dup')

    const first = await jobs.claimNext()
    const second = await jobs.claimNext()

    expect(first?.fixtureId).toBe('fx-dup')
    expect(second).toBeNull()
  })

  it('a fresh enqueue is allowed once the prior job is completed', async () => {
    const jobs = new MemorySnapshotJobRepository()
    await jobs.enqueue('fx-redo')
    const claimed = await jobs.claimNext()
    await jobs.complete(claimed!.jobId)

    await jobs.enqueue('fx-redo')
    expect((await jobs.claimNext())?.fixtureId).toBe('fx-redo')
  })

  it('requeueRunning recovers jobs a crash left running', async () => {
    const jobs = new MemorySnapshotJobRepository()
    await jobs.enqueue('fx-orphan')
    await jobs.claimNext() // now running, not claimable again

    expect(await jobs.claimNext()).toBeNull()
    const requeued = await jobs.requeueRunning()
    expect(requeued).toBe(1)
    expect((await jobs.claimNext())?.fixtureId).toBe('fx-orphan')
  })
})

describe('drainSnapshotJobs', () => {
  it('runs the capture for an enqueued fixture and removes the finished job', async () => {
    const jobs = new MemorySnapshotJobRepository()
    const snapshots = new MemoryParticipantInfluenceSnapshotRepository()
    snapshots.setWorkForFixture('fx-ok', [
      { participantId: 'p-1', soccerverseUsername: 'alice', cutoffUnix: 1000, kickoffUnix: 5000, playerId: 101 },
    ])
    const fetchTrades = vi.fn(async () => [{ unixTime: 2000, buyer: 'alice', seller: 'x', num: 20 }])
    await jobs.enqueue('fx-ok')

    await drainSnapshotJobs({ jobRepository: jobs, snapshotRepository: snapshots, fetchTrades })

    // net = 20 → floor(20/10) = 2% bonus, written by the capture.
    expect(await snapshots.getBonusPercent('p-1', 'fx-ok', 101)).toBe(2)
    // The job was completed (drained), so nothing is left to claim.
    expect(await jobs.claimNext()).toBeNull()
  })

  it('retries a failing job across passes, then gives up and records an error event', async () => {
    const jobs = new MemorySnapshotJobRepository()
    // listSnapshotWorkForFixture throwing makes the whole capture reject → the worker's job-level catch.
    const failing = {
      storageKind: 'memory',
      upsert: vi.fn(),
      getBonusPercent: vi.fn(),
      listAll: vi.fn(),
      listSnapshotWorkForFixture: vi.fn(async () => {
        throw new Error('db down')
      }),
    } as unknown as ParticipantInfluenceSnapshotRepository

    await jobs.enqueue('fx-fail')

    // A retryable failure breaks the pass, so each drain is one attempt. MAX_JOB_ATTEMPTS = 3.
    await drainSnapshotJobs({ jobRepository: jobs, snapshotRepository: failing }) // attempt 1 → released
    await drainSnapshotJobs({ jobRepository: jobs, snapshotRepository: failing }) // attempt 2 → released
    await drainSnapshotJobs({ jobRepository: jobs, snapshotRepository: failing }) // attempt 3 → gave up

    // Failed (not pending) → nothing left to claim.
    expect(await jobs.claimNext()).toBeNull()
    const gaveUp = listOperationEvents().find(
      (event) => event.type === 'influence_snapshot' && event.status === 'error' && event.detail.fixtureId === 'fx-fail',
    )
    expect(gaveUp).toBeDefined()
    expect(gaveUp?.detail.attempts).toBe(3)
  })
})
