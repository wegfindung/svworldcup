// Pure aggregation helpers for the two nation-oriented Stats tabs (see SOP "Stats — Nation Pools" and
// "Stats — By Represented Nation"). Both run client-side off the existing /squad-usage payload; the
// "Allegiance" tab additionally needs a manager→nation map, which the panel builds from the league
// leaderboards (ParticipantScoreRow) so no server field is needed.
import type { ParticipantScoreRow, PublicSquadUsagePayload, PublicSquadUsagePlayer } from './types'

// --- Tab A: Nation pools (group tournament nations by player picks) ---

export interface NationPoolRow {
  teamCode: string
  totalPicks: number
  distinctPlayers: number
  // Fraction (0..1) of all picks that went to this nation's players.
  share: number
}

// Group revealed-squad players by their tournament nation (teamCode = the 48 WC team codes), summing picks
// and counting distinct players. Sorted most-picked first.
export function aggregateNationPools(payload: PublicSquadUsagePayload | null): NationPoolRow[] {
  const byNation = new Map<string, { totalPicks: number; distinctPlayers: number }>()
  for (const player of payload?.items ?? []) {
    const entry = byNation.get(player.teamCode) ?? { totalPicks: 0, distinctPlayers: 0 }
    entry.totalPicks += player.usageCount
    entry.distinctPlayers += 1
    byNation.set(player.teamCode, entry)
  }
  const grandTotal = [...byNation.values()].reduce((sum, entry) => sum + entry.totalPicks, 0)
  return [...byNation.entries()]
    .map(([teamCode, entry]) => ({
      teamCode,
      totalPicks: entry.totalPicks,
      distinctPlayers: entry.distinctPlayers,
      share: grandTotal > 0 ? entry.totalPicks / grandTotal : 0,
    }))
    .sort(
      (left, right) =>
        right.totalPicks - left.totalPicks ||
        right.distinctPlayers - left.distinctPlayers ||
        left.teamCode.localeCompare(right.teamCode),
    )
}

export interface NationPoolPlayer {
  player: PublicSquadUsagePlayer
  picks: number
  // Player's picks ÷ the nation's total picks (0..1); summed across the nation's players ≈ 1.
  shareOfNation: number
}

export interface NationPoolDetail {
  totalPicks: number
  players: NationPoolPlayer[]
}

// Every player picked from one nation's pool, ranked by pick count, each with its share of that nation's
// total picks. Feeds the Nation pools drill-down modal.
export function playersForNationPool(payload: PublicSquadUsagePayload | null, teamCode: string | null): NationPoolDetail {
  if (!teamCode) {
    return { totalPicks: 0, players: [] }
  }
  const nationPlayers = (payload?.items ?? []).filter((player) => player.teamCode === teamCode)
  const totalPicks = nationPlayers.reduce((sum, player) => sum + player.usageCount, 0)
  const players = nationPlayers
    .map((player) => ({
      player,
      picks: player.usageCount,
      shareOfNation: totalPicks > 0 ? player.usageCount / totalPicks : 0,
    }))
    .sort((left, right) => right.picks - left.picks || left.player.displayName.localeCompare(right.player.displayName))
  return { totalPicks, players }
}

// --- Tab B: Allegiance (a Nation-League nation's managers → players they picked) ---

export interface ManagerNation {
  primaryTeamCode: string
  secondaryTeamCode?: string
}

export type NationByParticipant = Map<string, ManagerNation>

// Build the participantId → nation map from one or more league boards. The first occurrence wins (a
// participant sits on exactly one board, so there is no real conflict).
export function nationByParticipantFromRows(
  ...rowLists: Array<ParticipantScoreRow[] | null | undefined>
): NationByParticipant {
  const map: NationByParticipant = new Map()
  for (const rows of rowLists) {
    for (const row of rows ?? []) {
      if (!map.has(row.participantId)) {
        map.set(row.participantId, {
          primaryTeamCode: row.primaryTeamCode,
          secondaryTeamCode: row.secondaryTeamCode,
        })
      }
    }
  }
  return map
}

// Distinct managers that actually appear in the usage payload (have a visible, locked squad). The same
// manager is listed once per slot they filled, so dedup by participantId.
function distinctUsageManagers(payload: PublicSquadUsagePayload | null): Set<string> {
  const ids = new Set<string>()
  for (const player of payload?.items ?? []) {
    for (const manager of player.managers) {
      ids.add(manager.participantId)
    }
  }
  return ids
}

export interface RepresentedNationOption {
  code: string
  managerCount: number
}

// Every nation represented among the usage managers, with how many of them claim it (primary OR secondary),
// sorted most-represented first. options[0] is the render-time default for the picker.
export function representedNationOptions(
  payload: PublicSquadUsagePayload | null,
  nationByParticipant: NationByParticipant,
): RepresentedNationOption[] {
  const byNation = new Map<string, Set<string>>()
  for (const participantId of distinctUsageManagers(payload)) {
    const nation = nationByParticipant.get(participantId)
    if (!nation) {
      continue
    }
    addManagerToNation(byNation, nation.primaryTeamCode, participantId)
    addManagerToNation(byNation, nation.secondaryTeamCode, participantId)
  }
  return [...byNation.entries()]
    .map(([code, managers]) => ({ code, managerCount: managers.size }))
    .sort((left, right) => right.managerCount - left.managerCount || left.code.localeCompare(right.code))
}

function addManagerToNation(byNation: Map<string, Set<string>>, code: string | undefined, participantId: string) {
  if (!code) {
    return
  }
  const managers = byNation.get(code) ?? new Set<string>()
  managers.add(participantId)
  byNation.set(code, managers)
}

export interface RepresentedNationPlayer {
  player: PublicSquadUsagePlayer
  // Distinct managers of the selected nation who picked this player.
  pickers: number
  // pickers ÷ the nation's total manager count (0..1).
  share: number
}

export interface RepresentedNationResult {
  nationManagerCount: number
  players: RepresentedNationPlayer[]
}

// For the selected nation, rank players by how many of that nation's managers picked them (manager matches
// on primary OR secondary). share = pickers ÷ nationManagerCount.
export function playersForRepresentedNation(
  payload: PublicSquadUsagePayload | null,
  nationByParticipant: NationByParticipant,
  nationCode: string | undefined,
): RepresentedNationResult {
  if (!nationCode) {
    return { nationManagerCount: 0, players: [] }
  }
  const nationManagers = new Set<string>()
  for (const participantId of distinctUsageManagers(payload)) {
    const nation = nationByParticipant.get(participantId)
    if (nation && (nation.primaryTeamCode === nationCode || nation.secondaryTeamCode === nationCode)) {
      nationManagers.add(participantId)
    }
  }
  const nationManagerCount = nationManagers.size
  const players = (payload?.items ?? [])
    .map((player) => {
      const pickers = new Set<string>()
      for (const manager of player.managers) {
        if (nationManagers.has(manager.participantId)) {
          pickers.add(manager.participantId)
        }
      }
      return {
        player,
        pickers: pickers.size,
        share: nationManagerCount > 0 ? pickers.size / nationManagerCount : 0,
      }
    })
    .filter((row) => row.pickers > 0)
    .sort(
      (left, right) =>
        right.pickers - left.pickers ||
        right.player.usageCount - left.player.usageCount ||
        left.player.displayName.localeCompare(right.player.displayName),
    )
  return { nationManagerCount, players }
}
