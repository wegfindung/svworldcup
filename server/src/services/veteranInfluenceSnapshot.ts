import { fetchPlayerShareTrades, type ShareTradeEvent } from './soccerverse.js'
import type { VeteranInfluenceSnapshotRepository } from '../repositories/veteranInfluenceSnapshotRepository.js'

export function computeNetInfluence(trades: ShareTradeEvent[], name: string): number {
  let net = 0
  for (const trade of trades) {
    if (trade.buyer === name) net += trade.num
    if (trade.seller === name) net -= trade.num
  }
  return Math.max(0, net)
}

export function bonusPercentFromNet(netShares: number): number {
  return Math.min(10, Math.max(0, Math.floor(netShares / 10)))
}

export interface VeteranInfluenceSnapshotDeps {
  snapshotRepository: VeteranInfluenceSnapshotRepository
  fetchTrades?: typeof fetchPlayerShareTrades
}

export async function captureVeteranInfluenceSnapshotForFixture(
  fixtureId: string,
  deps: VeteranInfluenceSnapshotDeps,
): Promise<{ captured: number }> {
  const work = await deps.snapshotRepository.listSnapshotWorkForFixture(fixtureId)
  if (work.length === 0) {
    return { captured: 0 }
  }

  const fetchTrades = deps.fetchTrades ?? fetchPlayerShareTrades
  let captured = 0

  for (const item of work) {
    try {
      const trades = await fetchTrades(item.soccerverseUsername, item.playerId, item.cutoffUnix)
      const netShares = computeNetInfluence(trades, item.soccerverseUsername)
      const bonusPercent = bonusPercentFromNet(netShares)
      await deps.snapshotRepository.upsert({
        participantId: item.participantId,
        fixtureId,
        playerId: item.playerId,
        netShares,
        bonusPercent,
      })
      captured += 1
    } catch (error) {
      console.warn(
        `veteran influence snapshot failed participant=${item.participantId} fixture=${fixtureId} player=${item.playerId}: ${(error as Error).message}`,
      )
    }
  }

  return { captured }
}
