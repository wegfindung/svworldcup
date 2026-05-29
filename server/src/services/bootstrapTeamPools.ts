import { initialTeamSelections } from '../data/initialTeamSelections.js'
import { getSoccerverseCountryId } from '../data/teamCountryMap.js'
import type { SoccerversePlayerRecord } from '../domain/types.js'
import {
  findSuspiciousTeamPoolCountryMismatch,
  formatSuspiciousTeamPoolCountryMismatch,
} from '../lib/teamPoolCountryGuard.js'
import type { TeamPoolRepository } from '../repositories/teamPoolRepository.js'
import { fetchPlayersByIds } from './soccerverse.js'

function orderPlayersBySelection(playerIds: number[], players: SoccerversePlayerRecord[]) {
  const byPlayerId = new Map(players.map((player) => [player.playerId, player]))
  return playerIds.map((playerId) => byPlayerId.get(playerId)).filter((player): player is SoccerversePlayerRecord => Boolean(player))
}

export async function bootstrapInitialTeamPools(teamPoolRepository: TeamPoolRepository) {
  for (const [teamCode, playerIds] of Object.entries(initialTeamSelections)) {
    const countryId = getSoccerverseCountryId(teamCode)
    if (!countryId || playerIds.length === 0) {
      continue
    }

    const countryMatchedPlayers = await fetchPlayersByIds(playerIds, countryId)
    const countryMatchedIds = new Set(countryMatchedPlayers.map((player) => player.playerId))
    const missingPlayerIds = playerIds.filter((playerId) => !countryMatchedIds.has(playerId))
    const fallbackPlayers = missingPlayerIds.length > 0 ? await fetchPlayersByIds(missingPlayerIds) : []
    const players = orderPlayersBySelection(playerIds, [...countryMatchedPlayers, ...fallbackPlayers])
    if (players.length === 0) {
      continue
    }

    const countryMismatch = findSuspiciousTeamPoolCountryMismatch(teamCode, players)
    if (countryMismatch) {
      console.warn(formatSuspiciousTeamPoolCountryMismatch(teamCode, countryMismatch))
      continue
    }

    await teamPoolRepository.replaceTeamPlayers(teamCode, players)
  }
}
