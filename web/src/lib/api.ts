import type { BootstrapPayload, SoccerversePlayer } from './types'

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(path)
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }
  return (await response.json()) as T
}

export function fetchBootstrap() {
  return getJson<BootstrapPayload>('/api/public/bootstrap')
}

export async function searchPlayers(params: {
  name?: string
  position?: string
  nationality?: string
  ratingMin?: number
  ratingMax?: number
  page?: number
  perPage?: number
}) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue
    search.set(key, String(value))
  }

  return getJson<{
    items: SoccerversePlayer[]
    total: number
    page: number
    totalPages: number
  }>(`/api/public/player-search?${search.toString()}`)
}
