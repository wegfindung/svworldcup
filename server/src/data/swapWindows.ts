import { env } from '../config/env.js'
import type { FixtureSeed } from '../domain/types.js'
import { allTeamsCompletedNthEpoch, firstKickoffEpochOfRound } from '../lib/tournamentRounds.js'
import { fixtureKickoffEpoch } from './competitionWindow.js'
import { fixtures as seededFixtures } from './worldCupSeed.js'

// Player-swap windows. See architecture/SOP_scoring_and_leagues.md "Player Swaps".
// Each window closes at the next round's first kickoff (forced by the <=11-full-points-per-round
// rule) and sets the lineup for that round. Windows are data, not hardcoded constants, so adding or
// retiming a window is a config change.

const HOUR_MS = 60 * 60 * 1000

// D — assumed match duration, one tier, biased conservative (no live feed exists). Used by both the
// in-match lock and the window completion basis ("a team has played N once its Nth match has had
// time to finish"). Overridable via SWAP_IN_MATCH_HOURS.
export function inMatchDurationMs() {
  return (env.SWAP_IN_MATCH_HOURS ?? 3) * HOUR_MS
}

// W3 is the fixed rest-day window before the quarter-finals (2026-07-08); its close is the
// tournament-wide hard stop. Overridable via SWAP_W3_OPENS_AT / SWAP_W3_CLOSES_AT.
const DEFAULT_W3_OPENS_EPOCH = Date.UTC(2026, 6, 8, 0, 0, 0)
const DEFAULT_W3_CLOSES_EPOCH = Date.UTC(2026, 6, 9, 0, 0, 0)

function w3OpensEpoch() {
  return env.SWAP_W3_OPENS_AT ? env.SWAP_W3_OPENS_AT.getTime() : DEFAULT_W3_OPENS_EPOCH
}

function w3ClosesEpoch() {
  return env.SWAP_W3_CLOSES_AT ? env.SWAP_W3_CLOSES_AT.getTime() : DEFAULT_W3_CLOSES_EPOCH
}

export interface SwapWindow {
  key: string
  opensAt: number // epoch ms, inclusive
  closesAt: number // epoch ms, exclusive
  swapLimit: number
  targetRound: number // the round this window's swaps set the lineup for
}

// W1/W2 derive their open/close instants from the fixtures table (self-correcting if a kickoff is
// rescheduled); W3 is the fixed epoch above. A window whose instants cannot be derived (e.g. a round
// not yet seeded) is dropped rather than guessed.
export function buildSwapWindows(fixtures: FixtureSeed[] = seededFixtures): SwapWindow[] {
  const d = inMatchDurationMs()
  const windows: SwapWindow[] = []

  const w1Opens = allTeamsCompletedNthEpoch(1, fixtures, d)
  const w1Closes = firstKickoffEpochOfRound(2, fixtures)
  if (w1Opens != null && w1Closes != null) {
    windows.push({ key: 'W1', opensAt: w1Opens, closesAt: w1Closes, swapLimit: env.SWAP_LIMIT_W1 ?? 2, targetRound: 2 })
  }

  const w2Opens = allTeamsCompletedNthEpoch(2, fixtures, d)
  const w2Closes = firstKickoffEpochOfRound(3, fixtures)
  if (w2Opens != null && w2Closes != null) {
    windows.push({ key: 'W2', opensAt: w2Opens, closesAt: w2Closes, swapLimit: env.SWAP_LIMIT_W2 ?? 2, targetRound: 3 })
  }

  // W3 targets the quarter-final (round 6); the round of 32/16 run swap-free and inherit round 3.
  windows.push({ key: 'W3', opensAt: w3OpensEpoch(), closesAt: w3ClosesEpoch(), swapLimit: env.SWAP_LIMIT_W3 ?? 4, targetRound: 6 })

  return windows.sort((left, right) => left.opensAt - right.opensAt)
}

export function getOpenSwapWindow(now = Date.now(), fixtures: FixtureSeed[] = seededFixtures): SwapWindow | null {
  return buildSwapWindows(fixtures).find((window) => now >= window.opensAt && now < window.closesAt) ?? null
}

// Hard stop = the close of the last window (W3). After this, no swap is ever allowed.
export function swapHardStopEpoch(fixtures: FixtureSeed[] = seededFixtures): number {
  return Math.max(...buildSwapWindows(fixtures).map((window) => window.closesAt))
}

export function hasSwapHardStopPassed(now = Date.now(), fixtures: FixtureSeed[] = seededFixtures): boolean {
  return now >= swapHardStopEpoch(fixtures)
}

// In-match lock: is this nation's team between kickoff and kickoff + D right now? A UX/defensive
// guard only — scoring is already protected by the per-round freeze (a swap only affects rounds
// whose first kickoff is still in the future). Dormant under the final window design (every window
// sits in a match-free gap); fires only if a window is reconfigured to overlap live matches.
export function isNationInMatch(nationCode: string, now = Date.now(), fixtures: FixtureSeed[] = seededFixtures): boolean {
  const d = inMatchDurationMs()
  return fixtures.some((fixture) => {
    if (fixture.homeTeamCode !== nationCode && fixture.awayTeamCode !== nationCode) {
      return false
    }
    const kickoff = fixtureKickoffEpoch(fixture)
    return kickoff != null && now >= kickoff && now < kickoff + d
  })
}
