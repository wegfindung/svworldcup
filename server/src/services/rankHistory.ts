import type { FixtureSeed, LeagueType } from '../domain/types.js'
import type { CacheableRow } from '../repositories/leaderboardCache.js'

// Only the id + UTC kickoff date are needed; narrowing keeps both the DB FixtureSeed rows and the
// static seed fixtures assignable without requiring the full fixture shape.
type FixtureDay = Pick<FixtureSeed, 'fixtureId' | 'kickoffDate'>

// Per-day RANK HISTORY for a single leaderboard entity (a participant on the Rookie/Veteran board, or
// a nation on the Nations board). Derived from the same cached row set the live boards use, with no
// stored history and no DB change — `rank at end of UTC day D` = the standings using only fixtures
// whose UTC kickoff date <= D. See SOP_scoring_and_leagues.md "Rank History (display)".
//
// The per-day ranking mirrors the live comparators in scoringRepository.ts (rankParticipants /
// buildNationLeaderboard) but is replicated here to avoid a service<->repository import cycle. The
// server tests pin this to the live boards at the final matchday (cumulative through all fixtures =
// the live standings), so the two can never silently diverge.

export type RankHistoryBoardKey = 'rookie' | 'veteran' | 'nations'

export const RANK_HISTORY_BOARDS: readonly RankHistoryBoardKey[] = ['rookie', 'veteran', 'nations']

export function isRankHistoryBoard(value: string): value is RankHistoryBoardKey {
  return (RANK_HISTORY_BOARDS as readonly string[]).includes(value)
}

export interface RankHistoryPoint {
  /** UTC matchday, `YYYY-MM-DD`. */
  date: string
  rank: number
  /** Cumulative score as of the end of that UTC day — total for a participant, average for a nation. */
  score: number
}

export interface RankHistoryResult {
  board: RankHistoryBoardKey
  /** participantId for rookie/veteran, teamCode for nations. */
  id: string
  displayName: string
  points: RankHistoryPoint[]
  /** Number of ranked entities on the board (constant across matchdays). */
  boardSize: number
}

// Mirror of scoringRepository.toTimestamp — invalid dates sort last (a missing registration time must
// never outrank a real one on the tiebreak).
function toTimestamp(value: string) {
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : Number.MAX_SAFE_INTEGER
}

const DATE_PREFIX = /^\d{4}-\d{2}-\d{2}/

// fixtureId -> UTC matchday. kickoffDate is already the UTC calendar date of the kickoff instant
// (kickoffTimeUtc is a UTC wall-clock time on that date), so it is the correct end-of-UTC-day bucket.
// Falls back to the fixtureId's leading `YYYY-MM-DD` (the id format) if a fixture is missing from the
// seed list, so a contribution is never silently dropped from the cumulative sum.
function fixtureDateResolver(fixtures: FixtureDay[]): (fixtureId: string) => string | null {
  const byFixture = new Map<string, string>()
  for (const fixture of fixtures) {
    byFixture.set(fixture.fixtureId, fixture.kickoffDate)
  }
  return (fixtureId: string) => {
    const known = byFixture.get(fixtureId)
    if (known) {
      return known
    }
    const match = fixtureId.match(DATE_PREFIX)
    return match ? match[0] : null
  }
}

interface Cumulative {
  matchdays: string[]
  // participantId -> (matchday -> cumulative total score as of that day, multiplier applied)
  cumByParticipant: Map<string, Map<string, number>>
}

