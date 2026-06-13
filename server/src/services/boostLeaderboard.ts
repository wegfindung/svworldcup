import type {
  BoostLeaderboardManager,
  BoostLeaderboardPayload,
  BoostLeaderboardRow,
  ParticipantInfluenceSnapshotRecord,
  TeamPoolPlayer,
} from '../domain/types.js'

// A competitor's boost maxes at +10%, which bonusPercentFromNet reaches at 100 net shares (floor(net/10),
// capped at 10). Shares beyond 100 buy no more boost — they're held for other (trading) reasons — so we cap
// each competitor's contribution here. Without this a single 80k-share holder would dwarf the board for a
// player who is, for boost purposes, only +10% to them. Keep in sync with bonusPercentFromNet.
const BOOST_SHARE_CAP = 100

// The public Stats › Boosts board: which players the field has spent the most ownership boost on, summed
// across every competitor. Built from the frozen per-fixture influence snapshots — the only persisted
// per-player boost (a live combined figure would be one Soccerverse call per competitor × drafted player).
// See SOP_scoring_and_leagues "Stats — Boost Leaderboard".
//
// A snapshot is per (participant, fixture, player); a player accrues one per fixture their team played. We
// take the LATEST snapshot per (participant, player) as that competitor's current standing, then sum across
// competitors. Anonymous: the payload carries per-player totals only, never a participant id.
export function buildBoostLeaderboard(
  snapshots: ParticipantInfluenceSnapshotRecord[],
  playersById: Map<number, TeamPoolPlayer>,
  // Revealed competitors only (participantId → badge). A booster not in this map is counted in managerCount
  // but never named — naming a non-revealed competitor would leak one of their hidden squad picks.
  revealedManagers: Map<string, BoostLeaderboardManager> = new Map(),
): BoostLeaderboardPayload {
  // Latest snapshot per (participant, player) — most recent capture is the competitor's current boost.
  const latest = new Map<string, ParticipantInfluenceSnapshotRecord>()
  for (const snapshot of snapshots) {
    const key = `${snapshot.participantId}|${snapshot.playerId}`
    const existing = latest.get(key)
    if (!existing || snapshot.snapshotAt > existing.snapshotAt) {
      latest.set(key, snapshot)
    }
  }

  interface Aggregate {
    totalNetShares: number
    combinedBonusPercent: number
    // One entry per boosting competitor for this player (latest-per-pair guarantees distinct participants).
    boosters: Array<{ participantId: string; shares: number }>
  }
  const byPlayer = new Map<number, Aggregate>()
  const boostingCompetitors = new Set<string>()
  for (const snapshot of latest.values()) {
    // Only an actual boost counts — a drafted-but-unboosted player has a zero snapshot.
    if (snapshot.netShares <= 0) {
      continue
    }
    boostingCompetitors.add(snapshot.participantId)
    const shares = Math.min(snapshot.netShares, BOOST_SHARE_CAP)
    const aggregate = byPlayer.get(snapshot.playerId) ?? { totalNetShares: 0, combinedBonusPercent: 0, boosters: [] }
    // Only the boost-contributing shares count toward "boost spent" — capped at the +10% max.
    aggregate.totalNetShares += shares
    aggregate.combinedBonusPercent += snapshot.bonusPercent
    aggregate.boosters.push({ participantId: snapshot.participantId, shares })
    byPlayer.set(snapshot.playerId, aggregate)
  }

  let totalNetShares = 0
  const items: BoostLeaderboardRow[] = []
  for (const [playerId, aggregate] of byPlayer) {
    const player = playersById.get(playerId)
    if (!player) {
      // A boosted player no longer in any current pool can't be displayed — skip it.
      continue
    }
    totalNetShares += aggregate.totalNetShares
    // Name only the revealed boosters, biggest boost first; the rest stay anonymous in the count.
    const managers: BoostLeaderboardManager[] = aggregate.boosters
      .filter((booster) => revealedManagers.has(booster.participantId))
      .sort((left, right) => right.shares - left.shares)
      .map((booster) => revealedManagers.get(booster.participantId)!)
    items.push({
      playerId: player.playerId,
      displayName: player.displayName,
      teamCode: player.teamCode,
      nationalityCode: player.nationalityCode,
      imageUrl: player.imageUrl,
      rating: player.rating,
      capCost: player.capCost,
      positionMain: player.positionMain,
      positions: player.positions,
      positionClasses: player.positionClasses,
      totalNetShares: aggregate.totalNetShares,
      managerCount: aggregate.boosters.length,
      combinedBonusPercent: aggregate.combinedBonusPercent,
      managers,
    })
  }

  items.sort(
    (left, right) =>
      right.totalNetShares - left.totalNetShares ||
      right.managerCount - left.managerCount ||
      left.displayName.localeCompare(right.displayName),
  )

  return {
    summary: { playersBoosted: items.length, competitorsBoosting: boostingCompetitors.size, totalNetShares },
    items,
  }
}
