// Display seed for the reusable PlayerStatsModal. Both PlayerPointsPlayer and PublicSquadUsagePlayer carry
// these fields, so one helper seeds the modal from either Stats list. Kept out of the modal component file
// so that module only exports a component (react-refresh lint rule).
export interface PlayerStatsSeed {
  playerId: number
  displayName: string
  teamCode: string
  imageUrl?: string
  rating?: number
  capCost?: number
  positions?: string[]
  positionMain?: string
}

type SeedSource = {
  playerId: number
  displayName: string
  teamCode: string
  imageUrl?: string
  rating: number
  capCost: number
  positions: string[]
  positionMain?: string
}

export function toPlayerSeed(player: SeedSource): PlayerStatsSeed {
  return {
    playerId: player.playerId,
    displayName: player.displayName,
    teamCode: player.teamCode,
    imageUrl: player.imageUrl,
    rating: player.rating,
    capCost: player.capCost,
    positions: player.positions,
    positionMain: player.positionMain,
  }
}
