import { env } from '../config/env.js'
import type { SoccerversePlayerRecord } from '../domain/types.js'
import { getCommunityPlayerName } from './communityPack.js'

// Soccerverse's services.soccerverse.com REST API enforces a hard ~3 req/s limit
// (claude-docs/soccerverse.md "Soccerverse rate limit-läge"). Over-rate returns 429
// + "STOP SPAMMING" body + dropped CORS headers, and repeated triggering risks an IP
// ban. We pace at 2.5 req/s (400ms slots) to match the sister project's throttle, with
// exponential backoff (base 1s, ×2 per retry, capped at 30s, max 4 retries) on 429 —
// honouring Retry-After when the server sends a numeric one.
const SV_SLOT_MS = 400
const SV_MAX_BACKOFF_MS = 30_000
const SV_MAX_RETRIES = 4

interface SvFetchClock {
  now(): number
  sleep(ms: number): Promise<void>
  fetch: typeof fetch
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

let svNextAllowedAt = 0
let svGate: Promise<void> = Promise.resolve()

async function svPace(clock: SvFetchClock): Promise<void> {
  // Serialise pacing through svGate so concurrent callers queue in arrival order.
  const myGate = svGate
  let release!: () => void
  svGate = new Promise<void>((resolve) => {
    release = resolve
  })
  try {
    await myGate
    const now = clock.now()
    const wait = Math.max(0, svNextAllowedAt - now)
    if (wait > 0) {
      await clock.sleep(wait)
    }
    svNextAllowedAt = Math.max(clock.now(), svNextAllowedAt) + SV_SLOT_MS
  } finally {
    release()
  }
}

let svClock: SvFetchClock = {
  now: () => Date.now(),
  sleep: defaultSleep,
  fetch: (input, init) => fetch(input as string, init),
}

export function _setSvFetchClockForTests(clock: Partial<SvFetchClock>) {
  svClock = { ...svClock, ...clock }
  svNextAllowedAt = 0
  svGate = Promise.resolve()
}

export async function svFetch(url: string, init?: RequestInit, attempt = 0): Promise<Response> {
  await svPace(svClock)
  const response = await svClock.fetch(url, init)
  if (response.status !== 429) return response
  if (attempt >= SV_MAX_RETRIES) return response
  const retryAfterHeader = response.headers.get('retry-after')
  const retryAfterMs = retryAfterHeader && /^\d+$/.test(retryAfterHeader.trim())
    ? Math.min(SV_MAX_BACKOFF_MS, Number(retryAfterHeader.trim()) * 1000)
    : Math.min(SV_MAX_BACKOFF_MS, 1000 * 2 ** attempt)
  await svClock.sleep(retryAfterMs)
  return svFetch(url, init, attempt + 1)
}

function createPlayerImageUrl(playerId: number) {
  return `https://elrincondeldt.com/sv/photos/players/${playerId}.png`
}

function mapSoccerverseRecord(item: Record<string, unknown>, fallbackName?: string): SoccerversePlayerRecord {
  const playerId = Number(item.player_id)
  return {
    playerId,
    displayName: fallbackName ?? `Player ${playerId}`,
    nationalityCode: String(item.country_id ?? ''),
    rating: Number(item.rating ?? 50),
    clubId: Number(item.club_id ?? 0),
    positions: Array.isArray(item.positions) ? item.positions.map((value) => String(value)) : [],
    positionMain: item.position_main ? String(item.position_main) : undefined,
  }
}

async function requestPlayers(searchParams: URLSearchParams) {
  const response = await svFetch(`${env.SV_SERVICES_API_URL}/players/detailed?${searchParams.toString()}`)
  if (!response.ok) {
    throw new Error(`Soccerverse player request failed with ${response.status}`)
  }

  return (await response.json()) as {
    items?: Array<Record<string, unknown>>
    total?: number
  }
}

export async function fetchPlayersByIds(playerIds: number[], countryId?: string): Promise<SoccerversePlayerRecord[]> {
  const uniqueIds = [...new Set(playerIds.filter((playerId) => Number.isInteger(playerId) && playerId > 0))]
  if (uniqueIds.length === 0) {
    return []
  }

  const searchParams = new URLSearchParams({
    page: '1',
    per_page: uniqueIds.length <= 5 ? '5' : uniqueIds.length <= 10 ? '10' : uniqueIds.length <= 20 ? '20' : '50',
  })

  if (countryId) {
    searchParams.set('country_id', countryId)
  }

  for (const playerId of uniqueIds.slice(0, 50)) {
    searchParams.append('player_id', String(playerId))
  }

  const payload = await requestPlayers(searchParams)
  const items = payload.items ?? []
  const mapped: SoccerversePlayerRecord[] = []

  for (const item of items) {
    const playerId = Number(item.player_id)
    const fallbackName = await getCommunityPlayerName(playerId)
    mapped.push(mapSoccerverseRecord(item, fallbackName))
  }

  return mapped
}

export async function searchPlayersByCountryAndName(countryId: string, query: string) {
  const { searchCommunityPlayerIds } = await import('./communityPack.js')
  const matchingIds = /^\d+$/.test(query.trim()) ? [Number(query.trim())] : await searchCommunityPlayerIds(query, 40)
  const players = await fetchPlayersByIds(matchingIds, countryId)
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) {
    return players
  }

