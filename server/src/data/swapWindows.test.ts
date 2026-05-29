import { describe, expect, it } from 'vitest'
import {
  buildSwapWindows,
  getOpenSwapWindow,
  hasSwapHardStopPassed,
  isNationInMatch,
  swapHardStopEpoch,
} from './swapWindows.js'

function at(isoString: string) {
  return new Date(isoString).getTime()
}

describe('swap windows', () => {
  const windows = buildSwapWindows()
  const byKey = new Map(windows.map((window) => [window.key, window]))

  it('derives W1, W2 from fixtures and adds the fixed W3', () => {
    expect(windows.map((window) => window.key)).toEqual(['W1', 'W2', 'W3'])
  })

  it('W1: 2026-06-18 05:00 -> 16:00 UTC, limit 2, targets round 2', () => {
    const w1 = byKey.get('W1')!
    expect(new Date(w1.opensAt).toISOString()).toBe('2026-06-18T05:00:00.000Z')
    expect(new Date(w1.closesAt).toISOString()).toBe('2026-06-18T16:00:00.000Z')
    expect(w1.swapLimit).toBe(2)
    expect(w1.targetRound).toBe(2)
  })

  it('W2: 2026-06-24 05:00 -> 19:00 UTC, limit 2, targets round 3', () => {
    const w2 = byKey.get('W2')!
    expect(new Date(w2.opensAt).toISOString()).toBe('2026-06-24T05:00:00.000Z')
    expect(new Date(w2.closesAt).toISOString()).toBe('2026-06-24T19:00:00.000Z')
    expect(w2.swapLimit).toBe(2)
    expect(w2.targetRound).toBe(3)
  })

  it('W3: fixed 2026-07-08 -> 07-09 UTC, limit 4, targets the quarter-final (round 6)', () => {
    const w3 = byKey.get('W3')!
    expect(new Date(w3.opensAt).toISOString()).toBe('2026-07-08T00:00:00.000Z')
    expect(new Date(w3.closesAt).toISOString()).toBe('2026-07-09T00:00:00.000Z')
    expect(w3.swapLimit).toBe(4)
    expect(w3.targetRound).toBe(6)
  })
})

describe('open-window + hard-stop predicates', () => {
  it('reports the open window inside W1 and nothing in the W1->W2 gap', () => {
    expect(getOpenSwapWindow(at('2026-06-18T08:00:00Z'))?.key).toBe('W1')
    expect(getOpenSwapWindow(at('2026-06-18T16:00:00Z'))).toBeNull() // close is exclusive
    expect(getOpenSwapWindow(at('2026-06-20T00:00:00Z'))).toBeNull() // between windows
  })

  it('hard stop is the W3 close (2026-07-09 UTC)', () => {
    expect(new Date(swapHardStopEpoch()).toISOString()).toBe('2026-07-09T00:00:00.000Z')
    expect(hasSwapHardStopPassed(at('2026-07-08T23:59:59Z'))).toBe(false)
    expect(hasSwapHardStopPassed(at('2026-07-09T00:00:00Z'))).toBe(true)
  })
})

describe('in-match lock', () => {
  // MEX-RSA kicks off 2026-06-11 19:00 UTC; with D = 3h the lock covers 19:00..22:00.
  it('locks a nation between kickoff and kickoff + 3h, and not outside it', () => {
    expect(isNationInMatch('MEX', at('2026-06-11T19:30:00Z'))).toBe(true)
    expect(isNationInMatch('RSA', at('2026-06-11T19:30:00Z'))).toBe(true)
    expect(isNationInMatch('MEX', at('2026-06-11T18:59:00Z'))).toBe(false)
    expect(isNationInMatch('MEX', at('2026-06-11T22:00:00Z'))).toBe(false) // +3h, exclusive
  })
})
