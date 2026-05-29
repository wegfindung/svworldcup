import { teams } from '../data/worldCupSeed.js'
import { normalizeName } from './normalizeName.js'

// Source country names sometimes differ from canonical Grand Tournament team names. Mirrors the
// alias handling in tools/import-world-cup-squads.ts.
const explicitAliases = new Map<string, string>([
  ['turkiye', 'TUR'],
  ['turkey', 'TUR'],
  ['dr congo', 'COD'],
  ['democratic republic of the congo', 'COD'],
  ['usa', 'USA'],
])

let teamCodeByName: Map<string, string> | null = null

function buildTeamCodeByName(): Map<string, string> {
  const map = new Map<string, string>()
  for (const team of teams) {
    map.set(normalizeName(team.nameEn), team.code)
  }
  for (const [alias, code] of explicitAliases) {
    map.set(alias, code)
  }
  return map
}

// Resolve a source team name to a canonical Grand Tournament team code, or null if unknown.
export function resolveTeamCode(name: string): string | null {
  if (!teamCodeByName) {
    teamCodeByName = buildTeamCodeByName()
  }
  return teamCodeByName.get(normalizeName(name)) ?? null
}
