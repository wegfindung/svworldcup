import type {
  AdminProfile,
  BootstrapPayload,
  ParticipantProfile,
  ParticipantSquad,
  SoccerversePlayer,
  TeamPoolPlayer,
  TeamSeed,
} from './types'

async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(payload?.error ?? `Request failed with status ${response.status}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export function fetchBootstrap() {
  return getJson<BootstrapPayload>('/api/public/bootstrap', {
    method: 'GET',
    headers: {},
  })
}

export function registerParticipant(payload: {
  email: string
  displayName: string
  soccerverseUsername?: string
  primaryTeamCode: string
  secondaryTeamCode?: string
}) {
  return getJson<{
    participantId: string
    email: string
    leagueType: 'rookie' | 'veteran'
    status: string
    nextStep: 'verify_email'
    verificationPreviewUrl?: string
  }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function resendVerificationEmail(email: string) {
  return getJson<{ participantId: string; status: string }>('/api/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export function verifyRegistration(token: string) {
  return getJson<{
    participantId: string
    email: string
    displayName: string
    leagueType: 'rookie' | 'veteran'
    status: string
    verifiedAt?: string
    budgetLimit: number
  }>(`/api/auth/verify?token=${encodeURIComponent(token)}`, {
    method: 'GET',
    headers: {},
  })
}

export function fetchParticipantSession() {
  return getJson<{ participant: ParticipantProfile; budgetLimit: number }>('/api/auth/me', {
    method: 'GET',
    headers: {},
  })
}

export function logoutParticipant() {
  return getJson<void>('/api/auth/logout', {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export function fetchTeamPlayers(teamCode: string) {
  return getJson<{ items: TeamPoolPlayer[] }>(`/api/public/team-players/${teamCode}`, {
    method: 'GET',
    headers: {},
  })
}

export function fetchParticipantSquad() {
  return getJson<{ squad: ParticipantSquad }>('/api/participant/squad', {
    method: 'GET',
    headers: {},
  })
}

export function assignSquadPlayer(slotKey: string, playerId: number) {
  return getJson<{ squad: ParticipantSquad }>('/api/participant/squad/assign', {
    method: 'POST',
    body: JSON.stringify({ slotKey, playerId }),
  })
}

export function removeSquadPlayer(slotKey: string) {
  return getJson<{ squad: ParticipantSquad }>(`/api/participant/squad/slots/${encodeURIComponent(slotKey)}`, {
    method: 'DELETE',
    headers: {},
  })
}

export function resetSquad() {
  return getJson<{ squad: ParticipantSquad }>('/api/participant/squad/reset', {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export function fetchAdminSession() {
  return getJson<{ admin: AdminProfile }>('/api/admin/session', {
    method: 'GET',
    headers: {},
  })
}

export function loginAdmin(email: string, password: string) {
  return getJson<{ admin: AdminProfile }>('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function logoutAdmin() {
  return getJson<void>('/api/admin/logout', {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export function fetchAdminTeams() {
  return getJson<{ items: Array<TeamSeed & { selectedCount: number }> }>('/api/admin/teams', {
    method: 'GET',
    headers: {},
  })
}

export function fetchTeamSelections(teamCode: string) {
  return getJson<{ items: TeamPoolPlayer[] }>(`/api/admin/teams/${teamCode}/selections`, {
    method: 'GET',
    headers: {},
  })
}

export function searchTeamCandidates(teamCode: string, query: string) {
  return getJson<{ items: SoccerversePlayer[] }>(
    `/api/admin/teams/${teamCode}/candidates?query=${encodeURIComponent(query)}`,
    {
      method: 'GET',
      headers: {},
    },
  )
}

export function saveTeamSelections(teamCode: string, players: TeamPoolPlayer[] | SoccerversePlayer[]) {
  return getJson<{ items: TeamPoolPlayer[] }>(`/api/admin/teams/${teamCode}/selections`, {
    method: 'PUT',
    body: JSON.stringify({
      players: players.map((player) => ({
        playerId: player.playerId,
        displayName: player.displayName,
        nationalityCode: player.nationalityCode,
        rating: player.rating,
        clubId: 'clubId' in player ? player.clubId : 0,
        positions: player.positions,
        positionMain: player.positionMain,
      })),
    }),
  })
}
