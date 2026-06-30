// Ranking helpers for the landing-page "Tournament leaders" card. They mirror the Stats › Leaders board
// exactly (same filters + tiebreaks) so the landing digest agrees with the full tables, and add a
// "points" board ranked by squad-independent base points and a "boosted" board off the boost leaderboard.
import type { BoostLeaderboardRow, PlayerPointsPlayer } from './types'
import { earnsCleanSheetPosition } from './playerStats'

// Metrics sourced from the /player-points payload. "boosted" is handled separately (different payload).
export type PointsLeaderMetric = 'goals' | 'assists' | 'cleanSheets' | 'points' | 'average'

export function pointsMetricValue(player: PlayerPointsPlayer, metric: PointsLeaderMetric): number {
  switch (metric) {
    case 'goals':
      return player.goals
    case 'assists':
      return player.assists
    case 'cleanSheets':
      return player.cleanSheets
    case 'points':
      return player.basePoints
    case 'average':
      return player.averageRating
  }
}

// Who belongs on a board: positive on the metric, and — for clean sheets — only a position that can earn
// clean-sheet points (GK/DEF or a defensive-midfield MID), matching LeadersPanel.
function qualifies(player: PlayerPointsPlayer, metric: PointsLeaderMetric): boolean {
  if (metric === 'average') return player.averageRating > 0
  if (metric === 'cleanSheets') {
    return player.cleanSheets > 0 && earnsCleanSheetPosition(player.positionClasses, player.positions)
  }
  return pointsMetricValue(player, metric) > 0
}

// Top-N players for a /player-points metric. Tiebreak by base points then name, like the Leaders board.
export function topPointsLeaders(
  players: PlayerPointsPlayer[],
  metric: PointsLeaderMetric,
  limit: number,
): PlayerPointsPlayer[] {
  return players
    .filter((player) => qualifies(player, metric))
    .sort(
      (left, right) =>
        pointsMetricValue(right, metric) - pointsMetricValue(left, metric) ||
        right.basePoints - left.basePoints ||
        left.displayName.localeCompare(right.displayName),
    )
    .slice(0, limit)
}

// Top-N most-boosted players (total net influence shares), mirroring the Boosts board's rank key.
export function topBoostLeaders(rows: BoostLeaderboardRow[], limit: number): BoostLeaderboardRow[] {
  return rows
    .filter((row) => row.totalNetShares > 0)
    .sort((left, right) => right.totalNetShares - left.totalNetShares || left.displayName.localeCompare(right.displayName))
    .slice(0, limit)
}
