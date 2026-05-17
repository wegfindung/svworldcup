import type { FixtureSeed, MatchEntryInput, SlotClass, TeamPoolPlayer } from '../domain/types.js'

type TeamPlayersByCode = Map<string, TeamPoolPlayer[]>

interface SimulationOptions {
  seed?: string
  sourceNotePrefix?: string
}

export interface SimulatedFixture {
  fixtureId: string
  groupKey: string
  kickoffDate: string
  kickoffTimeUtc: string
  homeTeamCode: string
  awayTeamCode: string
  homeGoals: number
  awayGoals: number
  entries: MatchEntryInput[]
}

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

export interface SimulatedCompetition {
  fixtures: SimulatedFixture[]
  standings: GroupStanding[]
  champion: string
  runnerUp: string
  thirdPlace: string
  final: SimulatedFixture
}

interface SimulatedPlayerState {
  player: TeamPoolPlayer
  slotClass: SlotClass
  inOfficialSquad: boolean
  minutes: number
  goals: number
  assists: number
  rating?: number
}

const slotClassOrder: SlotClass[] = ['GK', 'DEF', 'MID', 'FWD']

const starterShape: Record<SlotClass, number> = {
  GK: 1,
  DEF: 4,
  MID: 3,
  FWD: 3,
}

export const simulationTeamStrengthFloor: Record<string, number> = {
  ALG: 78,
  ARG: 92,
  AUS: 75,
  AUT: 80,
  BIH: 76,
  CAN: 78,
  CIV: 79,
  COD: 75,
  CPV: 68,
  CUW: 66,
  CZE: 78,
  ECU: 80,
  EGY: 78,
  BRA: 92,
  ENG: 90,
  ESP: 90,
  FRA: 93,
  GER: 88,
  GHA: 77,
  HAI: 66,
  IRN: 78,
  IRQ: 70,
  JOR: 68,
  KOR: 79,
  KSA: 72,
  MEX: 81,
  NED: 88,
  NOR: 84,
  NZL: 70,
  PAN: 71,
  PAR: 78,
  POR: 90,
  BEL: 86,
  COL: 84,
  CRO: 85,
  JPN: 82,
  MAR: 83,
  QAT: 70,
  RSA: 70,
  SCO: 77,
  SEN: 82,
  SWE: 80,
  SUI: 82,
  TUN: 76,
  TUR: 80,
  URU: 84,
  USA: 80,
  UZB: 73,
}

