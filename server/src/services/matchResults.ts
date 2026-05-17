import type { FixtureSeed, MatchEntryRecord, TeamPoolPlayer } from '../domain/types.js'

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

export interface PublicFixturePlayerResult {
  playerId: number
  displayName: string
  teamCode: string
  imageUrl?: string
  minutes: number
  goals: number
  assists: number
  cleanSheetEligible: boolean
  rating?: number
  sourceNote?: string
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
      const playerResult: PublicFixturePlayerResult = {
        playerId: entry.playerId,
        displayName: player?.displayName ?? `Player ${entry.playerId}`,
        teamCode,
        imageUrl: player?.imageUrl,
        minutes: entry.minutes,
        goals: entry.goals,
        assists: entry.assists,
        cleanSheetEligible: entry.cleanSheetEligible,
        rating: entry.rating,
        sourceNote: entry.sourceNote,
      }
      if (teamCode === fixture.homeTeamCode) {
        homePlayers.push(playerResult)
      } else {
        awayPlayers.push(playerResult)
      }
    }

    const status = fixtureEntries.length > 0 ? 'final' : 'pending'

    return {
      fixtureId: fixture.fixtureId,
      groupKey: fixture.groupKey,
      kickoffDate: fixture.kickoffDate,
      kickoffTimeUtc: fixture.kickoffTimeUtc,
      homeTeamCode: fixture.homeTeamCode,
      awayTeamCode: fixture.awayTeamCode,
      homeGoals: status === 'final' ? goalsByTeam.get(fixture.homeTeamCode) ?? 0 : null,
      awayGoals: status === 'final' ? goalsByTeam.get(fixture.awayTeamCode) ?? 0 : null,
      status,
      entryCount: fixtureEntries.length,
      homePlayers: sortPlayerResults(homePlayers),
      awayPlayers: sortPlayerResults(awayPlayers),
    }
  })
}
