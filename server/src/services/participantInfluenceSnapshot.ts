import { fetchPlayerShareTrades, type ShareTradeEvent } from './soccerverse.js'
import { logger } from '../lib/logger.js'
import { recordOperationEvent } from './operationsMonitor.js'
import type { ParticipantInfluenceSnapshotRepository } from '../repositories/participantInfluenceSnapshotRepository.js'

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

export interface ParticipantInfluenceSnapshotDeps {
  snapshotRepository: ParticipantInfluenceSnapshotRepository
  fetchTrades?: typeof fetchPlayerShareTrades
}

// Yield to the event loop every N items so a large work list can't monopolise the loop between the
// (already I/O-bound) gate awaits. The real heavy lifting is paced by the Soccerverse gate; this is
// a cheap defensive yield, not the load fix.
const YIELD_EVERY = 25

// In-flight fixtures, so a duplicate capture (e.g. a re-promotion) doesn't pile a second ~100s run
// onto the shared Soccerverse gate while the first is still going.
const capturesInProgress = new Set<string>()

export async function captureParticipantInfluenceSnapshotForFixture(
  fixtureId: string,
  deps: ParticipantInfluenceSnapshotDeps,
): Promise<{ captured: number }> {
  if (capturesInProgress.has(fixtureId)) {
    logger.info({ fixtureId }, 'influence snapshot already in progress; skipping duplicate run')
    return { captured: 0 }
  }
  capturesInProgress.add(fixtureId)

  try {
    const work = await deps.snapshotRepository.listSnapshotWorkForFixture(fixtureId)
    if (work.length === 0) {
      return { captured: 0 }
    }

    const fetchTrades = deps.fetchTrades ?? fetchPlayerShareTrades
    const maxAttempts = 2
    let captured = 0
    let failed = 0

    for (const [index, item] of work.entries()) {
      let lastError: unknown
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          const trades = await fetchTrades(item.soccerverseUsername, item.playerId, item.cutoffUnix, item.kickoffUnix)
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
          lastError = undefined
          break
        } catch (error) {
          lastError = error
        }
      }
      if (lastError !== undefined) {
        failed += 1
        logger.warn(
          { participantId: item.participantId, fixtureId, playerId: item.playerId, err: lastError },
          'participant influence snapshot item failed after retries',
        )
      }
      if ((index + 1) % YIELD_EVERY === 0) {
        await new Promise<void>((resolve) => setImmediate(resolve))
      }
    }

    // Surface the run to the admin operations screen (lost on restart) alongside the durable log.
    recordOperationEvent({
      type: 'influence_snapshot',
      status: failed > 0 ? 'warning' : 'ok',
      message: `Influence snapshot for fixture ${fixtureId}: captured ${captured}, failed ${failed}.`,
      detail: { fixtureId, captured, failed, total: work.length },
    })

    return { captured }
  } finally {
    capturesInProgress.delete(fixtureId)
  }
}
