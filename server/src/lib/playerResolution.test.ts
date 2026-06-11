import { describe, expect, it } from 'vitest'
import type {
  MatchImportPlayerMapEntry,
  MatchImportSkipNameEntry,
  TeamPoolPlayer,
} from '../domain/types.js'
import { resolvePlayer } from './playerResolution.js'

function poolPlayer(playerId: number, displayName: string): TeamPoolPlayer {
  return {
    teamCode: 'BRA',
    playerId,
    displayName,
    nationalityCode: 'BRA',
    rating: 80,
    capCost: 1000,
    positions: [],
    positionClasses: [],
    imageUrl: '',
  }
}

function mapEntry(teamCode: string, normalizedSourceName: string, playerId: number): MatchImportPlayerMapEntry {
  return {
    mapId: `map-${normalizedSourceName}`,
    teamCode,
    normalizedSourceName,
    playerId,
    createdBy: 'admin@example.com',
    createdAt: '2026-05-14T00:00:00.000Z',
  }
}

function skipEntry(teamCode: string, normalizedSourceName: string): MatchImportSkipNameEntry {
  return {
    skipId: `skip-${normalizedSourceName}`,
    teamCode,
    normalizedSourceName,
    createdBy: 'admin@example.com',
    createdAt: '2026-05-14T00:00:00.000Z',
  }
}