const knockoutSchedule: Record<number, { groupKey: string; kickoffDate: string; kickoffTimeUtc: string }> = {
  73: { groupKey: 'R32', kickoffDate: '2026-06-28', kickoffTimeUtc: '19:00:00' },
  74: { groupKey: 'R32', kickoffDate: '2026-06-29', kickoffTimeUtc: '20:30:00' },
  75: { groupKey: 'R32', kickoffDate: '2026-06-30', kickoffTimeUtc: '01:00:00' },
  76: { groupKey: 'R32', kickoffDate: '2026-06-29', kickoffTimeUtc: '17:00:00' },
  77: { groupKey: 'R32', kickoffDate: '2026-06-30', kickoffTimeUtc: '21:00:00' },
  78: { groupKey: 'R32', kickoffDate: '2026-06-30', kickoffTimeUtc: '17:00:00' },
  79: { groupKey: 'R32', kickoffDate: '2026-07-01', kickoffTimeUtc: '01:00:00' },
  80: { groupKey: 'R32', kickoffDate: '2026-07-01', kickoffTimeUtc: '16:00:00' },
  81: { groupKey: 'R32', kickoffDate: '2026-07-02', kickoffTimeUtc: '00:00:00' },
  82: { groupKey: 'R32', kickoffDate: '2026-07-01', kickoffTimeUtc: '20:00:00' },
  83: { groupKey: 'R32', kickoffDate: '2026-07-02', kickoffTimeUtc: '23:00:00' },
  84: { groupKey: 'R32', kickoffDate: '2026-07-02', kickoffTimeUtc: '19:00:00' },
  85: { groupKey: 'R32', kickoffDate: '2026-07-03', kickoffTimeUtc: '03:00:00' },
  86: { groupKey: 'R32', kickoffDate: '2026-07-03', kickoffTimeUtc: '22:00:00' },
  87: { groupKey: 'R32', kickoffDate: '2026-07-04', kickoffTimeUtc: '01:30:00' },
  88: { groupKey: 'R32', kickoffDate: '2026-07-03', kickoffTimeUtc: '18:00:00' },
  89: { groupKey: 'R16', kickoffDate: '2026-07-04', kickoffTimeUtc: '21:00:00' },
  90: { groupKey: 'R16', kickoffDate: '2026-07-04', kickoffTimeUtc: '17:00:00' },
  91: { groupKey: 'R16', kickoffDate: '2026-07-05', kickoffTimeUtc: '20:00:00' },
  92: { groupKey: 'R16', kickoffDate: '2026-07-06', kickoffTimeUtc: '00:00:00' },
  93: { groupKey: 'R16', kickoffDate: '2026-07-06', kickoffTimeUtc: '19:00:00' },
  94: { groupKey: 'R16', kickoffDate: '2026-07-07', kickoffTimeUtc: '00:00:00' },
  95: { groupKey: 'R16', kickoffDate: '2026-07-07', kickoffTimeUtc: '22:00:00' },
  96: { groupKey: 'R16', kickoffDate: '2026-07-08', kickoffTimeUtc: '01:00:00' },
  97: { groupKey: 'QF', kickoffDate: '2026-07-10', kickoffTimeUtc: '01:00:00' },
  98: { groupKey: 'QF', kickoffDate: '2026-07-10', kickoffTimeUtc: '19:00:00' },
  99: { groupKey: 'QF', kickoffDate: '2026-07-11', kickoffTimeUtc: '22:00:00' },
  100: { groupKey: 'QF', kickoffDate: '2026-07-11', kickoffTimeUtc: '19:00:00' },
  101: { groupKey: 'SF', kickoffDate: '2026-07-15', kickoffTimeUtc: '01:00:00' },
  102: { groupKey: 'SF', kickoffDate: '2026-07-15', kickoffTimeUtc: '22:00:00' },
  103: { groupKey: '3P', kickoffDate: '2026-07-18', kickoffTimeUtc: '22:00:00' },
  104: { groupKey: 'FINAL', kickoffDate: '2026-07-19', kickoffTimeUtc: '19:00:00' },
}

const roundOf32Templates = [
  { match: 73, home: { rank: 2, group: 'A' }, away: { rank: 2, group: 'B' } },
  { match: 74, home: { rank: 1, group: 'E' }, thirdAway: ['A', 'B', 'C', 'D', 'F'] },
  { match: 75, home: { rank: 1, group: 'F' }, away: { rank: 2, group: 'C' } },
  { match: 76, home: { rank: 1, group: 'C' }, away: { rank: 2, group: 'F' } },
  { match: 77, home: { rank: 1, group: 'I' }, thirdAway: ['C', 'D', 'F', 'G', 'H'] },
  { match: 78, home: { rank: 2, group: 'E' }, away: { rank: 2, group: 'I' } },
  { match: 79, home: { rank: 1, group: 'A' }, thirdAway: ['C', 'E', 'F', 'H', 'I'] },
  { match: 80, home: { rank: 1, group: 'L' }, thirdAway: ['E', 'H', 'I', 'J', 'K'] },
  { match: 81, home: { rank: 1, group: 'D' }, thirdAway: ['B', 'E', 'F', 'I', 'J'] },
  { match: 82, home: { rank: 1, group: 'G' }, thirdAway: ['A', 'E', 'H', 'I', 'J'] },
  { match: 83, home: { rank: 2, group: 'K' }, away: { rank: 2, group: 'L' } },
  { match: 84, home: { rank: 1, group: 'H' }, away: { rank: 2, group: 'J' } },
  { match: 85, home: { rank: 1, group: 'B' }, thirdAway: ['E', 'F', 'G', 'I', 'J'] },
  { match: 86, home: { rank: 1, group: 'J' }, away: { rank: 2, group: 'H' } },
  { match: 87, home: { rank: 1, group: 'K' }, thirdAway: ['D', 'E', 'I', 'J', 'L'] },
  { match: 88, home: { rank: 2, group: 'D' }, away: { rank: 2, group: 'G' } },
] as const

