import { fixtures } from '../data/worldCupSeed.js'
import { simulateConfiguredCompetition, simulationTeamStrengthFloor } from '../services/competitionSimulation.js'
import { closeRepositoryPool, createScoringRepository, createTeamPoolRepository } from '../services/repos.js'

interface CliOptions {
  dryRun: boolean
  fixtureId?: string
  seed: string
  seedFakePoolsIfEmpty: boolean
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    dryRun: false,
    seed: 'svwc-simulation',
    seedFakePoolsIfEmpty: false,
  }

  for (const arg of argv) {
    if (arg === '--dry-run') {
      options.dryRun = true
      continue
    }
    if (arg.startsWith('--fixture=')) {
      options.fixtureId = arg.slice('--fixture='.length)
      continue
    }
    if (arg.startsWith('--seed=')) {
      options.seed = arg.slice('--seed='.length) || options.seed
      continue
    }
    if (arg === '--seed-fake-pools-if-empty') {
      options.seedFakePoolsIfEmpty = true
      continue
    }

    throw new Error(`Unknown argument: ${arg}`)
  }

  return options
}

function formatResult(result: { fixtureId: string; homeTeamCode: string; awayTeamCode: string; homeGoals: number; awayGoals: number; entries: unknown[] }) {
  return `${result.fixtureId}: ${result.homeTeamCode} ${result.homeGoals}-${result.awayGoals} ${result.awayTeamCode} (${result.entries.length} player entries)`
}

function hashTeamCode(teamCode: string) {
  return teamCode.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
}

function fakeTeamPlayers(teamCode: string) {
  const baseId = 9_000_000 + hashTeamCode(teamCode) * 100
  const teamBaseRating = simulationTeamStrengthFloor[teamCode] ?? 74
  const shape = [
    ...Array.from({ length: 3 }, (_, index) => ({ position: 'GK', offset: index })),
    ...Array.from({ length: 8 }, (_, index) => ({ position: ['CB', 'LB', 'RB', 'CB', 'LB', 'RB', 'CB', 'RB'][index], offset: 10 + index })),
    ...Array.from({ length: 8 }, (_, index) => ({ position: ['DM', 'CM', 'CM', 'AM', 'LM', 'RM', 'CM', 'AM'][index], offset: 30 + index })),
    ...Array.from({ length: 7 }, (_, index) => ({ position: ['ST', 'LW', 'RW', 'CF', 'ST', 'LW', 'RW'][index], offset: 50 + index })),
  ]

  return shape.map((item, index) => ({
    playerId: baseId + item.offset,
    displayName: `${teamCode} Sim ${item.position} ${index + 1}`,
    nationalityCode: teamCode,
    rating: Math.max(55, Math.min(94, teamBaseRating + 5 - Math.floor(index / 3))),
    clubId: 0,
    positions: [item.position],
    positionMain: item.position,
    imageUrl: `https://elrincondeldt.com/sv/photos/players/${baseId + item.offset}.png`,
  }))
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const selectedFixtures = options.fixtureId ? fixtures.filter((fixture) => fixture.fixtureId === options.fixtureId) : fixtures

  if (options.fixtureId && selectedFixtures.length === 0) {
    throw new Error(`Unknown fixture id: ${options.fixtureId}`)
  }

  const teamCodes = [...new Set(selectedFixtures.flatMap((fixture) => [fixture.homeTeamCode, fixture.awayTeamCode]))]
  const teamPoolRepository = createTeamPoolRepository()
  const scoringRepository = createScoringRepository()
  const playersByTeam = new Map<string, Awaited<ReturnType<typeof teamPoolRepository.listByTeam>>>()

  if (options.seedFakePoolsIfEmpty) {
    for (const teamCode of teamCodes) {
      await teamPoolRepository.seedTeamPlayersIfEmpty(teamCode, fakeTeamPlayers(teamCode))
    }
  }

  for (const teamCode of teamCodes) {
    playersByTeam.set(teamCode, await teamPoolRepository.listByTeam(teamCode))
  }

  const missingTeams = teamCodes.filter((teamCode) => (playersByTeam.get(teamCode)?.length ?? 0) === 0)
  const simulatedFixtures = simulateConfiguredCompetition(selectedFixtures, playersByTeam, { seed: options.seed })
  const entries = simulatedFixtures.flatMap((fixture) => fixture.entries)

  if (!options.dryRun) {
    for (const entry of entries) {
      await scoringRepository.upsertMatchEntry(entry)
    }
  }

  console.log(options.dryRun ? 'Dry run only. No scoring entries were written.' : 'Simulation written to scoring entries.')
  console.log(`Storage: ${scoringRepository.storageKind}`)
  console.log(`Fixtures simulated: ${simulatedFixtures.length}/${selectedFixtures.length}`)
  console.log(`Player entries ${options.dryRun ? 'generated' : 'upserted'}: ${entries.length}`)
  if (options.seedFakePoolsIfEmpty) {
    console.log('Fake team pools were seeded only for teams that were empty.')
  }

  if (missingTeams.length > 0) {
    console.log(`Missing team pools, skipped where needed: ${missingTeams.join(', ')}`)
  }

  for (const line of simulatedFixtures.slice(0, 12).map(formatResult)) {
    console.log(line)
  }

  if (simulatedFixtures.length > 12) {
    console.log(`...and ${simulatedFixtures.length - 12} more fixtures.`)
  }

  if (scoringRepository.storageKind === 'memory' && !options.dryRun) {
    console.log('Warning: no database connection was detected; this in-memory simulation disappears when the process exits.')
  }
}

try {
  await main()
} finally {
  await closeRepositoryPool()
}
