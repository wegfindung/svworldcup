import type {
  CreateMatchBatchInput,
  CreateMatchBatchRowInput,
  MatchResolution,
  ResolutionOverride,
} from '../domain/types.js'
import { MatchImportValidationError } from './matchImportError.js'
import { normalizeName } from './normalizeName.js'

interface MemoryWrite {
  teamCode: string
  normalizedSourceName: string
}

export interface FinalizedSubmission {
  batchInput: CreateMatchBatchInput
  // D9: names the admin manually resolved — written back to the player-map so they never
  // need re-resolving. D12: names the admin chose to skip — written to the skip list.
  mappingWrites: Array<MemoryWrite & { playerId: number }>
  skipWrites: MemoryWrite[]
}

function overrideKey(teamCode: string, sourceName: string): string {
  return `${teamCode}:${normalizeName(sourceName)}`
}

// Fix 7 + Fix A: apply the admin's pre-persist choices — resolve/skip plus optional stat
// edits — assert every row is now resolved or skipped, and build the batch input plus the
// D9/D12 memory writes. A row still unresolved with no override means the submission cannot
// be persisted.
export function finalizeSubmission(
  resolution: MatchResolution,
  overrides: ResolutionOverride[],
  createdBy: string,
): FinalizedSubmission {
  const overrideByKey = new Map<string, ResolutionOverride>()
  for (const override of overrides) {
    overrideByKey.set(overrideKey(override.teamCode, override.sourceName), override)
  }

  const rows: CreateMatchBatchRowInput[] = []
  const mappingWrites: FinalizedSubmission['mappingWrites'] = []
  const skipWrites: MemoryWrite[] = []

  for (const row of resolution.rows) {
    const override = overrideByKey.get(overrideKey(row.teamCode, row.sourceName))
    const normalizedSourceName = normalizeName(row.sourceName)

    if (override?.skip) {
      skipWrites.push({ teamCode: row.teamCode, normalizedSourceName })
      continue
    }

    let playerId: number
    if (override?.playerId !== undefined) {
      playerId = override.playerId
      mappingWrites.push({ teamCode: row.teamCode, normalizedSourceName, playerId })
    } else if (row.resolution.status === 'resolved') {
      playerId = row.resolution.playerId
    } else {
      throw new MatchImportValidationError(
        `"${row.sourceName}" is still unresolved — every player must be resolved or skipped before submitting.`,
      )
    }

    // Fix A: resolve-stage stat edits ride in on the override; each falls back to the
    // parsed value when not edited (?? not ||, so an edited 0 is kept).
    const minutes = override?.minutes ?? row.minutes
    // Auto-derive clean-sheet eligibility from real match data: the player lasted 60+ minutes
    // and their team conceded none (the opposing side's goals from the match result, which is
    // more authoritative than summing per-player goals — own goals are the known weak point).
    // An admin can still override it per row after promotion (UpdateMatchRowInput.cleanSheetEligible);
    // that manual fix wins. Forwards are zeroed regardless by the position weight in the scoring engine.
    const concededGoals = row.teamCode === resolution.homeTeamCode ? resolution.awayGoals : resolution.homeGoals

    rows.push({
      sourceName: row.sourceName,
      teamCode: row.teamCode,
      playerId,
      lineupStatus: override?.lineupStatus ?? row.lineupStatus,
      minutes,
      goals: override?.goals ?? row.goals,
      assists: override?.assists ?? row.assists,
      rating: override?.rating ?? row.rating,
      cleanSheetEligible: minutes >= 60 && concededGoals === 0,
    })
  }

  return {
    batchInput: {
      fixtureId: resolution.fixtureId,
      sourceUrl: resolution.sourceUrl,
      homeGoals: resolution.homeGoals,
      awayGoals: resolution.awayGoals,
      createdBy,
      rows,
    },
    mappingWrites,
    skipWrites,
  }
}
