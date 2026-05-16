import type { FixtureSeed, MatchEntryInput, SlotClass, TeamPoolPlayer } from '../domain/types.js'

type TeamPlayersByCode = Map<string, TeamPoolPlayer[]>

interface SimulationOptions {
  seed?: string
  sourceNotePrefix?: string
}

export interface SimulatedFixture {
  fixtureId: string
  homeTeamCode: string
  awayTeamCode: string
  homeGoals: number
  awayGoals: number
  entries: MatchEntryInput[]
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
