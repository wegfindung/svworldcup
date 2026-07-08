import type { FixtureSeed } from '../domain/types.js'

export interface KnockoutScheduleSlot {
  groupKey: string
  kickoffDate: string
  kickoffTimeUtc: string
  // Optional override for the date baked into the fixtureId (see playoffFixtureId). Set ONLY when a
  // kickoff correction moves a match across a UTC day boundary AFTER the fixture was already
  // materialized, so the id stays stable and the existing DB row is UPDATEd in place rather than
  // orphaned as a duplicate. kickoffDate/kickoffTimeUtc still carry the true (corrected) kickoff.
  idDate?: string
}

export const knockoutSchedule: Record<number, KnockoutScheduleSlot> = {
  73: { groupKey: 'R32', kickoffDate: '2026-06-28', kickoffTimeUtc: '19:00:00' },
  74: { groupKey: 'R32', kickoffDate: '2026-06-29', kickoffTimeUtc: '20:30:00' },
  75: { groupKey: 'R32', kickoffDate: '2026-06-30', kickoffTimeUtc: '01:00:00' },
  76: { groupKey: 'R32', kickoffDate: '2026-06-29', kickoffTimeUtc: '17:00:00' },
  77: { groupKey: 'R32', kickoffDate: '2026-06-30', kickoffTimeUtc: '21:00:00' },
  78: { groupKey: 'R32', kickoffDate: '2026-06-30', kickoffTimeUtc: '17:00:00' },
  79: { groupKey: 'R32', kickoffDate: '2026-07-01', kickoffTimeUtc: '01:00:00' },
  80: { groupKey: 'R32', kickoffDate: '2026-07-01', kickoffTimeUtc: '16:00:00' },
  81: { groupKey: 'R32', kickoffDate: '2026-07-02', kickoffTimeUtc: '00:00:00' },
  82: { groupKey: 'R32', kickoffDate: '2026-07-01', kickoffTimeUtc: '20:00:00' },
  83: { groupKey: 'R32', kickoffDate: '2026-07-02', kickoffTimeUtc: '23:00:00' },
  84: { groupKey: 'R32', kickoffDate: '2026-07-02', kickoffTimeUtc: '19:00:00' },
  85: { groupKey: 'R32', kickoffDate: '2026-07-03', kickoffTimeUtc: '03:00:00' },
  86: { groupKey: 'R32', kickoffDate: '2026-07-03', kickoffTimeUtc: '22:00:00' },
  87: { groupKey: 'R32', kickoffDate: '2026-07-04', kickoffTimeUtc: '01:30:00' },
  88: { groupKey: 'R32', kickoffDate: '2026-07-03', kickoffTimeUtc: '18:00:00' },
  89: { groupKey: 'R16', kickoffDate: '2026-07-04', kickoffTimeUtc: '21:00:00' },
  90: { groupKey: 'R16', kickoffDate: '2026-07-04', kickoffTimeUtc: '17:00:00' },
  91: { groupKey: 'R16', kickoffDate: '2026-07-05', kickoffTimeUtc: '20:00:00' },
  92: { groupKey: 'R16', kickoffDate: '2026-07-06', kickoffTimeUtc: '00:00:00' },
  93: { groupKey: 'R16', kickoffDate: '2026-07-06', kickoffTimeUtc: '19:00:00' },
  94: { groupKey: 'R16', kickoffDate: '2026-07-07', kickoffTimeUtc: '00:00:00' },
  95: { groupKey: 'R16', kickoffDate: '2026-07-07', kickoffTimeUtc: '16:00:00' },
  // Corrected 2026-07-08: real kickoff is 2026-07-07 20:00 UTC (was mis-scheduled as 07-08 01:00).
  // idDate pins the fixtureId to 2026-07-08-r16-96 (the already-materialized row) so it updates in place.
  96: { groupKey: 'R16', kickoffDate: '2026-07-07', kickoffTimeUtc: '20:00:00', idDate: '2026-07-08' },
  // Corrected 2026-07-08: real kickoff 2026-07-09 20:00 UTC. idDate pins the id to the already-
  // materialized 2026-07-10-qf-97 (date moved back a UTC day) so the row updates in place.
  97: { groupKey: 'QF', kickoffDate: '2026-07-09', kickoffTimeUtc: '20:00:00', idDate: '2026-07-10' },
  98: { groupKey: 'QF', kickoffDate: '2026-07-10', kickoffTimeUtc: '19:00:00' },
  99: { groupKey: 'QF', kickoffDate: '2026-07-11', kickoffTimeUtc: '21:00:00' },
  // Corrected 2026-07-08: real kickoff 2026-07-12 01:00 UTC. idDate pins the id to the already-
  // materialized 2026-07-11-qf-100 (date moved forward a UTC day) so the row updates in place.
  100: { groupKey: 'QF', kickoffDate: '2026-07-12', kickoffTimeUtc: '01:00:00', idDate: '2026-07-11' },
  // Corrected 2026-07-08: real kickoff 2026-07-14 19:00 UTC (was 07-15 01:00). No idDate: the SF is
  // not materialized yet (its QF feeders are unplayed), so it takes the corrected date cleanly.
  101: { groupKey: 'SF', kickoffDate: '2026-07-14', kickoffTimeUtc: '19:00:00' },
  102: { groupKey: 'SF', kickoffDate: '2026-07-15', kickoffTimeUtc: '19:00:00' },
  103: { groupKey: '3P', kickoffDate: '2026-07-18', kickoffTimeUtc: '21:00:00' },
  104: { groupKey: 'FINAL', kickoffDate: '2026-07-19', kickoffTimeUtc: '19:00:00' },
}

