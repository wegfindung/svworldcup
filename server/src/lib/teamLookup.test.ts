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

  it('treats "&" and "and" as equivalent in either direction', () => {
    // Canonical seed name is "Bosnia and Herzegovina"; a source CSV using "&" must still resolve.
    expect(resolveTeamCode('Bosnia & Herzegovina')).toBe('BIH')
    expect(resolveTeamCode('Bosnia and Herzegovina')).toBe('BIH')
    expect(resolveTeamCode('  bosnia   &   herzegovina ')).toBe('BIH')
  })

  it('returns null for unknown names', () => {
    expect(resolveTeamCode('Atlantis')).toBeNull()
  })
})
