import { getSoccerverseCountryId } from '../data/teamCountryMap.js'
import type { SoccerversePlayerRecord } from '../domain/types.js'

const suspiciousMismatchMinPlayers = 8
const suspiciousMismatchRatio = 0.8

export interface SuspiciousTeamPoolCountryMismatch {
  expectedCountryId: string
  mismatchCount: number
  playerCount: number
  sample: Array<{
    playerId: number
    displayName: string
    nationalityCode: string
  }>
}

export function findSuspiciousTeamPoolCountryMismatch(
  teamCode: string,
  players: SoccerversePlayerRecord[],
): SuspiciousTeamPoolCountryMismatch | null {
  const expectedCountryId = getSoccerverseCountryId(teamCode)
  if (!expectedCountryId || players.length === 0) {
    return null
  }

  const mismatches = players.filter(
    (player) => String(player.nationalityCode ?? '').trim().toUpperCase() !== expectedCountryId,
  )

  if (
    mismatches.length < suspiciousMismatchMinPlayers ||
    mismatches.length / players.length < suspiciousMismatchRatio
  ) {
    return null
  }

  return {
    expectedCountryId,
    mismatchCount: mismatches.length,
    playerCount: players.length,
    sample: mismatches.slice(0, 5).map((player) => ({
      playerId: player.playerId,
      displayName: player.displayName,
      nationalityCode: String(player.nationalityCode ?? '').trim().toUpperCase(),
    })),
  }
}

export function formatSuspiciousTeamPoolCountryMismatch(teamCode: string, mismatch: SuspiciousTeamPoolCountryMismatch) {
  const sample = mismatch.sample
    .map((player) => `${player.displayName} (${player.nationalityCode || 'unknown'})`)
    .join(', ')
  return `Refusing to save ${teamCode}: ${mismatch.mismatchCount}/${mismatch.playerCount} players do not match expected Soccerverse country ${mismatch.expectedCountryId}. Sample: ${sample}.`
}
