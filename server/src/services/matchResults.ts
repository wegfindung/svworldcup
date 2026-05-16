import type { FixtureSeed, MatchEntryRecord, TeamPoolPlayer } from '../domain/types.js'

export interface PublicFixtureResult {
  fixtureId: string
  groupKey: string
  kickoffDate: string
  kickoffTimeLocal: string
  homeTeamCode: string
  awayTeamCode: string
  homeGoals: number | null
  awayGoals: number | null
  status: 'final' | 'pending'
  entryCount: number
}

export function buildPublicFixtureResults(
  fixtures: FixtureSeed[],
  playersByTeam: Map<string, TeamPoolPlayer[]>,
  entries: MatchEntryRecord[],
): PublicFixtureResult[] {
  const playerTeamCodes = new Map<number, string>()
  for (const [teamCode, players] of playersByTeam.entries()) {
    for (const player of players) {
      playerTeamCodes.set(player.playerId, teamCode)
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

    for (const entry of fixtureEntries) {
      const teamCode = playerTeamCodes.get(entry.playerId)
      if (teamCode !== fixture.homeTeamCode && teamCode !== fixture.awayTeamCode) {
        continue
      }

      goalsByTeam.set(teamCode, (goalsByTeam.get(teamCode) ?? 0) + entry.goals)
    }

    const status = fixtureEntries.length > 0 ? 'final' : 'pending'

    return {
      fixtureId: fixture.fixtureId,
      groupKey: fixture.groupKey,
      kickoffDate: fixture.kickoffDate,
      kickoffTimeLocal: fixture.kickoffTimeLocal,
      homeTeamCode: fixture.homeTeamCode,
      awayTeamCode: fixture.awayTeamCode,
      homeGoals: status === 'final' ? goalsByTeam.get(fixture.homeTeamCode) ?? 0 : null,
      awayGoals: status === 'final' ? goalsByTeam.get(fixture.awayTeamCode) ?? 0 : null,
      status,
      entryCount: fixtureEntries.length,
    }
  })
}
