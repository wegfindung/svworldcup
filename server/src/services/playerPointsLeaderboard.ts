import { scoringDefaults } from '../data/scoringDefaults.js'
import { cleanSheetPointsForClass, scoreEntryComponents } from '../lib/matchScoring.js'
import type { MatchEntryRecord, ScoringConfig, SlotClass, TeamPoolPlayer } from '../domain/types.js'

// Accumulated clean-sheet points the player has earned IF placed in this slot class across all promoted
// matches (the only position-dependent scoring component — see SOP_scoring_and_leagues). Once the position
// is fixed the clean sheet is deterministic, so it folds into that position's total (the same convention as
// the goalkeeper fold on the Results page).
export interface PlayerPointsCleanSheet {
  slotClass: SlotClass
  points: number
}

export interface PlayerPointsRow {
  playerId: number
  displayName: string
  teamCode: string
  nationalityCode: string
  imageUrl?: string
  rating: number
  capCost: number
  positionMain?: string
  positions: string[]
  positionClasses: SlotClass[]
  // Totals across every promoted entry for this player.
  appearances: number
  minutes: number
  goals: number
  assists: number
  // Squad-independent base-point breakdown, summed; clean sheet excluded (it is in cleanSheetByPosition).
  goalPoints: number
  assistPoints: number
  appearancePoints: number
  minutePoints: number
  performancePoints: number
  basePoints: number
  // One entry per slot class the player qualifies for, with the accumulated clean-sheet points that class
  // earns. The per-position total shown to the user is basePoints + the matching entry's points.
  cleanSheetByPosition: PlayerPointsCleanSheet[]
}

export interface PlayerPointsSummary {
  fixturesCounted: number
  playersRanked: number
}

export interface PlayerPointsLeaderboard {
  summary: PlayerPointsSummary
  items: PlayerPointsRow[]
}

// Aggregates every promoted match entry into one row per player, carrying the squad-independent base points
// and the per-eligible-position clean-sheet totals. The public Stats > Points tab ranks these per position
// (basePoints + that position's clean sheet). Scoring math is shared with the engine and the Results page
// via lib/matchScoring.ts, so the figures are identical.
export function buildPlayerPointsLeaderboard(
  playersByTeam: Map<string, TeamPoolPlayer[]>,
  entries: MatchEntryRecord[],
  // Defaults to the locked rubric so plain test callers work; the route passes the live config.
  scoring: ScoringConfig = scoringDefaults,
): PlayerPointsLeaderboard {
  const playersById = new Map<number, TeamPoolPlayer>()
  for (const players of playersByTeam.values()) {
    for (const player of players) {
      playersById.set(player.playerId, player)
    }
  }

  const rows = new Map<number, PlayerPointsRow>()
  const fixtures = new Set<string>()

  for (const entry of entries) {
    const player = playersById.get(entry.playerId)
    if (!player) {
      // An entry for a player not in any current pool cannot be drafted or ranked — skip it.
      continue
    }
    fixtures.add(entry.fixtureId)

    const components = scoreEntryComponents(entry, scoring)
    let row = rows.get(entry.playerId)
    if (!row) {
      row = {
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
        appearances: 0,
        minutes: 0,
        goals: 0,
        assists: 0,
        goalPoints: 0,
        assistPoints: 0,
        appearancePoints: 0,
        minutePoints: 0,
        performancePoints: 0,
        basePoints: 0,
        cleanSheetByPosition: player.positionClasses.map((slotClass) => ({ slotClass, points: 0 })),
      }
      rows.set(entry.playerId, row)
    }

    row.appearances += entry.minutes > 0 ? 1 : 0
    row.minutes += entry.minutes
    row.goals += entry.goals
    row.assists += entry.assists
    row.goalPoints += components.goals
    row.assistPoints += components.assists
    row.appearancePoints += components.appearance
    row.minutePoints += components.minutes
    row.performancePoints += components.performance
    row.basePoints += components.total
    for (const cleanSheet of row.cleanSheetByPosition) {
      cleanSheet.points += entry.cleanSheetEligible
        ? cleanSheetPointsForClass(scoring, cleanSheet.slotClass, player.positions)
        : 0
    }
  }

  const items = [...rows.values()].sort(
    (left, right) => right.basePoints - left.basePoints || left.displayName.localeCompare(right.displayName),
  )

  return {
    summary: { fixturesCounted: fixtures.size, playersRanked: items.length },
    items,
  }
}
