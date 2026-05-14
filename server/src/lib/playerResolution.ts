import type {
  MatchImportPlayerMapEntry,
  MatchImportSkipNameEntry,
  PlayerResolution,
  TeamPoolPlayer,
} from '../domain/types.js'
import { normalizeName } from './normalizeName.js'

export interface PlayerResolutionContext {
  mapEntries: MatchImportPlayerMapEntry[]
  skipNames: MatchImportSkipNameEntry[]
  teamPool: TeamPoolPlayer[]
}

// D9: resolve a screenshot source name to a world_cup_players id for the given team.
// Order: persisted mapping table -> reviewer skip list -> auto-match against the curated
// team pool. v1 confidence bar for auto-match is an exact normalized-name match; anything
// less certain is left explicitly unresolved for the review UI.
export function resolvePlayer(
  sourceName: string,
  teamCode: string,
  context: PlayerResolutionContext,
): PlayerResolution {
  const normalized = normalizeName(sourceName)
  if (!normalized) {
    return { status: 'unresolved', reason: 'Empty player name.' }
  }

  const mapped = context.mapEntries.find(
    (entry) => entry.teamCode === teamCode && entry.normalizedSourceName === normalized,
  )
  if (mapped) {
    return { status: 'resolved', playerId: mapped.playerId }
  }

  const isSkipped = context.skipNames.some(
    (entry) => entry.teamCode === teamCode && entry.normalizedSourceName === normalized,
  )
  if (isSkipped) {
    return { status: 'skipped' }
  }

  const poolMatches = context.teamPool.filter(
    (player) => normalizeName(player.displayName) === normalized,
  )
  if (poolMatches.length === 1) {
    return { status: 'resolved', playerId: poolMatches[0].playerId }
  }
  if (poolMatches.length > 1) {
    return { status: 'unresolved', reason: 'Name matches more than one player in the team pool.' }
  }

  return { status: 'unresolved', reason: 'No matching player in the team pool.' }
}
