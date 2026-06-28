import { knockoutFixture, playoffMatchNumberFromFixtureId, roundOf32Templates, winnerBracket } from '../data/playoffBracket.js'
import type { FixtureSeed } from '../domain/types.js'
import type { ConfigRepository } from '../repositories/configRepository.js'
import type { FixtureRepository } from '../repositories/fixtureRepository.js'
import type { ScoringRepository } from '../repositories/scoringRepository.js'
import type { TeamPoolRepository } from '../repositories/teamPoolRepository.js'
import { buildPublicFixtureResults, type PublicFixtureResult } from './matchResults.js'

interface GroupStanding {
  teamCode: string
  groupKey: string
  played: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
}

interface KnockoutTeam {
  teamCode: string
  groupKey: string
  rank: number
  standing: GroupStanding
}

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

function emptyStanding(teamCode: string, groupKey: string): GroupStanding {
  return {
    teamCode,
    groupKey,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
  }
}

function compareStandings(left: GroupStanding, right: GroupStanding) {
  return (
    right.points - left.points ||
    right.goalDifference - left.goalDifference ||
    right.goalsFor - left.goalsFor ||
    left.teamCode.localeCompare(right.teamCode)
  )
}

function applyStandingResult(standings: Map<string, GroupStanding>, result: PublicFixtureResult) {
  if (result.status !== 'final' || result.homeGoals === null || result.awayGoals === null) {
    return
  }

  const home = standings.get(result.homeTeamCode)
  const away = standings.get(result.awayTeamCode)
  if (!home || !away) {
    return
  }

  home.played += 1
  away.played += 1
  home.goalsFor += result.homeGoals
  home.goalsAgainst += result.awayGoals
  away.goalsFor += result.awayGoals
  away.goalsAgainst += result.homeGoals
  home.goalDifference = home.goalsFor - home.goalsAgainst
  away.goalDifference = away.goalsFor - away.goalsAgainst

  if (result.homeGoals > result.awayGoals) {
    home.wins += 1
    away.losses += 1
    home.points += 3
  } else if (result.awayGoals > result.homeGoals) {
    away.wins += 1
    home.losses += 1
    away.points += 3
  } else {
    home.draws += 1
    away.draws += 1
    home.points += 1
    away.points += 1
  }
}

function buildGroupStandings(results: PublicFixtureResult[]) {
  const standings = new Map<string, GroupStanding>()
  for (const result of results.filter((item) => groupKeys.includes(item.groupKey))) {
    if (!standings.has(result.homeTeamCode)) {
      standings.set(result.homeTeamCode, emptyStanding(result.homeTeamCode, result.groupKey))
    }
    if (!standings.has(result.awayTeamCode)) {
      standings.set(result.awayTeamCode, emptyStanding(result.awayTeamCode, result.groupKey))
    }
    applyStandingResult(standings, result)
  }

  const byGroup = new Map<string, GroupStanding[]>()
  for (const standing of standings.values()) {
    const current = byGroup.get(standing.groupKey) ?? []
    current.push(standing)
    byGroup.set(standing.groupKey, current)
  }

  return new Map(groupKeys.map((groupKey) => [groupKey, [...(byGroup.get(groupKey) ?? [])].sort(compareStandings)]))
}

function groupStageIsFinal(results: PublicFixtureResult[]) {
  const groupResults = results.filter((result) => groupKeys.includes(result.groupKey))
  return groupResults.length >= 72 && groupResults.every((result) => result.status === 'final')
}

function selectThirdPlaceTeam(availableThirds: KnockoutTeam[], allowedGroups: readonly string[]) {
  const selected = availableThirds.find((team) => allowedGroups.includes(team.groupKey)) ?? availableThirds[0]
  if (!selected) {
    return null
  }
  availableThirds.splice(availableThirds.indexOf(selected), 1)
  return selected
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

  const standingsByGroup = buildGroupStandings(results)
  const qualifierBySeed = new Map<string, KnockoutTeam>()
  const thirdPlaceTeams: KnockoutTeam[] = []

  for (const [groupKey, rows] of standingsByGroup) {
    rows.forEach((standing, index) => {
      const team: KnockoutTeam = { teamCode: standing.teamCode, groupKey, rank: index + 1, standing }
      if (index < 2) {
        qualifierBySeed.set(`${index + 1}${groupKey}`, team)
      } else if (index === 2) {
        thirdPlaceTeams.push(team)
      }
    })
  }

  const availableThirds = [...thirdPlaceTeams].sort((left, right) => compareStandings(left.standing, right.standing)).slice(0, 8)
  const derived: FixtureSeed[] = []
  const byMatch = resultsByPlayoffMatch(results)

  for (const template of roundOf32Templates) {
    const home = qualifierBySeed.get(`${template.home.rank}${template.home.group}`)
    const away = 'away' in template ? qualifierBySeed.get(`${template.away.rank}${template.away.group}`) : selectThirdPlaceTeam(availableThirds, template.thirdAway)
    if (home && away) {
      derived.push(knockoutFixture(template.match, home.teamCode, away.teamCode))
    }
  }

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
