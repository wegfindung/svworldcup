import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import type { MatchImportPlayerMapEntry, MatchImportSkipNameEntry, TeamPoolPlayer } from '../server/src/domain/types.js'
import { resolvePlayer, type PlayerResolutionContext } from '../server/src/lib/playerResolution.js'
import { resolveTeamCode } from '../server/src/lib/teamLookup.js'
import { getCommunityPlayerName } from '../server/src/services/communityPack.js'

// `pg` lives in server/node_modules; tools/ has no own deps, so resolve from there.
const require = createRequire(new URL('../server/package.json', import.meta.url))
const { Pool } = require('pg') as typeof import('pg')

// Pre-import dry run for a provider feed CSV: runs the REAL resolution pipeline
// (lib/playerResolution.ts — persisted name map -> skip list -> exact pool match ->
// name-form match) over every played row and reports, per team, what auto-resolves, what
// is auto-skipped, and what the admin will have to resolve or skip by hand — plus how
// many locked squads hold each resolved player (the scoring impact). Read-only.
//
// Usage (from server/):
//   npx tsx ../tools/check-feed-pool-coverage.ts <path-to-feed.csv> [--db <postgres-url>]
// The database comes from --db or the DATABASE_URL environment variable.

interface FeedRow {
  teamName: string
  player: string
  minutes: string
}

function parseFeedRows(text: string): FeedRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
  if (lines.length < 2) {
    throw new Error('The CSV needs a header row and at least one player row.')
  }
  const delimiter = lines[0].includes('\t') ? '\t' : ','
  const header = lines[0].split(delimiter).map((cell) => cell.trim().toLowerCase())
  for (const column of ['team', 'player', 'minutes']) {
    if (!header.includes(column)) {
      throw new Error(`The CSV header is missing the "${column}" column.`)
    }
  }
  return lines.slice(1).map((line) => {
    const cells = line.split(delimiter)
    const cell = (column: string) => cells[header.indexOf(column)]?.trim() ?? ''
    return { teamName: cell('team'), player: cell('player'), minutes: cell('minutes') }
  })
}

async function main() {
  const args = process.argv.slice(2)
  const dbFlagIndex = args.indexOf('--db')
  const databaseUrl = dbFlagIndex >= 0 ? args[dbFlagIndex + 1] : process.env.DATABASE_URL
  const csvPath = args.filter((_, index) => index !== dbFlagIndex && index !== dbFlagIndex + 1)[0]
  if (!csvPath || !databaseUrl) {
    throw new Error('Usage: npx tsx ../tools/check-feed-pool-coverage.ts <feed.csv> [--db <postgres-url>]')
  }

  const rows = parseFeedRows(readFileSync(csvPath, 'utf8'))
  const played = rows.filter((row) => row.minutes !== '')
  const codeFor = (teamName: string) => resolveTeamCode(teamName) ?? teamName.toUpperCase()
  const teamCodes = [...new Set(rows.map((row) => codeFor(row.teamName)))]

  const pool = new Pool({ connectionString: databaseUrl, max: 1 })
  try {
    const poolRows = await pool.query<{ team_code: string; player_id: number; display_name: string }>(
      `SELECT sel.team_code, p.player_id, p.display_name
         FROM world_cup_team_selections sel
         JOIN world_cup_players p ON p.player_id = sel.player_id
        WHERE sel.team_code = ANY($1)`,
      [teamCodes],
    )
    const mapRows = await pool.query<{ team_code: string; normalized_source_name: string; player_id: number }>(
      'SELECT team_code, normalized_source_name, player_id FROM match_import_player_map WHERE team_code = ANY($1)',
      [teamCodes],
    )
    const skipRows = await pool.query<{ team_code: string; normalized_source_name: string }>(
      'SELECT team_code, normalized_source_name FROM match_import_skip_names WHERE team_code = ANY($1)',
      [teamCodes],
    )
    const draftRows = await pool.query<{ player_id: number; squad_count: string }>(
      `SELECT ss.player_id, count(DISTINCT sq.participant_id) AS squad_count
         FROM squad_slots ss
         JOIN squads sq ON sq.squad_id = ss.squad_id
         JOIN world_cup_team_selections sel ON sel.player_id = ss.player_id
        WHERE sq.is_locked AND sel.team_code = ANY($1)
        GROUP BY ss.player_id`,
      [teamCodes],
    )

    const draftedBy = new Map(draftRows.rows.map((row) => [row.player_id, Number(row.squad_count)]))
    const mapEntries: MatchImportPlayerMapEntry[] = mapRows.rows.map((row, index) => ({
      mapId: `map-${index}`,
      teamCode: row.team_code,
      normalizedSourceName: row.normalized_source_name,
      playerId: row.player_id,
      createdBy: 'tool',
      createdAt: '',
    }))
    const skipNames: MatchImportSkipNameEntry[] = skipRows.rows.map((row, index) => ({
      skipId: `skip-${index}`,
      teamCode: row.team_code,
      normalizedSourceName: row.normalized_source_name,
      createdBy: 'tool',
      createdAt: '',
    }))
    const poolNameById = new Map(poolRows.rows.map((row) => [row.player_id, row.display_name]))

    // Same enrichment production resolution uses: each pool player's CURRENT community-pack
    // name as an alias. Best-effort — a pack failure degrades to stored names only.
    let packNamesByPlayerId: Map<number, string> | undefined
    try {
      const entries = await Promise.all(
        poolRows.rows.map(async (row) => [row.player_id, await getCommunityPlayerName(row.player_id)] as const),
      )
      packNamesByPlayerId = new Map()
      for (const [playerId, name] of entries) {
        if (name) {
          packNamesByPlayerId.set(playerId, name)
        }
      }
    } catch (error) {
      console.warn(`community pack unavailable — matching on stored names only (${(error as Error).message})`)
    }

    for (const teamCode of teamCodes) {
      const teamPool: TeamPoolPlayer[] = poolRows.rows
        .filter((row) => row.team_code === teamCode)
        .map((row) => ({
          teamCode,
          playerId: row.player_id,
          displayName: row.display_name,
          nationalityCode: '',
          rating: 0,
          capCost: 0,
          positions: [],
          positionClasses: [],
          imageUrl: '',
        }))
      const context: PlayerResolutionContext = { mapEntries, skipNames, teamPool, packNamesByPlayerId }
      const teamPlayed = played.filter((row) => codeFor(row.teamName) === teamCode)

      const resolved: string[] = []
      const skipped: string[] = []
      const unresolved: string[] = []
      for (const row of teamPlayed) {
        const resolution = resolvePlayer(row.player, teamCode, context)
        if (resolution.status === 'resolved') {
          resolved.push(
            `${row.player}  ->  ${poolNameById.get(resolution.playerId) ?? '?'} (#${resolution.playerId}, drafted by ${draftedBy.get(resolution.playerId) ?? 0})`,
          )
        } else if (resolution.status === 'skipped') {
          skipped.push(row.player)
        } else {
          unresolved.push(`${row.player}  (${resolution.reason})`)
        }
      }

      console.log(`\n=== ${teamCode} — ${teamPlayed.length} played rows, pool size ${teamPool.length} ===`)
      console.log(`auto-resolves: ${resolved.length}`)
      for (const line of resolved) console.log(`  + ${line}`)
      if (skipped.length) {
        console.log(`auto-skipped (skip list): ${skipped.length}`)
        for (const name of skipped) console.log(`  - ${name}`)
      }
      console.log(`needs manual resolve/skip: ${unresolved.length}`)
      for (const line of unresolved) console.log(`  ! ${line}`)
    }
  } finally {
    await pool.end()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
