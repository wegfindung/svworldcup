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
  // Each pool player's CURRENT community-pack name (full real names), fetched in-memory at
  // import time. Optional enrichment: stored display names are snapshots of the pack at
  // curation time and older pack versions were abbreviated ("C. Montes"), so the live pack
  // name often matches provider data better. Absent (pack unreachable) -> stored names only.
  packNamesByPlayerId?: Map<number, string>
}

// Stored pool names are frequently abbreviated ("C. Montes") or extended ("Luis Chávez
// Magallón", "Julián Quiñones Quiñones", "César Montes Castro") relative to the names
// provider data carries ("César Montes", "Luis Chávez") — the Soccerverse API returns no
// name at all, so names come from the community datapack, whose forms shift over time.
// These two checks bridge the remaining form gaps conservatively; see
// SOP_match_data_import.md "Player-ID Resolution".

// "c montes" fits "cesar montes": a single-letter lead token matching the other name's
// first initial, plus identical trailing surname tokens ("j dos santos" / "jonathan dos
// santos" works the same way).
function isInitialSurnameMatch(abbreviated: string[], full: string[]): boolean {
  if (abbreviated.length < 2 || abbreviated[0].length !== 1) {
    return false
  }
  if (full.length < 2 || abbreviated[0] !== full[0][0]) {
    return false
  }
  const surname = abbreviated.slice(1)
  if (surname.length > full.length - 1) {
    return false
  }
  const tail = full.slice(-surname.length)
  return surname.every((token, index) => token === tail[index])
}

// "luis chavez" fits "luis chavez magallon": one token list is a strict prefix of the
// other. A single token is too weak to match on.
function isExtendedFormMatch(left: string[], right: string[]): boolean {
  const [short, long] = left.length <= right.length ? [left, right] : [right, left]
  if (short.length === long.length || short.length < 2) {
    return false
  }
  return short.every((token, index) => token === long[index])
}

// D9: resolve a source name to a world_cup_players id for the given team.
// Order: persisted mapping table -> reviewer skip list -> auto-match against the curated
// team pool. Auto-match is two-tier: an exact normalized-name match first, then the
// conservative name-form match above. Either tier resolves only on exactly ONE candidate;
// anything ambiguous is left explicitly unresolved for the review UI.
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

  // Candidate names per pool player: the stored display name plus the current pack name.
  const candidateNames = (player: TeamPoolPlayer): string[] => {
    const names = [normalizeName(player.displayName)]
    const packName = context.packNamesByPlayerId?.get(player.playerId)
    if (packName) {
      const normalizedPackName = normalizeName(packName)
      if (normalizedPackName && normalizedPackName !== names[0]) {
        names.push(normalizedPackName)
      }
    }
    return names
  }

  const poolMatches = context.teamPool.filter((player) =>
    candidateNames(player).some((name) => name === normalized),
  )
  if (poolMatches.length === 1) {
    return { status: 'resolved', playerId: poolMatches[0].playerId }
  }
  if (poolMatches.length > 1) {
    return { status: 'unresolved', reason: 'Name matches more than one player in the team pool.' }
  }

  const sourceTokens = normalized.split(' ')
  const formMatches = context.teamPool.filter((player) =>
    candidateNames(player).some((name) => {
      const poolTokens = name.split(' ')
      return (
        isInitialSurnameMatch(poolTokens, sourceTokens) ||
        isInitialSurnameMatch(sourceTokens, poolTokens) ||
        isExtendedFormMatch(sourceTokens, poolTokens)
      )
    }),
  )
  if (formMatches.length === 1) {
    return { status: 'resolved', playerId: formMatches[0].playerId }
  }
  if (formMatches.length > 1) {
    return { status: 'unresolved', reason: 'Name matches more than one player in the team pool.' }
  }

  return { status: 'unresolved', reason: 'No matching player in the team pool.' }
}
