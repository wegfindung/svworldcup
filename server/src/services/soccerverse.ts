import { env } from '../config/env.js'
import type { SoccerversePlayerRecord } from '../domain/types.js'
import { getCommunityPlayerName } from './communityPack.js'

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
  const response = await fetch(`${env.SV_SERVICES_API_URL}/players/detailed?${searchParams.toString()}`)
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
