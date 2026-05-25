import { describe, expect, it } from 'vitest'
import { normalizeDisplayName } from './displayName.js'
import { normalizeName } from './normalizeName.js'

describe('normalizeDisplayName', () => {
  it('decodes HTML entities commonly found in player datapacks', () => {
    expect(normalizeDisplayName('N. O&apos;Reilly')).toBe("N. O'Reilly")
    expect(normalizeDisplayName('N. O&#39;Reilly')).toBe("N. O'Reilly")
    expect(normalizeDisplayName('N. O&#x27;Reilly')).toBe("N. O'Reilly")
    expect(normalizeDisplayName('N. O&amp;apos;Reilly')).toBe("N. O'Reilly")
  })

  it('keeps normalized matching consistent for entity-encoded names', () => {
    expect(normalizeName('N. O&apos;Reilly')).toBe(normalizeName("N. O'Reilly"))
  })
})
