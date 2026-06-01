import { describe, expect, it, vi } from 'vitest'
import { MemoryParticipantInfluenceSnapshotRepository } from '../repositories/participantInfluenceSnapshotRepository.js'
import { listOperationEvents } from './operationsMonitor.js'
import {
  bonusPercentFromNet,
  captureParticipantInfluenceSnapshotForFixture,
  computeNetInfluence,
} from './participantInfluenceSnapshot.js'

describe('computeNetInfluence', () => {
  it('sums buys when the name is the buyer', () => {
    const trades = [
      { unixTime: 1, buyer: 'alice', seller: 'bob', num: 5 },
      { unixTime: 2, buyer: 'alice', seller: 'carol', num: 3 },
    ]
    expect(computeNetInfluence(trades, 'alice')).toBe(8)
  })

  it('subtracts sells when the name is the seller', () => {
    const trades = [
      { unixTime: 1, buyer: 'alice', seller: 'bob', num: 10 },
      { unixTime: 2, buyer: 'carol', seller: 'alice', num: 4 },
    ]
    expect(computeNetInfluence(trades, 'alice')).toBe(6)
  })

  it('floors at 0 when sells exceed buys', () => {
    const trades = [
      { unixTime: 1, buyer: 'alice', seller: 'bob', num: 2 },
      { unixTime: 2, buyer: 'carol', seller: 'alice', num: 50 },
    ]
    expect(computeNetInfluence(trades, 'alice')).toBe(0)
  })

  it('ignores trades where the name is not party', () => {
    const trades = [{ unixTime: 1, buyer: 'bob', seller: 'carol', num: 100 }]
    expect(computeNetInfluence(trades, 'alice')).toBe(0)
  })
})

describe('bonusPercentFromNet', () => {
  it('returns 0 for less than 10 shares', () => {
    expect(bonusPercentFromNet(0)).toBe(0)
    expect(bonusPercentFromNet(9)).toBe(0)
  })

  it('returns 1% per 10 shares', () => {
    expect(bonusPercentFromNet(10)).toBe(1)
    expect(bonusPercentFromNet(55)).toBe(5)
    expect(bonusPercentFromNet(99)).toBe(9)
    expect(bonusPercentFromNet(100)).toBe(10)
  })

  it('caps at 10%', () => {
    expect(bonusPercentFromNet(500)).toBe(10)
    expect(bonusPercentFromNet(1_000_000)).toBe(10)
  })
})

