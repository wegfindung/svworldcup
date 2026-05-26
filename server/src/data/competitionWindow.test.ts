import { describe, expect, it } from 'vitest'
import { hasRegistrationClosed, isRegistrationOpen, registrationCloseEpoch } from './competitionWindow.js'

describe('registration close window', () => {
  const close = registrationCloseEpoch()

  it('defaults to the Soccerverse season transition, 2026-07-04 00:00 UTC', () => {
    expect(new Date(registrationCloseEpoch()).toISOString()).toBe('2026-07-04T00:00:00.000Z')
  })

  it('is open right up until the close instant', () => {
    expect(isRegistrationOpen(close - 1)).toBe(true)
    expect(hasRegistrationClosed(close - 1)).toBe(false)
  })

  it('is closed at and after the close instant', () => {
    expect(isRegistrationOpen(close)).toBe(false)
    expect(hasRegistrationClosed(close)).toBe(true)
    expect(isRegistrationOpen(close + 1)).toBe(false)
    expect(hasRegistrationClosed(close + 1)).toBe(true)
  })
})
