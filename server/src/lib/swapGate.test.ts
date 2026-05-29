import { describe, expect, it } from 'vitest'
import { assertSwapAllowed, SwapValidationError, type SwapGateContext } from './swapGate.js'

function at(isoString: string) {
  return new Date(isoString).getTime()
}

// Inside W1 (2026-06-18 05:00 -> 16:00 UTC); no team is mid-match at 08:00.
const W1_TIME = at('2026-06-18T08:00:00Z')

function context(overrides: Partial<SwapGateContext> = {}): SwapGateContext {
  return {
    isLocked: true,
    isComplete: true,
    nationsInvolved: ['MEX', 'BRA'],
    swapsUsedInWindow: 0,
    now: W1_TIME,
    ...overrides,
  }
}

describe('assertSwapAllowed', () => {
  it('returns the open window when all conditions pass', () => {
    const window = assertSwapAllowed(context())
    expect(window.key).toBe('W1')
    expect(window.targetRound).toBe(2)
  })

  it('rejects an unlocked or incomplete squad', () => {
    expect(() => assertSwapAllowed(context({ isLocked: false }))).toThrow(SwapValidationError)
    expect(() => assertSwapAllowed(context({ isComplete: false }))).toThrow(SwapValidationError)
  })

  it('rejects when no window is open (between W1 and W2)', () => {
    expect(() => assertSwapAllowed(context({ now: at('2026-06-20T00:00:00Z') }))).toThrow(/No swap window/)
  })

  it('rejects after the hard stop', () => {
    expect(() => assertSwapAllowed(context({ now: at('2026-07-09T00:00:00Z') }))).toThrow(/closed for the rest/)
  })

  it('rejects when an involved nation is mid-match', () => {
    // The in-match guard is dormant under the seeded calendar (every window sits in a match-free
    // gap). To exercise it honestly we need a window open AND a nation live: the always-present W3
    // window (2026-07-08) with a custom fixture kicking off inside it.
    const liveFixtures = [
      { fixtureId: 'ko-1', groupKey: 'KO', kickoffDate: '2026-07-08', kickoffTimeUtc: '12:00:00', homeTeamCode: 'XXX', awayTeamCode: 'YYY' },
    ]
    expect(() =>
      assertSwapAllowed(context({ nationsInvolved: ['XXX'], now: at('2026-07-08T12:30:00Z'), fixtures: liveFixtures })),
    ).toThrow(/currently playing/)
  })

  it('rejects when the window swap limit is reached', () => {
    expect(() => assertSwapAllowed(context({ swapsUsedInWindow: 2 }))).toThrow(/limit reached/)
    // one below the limit still passes
    expect(assertSwapAllowed(context({ swapsUsedInWindow: 1 })).key).toBe('W1')
  })
})
