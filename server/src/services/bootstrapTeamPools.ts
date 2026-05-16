import { initialTeamSelections } from '../data/initialTeamSelections.js'
import { getSoccerverseCountryId } from '../data/teamCountryMap.js'
import type { TeamPoolRepository } from '../repositories/teamPoolRepository.js'
import { fetchPlayersByIds } from './soccerverse.js'

export async function bootstrapInitialTeamPools(teamPoolRepository: TeamPoolRepository) {
  for (const [teamCode, playerIds] of Object.entries(initialTeamSelections)) {
    const countryId = getSoccerverseCountryId(teamCode)
    if (!countryId || playerIds.length === 0) {
      continue
    }

    const players = await fetchPlayersByIds(playerIds, countryId)
    if (players.length === 0) {
      continue
    }

    await teamPoolRepository.replaceTeamPlayers(teamCode, players)
  }
}
