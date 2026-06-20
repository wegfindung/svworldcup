import type { PlayerPointsPayload, PlayerPointsPlayer } from './types'

// The Results › Group-standings nation modal: that nation's players who have scored points so far,
// derived purely from the cached /player-points payload (no server/DB). See
// SOP_scoring_and_leagues.md "Nation player pool".

export type NationPoolSortKey =
  | 'points'
  | 'goals'
  | 'assists'
  | 'appearances'
  | 'minutes'
  | 'cleanSheets'
  | 'rating'
  | 'name'

export type SortDir = 'asc' | 'desc'

// Players from one nation who featured and accumulated at least one point (basePoints > 0).
export function nationPoolPlayers(payload: PlayerPointsPayload | null, teamCode: string): PlayerPointsPlayer[] {
  if (!payload) {
    return []
  }
  return payload.items.filter((player) => player.teamCode === teamCode && player.basePoints > 0)
}

const numericValue: Record<Exclude<NationPoolSortKey, 'name'>, (player: PlayerPointsPlayer) => number> = {
  points: (player) => player.basePoints,
  goals: (player) => player.goals,
  assists: (player) => player.assists,
  appearances: (player) => player.appearances,
  minutes: (player) => player.minutes,
  cleanSheets: (player) => player.cleanSheets,
  rating: (player) => player.averageRating,
}

// Sort by the chosen key/direction, always falling back to points desc then name so the order is
// stable and a tie never looks arbitrary.
export function sortNationPoolPlayers(
  players: PlayerPointsPlayer[],
  key: NationPoolSortKey,
  dir: SortDir,
): PlayerPointsPlayer[] {
  return [...players].sort((left, right) => {
    let primary: number
    if (key === 'name') {
      primary = left.displayName.localeCompare(right.displayName)
    } else {
      primary = numericValue[key](left) - numericValue[key](right)
    }
    if (dir === 'desc') {
      primary = -primary
    }
    return primary || right.basePoints - left.basePoints || left.displayName.localeCompare(right.displayName)
  })
}
