import { describe, expect, it } from 'vitest'
import { resolveTeamCode } from './teamLookup.js'

describe('resolveTeamCode', () => {
  it('resolves canonical team names', () => {
    expect(resolveTeamCode('Brazil')).toBe('BRA')
    expect(resolveTeamCode('Germany')).toBe('GER')
  })

  it('is whitespace- and case-insensitive', () => {
    expect(resolveTeamCode('  brazil ')).toBe('BRA')
  })

  it('resolves known source-name aliases', () => {
    expect(resolveTeamCode('Türkiye')).toBe('TUR')
    expect(resolveTeamCode('DR Congo')).toBe('COD')
    expect(resolveTeamCode('USA')).toBe('USA')
  })

  it('returns null for unknown names', () => {
    expect(resolveTeamCode('Atlantis')).toBeNull()
  })
})
