import type {
  AdminProfile,
  AdminOverview,
  AdminParticipantRecord,
  BootstrapPayload,
  EmailCampaignDispatchSummary,
  EmailCampaignInput,
  EmailCampaignRecipient,
  EmailCampaignRecord,
  EventControls,
  MatchEntryInput,
  MatchEntryRecord,
  MatchImportPromotionResult,
  MatchImportRowEdit,
  MatchImportSkipNameEntry,
  PendingMatchBatch,
  ScoringConfig,
  ParticipantProfile,
  ParticipantSquad,
  ParticipantSquadSummary,
  ParticipantScoreRow,
  PublicParticipantProfile,
  NationScoreRow,
  ReferralAnalyticsRow,
  SoccerversePlayer,
  TeamPoolPlayer,
  TeamSeed,
} from './types'
import type { ShareSnapshotPayload } from './sharePayload'

interface AuthParticipantResponse {
  participant: ParticipantProfile
  budgetLimit: number
  squadSummary: ParticipantSquadSummary
  csrfToken?: string
}

let participantCsrfToken = ''
let adminCsrfToken = ''

function isUnsafeMethod(method?: string) {
  const normalizedMethod = (method ?? 'GET').toUpperCase()
  return normalizedMethod !== 'GET' && normalizedMethod !== 'HEAD' && normalizedMethod !== 'OPTIONS'
}

function csrfTokenForPath(path: string) {
  if (path.startsWith('/api/admin')) {
    return adminCsrfToken
  }
  if (path.startsWith('/api/participant') || path === '/api/auth/set-password' || path === '/api/auth/logout') {
    return participantCsrfToken
  }
  return ''
}

function storeCsrfToken(path: string, payload: unknown) {
  if (!payload || typeof payload !== 'object' || !('csrfToken' in payload)) {
    return
  }

  const csrfToken = typeof payload.csrfToken === 'string' ? payload.csrfToken : ''
  if (!csrfToken) {
    return
  }

  if (path.startsWith('/api/admin')) {
    adminCsrfToken = csrfToken
  }
  if (path.startsWith('/api/auth') || path.startsWith('/api/participant')) {
    participantCsrfToken = csrfToken
  }
}

