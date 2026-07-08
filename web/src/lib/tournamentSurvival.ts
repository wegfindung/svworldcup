import { useEffect, useState } from 'react'
import { eventTeams } from '../data/eventConfig'
import { fetchMatchResults } from './api'
import type { PublicFixtureResult, PublicSquadUsagePayload } from './types'

// Squad-survival + eliminated-player display primitive. Pure, client-side, derived from the public
// /match-results payload — no server or DB change. See SOP_scoring_and_leagues.md
// "Squad survival indicator + eliminated player marker (display)".

const KNOCKOUT_GROUP_KEYS = new Set(['R32', 'R16', 'QF', 'SF', '3P', 'FINAL'])

const tournamentTeamCodes = new Set(eventTeams.map((team) => team.code))

// Winner of a FINAL knockout fixture: goals decide it, else the recorded penalty-shootout winner when
// level. Null while pending or an undecided level score (mirrors ResultsPage winnerCode/loserCode).
function winnerOf(result: PublicFixtureResult): string | null {
  if (result.status !== 'final' || result.homeGoals === null || result.awayGoals === null) {
    return null
  }
  if (result.homeGoals > result.awayGoals) {
    return result.homeTeamCode
  }
  if (result.awayGoals > result.homeGoals) {
    return result.awayTeamCode
  }
  if (result.penaltyWinnerTeamCode === result.homeTeamCode || result.penaltyWinnerTeamCode === result.awayTeamCode) {
    return result.penaltyWinnerTeamCode
  }
  return null
}

export interface TournamentSurvival {
  // True once at least one knockout fixture exists. Before that the indicator is dormant.
  hasKnockoutStarted: boolean
  // Tournament team codes still alive in the knockout bracket.
  aliveTeams: Set<string>
}

// aliveTeams = teams in any knockout fixture minus the loser of every decided knockout fixture.
export function computeSurvival(results: PublicFixtureResult[]): TournamentSurvival {
  const knockout = results.filter((result) => KNOCKOUT_GROUP_KEYS.has(result.groupKey))
  const aliveTeams = new Set<string>()
  for (const result of knockout) {
    aliveTeams.add(result.homeTeamCode)
    aliveTeams.add(result.awayTeamCode)
  }
  for (const result of knockout) {
    const winner = winnerOf(result)
    if (winner) {
      const loser = winner === result.homeTeamCode ? result.awayTeamCode : result.homeTeamCode
      aliveTeams.delete(loser)
    }
  }
  return { hasKnockoutStarted: knockout.length > 0, aliveTeams }
}

// A team is eliminated only once the knockout stage exists, and only for real tournament team codes —
// a Soccerverse-nationality flag code (never a tournament team) must never be mis-marked as out.
export function isTeamEliminated(survival: TournamentSurvival | null, teamCode: string): boolean {
  if (!survival || !survival.hasKnockoutStarted) {
    return false
  }
  if (!tournamentTeamCodes.has(teamCode)) {
    return false
  }
  return !survival.aliveTeams.has(teamCode)
}

// participantId -> the team codes of that manager's 15 drafted players (with multiplicity), inverted
// from the revealed squad-usage payload (same client-side join the Allegiance tab uses). Only revealed
// squads appear; global reveal is on by kickoff, so coverage is effectively complete.
export function teamCodesByParticipant(usage: PublicSquadUsagePayload): Map<string, string[]> {
  const byParticipant = new Map<string, string[]>()
  for (const player of usage.items) {
    for (const manager of player.managers) {
      const list = byParticipant.get(manager.participantId) ?? []
      list.push(player.teamCode)
      byParticipant.set(manager.participantId, list)
    }
  }
  return byParticipant
}

// { remaining, total } surviving players for a manager, or null when their squad isn't covered by the
// usage payload (not revealed). Before the knockout stage everyone counts as in.
export function survivingCount(
  teamCodesMap: Map<string, string[]>,
  survival: TournamentSurvival | null,
  participantId: string,
): { remaining: number; total: number } | null {
  const teams = teamCodesMap.get(participantId)
  if (!teams || teams.length === 0) {
    return null
  }
  if (!survival || !survival.hasKnockoutStarted) {
    return { remaining: teams.length, total: teams.length }
  }
  const remaining = teams.filter((code) => survival.aliveTeams.has(code)).length
  return { remaining, total: teams.length }
}

// Module-cached one-time /match-results read, shared by every PlayerTooltip/PlayerStatsModal and the
// Tables page so the survival set is fetched once per app session.
let cached: TournamentSurvival | null = null
let cachePromise: Promise<TournamentSurvival> | null = null

export function loadTournamentSurvival(): Promise<TournamentSurvival> {
  if (!cachePromise) {
    cachePromise = fetchMatchResults()
      .then((response) => {
        cached = computeSurvival(response.items)
        return cached
      })
      .catch((error) => {
        cachePromise = null // allow a retry on the next call
        throw error
      })
  }
  return cachePromise
}

export function useTournamentSurvival(): TournamentSurvival | null {
  // Initialise from the module cache when warm (no flash, no effect setState needed); otherwise the
  // effect resolves the shared one-time load. Both paths share the same cached promise.
  const [survival, setSurvival] = useState<TournamentSurvival | null>(cached)

  useEffect(() => {
    if (cached) {
      return
    }
    let active = true
    loadTournamentSurvival()
      .then((value) => {
        if (active) {
          setSurvival(value)
        }
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  return survival
}
