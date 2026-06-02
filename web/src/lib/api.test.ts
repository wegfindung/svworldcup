import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  clearApiClientState,
  fetchRookieLeaderboard,
  fetchTeamPlayers,
  linkSoccerverseAccount,
  loginParticipant,
} from './api'

function jsonResponse(body: unknown): Response {
  return { ok: true, status: 200, json: async () => body } as Response
}

function errorResponse(status: number, body: unknown = {}): Response {
  return { ok: false, status, json: async () => body } as Response
}

afterEach(() => {
  clearApiClientState()
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

describe('api selective GET retry', () => {
  it('retries a safe GET after a transient network error, then resolves', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(jsonResponse({ items: [{ rank: 1 }] }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchRookieLeaderboard()

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result).toEqual({ items: [{ rank: 1 }] })
  })

  it('retries a safe GET on a gateway 5xx, then resolves', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(errorResponse(503))
      .mockResolvedValueOnce(jsonResponse({ items: [] }))
    vi.stubGlobal('fetch', fetchMock)

    await fetchRookieLeaderboard()

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not retry a 4xx — it is a deterministic client error', async () => {
    const fetchMock = vi.fn(async () => errorResponse(400, { error: 'bad request' }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchRookieLeaderboard()).rejects.toMatchObject({ status: 400 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('gives up after the bounded number of retries on a persistent network error', async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchRookieLeaderboard()).rejects.toBeInstanceOf(TypeError)
    // 1 initial attempt + MAX_GET_RETRIES (2) = 3.
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('never retries a non-GET write, even on a transient network error', async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(loginParticipant('a@b.c', 'pw')).rejects.toBeInstanceOf(TypeError)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('api participant CSRF refresh', () => {
  it('refreshes the participant CSRF token before a protected write when none is loaded', async () => {
    const fetchMock = vi.fn(async (path: string) => {
      if (path === '/api/auth/me') {
        return jsonResponse({
          participant: {},
          budgetLimit: 0,
          squadSummary: {},
          csrfToken: 'fresh-token',
        })
      }
      if (path === '/api/participant/link-soccerverse') {
        return jsonResponse({ participant: { soccerverseUsername: 'Liberterx' } })
      }
      throw new Error(`Unexpected path: ${path}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    await linkSoccerverseAccount('Liberterx')

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/auth/me')
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/participant/link-soccerverse')
    expect((fetchMock.mock.calls[1]?.[1] as RequestInit).headers).toMatchObject({
      'x-csrf-token': 'fresh-token',
    })
  })

  it('refreshes and retries once when a protected write rejects a stale CSRF token', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          participant: {},
          budgetLimit: 0,
          squadSummary: {},
          csrfToken: 'stale-token',
        }),
      )
      .mockResolvedValueOnce(errorResponse(403, { error: 'CSRF token is invalid or missing.' }))
      .mockResolvedValueOnce(
        jsonResponse({
          participant: {},
          budgetLimit: 0,
          squadSummary: {},
          csrfToken: 'fresh-token',
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ participant: { soccerverseUsername: 'Liberterx' } }))
    vi.stubGlobal('fetch', fetchMock)

    await loginParticipant('user@example.com', 'password')
    await linkSoccerverseAccount('Liberterx')

    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/participant/link-soccerverse')
    expect((fetchMock.mock.calls[1]?.[1] as RequestInit).headers).toMatchObject({
      'x-csrf-token': 'stale-token',
    })
    expect(fetchMock.mock.calls[2]?.[0]).toBe('/api/auth/me')
    expect(fetchMock.mock.calls[3]?.[0]).toBe('/api/participant/link-soccerverse')
    expect((fetchMock.mock.calls[3]?.[1] as RequestInit).headers).toMatchObject({
      'x-csrf-token': 'fresh-token',
    })
  })
})