  return players
    .filter((player) => player.displayName.toLowerCase().includes(normalizedQuery) || String(player.playerId) === normalizedQuery)
    .sort((left, right) => right.rating - left.rating || left.displayName.localeCompare(right.displayName))
}

export function withImageUrl(player: SoccerversePlayerRecord) {
  return {
    ...player,
    imageUrl: createPlayerImageUrl(player.playerId),
  }
}

export interface ShareTradeEvent {
  unixTime: number
  buyer: string
  seller: string
  num: number
}

interface ShareTradeHistoryPayload {
  page?: number
  per_page?: number
  total?: number
  total_pages?: number
  items?: Array<{
    unix_time?: number
    share_type?: string
    share_id?: number
    buyer?: string
    seller?: string
    num?: number
  }>
}

const SHARE_TRADE_PAGE_SIZE = 100

export async function fetchPlayerShareTrades(
  name: string,
  playerId: number,
  cutoffUnix: number,
): Promise<ShareTradeEvent[]> {
  if (!name || !Number.isFinite(playerId) || playerId <= 0) {
    return []
  }

  const collected: ShareTradeEvent[] = []
  let page = 1

  while (true) {
    const searchParams = new URLSearchParams({
      page: String(page),
      per_page: String(SHARE_TRADE_PAGE_SIZE),
      name,
      player_id: String(playerId),
      sort_by: 'unix_time',
      sort_order: 'desc',
    })

    let payload: ShareTradeHistoryPayload
    try {
      const response = await svFetch(`${env.SV_SERVICES_API_URL}/share_trade_history?${searchParams.toString()}`)
      if (!response.ok) {
        console.warn(`share_trade_history ${response.status} name=${name} player_id=${playerId} page=${page}`)
        return collected
      }
      payload = (await response.json()) as ShareTradeHistoryPayload
    } catch (error) {
      console.warn(`share_trade_history fetch failed name=${name} player_id=${playerId} page=${page}: ${(error as Error).message}`)
      return collected
    }

    const items = payload.items ?? []
    let reachedCutoff = false

    for (const item of items) {
      const unixTime = Number(item.unix_time)
      if (!Number.isFinite(unixTime)) continue
      if (unixTime < cutoffUnix) {
        reachedCutoff = true
        continue
      }
      if (item.share_type !== 'player') continue
      if (Number(item.share_id) !== playerId) continue
      const buyer = String(item.buyer ?? '')
      const seller = String(item.seller ?? '')
      if (buyer === seller) continue
      if (buyer !== name && seller !== name) continue
      const num = Number(item.num)
      if (!Number.isFinite(num) || num <= 0) continue
      collected.push({ unixTime, buyer, seller, num })
    }

    if (reachedCutoff) break
    const totalPages = Number(payload.total_pages ?? 1)
    if (page >= totalPages) break
    if (items.length < SHARE_TRADE_PAGE_SIZE) break
    page += 1
  }

  return collected
}
