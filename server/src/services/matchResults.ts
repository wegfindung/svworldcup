import { scoringDefaults } from '../data/scoringDefaults.js'
import { cleanSheetPointsForClass, scoreEntryComponents } from '../lib/matchScoring.js'
import type {
  FixtureScoreOverrides,
  FixtureSeed,
  LineupStatus,
  MatchEntryRecord,
  ScoringConfig,
  SlotClass,
  TeamPoolPlayer,
} from '../domain/types.js'

export interface PublicFixtureResult {
  fixtureId: string
  groupKey: string
  kickoffDate: string
  kickoffTimeUtc: string
  homeTeamCode: string
  awayTeamCode: string
  homeGoals: number | null
  awayGoals: number | null
  status: 'final' | 'pending'
  entryCount: number
  homePlayers: PublicFixturePlayerResult[]
  awayPlayers: PublicFixturePlayerResult[]
}

// Clean-sheet points the player would earn if placed in this slot class (the only position-dependent
// scoring component — see SOP_scoring_and_leagues "Public Match Results Page").
export interface CleanSheetByPosition {
  slotClass: SlotClass
  points: number
}

export interface PublicFixturePlayerResult {
  playerId: number
  displayName: string
  teamCode: string
  imageUrl?: string
  minutes: number
  goals: number
  assists: number
  cleanSheetEligible: boolean
  lineupStatus: LineupStatus
  rating?: number
  sourceNote?: string
  // Soccerverse position codes + primary, for the player card.
  positions: string[]
  positionMain?: string
  // Squad-independent base points (goal/assist/appearance/minutes/performance), computed identically
  // to the scoring engine. The clean sheet is excluded — it is position-dependent (cleanSheetByPosition).
  goalPoints: number
  assistPoints: number
  appearancePoints: number
  minutePoints: number
  performancePoints: number
  basePoints: number
  // One entry per slot class the player qualifies for, with the clean-sheet points that class earns
  // (0 unless the team kept a clean sheet AND the class pays — GK/DEF always, MID only with a DM code).
  cleanSheetByPosition: CleanSheetByPosition[]
  // True when the player would earn clean-sheet points in at least one eligible class — drives the badge.
  earnsCleanSheet: boolean
}

function sortPlayerResults(players: PublicFixturePlayerResult[]) {
  return players.sort(
    (left, right) =>
      right.goals - left.goals ||
      right.assists - left.assists ||
      right.minutes - left.minutes ||
      (right.rating ?? 0) - (left.rating ?? 0) ||
      left.displayName.localeCompare(right.displayName),
  )
}

export function buildPublicFixtureResults(
  fixtures: FixtureSeed[],
  playersByTeam: Map<string, TeamPoolPlayer[]>,
  entries: MatchEntryRecord[],
  // Defaults to the team-locked rubric so existing 3-arg callers keep working; the route passes the
  // live config so a scoring-config change propagates to the public point figures too.
  scoring: ScoringConfig = scoringDefaults,
  // Per-fixture true scoreline, keyed by fixtureId. When a final fixture has an override it replaces
  // the derived per-player goal sum for display (own-goal / skipped-scorer correction); scoring is
  // untouched. Defaults to none so existing callers keep working. See SOP "Official Scoreline Override".
  scoreOverrides: FixtureScoreOverrides = {},
): PublicFixtureResult[] {
  const playerTeamCodes = new Map<number, string>()
  const playersById = new Map<number, TeamPoolPlayer>()
  for (const [teamCode, players] of playersByTeam.entries()) {
    for (const player of players) {
      playerTeamCodes.set(player.playerId, teamCode)
      playersById.set(player.playerId, player)
    }
  }

  const entriesByFixture = new Map<string, MatchEntryRecord[]>()
  for (const entry of entries) {
    const fixtureEntries = entriesByFixture.get(entry.fixtureId) ?? []
    fixtureEntries.push(entry)
    entriesByFixture.set(entry.fixtureId, fixtureEntries)
  }

  return fixtures.map((fixture) => {
    const fixtureEntries = entriesByFixture.get(fixture.fixtureId) ?? []
    const goalsByTeam = new Map<string, number>([
      [fixture.homeTeamCode, 0],
      [fixture.awayTeamCode, 0],
    ])
    const homePlayers: PublicFixturePlayerResult[] = []
    const awayPlayers: PublicFixturePlayerResult[] = []

    for (const entry of fixtureEntries) {
      const teamCode = playerTeamCodes.get(entry.playerId)
      if (teamCode !== fixture.homeTeamCode && teamCode !== fixture.awayTeamCode) {
        continue
      }

      goalsByTeam.set(teamCode, (goalsByTeam.get(teamCode) ?? 0) + entry.goals)

      const player = playersById.get(entry.playerId)
      const positions = player?.positions ?? []
      const positionClasses = player?.positionClasses ?? []
      const components = scoreEntryComponents(entry, scoring)
      const cleanSheetByPosition: CleanSheetByPosition[] = positionClasses.map((slotClass) => ({
        slotClass,
        points: entry.cleanSheetEligible ? cleanSheetPointsForClass(scoring, slotClass, positions) : 0,
      }))
      const earnsCleanSheet = entry.cleanSheetEligible && cleanSheetByPosition.some((position) => position.points > 0)

      const playerResult: PublicFixturePlayerResult = {
        playerId: entry.playerId,
        displayName: player?.displayName ?? `Player ${entry.playerId}`,
        teamCode,
        imageUrl: player?.imageUrl,
        minutes: entry.minutes,
        goals: entry.goals,
        assists: entry.assists,
        cleanSheetEligible: entry.cleanSheetEligible,
        lineupStatus: entry.lineupStatus,
        rating: entry.rating,
        sourceNote: entry.sourceNote,
        positions,
        positionMain: player?.positionMain,
        goalPoints: components.goals,
        assistPoints: components.assists,
        appearancePoints: components.appearance,
        minutePoints: components.minutes,
        performancePoints: components.performance,
        basePoints: components.total,
        cleanSheetByPosition,
        earnsCleanSheet,
      }
      if (teamCode === fixture.homeTeamCode) {
        homePlayers.push(playerResult)
      } else {
        awayPlayers.push(playerResult)
      }
    }

    const status = fixtureEntries.length > 0 ? 'final' : 'pending'

    // An override is the admin-entered true scoreline; it wins over the per-player goal sum, which
    // under-counts own goals and skipped scorers. Player goal figures are unchanged either way.
    const override = scoreOverrides[fixture.fixtureId]
    const homeGoalSum = goalsByTeam.get(fixture.homeTeamCode) ?? 0
    const awayGoalSum = goalsByTeam.get(fixture.awayTeamCode) ?? 0

    return {
      fixtureId: fixture.fixtureId,
      groupKey: fixture.groupKey,
      kickoffDate: fixture.kickoffDate,
      kickoffTimeUtc: fixture.kickoffTimeUtc,
      homeTeamCode: fixture.homeTeamCode,
      awayTeamCode: fixture.awayTeamCode,
      homeGoals: status === 'final' ? override?.home ?? homeGoalSum : null,
      awayGoals: status === 'final' ? override?.away ?? awayGoalSum : null,
      status,
      entryCount: fixtureEntries.length,
      homePlayers: sortPlayerResults(homePlayers),
      awayPlayers: sortPlayerResults(awayPlayers),
    }
  })
}