describe('captureParticipantInfluenceSnapshotForFixture', () => {
  it('upserts one snapshot per work item with computed bonus', async () => {
    const repo = new MemoryParticipantInfluenceSnapshotRepository()
    repo.setWorkForFixture('fixture-1', [
      { participantId: 'p-1', soccerverseUsername: 'alice', cutoffUnix: 1000, kickoffUnix: 5000, playerId: 101 },
      { participantId: 'p-2', soccerverseUsername: 'bob', cutoffUnix: 1000, kickoffUnix: 5000, playerId: 101 },
    ])

    const fetchTrades = vi.fn(async (name: string, _playerId: number, _cutoff: number) => {
      if (name === 'alice') {
        return [{ unixTime: 2000, buyer: 'alice', seller: 'seller', num: 55 }]
      }
      return [{ unixTime: 2000, buyer: 'bob', seller: 'seller', num: 5 }]
    })

    const result = await captureParticipantInfluenceSnapshotForFixture('fixture-1', {
      snapshotRepository: repo,
      fetchTrades,
    })

    expect(result).toEqual({ captured: 2 })
    expect(await repo.getBonusPercent('p-1', 'fixture-1', 101)).toBe(5)
    expect(await repo.getBonusPercent('p-2', 'fixture-1', 101)).toBe(0)
  })

  it('returns captured=0 when there is no work for the fixture', async () => {
    const repo = new MemoryParticipantInfluenceSnapshotRepository()
    const fetchTrades = vi.fn()
    const result = await captureParticipantInfluenceSnapshotForFixture('fixture-empty', {
      snapshotRepository: repo,
      fetchTrades: fetchTrades as never,
    })
    expect(result).toEqual({ captured: 0 })
    expect(fetchTrades).not.toHaveBeenCalled()
  })

  it('excludes trades after kickoff (frozen-at-kickoff semantic)', async () => {
    const repo = new MemoryParticipantInfluenceSnapshotRepository()
    repo.setWorkForFixture('fixture-K', [
      { participantId: 'p-1', soccerverseUsername: 'alice', cutoffUnix: 1000, kickoffUnix: 5000, playerId: 101 },
    ])

    // Mock that honours the upper bound: returns only trades in [cutoff, kickoff].
    const fetchTrades = vi.fn(async (_name: string, _playerId: number, cutoff: number, tradesBefore?: number) => {
      const allTrades = [
        { unixTime: 4500, buyer: 'alice', seller: 'x', num: 30 },
        { unixTime: 6000, buyer: 'alice', seller: 'x', num: 70 }, // post-kickoff
      ]
      return allTrades.filter((trade) => trade.unixTime >= cutoff && (tradesBefore === undefined || trade.unixTime <= tradesBefore))
    })

    await captureParticipantInfluenceSnapshotForFixture('fixture-K', {
      snapshotRepository: repo,
      fetchTrades,
    })

    expect(fetchTrades).toHaveBeenCalledWith('alice', 101, 1000, 5000)
    // Only the 30-share pre-kickoff buy counts. 30 / 10 = 3% bonus.
    expect(await repo.getBonusPercent('p-1', 'fixture-K', 101)).toBe(3)
  })

  it('continues past a single failing fetch and counts the rest', async () => {
    const repo = new MemoryParticipantInfluenceSnapshotRepository()
    repo.setWorkForFixture('fixture-1', [
      { participantId: 'p-1', soccerverseUsername: 'alice', cutoffUnix: 1000, kickoffUnix: 5000, playerId: 101 },
      { participantId: 'p-2', soccerverseUsername: 'bob', cutoffUnix: 1000, kickoffUnix: 5000, playerId: 101 },
    ])

    const fetchTrades = vi.fn(async (name: string) => {
      if (name === 'alice') {
        throw new Error('network')
      }
      return [{ unixTime: 2000, buyer: 'bob', seller: 'seller', num: 20 }]
    })

    const result = await captureParticipantInfluenceSnapshotForFixture('fixture-1', {
      snapshotRepository: repo,
      fetchTrades,
    })

    expect(result).toEqual({ captured: 1 })
    expect(await repo.getBonusPercent('p-1', 'fixture-1', 101)).toBe(0)
    expect(await repo.getBonusPercent('p-2', 'fixture-1', 101)).toBe(2)
  })

  it('retries a transient fetch failure and captures on the second attempt', async () => {
    const repo = new MemoryParticipantInfluenceSnapshotRepository()
    repo.setWorkForFixture('fixture-R', [
      { participantId: 'p-1', soccerverseUsername: 'alice', cutoffUnix: 1000, kickoffUnix: 5000, playerId: 101 },
    ])

    let calls = 0
    const fetchTrades = vi.fn(async () => {
      calls += 1
      if (calls === 1) {
        throw new Error('transient')
      }
      return [{ unixTime: 2000, buyer: 'alice', seller: 'x', num: 20 }]
    })

    const result = await captureParticipantInfluenceSnapshotForFixture('fixture-R', {
      snapshotRepository: repo,
      fetchTrades,
    })

    expect(fetchTrades).toHaveBeenCalledTimes(2)
    expect(result).toEqual({ captured: 1 })
    expect(await repo.getBonusPercent('p-1', 'fixture-R', 101)).toBe(2)
  })

  it('records a warning operations event when an item fails after retries', async () => {
    const repo = new MemoryParticipantInfluenceSnapshotRepository()
    repo.setWorkForFixture('fixture-F', [
      { participantId: 'p-1', soccerverseUsername: 'alice', cutoffUnix: 1000, kickoffUnix: 5000, playerId: 101 },
    ])

    const fetchTrades = vi.fn(async () => {
      throw new Error('down')
    })

    await captureParticipantInfluenceSnapshotForFixture('fixture-F', {
      snapshotRepository: repo,
      fetchTrades,
    })

    expect(fetchTrades).toHaveBeenCalledTimes(2)
    const event = listOperationEvents().find(
      (candidate) => candidate.type === 'influence_snapshot' && candidate.detail.fixtureId === 'fixture-F',
    )
    expect(event?.status).toBe('warning')
    expect(event?.detail).toMatchObject({ captured: 0, failed: 1 })
  })

  it('skips a duplicate capture while one is already in progress for the same fixture', async () => {
    const repo = new MemoryParticipantInfluenceSnapshotRepository()
    repo.setWorkForFixture('fixture-D', [
      { participantId: 'p-1', soccerverseUsername: 'alice', cutoffUnix: 1000, kickoffUnix: 5000, playerId: 101 },
    ])

    const fetchTrades = vi.fn(async () => [{ unixTime: 2000, buyer: 'alice', seller: 'x', num: 20 }])

    // Start the first run but don't await it — it registers the fixture as in-progress synchronously
    // before its first await, so the second (awaited) call sees it and skips.
    const first = captureParticipantInfluenceSnapshotForFixture('fixture-D', { snapshotRepository: repo, fetchTrades })
    const second = await captureParticipantInfluenceSnapshotForFixture('fixture-D', { snapshotRepository: repo, fetchTrades })

    expect(second).toEqual({ captured: 0 })
    await expect(first).resolves.toEqual({ captured: 1 })
  })
})