// One pass over every row: bucket each fixture's (base + boost) contribution by UTC matchday, then
// prefix-sum across matchdays and apply the participant's constant budget multiplier. The set of
// matchdays is the union of every row's scored-fixture dates — a date with no scored fixture cannot
// move any rank, so it is omitted (clean step series).
function computeCumulative(rows: CacheableRow[], resolveDate: (fixtureId: string) => string | null): Cumulative {
  const dates = new Set<string>()
  const contributionByParticipant = new Map<string, Map<string, number>>()

  for (const row of rows) {
    const byDate = new Map<string, number>()
    for (const fixture of row.fixtures) {
      const date = resolveDate(fixture.fixtureId)
      if (!date) {
        continue
      }
      dates.add(date)
      const base = fixture.totalPoints
      const bonus = row.fixtureBonusById[fixture.fixtureId] ?? 0
      byDate.set(date, (byDate.get(date) ?? 0) + base + bonus)
    }
    contributionByParticipant.set(row.participantId, byDate)
  }

  const matchdays = [...dates].sort()
  const cumByParticipant = new Map<string, Map<string, number>>()
  for (const row of rows) {
    const byDate = contributionByParticipant.get(row.participantId) ?? new Map<string, number>()
    const cumulative = new Map<string, number>()
    let running = 0
    for (const matchday of matchdays) {
      running += byDate.get(matchday) ?? 0
      cumulative.set(matchday, running * row.scoreMultiplier)
    }
    cumByParticipant.set(row.participantId, cumulative)
  }

  return { matchdays, cumByParticipant }
}

function scoreAt(cum: Cumulative, participantId: string, matchday: string) {
  return cum.cumByParticipant.get(participantId)?.get(matchday) ?? 0
}

// Rookie/Veteran: rank the league's locked participants by per-day score, tiebreaking exactly as the
// live board (score desc -> earliest registration -> display name).
function buildParticipantHistory(
  rows: CacheableRow[],
  cum: Cumulative,
  board: 'rookie' | 'veteran',
  entityId: string,
): RankHistoryResult | null {
  const subset = rows.filter((row) => row.leagueType === (board as LeagueType))
  const entity = subset.find((row) => row.participantId === entityId)
  if (!entity) {
    return null
  }

  const points = cum.matchdays.map((matchday) => {
    const ordered = [...subset].sort(
      (left, right) =>
        scoreAt(cum, right.participantId, matchday) - scoreAt(cum, left.participantId, matchday) ||
        toTimestamp(left.registeredAt) - toTimestamp(right.registeredAt) ||
        left.displayName.localeCompare(right.displayName),
    )
    const index = ordered.findIndex((row) => row.participantId === entityId)
    return { date: matchday, rank: index + 1, score: scoreAt(cum, entityId, matchday) }
  })

  return { board, id: entityId, displayName: entity.displayName, points, boardSize: subset.length }
}

// Nations: aggregate each qualified nation's (>=2 members) per-day member scores into an average +
// top, then rank by average desc -> top desc -> teamCode asc — mirroring buildNationLeaderboard.
// Membership counts a participant on their primary AND optional secondary nation, and is constant
// across matchdays (it is the current locked set).
function buildNationHistory(rows: CacheableRow[], cum: Cumulative, teamCode: string): RankHistoryResult | null {
  const membersByNation = new Map<string, CacheableRow[]>()
  for (const row of rows) {
    for (const code of [row.primaryTeamCode, row.secondaryTeamCode].filter(Boolean) as string[]) {
      const members = membersByNation.get(code) ?? []
      members.push(row)
      membersByNation.set(code, members)
    }
  }

  const qualified = [...membersByNation.entries()].filter(([, members]) => members.length >= 2)
  if (!qualified.some(([code]) => code === teamCode)) {
    return null
  }

  const points = cum.matchdays.map((matchday) => {
    const ranked = qualified
      .map(([code, members]) => {
        const scores = members.map((member) => scoreAt(cum, member.participantId, matchday))
        const average = scores.reduce((sum, value) => sum + value, 0) / scores.length
        const top = Math.max(...scores)
        return { code, average, top }
      })
      .sort((left, right) => right.average - left.average || right.top - left.top || left.code.localeCompare(right.code))
    const index = ranked.findIndex((nation) => nation.code === teamCode)
    return { date: matchday, rank: index + 1, score: ranked[index]?.average ?? 0 }
  })

  return { board: 'nations', id: teamCode, displayName: teamCode, points, boardSize: qualified.length }
}

export function buildRankHistoryForEntity(
  rows: CacheableRow[],
  fixtures: FixtureDay[],
  board: RankHistoryBoardKey,
  entityId: string,
): RankHistoryResult | null {
  const cum = computeCumulative(rows, fixtureDateResolver(fixtures))
  if (board === 'nations') {
    return buildNationHistory(rows, cum, entityId)
  }
  return buildParticipantHistory(rows, cum, board, entityId)
}
