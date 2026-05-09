import fs from 'node:fs'
import path from 'node:path'
import { env } from '../server/src/config/env.js'
import { teams } from '../server/src/data/worldCupSeed.js'
import type { SoccerversePlayerRecord } from '../server/src/domain/types.js'
import { createTeamPoolRepository } from '../server/src/services/repos.js'

interface SourcePlayer {
  id: number
  name: string
  photo?: string
  position_main?: string
  positions?: string[]
  rating?: number
  country_id?: string
}

interface SourceTeamPayload {
  team_id?: number
  players?: SourcePlayer[]
}

type SourcePayload = Record<string, SourceTeamPayload>

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const viaAdminApi = args.includes('--via-admin-api')
const sourcePath =
  args.find((value) => value !== '--dry-run' && value !== '--via-admin-api') ??
  path.resolve(process.cwd(), '.tmp', 'updated_world_cup_squads.json')

const explicitAliases = new Map<string, string>([
  ['turkiye', 'TUR'],
  ['turkey', 'TUR'],
  ['dr congo', 'COD'],
  ['democratic republic of the congo', 'COD'],
  ['usa', 'USA'],
])

function normalizeLabel(value: string) {
  return value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function buildTeamCodeByName() {
  const map = new Map<string, string>()
  for (const team of teams) {
    map.set(normalizeLabel(team.nameEn), team.code)
  }
  for (const [alias, code] of explicitAliases) {
    map.set(alias, code)
  }
  return map
}

function normalizeRating(raw: unknown) {
  const value = Number(raw)
  if (!Number.isFinite(value)) {
    return 50
  }
  return Math.max(0, Math.min(99, Math.round(value)))
}

function normalizePositions(player: SourcePlayer) {
  const direct = Array.isArray(player.positions) ? player.positions.map((value) => String(value).trim().toUpperCase()).filter(Boolean) : []
  if (direct.length > 0) {
    return [...new Set(direct)]
  }
  if (player.position_main) {
    return [String(player.position_main).trim().toUpperCase()]
  }
  return []
}

function mapPlayer(player: SourcePlayer, fallbackTeamCode: string): SoccerversePlayerRecord {
  return {
    playerId: Number(player.id),
    displayName: String(player.name).trim(),
    nationalityCode: String(player.country_id ?? fallbackTeamCode).trim().toUpperCase().slice(0, 3) || fallbackTeamCode,
    rating: normalizeRating(player.rating),
    clubId: 0,
    positions: normalizePositions(player),
    positionMain: player.position_main ? String(player.position_main).trim().toUpperCase() : undefined,
    imageUrl: player.photo ? String(player.photo).trim() : undefined,
  }
}

async function main() {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source file not found: ${sourcePath}`)
  }

  const raw = fs.readFileSync(sourcePath, 'utf8')
  const payload = JSON.parse(raw) as SourcePayload
  const teamCodeByName = buildTeamCodeByName()
  const repository = dryRun || viaAdminApi ? null : createTeamPoolRepository()

  if (!dryRun && !viaAdminApi && repository?.storageKind !== 'postgres') {
    throw new Error('Team pool repository is not using PostgreSQL. Check DATABASE_URL / DB_* env configuration first.')
  }

  const imported: Array<{ teamCode: string; teamName: string; count: number }> = []
  const missingTeams: string[] = []

  for (const [teamName, teamPayload] of Object.entries(payload)) {
    const normalizedTeamName = normalizeLabel(teamName)
    const teamCode = teamCodeByName.get(normalizedTeamName)
    if (!teamCode) {
      missingTeams.push(teamName)
      continue
    }

    const dedupedPlayers = new Map<number, SoccerversePlayerRecord>()
    for (const sourcePlayer of teamPayload.players ?? []) {
      const mapped = mapPlayer(sourcePlayer, teamCode)
      if (!Number.isInteger(mapped.playerId) || mapped.playerId <= 0 || !mapped.displayName) {
        continue
      }
      if (!dedupedPlayers.has(mapped.playerId)) {
        dedupedPlayers.set(mapped.playerId, mapped)
      }
    }

    const players = [...dedupedPlayers.values()]
    if (repository) {
      await repository.replaceTeamPlayers(teamCode, players)
    }
    imported.push({
      teamCode,
      teamName,
      count: players.length,
    })
  }

  if (viaAdminApi) {
    const adminEmail = env.ADMIN_BOOTSTRAP_EMAILS[0]
    const adminPassword = env.ADMIN_BOOTSTRAP_PASSWORD
    if (!adminEmail || !adminPassword) {
      throw new Error('ADMIN_BOOTSTRAP_EMAILS / ADMIN_BOOTSTRAP_PASSWORD are required for --via-admin-api.')
    }

    const loginResponse = await fetch(`${env.PUBLIC_WEB_URL}/api/admin/login`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email: adminEmail,
        password: adminPassword,
      }),
    })

    if (!loginResponse.ok) {
      throw new Error(`Admin login failed with status ${loginResponse.status}.`)
    }

    const setCookieHeader = loginResponse.headers.get('set-cookie')
    if (!setCookieHeader) {
      throw new Error('Admin login did not return a session cookie.')
    }
    const sessionCookie = setCookieHeader.split(';', 1)[0]

    for (const item of imported) {
      const teamPayload = payload[item.teamName]
      const dedupedPlayers = new Map<number, SoccerversePlayerRecord>()
      for (const sourcePlayer of teamPayload.players ?? []) {
        const mapped = mapPlayer(sourcePlayer, item.teamCode)
        if (!Number.isInteger(mapped.playerId) || mapped.playerId <= 0 || !mapped.displayName) {
          continue
        }
        if (!dedupedPlayers.has(mapped.playerId)) {
          dedupedPlayers.set(mapped.playerId, mapped)
        }
      }

      const response = await fetch(`${env.PUBLIC_WEB_URL}/api/admin/teams/${item.teamCode}/selections`, {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          cookie: sessionCookie,
        },
        body: JSON.stringify({
          players: [...dedupedPlayers.values()],
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Import failed for ${item.teamCode} with status ${response.status}: ${errorText}`)
      }
    }
  }

  imported.sort((left, right) => left.teamCode.localeCompare(right.teamCode))

  console.log(`${dryRun ? 'Prepared' : 'Imported'} ${imported.length} teams from ${path.basename(sourcePath)}`)
  for (const item of imported) {
    console.log(`${item.teamCode}\t${item.count}\t${item.teamName}`)
  }

  if (missingTeams.length > 0) {
    console.log('')
    console.log(`Unmapped source teams (${missingTeams.length}):`)
    for (const teamName of missingTeams) {
      console.log(`- ${teamName}`)
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
