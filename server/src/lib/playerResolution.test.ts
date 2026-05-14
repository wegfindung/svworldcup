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
})
