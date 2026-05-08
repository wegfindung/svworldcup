import { env } from '../config/env.js'

interface CommunityPackPlayerIndex {
  playerId: number
  displayName: string
  searchName: string
}

interface CommunityPackIndex {
  byPlayerId: Map<number, CommunityPackPlayerIndex>
  searchable: CommunityPackPlayerIndex[]
}

let communityPackPromise: Promise<CommunityPackIndex> | null = null

function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}+/gu, '')
    .toLowerCase()
    .trim()
}

async function loadCommunityPack(): Promise<CommunityPackIndex> {
  const response = await fetch(env.COMMUNITY_PACK_URL)
  if (!response.ok) {
    throw new Error(`Community datapack request failed with ${response.status}`)
  }

  const payload = (await response.json()) as {
    PackData?: {
      PlayerData?: {
        P?: Record<string, { id?: string; f?: string; s?: string }>
      }
    }
  }

  const rawPlayers = payload.PackData?.PlayerData?.P ?? {}
  const byPlayerId = new Map<number, CommunityPackPlayerIndex>()

  for (const item of Object.values(rawPlayers)) {
    const playerId = Number(item.id)
    if (!Number.isInteger(playerId) || playerId <= 0) {
      continue
    }

    const displayName = [item.f, item.s].filter(Boolean).join(' ').trim()
    if (!displayName) {
      continue
    }

    const next: CommunityPackPlayerIndex = {
      playerId,
      displayName,
      searchName: normalizeSearch(displayName),
    }
    byPlayerId.set(playerId, next)
  }

  const searchable = [...byPlayerId.values()].sort((left, right) => left.displayName.localeCompare(right.displayName))
  return { byPlayerId, searchable }
}

async function getCommunityPackIndex() {
  if (!communityPackPromise) {
    communityPackPromise = loadCommunityPack().catch((error) => {
      communityPackPromise = null
      throw error
    })
  }

  return communityPackPromise
}

export async function getCommunityPlayerName(playerId: number) {
  const pack = await getCommunityPackIndex()
  return pack.byPlayerId.get(playerId)?.displayName
}

export async function searchCommunityPlayerIds(query: string, limit = 40) {
  const normalizedQuery = normalizeSearch(query)
  if (!normalizedQuery) {
    return []
  }

  const pack = await getCommunityPackIndex()
  const matches: number[] = []

  for (const item of pack.searchable) {
    if (!item.searchName.includes(normalizedQuery)) {
      continue
    }
    matches.push(item.playerId)
    if (matches.length >= limit) {
      break
    }
  }

  return matches
}