async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const csrfToken = isUnsafeMethod(init?.method) ? csrfTokenForPath(path) : ''
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
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

  const payload = (await response.json()) as T
  storeCsrfToken(path, payload)
  return payload
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
  referrerSoccerverseUsername?: string
  marketingOptIn?: boolean
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
  }).finally(() => {
    participantCsrfToken = ''
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

export function createSignedShareSnapshot(payload: ShareSnapshotPayload) {
  return getJson<{ sharePath: string; cardPath: string }>('/api/participant/share-snapshot', {
    method: 'POST',
    body: JSON.stringify(payload),
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

export function fetchAdminParticipants() {
  return getJson<{ items: AdminParticipantRecord[] }>('/api/admin/participants', {
    method: 'GET',
    headers: {},
  })
}

export function fetchAdminReferralAnalytics() {
  return getJson<{ items: ReferralAnalyticsRow[] }>('/api/admin/referrals', {
    method: 'GET',
    headers: {},
  })
}

export function recordReferralClick(referrerSoccerverseUsername: string, landingPath: string) {
  return getJson<void>('/api/public/referral-click', {
    method: 'POST',
    body: JSON.stringify({ referrerSoccerverseUsername, landingPath }),
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

export function fetchEmailCampaigns() {
  return getJson<{ campaigns: EmailCampaignRecord[] }>('/api/admin/email-marketing/campaigns', {
    method: 'GET',
    headers: {},
  })
}

export function saveEmailCampaign(campaign: EmailCampaignInput) {
  return getJson<{ campaign: EmailCampaignRecord }>('/api/admin/email-marketing/campaigns', {
    method: 'POST',
    body: JSON.stringify(campaign),
  })
}

export function deleteEmailCampaign(campaignId: string) {
  return getJson<void>(`/api/admin/email-marketing/campaigns/${encodeURIComponent(campaignId)}`, {
    method: 'DELETE',
    headers: {},
  })
}

export function sendEmailCampaignNow(campaignId: string) {
  return getJson<{ result: EmailCampaignDispatchSummary }>(
    `/api/admin/email-marketing/campaigns/${encodeURIComponent(campaignId)}/send-now`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
  )
}

export function runDueEmailCampaigns() {
  return getJson<{ results: EmailCampaignDispatchSummary[] }>('/api/admin/email-marketing/run-due', {
    method: 'POST',
    body: JSON.stringify({ limit: 10 }),
  })
}

export function sendEmailCampaignTest(campaign: EmailCampaignInput, recipient: string) {
  return getJson<{ status: 'sent' }>('/api/admin/email-marketing/test', {
    method: 'POST',
    body: JSON.stringify({ ...campaign, recipient }),
  })
}

export function fetchEmailCampaignRecipients(campaignId: string) {
  return getJson<{ recipients: EmailCampaignRecipient[] }>(
    `/api/admin/email-marketing/campaigns/${encodeURIComponent(campaignId)}/recipients`,
    {
      method: 'GET',
      headers: {},
    },
  )
}

export function logoutAdmin() {
  return getJson<void>('/api/admin/logout', {
    method: 'POST',
    body: JSON.stringify({}),
  }).finally(() => {
    adminCsrfToken = ''
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

// --- Match data import engine (mounted under /api/admin/match-import) ---

export function fetchMatchImportBatches() {
  return getJson<{ items: PendingMatchBatch[] }>('/api/admin/match-import/batches', {
    method: 'GET',
    headers: {},
  })
}

export function fetchMatchImportBatch(batchId: string) {
  return getJson<{ batch: PendingMatchBatch }>(
    `/api/admin/match-import/batches/${encodeURIComponent(batchId)}`,
    { method: 'GET', headers: {} },
  )
}

export function uploadMatchImport(payload: { fixtureId: string; json: unknown; replace?: boolean }) {
  return getJson<{ batch: PendingMatchBatch; skippedNames: string[] }>('/api/admin/match-import/upload', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function confirmMatchImportBatch(batchId: string) {
  return getJson<{ batch: PendingMatchBatch | null; promotion: MatchImportPromotionResult }>(
    `/api/admin/match-import/batches/${encodeURIComponent(batchId)}/confirm`,
    { method: 'POST', body: JSON.stringify({}) },
  )
}

export function editMatchImportRow(batchId: string, rowId: string, edits: MatchImportRowEdit) {
  return getJson<{ batch: PendingMatchBatch }>(
    `/api/admin/match-import/batches/${encodeURIComponent(batchId)}/rows/${encodeURIComponent(rowId)}`,
    { method: 'PUT', body: JSON.stringify(edits) },
  )
}

export function resolveMatchImportRow(batchId: string, rowId: string, playerId: number) {
  return getJson<{ batch: PendingMatchBatch }>(
    `/api/admin/match-import/batches/${encodeURIComponent(batchId)}/rows/${encodeURIComponent(rowId)}/resolve`,
    { method: 'POST', body: JSON.stringify({ playerId }) },
  )
}

export function discardMatchImportBatch(batchId: string) {
  return getJson<void>(`/api/admin/match-import/batches/${encodeURIComponent(batchId)}`, {
    method: 'DELETE',
    headers: {},
  })
}

export function addMatchImportSkipName(teamCode: string, sourceName: string) {
  return getJson<{ item: MatchImportSkipNameEntry }>('/api/admin/match-import/skip-names', {
    method: 'POST',
    body: JSON.stringify({ teamCode, sourceName }),
  })
}

export function removeMatchImportSkipName(teamCode: string, sourceName: string) {
  return getJson<void>(
    `/api/admin/match-import/skip-names?teamCode=${encodeURIComponent(teamCode)}&sourceName=${encodeURIComponent(sourceName)}`,
    { method: 'DELETE', headers: {} },
  )
}