export const roundOf32Templates = [
  { match: 73, home: { rank: 2, group: 'A' }, away: { rank: 2, group: 'B' } },
  { match: 74, home: { rank: 1, group: 'E' }, thirdAway: ['A', 'B', 'C', 'D', 'F'] },
  { match: 75, home: { rank: 1, group: 'F' }, away: { rank: 2, group: 'C' } },
  { match: 76, home: { rank: 1, group: 'C' }, away: { rank: 2, group: 'F' } },
  { match: 77, home: { rank: 1, group: 'I' }, thirdAway: ['C', 'D', 'F', 'G', 'H'] },
  { match: 78, home: { rank: 2, group: 'E' }, away: { rank: 2, group: 'I' } },
  { match: 79, home: { rank: 1, group: 'A' }, thirdAway: ['C', 'E', 'F', 'H', 'I'] },
  { match: 80, home: { rank: 1, group: 'L' }, thirdAway: ['E', 'H', 'I', 'J', 'K'] },
  { match: 81, home: { rank: 1, group: 'D' }, thirdAway: ['B', 'E', 'F', 'I', 'J'] },
  { match: 82, home: { rank: 1, group: 'G' }, thirdAway: ['A', 'E', 'H', 'I', 'J'] },
  { match: 83, home: { rank: 2, group: 'K' }, away: { rank: 2, group: 'L' } },
  { match: 84, home: { rank: 1, group: 'H' }, away: { rank: 2, group: 'J' } },
  { match: 85, home: { rank: 1, group: 'B' }, thirdAway: ['E', 'F', 'G', 'I', 'J'] },
  { match: 86, home: { rank: 1, group: 'J' }, away: { rank: 2, group: 'H' } },
  { match: 87, home: { rank: 1, group: 'K' }, thirdAway: ['D', 'E', 'I', 'J', 'L'] },
  { match: 88, home: { rank: 2, group: 'D' }, away: { rank: 2, group: 'G' } },
] as const

export const winnerBracket = [
  { match: 89, home: 74, away: 77 },
  { match: 90, home: 73, away: 75 },
  { match: 91, home: 76, away: 78 },
  { match: 92, home: 79, away: 80 },
  { match: 93, home: 83, away: 84 },
  { match: 94, home: 81, away: 82 },
  { match: 95, home: 86, away: 88 },
  { match: 96, home: 85, away: 87 },
  { match: 97, home: 89, away: 90 },
  { match: 98, home: 93, away: 94 },
  { match: 99, home: 91, away: 92 },
  { match: 100, home: 95, away: 96 },
  { match: 101, home: 97, away: 98 },
  { match: 102, home: 99, away: 100 },
] as const

export function playoffFixtureId(matchNumber: number) {
  const schedule = knockoutSchedule[matchNumber]
  if (!schedule) {
    throw new Error(`Missing knockout schedule for match ${matchNumber}`)
  }
  return `${schedule.idDate ?? schedule.kickoffDate}-${schedule.groupKey.toLowerCase()}-${matchNumber}`
}

export function playoffMatchNumberFromFixtureId(fixtureId: string): number | null {
  const match = /-(\d+)$/.exec(fixtureId)
  if (!match) {
    return null
  }
  const matchNumber = Number(match[1])
  return knockoutSchedule[matchNumber] ? matchNumber : null
}

export function knockoutFixture(matchNumber: number, homeTeamCode: string, awayTeamCode: string): FixtureSeed {
  const schedule = knockoutSchedule[matchNumber]
  if (!schedule) {
    throw new Error(`Missing knockout schedule for match ${matchNumber}`)
  }

  return {
    fixtureId: playoffFixtureId(matchNumber),
    groupKey: schedule.groupKey,
    kickoffDate: schedule.kickoffDate,
    kickoffTimeUtc: schedule.kickoffTimeUtc,
    homeTeamCode,
    awayTeamCode,
  }
}

export const officialRoundOf32Fixtures: FixtureSeed[] = [
  knockoutFixture(73, 'RSA', 'CAN'),
  knockoutFixture(74, 'GER', 'PAR'),
  knockoutFixture(75, 'NED', 'MAR'),
  knockoutFixture(76, 'BRA', 'JPN'),
  knockoutFixture(77, 'FRA', 'SWE'),
  knockoutFixture(78, 'CIV', 'NOR'),
  knockoutFixture(79, 'MEX', 'ECU'),
  knockoutFixture(80, 'ENG', 'COD'),
  knockoutFixture(81, 'USA', 'BIH'),
  knockoutFixture(82, 'BEL', 'SEN'),
  knockoutFixture(83, 'POR', 'CRO'),
  knockoutFixture(84, 'ESP', 'AUT'),
  knockoutFixture(85, 'SUI', 'ALG'),
  knockoutFixture(86, 'ARG', 'CPV'),
  knockoutFixture(87, 'COL', 'GHA'),
  knockoutFixture(88, 'AUS', 'EGY'),
]
