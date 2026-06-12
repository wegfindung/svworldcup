import { describe, expect, it } from 'vitest'
import type { MatchEntryRecord, SlotClass, TeamPoolPlayer } from '../domain/types.js'
import { buildPlayerPointsLeaderboard } from './playerPointsLeaderboard.js'

function player(playerId: number, positions: string[], positionClasses: SlotClass[]): TeamPoolPlayer {
  return {
    teamCode: 'AAA',
    playerId,
    displayName: `Player ${playerId}`,
    nationalityCode: 'AAA',
    rating: 70,
    capCost: 100_000,
    positions,
    positionMain: positions[0],
    positionClasses,
    imageUrl: `https://example.test/${playerId}.png`,
  }
}

function entry(
  fixtureId: string,
  playerId: number,
  opts: { minutes?: number; goals?: number; assists?: number; rating?: number; cleanSheetEligible?: boolean } = {},
): MatchEntryRecord {
  return {
    entryId: `${fixtureId}-${playerId}`,
    fixtureId,
    playerId,
    inOfficialSquad: true,
    minutes: opts.minutes ?? 90,
    goals: opts.goals ?? 0,
    assists: opts.assists ?? 0,
    cleanSheetEligible: opts.cleanSheetEligible ?? false,
    rating: opts.rating,
    sourceNote: 'test',
  }
}

// One of each position class so per-position clean-sheet folding can be checked.
const playersByTeam = new Map<string, TeamPoolPlayer[]>([
  [
    'AAA',
    [
      player(1, ['GK'], ['GK']),
      player(2, ['CB'], ['DEF']),
      player(3, ['DMC'], ['MID']), // DM variant → MID clean sheet pays
      player(4, ['CM'], ['MID']), // central mid, no DM → MID clean sheet is 0
      player(5, ['ST'], ['FWD']),
      player(6, ['CB', 'DMC'], ['DEF', 'MID']), // versatile → appears under DEF and MID
    ],
  ],
])

describe('buildPlayerPointsLeaderboard', () => {
  it('accumulates base points across fixtures and folds clean sheet per eligible position', () => {
    const { summary, items } = buildPlayerPointsLeaderboard(playersByTeam, [
      // GK keeps two clean sheets across both fixtures, sub-6 rating (0 performance).
      entry('fixture-1', 1, { rating: 5, cleanSheetEligible: true }),
      entry('fixture-2', 1, { rating: 5, cleanSheetEligible: true }),
      // DEF scores once and keeps a clean sheet, rating 8.0 → 1.0 performance.
      entry('fixture-1', 2, { goals: 1, rating: 8, cleanSheetEligible: true }),
      // DM-MID assists, rating 6.0 → 0.5 performance, clean sheet pays MID.
      entry('fixture-1', 3, { assists: 1, rating: 6, cleanSheetEligible: true }),
      // Non-DM MID, clean sheet kept but pays nothing, sub-6 rating.
      entry('fixture-1', 4, { rating: 5, cleanSheetEligible: true }),
      // FWD scores twice, rating 9.5 → 1.5 performance, clean sheet pays nothing.
      entry('fixture-1', 5, { goals: 2, rating: 9.5, cleanSheetEligible: true }),
      // Versatile DEF/MID, clean sheet kept, sub-6 rating.
      entry('fixture-1', 6, { rating: 5, cleanSheetEligible: true }),
      // Entry for a player outside every pool — must be ignored.
      entry('fixture-1', 999, { goals: 5, cleanSheetEligible: true }),
    ])

    expect(summary).toEqual({ fixturesCounted: 2, playersRanked: 6 })

    const byId = new Map(items.map((row) => [row.playerId, row]))

    // GK: 2×(appearance 1 + minute 1 + perf 0) base = 4; GK clean sheet 4×2 = 8.
    expect(byId.get(1)).toMatchObject({ basePoints: 4, appearances: 2, minutes: 180, cleanSheetByPosition: [{ slotClass: 'GK', points: 8 }] })
    // DEF: goal 5 + appearance 1 + minute 1 + perf 1 = 8; DEF clean sheet 3.
    expect(byId.get(2)).toMatchObject({ basePoints: 8, cleanSheetByPosition: [{ slotClass: 'DEF', points: 3 }] })
    // DM-MID: assist 3 + appearance 1 + minute 1 + perf 0.5 = 5.5; MID clean sheet 1.
    expect(byId.get(3)).toMatchObject({ basePoints: 5.5, cleanSheetByPosition: [{ slotClass: 'MID', points: 1 }] })
    // Non-DM MID: appearance 1 + minute 1 = 2; MID clean sheet 0.
    expect(byId.get(4)).toMatchObject({ basePoints: 2, cleanSheetByPosition: [{ slotClass: 'MID', points: 0 }] })
    // FWD: 2 goals 10 + appearance 1 + minute 1 + perf 1.5 = 13.5; FWD clean sheet 0.
    expect(byId.get(5)).toMatchObject({ basePoints: 13.5, cleanSheetByPosition: [{ slotClass: 'FWD', points: 0 }] })
    // Versatile: base 2; DEF clean sheet 3 and MID clean sheet 1 (DMC present) — appears under both.
    expect(byId.get(6)).toMatchObject({
      basePoints: 2,
      cleanSheetByPosition: [
        { slotClass: 'DEF', points: 3 },
        { slotClass: 'MID', points: 1 },
      ],
    })

    // Default ordering is by base points descending.
    expect(items.map((row) => row.playerId).slice(0, 3)).toEqual([5, 2, 3])
  })

  it('returns an empty leaderboard when there are no entries', () => {
    expect(buildPlayerPointsLeaderboard(playersByTeam, [])).toEqual({
      summary: { fixturesCounted: 0, playersRanked: 0 },
      items: [],
    })
  })
})
