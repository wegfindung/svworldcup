import { fixtureKickoffEpoch } from '../data/competitionWindow.js'
import type { FixtureSeed } from '../domain/types.js'

// The scoring unit is the round. Group matchdays are rounds 1/2/3; knockout rounds follow as
// 4 (round of 32), 5 (round of 16), 6 (quarter-final), 7 (semi-final), 8 (final/third-place).
// A fixture's round is the matchday/round it belongs to. In the group stage both teams in a fixture
// play the same matchday, so a team's Nth chronological fixture is its round-N fixture and both teams
// agree. See architecture/SOP_scoring_and_leagues.md "Per-Round Lineup Freeze".

export const GROUP_STAGE_ROUNDS = 3

interface FixtureWithEpoch {
  fixture: FixtureSeed
  epoch: number
}

function sortedFixturesWithEpoch(fixtures: FixtureSeed[]): FixtureWithEpoch[] {
  return fixtures
    .map((fixture) => ({ fixture, epoch: fixtureKickoffEpoch(fixture) }))
    .filter((entry): entry is FixtureWithEpoch => entry.epoch !== null)
    .sort((left, right) => left.epoch - right.epoch)
}

// Each team's kickoff epochs in chronological order, keyed by team code.
function teamAppearanceEpochs(fixtures: FixtureSeed[]): Map<string, number[]> {
  const byTeam = new Map<string, number[]>()
  for (const { fixture, epoch } of sortedFixturesWithEpoch(fixtures)) {
    for (const code of [fixture.homeTeamCode, fixture.awayTeamCode]) {
      const list = byTeam.get(code) ?? []
      list.push(epoch)
      byTeam.set(code, list)
    }
  }
  return byTeam
}

// fixtureId -> round ordinal. Built once and reused (scoring iterates many fixtures).
export function buildFixtureRoundMap(fixtures: FixtureSeed[]): Map<string, number> {
  // Each team's fixtureId -> its 1-based appearance index.
  const appearanceByTeam = new Map<string, Map<string, number>>()
  const byTeam = new Map<string, FixtureWithEpoch[]>()
  for (const entry of sortedFixturesWithEpoch(fixtures)) {
    for (const code of [entry.fixture.homeTeamCode, entry.fixture.awayTeamCode]) {
      const list = byTeam.get(code) ?? []
      list.push(entry)
      byTeam.set(code, list)
    }
  }
  for (const [code, list] of byTeam) {
    const roundByFixture = new Map<string, number>()
    list.forEach((entry, index) => roundByFixture.set(entry.fixture.fixtureId, index + 1))
    appearanceByTeam.set(code, roundByFixture)
  }

  const roundByFixture = new Map<string, number>()
  for (const fixture of fixtures) {
    const home = appearanceByTeam.get(fixture.homeTeamCode)?.get(fixture.fixtureId)
    const away = appearanceByTeam.get(fixture.awayTeamCode)?.get(fixture.fixtureId)
    // Group-stage fixtures pair same-matchday teams. If the two ever disagree, the earlier (min)
    // round is the safe choice — it never credits a later round's lineup to an earlier fixture.
    const round = home != null && away != null ? Math.min(home, away) : home ?? away ?? null
    if (round != null) {
      roundByFixture.set(fixture.fixtureId, round)
    }
  }
  return roundByFixture
}

export function getFixtureRound(fixtureId: string, fixtures: FixtureSeed[]): number | null {
  return buildFixtureRoundMap(fixtures).get(fixtureId) ?? null
}

// The earliest kickoff epoch among fixtures in the given round. A swap window that targets round N
// closes at this instant for round N (the round locks at its first kickoff). Returns null if no
// fixture for that round is loaded (e.g. knockout rounds not yet seeded).
export function firstKickoffEpochOfRound(round: number, fixtures: FixtureSeed[]): number | null {
  const roundByFixture = buildFixtureRoundMap(fixtures)
  const epochs = fixtures
    .filter((fixture) => roundByFixture.get(fixture.fixtureId) === round)
    .map((fixture) => fixtureKickoffEpoch(fixture))
    .filter((epoch): epoch is number => epoch !== null)
  return epochs.length ? Math.min(...epochs) : null
}

// "All teams have completed their Nth match" on a completion basis: max over every team of
// (their Nth fixture kickoff + durationMs). Returns null if any team has fewer than N fixtures
// loaded. Used to derive when a swap window opens (D = the in-match duration).
export function allTeamsCompletedNthEpoch(n: number, fixtures: FixtureSeed[], durationMs: number): number | null {
  const appearances = teamAppearanceEpochs(fixtures)
  if (appearances.size === 0) {
    return null
  }
  let max = 0
  for (const epochs of appearances.values()) {
    const nth = epochs[n - 1]
    if (nth === undefined) {
      return null
    }
    max = Math.max(max, nth + durationMs)
  }
  return max
}
