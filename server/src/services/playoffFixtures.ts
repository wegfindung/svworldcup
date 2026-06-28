import { knockoutFixture, officialRoundOf32Fixtures, playoffMatchNumberFromFixtureId, winnerBracket } from '../data/playoffBracket.js'
import type { FixtureSeed } from '../domain/types.js'
import type { ConfigRepository } from '../repositories/configRepository.js'
import type { FixtureRepository } from '../repositories/fixtureRepository.js'
import type { ScoringRepository } from '../repositories/scoringRepository.js'
import type { TeamPoolRepository } from '../repositories/teamPoolRepository.js'
import { buildPublicFixtureResults, type PublicFixtureResult } from './matchResults.js'

interface PlayoffFixtureSyncDeps {
  fixtureRepository: FixtureRepository
  scoringRepository: ScoringRepository
  configRepository: ConfigRepository
  teamPoolRepository: TeamPoolRepository
}

const groupKeys = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

function sortFixtures(fixtures: FixtureSeed[]) {
  return [...fixtures].sort(
    (left, right) =>
      left.kickoffDate.localeCompare(right.kickoffDate) ||
      left.kickoffTimeUtc.localeCompare(right.kickoffTimeUtc) ||
      left.fixtureId.localeCompare(right.fixtureId),
  )
}

function sameFixture(left: FixtureSeed, right: FixtureSeed) {
  return (
    left.groupKey === right.groupKey &&
    left.kickoffDate === right.kickoffDate &&
    left.kickoffTimeUtc === right.kickoffTimeUtc &&
    left.homeTeamCode === right.homeTeamCode &&
    left.awayTeamCode === right.awayTeamCode
  )
}

function groupStageIsFinal(results: PublicFixtureResult[]) {
  const groupResults = results.filter((result) => groupKeys.includes(result.groupKey))
  return groupResults.length >= 72 && groupResults.every((result) => result.status === 'final')
}

function winnerOf(result: PublicFixtureResult | undefined) {
  if (!result || result.status !== 'final' || result.homeGoals === null || result.awayGoals === null) {
    return null
  }
  if (result.homeGoals > result.awayGoals) {
    return result.homeTeamCode
  }
  if (result.awayGoals > result.homeGoals) {
    return result.awayTeamCode
  }
  return null
}

function loserOf(result: PublicFixtureResult | undefined) {
  const winner = winnerOf(result)
  if (!result || !winner) {
    return null
  }
  return winner === result.homeTeamCode ? result.awayTeamCode : result.homeTeamCode
}

function resultsByPlayoffMatch(results: PublicFixtureResult[]) {
  const byMatch = new Map<number, PublicFixtureResult>()
  for (const result of results) {
    const matchNumber = playoffMatchNumberFromFixtureId(result.fixtureId)
    if (matchNumber !== null) {
      byMatch.set(matchNumber, result)
    }
  }
  return byMatch
}

export function buildDerivedPlayoffFixtures(results: PublicFixtureResult[]): FixtureSeed[] {
  if (!groupStageIsFinal(results)) {
    return []
  }

  const derived: FixtureSeed[] = [...officialRoundOf32Fixtures]
  const byMatch = resultsByPlayoffMatch(results)

  for (const template of winnerBracket) {
    const home = winnerOf(byMatch.get(template.home))
    const away = winnerOf(byMatch.get(template.away))
    if (home && away) {
      derived.push(knockoutFixture(template.match, home, away))
    }
  }

  const firstSemi = byMatch.get(101)
  const secondSemi = byMatch.get(102)
  const thirdPlaceHome = loserOf(firstSemi)
  const thirdPlaceAway = loserOf(secondSemi)
  if (thirdPlaceHome && thirdPlaceAway) {
    derived.push(knockoutFixture(103, thirdPlaceHome, thirdPlaceAway))
  }

  const finalHome = winnerOf(firstSemi)
  const finalAway = winnerOf(secondSemi)
  if (finalHome && finalAway) {
    derived.push(knockoutFixture(104, finalHome, finalAway))
  }

  return derived
}

export async function syncDerivedPlayoffFixtures({
  fixtureRepository,
  scoringRepository,
  configRepository,
  teamPoolRepository,
}: PlayoffFixtureSyncDeps): Promise<FixtureSeed[]> {
  const currentFixtures = await fixtureRepository.listFixtures()
  const teamCodes = [...new Set(currentFixtures.flatMap((fixture) => [fixture.homeTeamCode, fixture.awayTeamCode]))]
  const playersByTeam = new Map<string, Awaited<ReturnType<TeamPoolRepository['listByTeam']>>>()
  const [entries, scoring, scoreOverrides] = await Promise.all([
    scoringRepository.listMatchEntries(),
    configRepository.getScoringConfig(),
    configRepository.getFixtureScoreOverrides(),
    Promise.all(teamCodes.map(async (teamCode) => playersByTeam.set(teamCode, await teamPoolRepository.listByTeam(teamCode)))),
  ])

  const results = buildPublicFixtureResults(currentFixtures, playersByTeam, entries, scoring, scoreOverrides)
  const derived = buildDerivedPlayoffFixtures(results)
  if (derived.length === 0) {
    return currentFixtures
  }

  const byId = new Map(currentFixtures.map((fixture) => [fixture.fixtureId, fixture]))
  const changed = derived.filter((fixture) => {
    const existing = byId.get(fixture.fixtureId)
    return !existing || !sameFixture(existing, fixture)
  })

  if (changed.length > 0) {
    await fixtureRepository.upsertFixtures(changed)
  }

  for (const fixture of derived) {
    byId.set(fixture.fixtureId, fixture)
  }

  return sortFixtures([...byId.values()])
}
