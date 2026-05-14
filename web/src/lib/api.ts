import type {
  AdminProfile,
  AdminOverview,
  BootstrapPayload,
  EventControls,
  MatchEntryInput,
  MatchEntryRecord,
  ScoringConfig,
  ParticipantProfile,
  ParticipantSquad,
  ParticipantSquadSummary,
  ParticipantScoreRow,
  PublicParticipantProfile,
  NationScoreRow,
  SoccerversePlayer,
  TeamPoolPlayer,
  TeamSeed,
} from './types'

interface AuthParticipantResponse {
  participant: ParticipantProfile
  budgetLimit: number
  squadSummary: ParticipantSquadSummary
}

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
    squadSummary: ParticipantSquadSummary
    hasPassword: boolean
  }>(`/api/auth/verify?token=${encodeURIComponent(token)}`, {
    method: 'GET',
    headers: {},
  })
}

export function loginParticipant(email: string, password: string) {
  return getJson<AuthParticipantResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function fetchParticipantSession() {
  return getJson<AuthParticipantResponse>('/api/auth/me', {
    method: 'GET',
    headers: {},
  })
}

export function setParticipantPassword(password: string) {
  return getJson<AuthParticipantResponse>('/api/auth/set-password', {
    method: 'POST',
    body: JSON.stringify({ password }),
  })
}

export function requestParticipantPasswordReset(email: string) {
  return getJson<{ status: string }>('/api/auth/request-password-reset', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export function resetParticipantPassword(token: string, password: string) {
  return getJson<AuthParticipantResponse>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
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

export function fetchRookieLeaderboard() {
  return getJson<{ items: ParticipantScoreRow[] }>('/api/public/leaderboards/rookie', {
    method: 'GET',
    headers: {},
  })
}

export function fetchVeteranLeaderboard() {
  return getJson<{ items: ParticipantScoreRow[] }>('/api/public/leaderboards/veteran', {
    method: 'GET',
    headers: {},
  })
}

export function fetchNationLeaderboard() {
  return getJson<{ items: NationScoreRow[] }>('/api/public/leaderboards/nations', {
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

export function lockSquad() {
  return getJson<{ squad: ParticipantSquad }>('/api/participant/squad/lock', {
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

export function revealParticipantProfile(revealSquad: boolean) {
  return getJson<{ participant: ParticipantProfile; publicProfileUrl: string }>('/api/participant/reveal', {
    method: 'POST',
    body: JSON.stringify({ revealSquad }),
  })
}

export function fetchPublicProfile(slug: string) {
  return getJson<{ item: PublicParticipantProfile }>(`/api/public/profiles/${encodeURIComponent(slug)}`, {
    method: 'GET',
    headers: {},
  })
}

export function fetchAdminOverview() {
  return getJson<AdminOverview>('/api/admin/overview', {
    method: 'GET',
    headers: {},
  })
}

export function updateAdminScoring(scoring: ScoringConfig) {
  return getJson<{ item: ScoringConfig }>('/api/admin/scoring', {
    method: 'PUT',
    body: JSON.stringify(scoring),
  })
}

export function fetchAdminMatchEntries(fixtureId?: string) {
  const query = fixtureId ? `?fixtureId=${encodeURIComponent(fixtureId)}` : ''
  return getJson<{ items: MatchEntryRecord[] }>(`/api/admin/match-entries${query}`, {
    method: 'GET',
    headers: {},
  })
}

export function saveAdminMatchEntry(entry: MatchEntryInput) {
  return getJson<{ item: MatchEntryRecord }>('/api/admin/match-entries', {
    method: 'PUT',
    body: JSON.stringify(entry),
  })
}

export function triggerGlobalReveal(payload: { revealProfiles: boolean; revealSquads: boolean }) {
  return getJson<{ eventControls: EventControls }>('/api/admin/reveal/global', {
    method: 'POST',
    body: JSON.stringify(payload),
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