const winnerBracket = [
  { match: 89, home: 74, away: 77 },
  { match: 90, home: 73, away: 75 },
  { match: 91, home: 76, away: 78 },
  { match: 92, home: 79, away: 80 },
  { match: 93, home: 83, away: 84 },
  { match: 94, home: 81, away: 82 },
  { match: 95, home: 86, away: 88 },
  { match: 96, home: 85, away: 87 },
  { match: 97, home: 89, away: 90 },
  { match: 98, home: 93, away: 94 },
  { match: 99, home: 91, away: 92 },
  { match: 100, home: 95, away: 96 },
  { match: 101, home: 97, away: 98 },
  { match: 102, home: 99, away: 100 },
] as const

function hashString(input: string) {
  let hash = 2166136261
  for (const char of input) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function createRng(seed: string) {
  let state = hashString(seed) || 1
  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function primarySlotClass(player: TeamPoolPlayer): SlotClass {
  if (player.positionClasses.length === 0) {
    return 'MID'
  }

  const primaryPosition = player.positionMain?.toUpperCase()
  if (primaryPosition) {
    const matchingClass = player.positionClasses.find((slotClass) => {
      if (slotClass === 'GK') return primaryPosition === 'GK'
      if (slotClass === 'DEF') return ['CB', 'LB', 'RB', 'LWB', 'RWB', 'DML', 'DMR'].includes(primaryPosition)
      if (slotClass === 'MID') return ['DM', 'DMC', 'CM', 'LM', 'RM', 'AM', 'AMC'].includes(primaryPosition)
      return ['LW', 'RW', 'ST', 'CF'].includes(primaryPosition)
    })
    if (matchingClass) {
      return matchingClass
    }
  }

  return player.positionClasses[0]
}

function compareByRating(left: TeamPoolPlayer, right: TeamPoolPlayer) {
  return right.rating - left.rating || left.displayName.localeCompare(right.displayName)
}

function teamStrength(teamCode: string, players: TeamPoolPlayer[]) {
  const topPlayers = [...players].sort(compareByRating).slice(0, 11)
  const playerAverage = topPlayers.length > 0 ? topPlayers.reduce((sum, player) => sum + player.rating, 0) / topPlayers.length : 70
  const floor = simulationTeamStrengthFloor[teamCode] ?? 76
  return playerAverage * 0.45 + floor * 0.55
}

function compareStandings(left: GroupStanding, right: GroupStanding) {
  return (
    right.points - left.points ||
    right.goalDifference - left.goalDifference ||
    right.goalsFor - left.goalsFor ||
    (simulationTeamStrengthFloor[right.teamCode] ?? 0) - (simulationTeamStrengthFloor[left.teamCode] ?? 0) ||
    left.teamCode.localeCompare(right.teamCode)
  )
}

function buildInitialStandings(fixtures: FixtureSeed[]) {
  const standings = new Map<string, GroupStanding>()
  for (const fixture of fixtures) {
    for (const teamCode of [fixture.homeTeamCode, fixture.awayTeamCode]) {
      if (!standings.has(teamCode)) {
        standings.set(teamCode, {
          teamCode,
          groupKey: fixture.groupKey,
          played: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0,
        })
      }
    }
  }
  return standings
}

function applyStandingResult(standings: Map<string, GroupStanding>, homeTeamCode: string, awayTeamCode: string, homeGoals: number, awayGoals: number) {
  const home = standings.get(homeTeamCode)
  const away = standings.get(awayTeamCode)
  if (!home || !away) {
    return
  }

  home.played += 1
  away.played += 1
  home.goalsFor += homeGoals
  home.goalsAgainst += awayGoals
  away.goalsFor += awayGoals
  away.goalsAgainst += homeGoals
  home.goalDifference = home.goalsFor - home.goalsAgainst
  away.goalDifference = away.goalsFor - away.goalsAgainst

  if (homeGoals > awayGoals) {
    home.wins += 1
    away.losses += 1
    home.points += 3
  } else if (awayGoals > homeGoals) {
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

function rankGroupStandings(standings: GroupStanding[]) {
  const byGroup = new Map<string, GroupStanding[]>()
  for (const standing of standings) {
    const current = byGroup.get(standing.groupKey) ?? []
    current.push(standing)
    byGroup.set(standing.groupKey, current)
  }
  return new Map([...byGroup.entries()].map(([groupKey, rows]) => [groupKey, [...rows].sort(compareStandings)]))
}

function selectThirdPlaceTeam(availableThirds: KnockoutTeam[], allowedGroups: readonly string[]) {
  const selected = availableThirds.find((team) => allowedGroups.includes(team.groupKey)) ?? availableThirds[0]
  if (!selected) {
    throw new Error(`Could not resolve third-place selector for groups ${allowedGroups.join('/')}`)
  }
  availableThirds.splice(availableThirds.indexOf(selected), 1)
  return selected
}

function knockoutFixture(matchNumber: number, homeTeamCode: string, awayTeamCode: string): FixtureSeed {
  const schedule = knockoutSchedule[matchNumber]
  if (!schedule) {
    throw new Error(`Missing knockout schedule for match ${matchNumber}`)
  }

  return {
    fixtureId: `${schedule.kickoffDate}-${schedule.groupKey.toLowerCase()}-${matchNumber}`,
    groupKey: schedule.groupKey,
    kickoffDate: schedule.kickoffDate,
    kickoffTimeUtc: schedule.kickoffTimeUtc,
    homeTeamCode,
    awayTeamCode,
  }
}

function winnerOf(fixture: SimulatedFixture) {
  if (fixture.homeGoals > fixture.awayGoals) return fixture.homeTeamCode
  if (fixture.awayGoals > fixture.homeGoals) return fixture.awayTeamCode
  return (simulationTeamStrengthFloor[fixture.homeTeamCode] ?? 0) >= (simulationTeamStrengthFloor[fixture.awayTeamCode] ?? 0)
    ? fixture.homeTeamCode
    : fixture.awayTeamCode
}

function loserOf(fixture: SimulatedFixture) {
  const winner = winnerOf(fixture)
  return winner === fixture.homeTeamCode ? fixture.awayTeamCode : fixture.homeTeamCode
}

function forceKnockoutWinner(fixture: SimulatedFixture) {
  if (fixture.homeGoals !== fixture.awayGoals) {
    return fixture
  }

  const homeStrength = simulationTeamStrengthFloor[fixture.homeTeamCode] ?? 0
  const awayStrength = simulationTeamStrengthFloor[fixture.awayTeamCode] ?? 0
  if (homeStrength >= awayStrength) {
    return { ...fixture, homeGoals: fixture.homeGoals + 1 }
  }
  return { ...fixture, awayGoals: fixture.awayGoals + 1 }
}

function drawPoisson(lambda: number, rng: () => number) {
  const limit = Math.exp(-lambda)
  let product = 1
  let goals = 0
  do {
    goals += 1
    product *= rng()
  } while (product > limit)
  return Math.min(6, goals - 1)
}

function chooseWeighted<T>(items: T[], getWeight: (item: T) => number, rng: () => number): T | undefined {
  const total = items.reduce((sum, item) => sum + Math.max(0, getWeight(item)), 0)
  if (total <= 0) {
    return items[0]
  }

  let cursor = rng() * total
  for (const item of items) {
    cursor -= Math.max(0, getWeight(item))
    if (cursor <= 0) {
      return item
    }
  }

  return items[items.length - 1]
}

function pickTeamSheet(players: TeamPoolPlayer[], rng: () => number) {
  const sortedPlayers = [...players].sort(compareByRating)
  const selected = new Set<number>()
  const starters: TeamPoolPlayer[] = []

  for (const slotClass of slotClassOrder) {
    const candidates = sortedPlayers.filter((player) => !selected.has(player.playerId) && player.positionClasses.includes(slotClass))
    for (const player of candidates.slice(0, starterShape[slotClass])) {
      selected.add(player.playerId)
      starters.push(player)
    }
  }

  for (const player of sortedPlayers) {
    if (starters.length >= 11) {
      break
    }
    if (!selected.has(player.playerId)) {
      selected.add(player.playerId)
      starters.push(player)
    }
  }

  const officialBench = sortedPlayers.filter((player) => !selected.has(player.playerId)).slice(0, 12)
  const benchPlayersUsed = officialBench.slice(0, Math.min(5, officialBench.length)).sort(() => rng() - 0.5)
  const states = new Map<number, SimulatedPlayerState>()

  for (const player of players) {
    states.set(player.playerId, {
      player,
      slotClass: primarySlotClass(player),
      inOfficialSquad: starters.includes(player) || officialBench.includes(player),
      minutes: 0,
      goals: 0,
      assists: 0,
    })
  }

  for (const player of starters) {
    const state = states.get(player.playerId)
    if (state) {
      state.minutes = Math.round(70 + rng() * 20)
    }
  }

  for (const player of benchPlayersUsed) {
    const state = states.get(player.playerId)
    if (state) {
      state.minutes = Math.round(8 + rng() * 28)
    }
  }

  return [...states.values()]
}

function scorerWeight(state: SimulatedPlayerState) {
  const classWeight: Record<SlotClass, number> = { GK: 0.02, DEF: 0.6, MID: 2.1, FWD: 4.2 }
  return classWeight[state.slotClass] * (0.7 + state.player.rating / 100) * Math.max(0.25, state.minutes / 90)
}

function assisterWeight(state: SimulatedPlayerState) {
  const classWeight: Record<SlotClass, number> = { GK: 0.02, DEF: 1.1, MID: 3.2, FWD: 2.4 }
  return classWeight[state.slotClass] * (0.7 + state.player.rating / 100) * Math.max(0.25, state.minutes / 90)
}

function applyGoals(states: SimulatedPlayerState[], goals: number, rng: () => number) {
  const onPitch = states.filter((state) => state.minutes > 0)
  if (onPitch.length === 0) {
    return
  }

  for (let goalIndex = 0; goalIndex < goals; goalIndex += 1) {
    const scorer = chooseWeighted(onPitch, scorerWeight, rng)
    if (!scorer) {
      continue
    }
    scorer.goals += 1

    if (rng() < 0.72) {
      const assister = chooseWeighted(
        onPitch.filter((state) => state.player.playerId !== scorer.player.playerId),
        assisterWeight,
        rng,
      )
      if (assister) {
        assister.assists += 1
      }
    }
  }
}

function assignRatings(states: SimulatedPlayerState[], goalsFor: number, goalsAgainst: number, rng: () => number) {
  const resultBonus = goalsFor > goalsAgainst ? 0.35 : goalsFor === goalsAgainst ? 0.05 : -0.25
  for (const state of states) {
    if (state.minutes <= 0) {
      continue
    }

    const contributionBonus = state.goals * 0.85 + state.assists * 0.45
    const defensiveBonus = goalsAgainst === 0 && state.slotClass !== 'FWD' && state.minutes >= 60 ? 0.35 : 0
    const minutesBonus = state.minutes >= 60 ? 0.15 : -0.1
    const noise = (rng() - 0.5) * 0.8
    state.rating = Number(clamp(6.15 + resultBonus + contributionBonus + defensiveBonus + minutesBonus + noise, 4.5, 9.8).toFixed(1))
  }
}

function toEntry(state: SimulatedPlayerState, fixtureId: string, concededGoals: number, resultLabel: string, sourceNotePrefix: string): MatchEntryInput {
  return {
    fixtureId,
    playerId: state.player.playerId,
    inOfficialSquad: state.inOfficialSquad,
    minutes: state.minutes,
    goals: state.goals,
    assists: state.assists,
    cleanSheetEligible: state.inOfficialSquad && state.minutes >= 60 && concededGoals === 0 && state.slotClass !== 'FWD',
    rating: state.rating,
    sourceNote: `${sourceNotePrefix}: ${resultLabel}`,
  }
}

export function simulateFixture(fixture: FixtureSeed, homePlayers: TeamPoolPlayer[], awayPlayers: TeamPoolPlayer[], options: SimulationOptions = {}): SimulatedFixture {
  const sourceNotePrefix = options.sourceNotePrefix ?? 'simulated competition'
  const rng = createRng(`${options.seed ?? 'svwc-simulation'}:${fixture.fixtureId}`)
  const homeStrength = teamStrength(fixture.homeTeamCode, homePlayers)
  const awayStrength = teamStrength(fixture.awayTeamCode, awayPlayers)
  const strengthDelta = clamp((homeStrength - awayStrength) / 10, -1.45, 1.45)
  const homeExpectedGoals = clamp(1.25 + 0.16 + strengthDelta * 0.72, 0.2, 3.6)
  const awayExpectedGoals = clamp(1.12 - strengthDelta * 0.72, 0.15, 3.4)
  let homeGoals = drawPoisson(homeExpectedGoals, rng)
  let awayGoals = drawPoisson(awayExpectedGoals, rng)
  if (strengthDelta > 0.35 && homeGoals < awayGoals && rng() < 0.85) {
    homeGoals = awayGoals + (strengthDelta > 0.85 && rng() < 0.45 ? 2 : 1)
  }
  if (strengthDelta < -0.35 && awayGoals < homeGoals && rng() < 0.85) {
    awayGoals = homeGoals + (strengthDelta < -0.85 && rng() < 0.45 ? 2 : 1)
  }
  const resultLabel = `${fixture.homeTeamCode} ${homeGoals}-${awayGoals} ${fixture.awayTeamCode}`

  const homeStates = pickTeamSheet(homePlayers, rng)
  const awayStates = pickTeamSheet(awayPlayers, rng)
  applyGoals(homeStates, homeGoals, rng)
  applyGoals(awayStates, awayGoals, rng)
  assignRatings(homeStates, homeGoals, awayGoals, rng)
  assignRatings(awayStates, awayGoals, homeGoals, rng)

  return {
    fixtureId: fixture.fixtureId,
    groupKey: fixture.groupKey,
    kickoffDate: fixture.kickoffDate,
    kickoffTimeUtc: fixture.kickoffTimeUtc,
    homeTeamCode: fixture.homeTeamCode,
    awayTeamCode: fixture.awayTeamCode,
    homeGoals,
    awayGoals,
    entries: [
      ...homeStates.map((state) => toEntry(state, fixture.fixtureId, awayGoals, resultLabel, sourceNotePrefix)),
      ...awayStates.map((state) => toEntry(state, fixture.fixtureId, homeGoals, resultLabel, sourceNotePrefix)),
    ],
  }
}

export function simulateConfiguredCompetition(fixtures: FixtureSeed[], playersByTeam: TeamPlayersByCode, options: SimulationOptions = {}) {
  return fixtures
    .filter((fixture) => (playersByTeam.get(fixture.homeTeamCode)?.length ?? 0) > 0 && (playersByTeam.get(fixture.awayTeamCode)?.length ?? 0) > 0)
    .map((fixture) => simulateFixture(fixture, playersByTeam.get(fixture.homeTeamCode) ?? [], playersByTeam.get(fixture.awayTeamCode) ?? [], options))
}

export function simulateCompleteCompetition(groupFixtures: FixtureSeed[], playersByTeam: TeamPlayersByCode, options: SimulationOptions = {}): SimulatedCompetition {
  const simulatedGroupFixtures = simulateConfiguredCompetition(groupFixtures, playersByTeam, options)
  const standingsByTeam = buildInitialStandings(groupFixtures)
  for (const fixture of simulatedGroupFixtures) {
    applyStandingResult(standingsByTeam, fixture.homeTeamCode, fixture.awayTeamCode, fixture.homeGoals, fixture.awayGoals)
  }

  const standings = [...standingsByTeam.values()]
  const rankedGroups = rankGroupStandings(standings)
  const qualifierBySeed = new Map<string, KnockoutTeam>()
  const thirdPlaceTeams: KnockoutTeam[] = []

  for (const [groupKey, groupRows] of rankedGroups) {
    groupRows.forEach((standing, index) => {
      const team: KnockoutTeam = { teamCode: standing.teamCode, groupKey, rank: index + 1, standing }
      if (index < 2) {
        qualifierBySeed.set(`${index + 1}${groupKey}`, team)
      } else if (index === 2) {
        thirdPlaceTeams.push(team)
      }
    })
  }

  const availableThirds = thirdPlaceTeams.sort((left, right) => compareStandings(left.standing, right.standing)).slice(0, 8)
  const simulatedByMatch = new Map<number, SimulatedFixture>()
  const allFixtures = [...simulatedGroupFixtures]

  for (const template of roundOf32Templates) {
    const home = qualifierBySeed.get(`${template.home.rank}${template.home.group}`)
    const away = 'away' in template ? qualifierBySeed.get(`${template.away.rank}${template.away.group}`) : selectThirdPlaceTeam(availableThirds, template.thirdAway)
    if (!home || !away) {
      throw new Error(`Could not resolve round-of-32 match ${template.match}`)
    }
    const fixture = knockoutFixture(template.match, home.teamCode, away.teamCode)
    const simulated = forceKnockoutWinner(
      simulateFixture(fixture, playersByTeam.get(fixture.homeTeamCode) ?? [], playersByTeam.get(fixture.awayTeamCode) ?? [], options),
    )
    simulatedByMatch.set(template.match, simulated)
    allFixtures.push(simulated)
  }

  for (const template of winnerBracket) {
    const homeSource = simulatedByMatch.get(template.home)
    const awaySource = simulatedByMatch.get(template.away)
    if (!homeSource || !awaySource) {
      throw new Error(`Could not resolve knockout match ${template.match}`)
    }
    const fixture = knockoutFixture(template.match, winnerOf(homeSource), winnerOf(awaySource))
    const simulated = forceKnockoutWinner(
      simulateFixture(fixture, playersByTeam.get(fixture.homeTeamCode) ?? [], playersByTeam.get(fixture.awayTeamCode) ?? [], options),
    )
    simulatedByMatch.set(template.match, simulated)
    allFixtures.push(simulated)
  }

  const firstSemi = simulatedByMatch.get(101)
  const secondSemi = simulatedByMatch.get(102)
  if (!firstSemi || !secondSemi) {
    throw new Error('Could not resolve semi-final winners.')
  }

  const thirdPlaceFixture = forceKnockoutWinner(
    simulateFixture(knockoutFixture(103, loserOf(firstSemi), loserOf(secondSemi)), playersByTeam.get(loserOf(firstSemi)) ?? [], playersByTeam.get(loserOf(secondSemi)) ?? [], options),
  )
  simulatedByMatch.set(103, thirdPlaceFixture)
  allFixtures.push(thirdPlaceFixture)

  const final = forceKnockoutWinner(
    simulateFixture(knockoutFixture(104, winnerOf(firstSemi), winnerOf(secondSemi)), playersByTeam.get(winnerOf(firstSemi)) ?? [], playersByTeam.get(winnerOf(secondSemi)) ?? [], options),
  )
  simulatedByMatch.set(104, final)
  allFixtures.push(final)

  return {
    fixtures: allFixtures,
    standings,
    champion: winnerOf(final),
    runnerUp: loserOf(final),
    thirdPlace: winnerOf(thirdPlaceFixture),
    final,
  }
}
