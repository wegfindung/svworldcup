import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearApiCache, fetchTeamPlayers } from './api'

function jsonResponse(body: unknown): Response {
  return { ok: true, status: 200, json: async () => body } as Response
}

afterEach(() => {
  clearApiCache()
  vi.unstubAllGlobals()
})

describe('api GET cache + dedup', () => {
  it('serves a repeat call within TTL from cache (one network fetch)', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ items: [{ playerId: 1 }] }))
    vi.stubGlobal('fetch', fetchMock)

    const first = await fetchTeamPlayers('BRA')
    const second = await fetchTeamPlayers('BRA')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(second).toEqual(first)
  })

  it('dedupes concurrent calls for the same path into one fetch', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ items: [] }))
    vi.stubGlobal('fetch', fetchMock)

    await Promise.all([fetchTeamPlayers('ARG'), fetchTeamPlayers('ARG')])

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('fetches distinct paths independently', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ items: [] }))
    vi.stubGlobal('fetch', fetchMock)

    await Promise.all([fetchTeamPlayers('BRA'), fetchTeamPlayers('ENG')])

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