describe('resolvePlayer', () => {
  it('resolves via an exact normalized auto-match against the team pool', () => {
    const result = resolvePlayer('Vinicius Junior', 'BRA', {
      mapEntries: [],
      skipNames: [],
      teamPool: [poolPlayer(10, 'Vinicius Junior')],
    })
    expect(result).toEqual({ status: 'resolved', playerId: 10 })
  })

  it('auto-matches diacritic-insensitively', () => {
    const result = resolvePlayer('Vinícius Júnior', 'BRA', {
      mapEntries: [],
      skipNames: [],
      teamPool: [poolPlayer(10, 'Vinicius Junior')],
    })
    expect(result).toEqual({ status: 'resolved', playerId: 10 })
  })

  it('resolves via the persisted mapping table', () => {
    const result = resolvePlayer('Vini Jr', 'BRA', {
      mapEntries: [mapEntry('BRA', 'vini jr', 10)],
      skipNames: [],
      teamPool: [],
    })
    expect(result).toEqual({ status: 'resolved', playerId: 10 })
  })

  it('lets the mapping table win over the team pool', () => {
    const result = resolvePlayer('Vinicius Junior', 'BRA', {
      mapEntries: [mapEntry('BRA', 'vinicius junior', 99)],
      skipNames: [],
      teamPool: [poolPlayer(10, 'Vinicius Junior')],
    })
    expect(result).toEqual({ status: 'resolved', playerId: 99 })
  })

  it('returns skipped when the name is on the team skip list', () => {
    const result = resolvePlayer('Team Doctor', 'BRA', {
      mapEntries: [],
      skipNames: [skipEntry('BRA', 'team doctor')],
      teamPool: [],
    })
    expect(result).toEqual({ status: 'skipped' })
  })

  it('scopes mapping and skip entries to the team', () => {
    const result = resolvePlayer('Vini Jr', 'BRA', {
      mapEntries: [mapEntry('ARG', 'vini jr', 10)],
      skipNames: [skipEntry('ARG', 'vini jr')],
      teamPool: [],
    })
    expect(result.status).toBe('unresolved')
  })

  it('leaves unresolved when no candidate matches', () => {
    const result = resolvePlayer('Unknown Player', 'BRA', {
      mapEntries: [],
      skipNames: [],
      teamPool: [poolPlayer(10, 'Vinicius Junior')],
    })
    expect(result.status).toBe('unresolved')
  })

  it('leaves unresolved when more than one pool player matches', () => {
    const result = resolvePlayer('Silva', 'BRA', {
      mapEntries: [],
      skipNames: [],
      teamPool: [poolPlayer(1, 'Silva'), poolPlayer(2, 'Silva')],
    })
    expect(result.status).toBe('unresolved')
  })

  it('leaves unresolved for an empty name', () => {
    const result = resolvePlayer('   ', 'BRA', { mapEntries: [], skipNames: [], teamPool: [] })
    expect(result.status).toBe('unresolved')
  })

  // Name-form tier: the pool's Soccerverse display names are often abbreviated or extended
  // forms of the full real name in provider data (real shapes from the MEX/RSA pools).

  it('matches a full source name to an abbreviated pool name (initial + surname)', () => {
    const result = resolvePlayer('César Montes', 'BRA', {
      mapEntries: [],
      skipNames: [],
      teamPool: [poolPlayer(2873, 'C. Montes'), poolPlayer(2887, 'R. Jiménez')],
    })
    expect(result).toEqual({ status: 'resolved', playerId: 2873 })
  })

  it('matches when the pool initial carries a diacritic', () => {
    const result = resolvePlayer('Erik Lira', 'BRA', {
      mapEntries: [],
      skipNames: [],
      teamPool: [poolPlayer(266345, 'É. Lira')],
    })
    expect(result).toEqual({ status: 'resolved', playerId: 266345 })
  })

  it('matches a multi-token surname behind the initial', () => {
    const result = resolvePlayer('Jonathan dos Santos', 'BRA', {
      mapEntries: [],
      skipNames: [],
      teamPool: [poolPlayer(7, 'J. dos Santos')],
    })
    expect(result).toEqual({ status: 'resolved', playerId: 7 })
  })

  it('matches an extended pool form (doubled or appended surname)', () => {
    const quinones = resolvePlayer('Julián Quiñones', 'BRA', {
      mapEntries: [],
      skipNames: [],
      teamPool: [poolPlayer(35532, 'Julián Quiñones Quiñones')],
    })
    expect(quinones).toEqual({ status: 'resolved', playerId: 35532 })
    const chavez = resolvePlayer('Luis Chávez', 'BRA', {
      mapEntries: [],
      skipNames: [],
      // M. Chávez shares the surname but fails the initial — must not make this ambiguous.
      teamPool: [poolPlayer(35690, 'Luis Chávez Magallón'), poolPlayer(390002, 'M. Chávez')],
    })
    expect(chavez).toEqual({ status: 'resolved', playerId: 35690 })
  })

  it('does not match when the initial differs (a genuinely different stored name)', () => {
    // Real case: the feed says Raúl Rangel, the pool stores J. Rangel — same surname,
    // different initial. That mapping is a human call, never automatic.
    const result = resolvePlayer('Raúl Rangel', 'BRA', {
      mapEntries: [],
      skipNames: [],
      teamPool: [poolPlayer(270774, 'J. Rangel')],
    })
    expect(result.status).toBe('unresolved')
  })

  it('leaves an ambiguous name-form match unresolved', () => {
    const result = resolvePlayer('J. Hernández', 'BRA', {
      mapEntries: [],
      skipNames: [],
      teamPool: [poolPlayer(1, 'Javier Hernández'), poolPlayer(2, 'Jonathan Hernández')],
    })
    expect(result.status).toBe('unresolved')
  })

  it('does not name-form match on a single token', () => {
    const result = resolvePlayer('Montes', 'BRA', {
      mapEntries: [],
      skipNames: [],
      teamPool: [poolPlayer(2873, 'C. Montes')],
    })
    expect(result.status).toBe('unresolved')
  })

  // Pack aliases: the stored display name is a curation-time snapshot; the current
  // community-pack name rides in as a second candidate name per pool player.

  it('matches exactly via the current pack name when the stored name is stale', () => {
    const result = resolvePlayer('Raúl Jiménez', 'BRA', {
      mapEntries: [],
      skipNames: [],
      teamPool: [poolPlayer(2887, 'R.J. Hernández')],
      packNamesByPlayerId: new Map([[2887, 'Raúl Jiménez']]),
    })
    expect(result).toEqual({ status: 'resolved', playerId: 2887 })
  })

  it('name-form matches via the pack name (full name with extra surname)', () => {
    const result = resolvePlayer('César Montes', 'BRA', {
      mapEntries: [],
      skipNames: [],
      teamPool: [poolPlayer(2873, 'C.M. Castro'), poolPlayer(2887, 'R. Jiménez')],
      packNamesByPlayerId: new Map([[2873, 'César Montes Castro']]),
    })
    expect(result).toEqual({ status: 'resolved', playerId: 2873 })
  })

  it('stored and pack names of the same player count as one candidate, not an ambiguity', () => {
    const result = resolvePlayer('César Montes', 'BRA', {
      mapEntries: [],
      skipNames: [],
      // Both the stored "C. Montes" (initial+surname) and the pack name (prefix) fit —
      // same player, so the match stays unique.
      teamPool: [poolPlayer(2873, 'C. Montes')],
      packNamesByPlayerId: new Map([[2873, 'César Montes Castro']]),
    })
    expect(result).toEqual({ status: 'resolved', playerId: 2873 })
  })

  it('a pack name can also create a real ambiguity across two players', () => {
    const result = resolvePlayer('Carlos Montes', 'BRA', {
      mapEntries: [],
      skipNames: [],
      teamPool: [poolPlayer(1, 'C. Montes'), poolPlayer(2, 'X. Other')],
      packNamesByPlayerId: new Map([[2, 'Carlos Montes Rivera']]),
    })
    expect(result.status).toBe('unresolved')
  })
})
