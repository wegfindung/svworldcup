import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ShareTradeEvent } from './soccerverse.js'
import {
  _resetParticipantBoostCacheForTests,
  computeParticipantBoostRows,
  draftedKeyOf,
  getParticipantBoost,
  summarizeShareTrades,
  type BoostDraftedPlayer,
} from './participantBoost.js'

const NAME = 'manager1'

function trade(buyer: string, seller: string, num: number): ShareTradeEvent {
  return { unixTime: 1000, buyer, seller, num }
}

function player(playerId: number): BoostDraftedPlayer {
  return { playerId, displayName: `Player ${playerId}`, teamCode: 'SWE', imageUrl: `img-${playerId}` }
}

beforeEach(() => {
  _resetParticipantBoostCacheForTests()
})

describe('summarizeShareTrades', () => {
  it('sums buys and sells separately and floors net at 0', () => {
    const trades = [trade(NAME, 'other', 30), trade(NAME, 'other', 25), trade('other', NAME, 40)]
    expect(summarizeShareTrades(trades, NAME)).toEqual({ bought: 55, sold: 40, net: 15 })
  })

  it('floors net at 0 when more was sold than bought', () => {
    const trades = [trade(NAME, 'other', 10), trade('other', NAME, 50)]
    expect(summarizeShareTrades(trades, NAME)).toEqual({ bought: 10, sold: 50, net: 0 })
  })

  it('ignores trades the participant is not party to', () => {
    expect(summarizeShareTrades([trade('a', 'b', 99)], NAME)).toEqual({ bought: 0, sold: 0, net: 0 })
  })
})

describe('computeParticipantBoostRows', () => {
  it('derives % from net: 1% per 10 net, capped at 10%', async () => {
    const fetchTrades = vi.fn(async (_name: string, playerId: number) => {
      if (playerId === 1) return [trade(NAME, 'other', 100)] // net 100 -> 10%
      if (playerId === 2) return [trade(NAME, 'other', 35)] // net 35 -> 3%
      if (playerId === 3) return [trade(NAME, 'other', 250)] // net 250 -> capped 10%
      return [] as ShareTradeEvent[]
    })

    const rows = await computeParticipantBoostRows(NAME, 0, [player(1), player(2), player(3), player(4)], { fetchTrades })

    expect(rows.map((row) => ({ id: row.playerId, net: row.net, pct: row.bonusPercent }))).toEqual([
      { id: 1, net: 100, pct: 10 },
      { id: 2, net: 35, pct: 3 },
      { id: 3, net: 250, pct: 10 },
      { id: 4, net: 0, pct: 0 },
    ])
    expect(fetchTrades).toHaveBeenCalledTimes(4)
  })

  it('passes the cutoff through to the trade fetch', async () => {
    const fetchTrades = vi.fn(async () => [] as ShareTradeEvent[])
    await computeParticipantBoostRows(NAME, 12345, [player(1)], { fetchTrades })
    expect(fetchTrades).toHaveBeenCalledWith(NAME, 1, 12345)
  })
})

describe('getParticipantBoost cache', () => {
  it('computes once then serves from cache for the same drafted set', async () => {
    const fetchTrades = vi.fn(async () => [trade('other', NAME, 20)])
    const players = [player(1), player(2)]

    const first = await getParticipantBoost('p1', NAME, 0, players, { deps: { fetchTrades } })
    const second = await getParticipantBoost('p1', NAME, 0, players, { deps: { fetchTrades } })

    expect(first.players).toHaveLength(2)
    expect(second.computedAt).toBe(first.computedAt)
    expect(fetchTrades).toHaveBeenCalledTimes(2) // 2 players, once — not re-fetched on the cache hit
  })

  it('recomputes when the drafted set changes', async () => {
    const fetchTrades = vi.fn(async () => [trade('other', NAME, 20)])

    await getParticipantBoost('p1', NAME, 0, [player(1)], { deps: { fetchTrades } })
    await getParticipantBoost('p1', NAME, 0, [player(1), player(2)], { deps: { fetchTrades } })

    expect(fetchTrades).toHaveBeenCalledTimes(3) // 1 + 2
  })

  it('refresh forces a recompute even within TTL', async () => {
    const fetchTrades = vi.fn(async () => [trade('other', NAME, 20)])

    await getParticipantBoost('p1', NAME, 0, [player(1)], { deps: { fetchTrades } })
    await getParticipantBoost('p1', NAME, 0, [player(1)], { refresh: true, deps: { fetchTrades } })

    expect(fetchTrades).toHaveBeenCalledTimes(2)
  })

  it('single-flights concurrent reads onto one compute', async () => {
    const fetchTrades = vi.fn(async () => [trade('other', NAME, 20)])
    const players = [player(1)]

    const [a, b] = await Promise.all([
      getParticipantBoost('p1', NAME, 0, players, { deps: { fetchTrades } }),
      getParticipantBoost('p1', NAME, 0, players, { deps: { fetchTrades } }),
    ])

    expect(a.computedAt).toBe(b.computedAt)
    expect(fetchTrades).toHaveBeenCalledTimes(1)
  })
})

describe('draftedKeyOf', () => {
  it('is order-independent', () => {
    expect(draftedKeyOf([player(3), player(1), player(2)])).toBe(draftedKeyOf([player(1), player(2), player(3)]))
  })
})
