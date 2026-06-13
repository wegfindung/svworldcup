import type {
  AdminProfile,
  AdminOverview,
  AdminParticipantRecord,
  AuditLogEntry,
  BootstrapPayload,
  EmailCampaignDispatchSummary,
  EmailCampaignInput,
  EmailCampaignRecipient,
  EmailCampaignRecord,
  EventControls,
  FixtureSeed,
  LocaleCode,
  MatchImportInput,
  MatchImportPromotionResult,
  MatchImportRowEdit,
  MatchImportSkipNameEntry,
  MatchResolution,
  OperationEvent,
  PendingMatchBatch,
  ResolutionOverride,
  ScoringConfig,
  ParticipantProfile,
  ParticipantLineup,
  ParticipantBoostResult,
  ParticipantSquad,
  ParticipantSquadSummary,
  SwapState,
  SwapResultSummary,
  ParticipantScoreRow,
  ParticipantRiskCase,
  ParticipantRiskInquiryEmail,
  ParticipantRiskCaseStatus,
  ParticipantTrashEntry,
  PublicFixtureResult,
  PublicParticipantProfile,
  PublicSquadUsagePayload,
  PlayerPointsPayload,
  BudgetStatsPayload,
  BoostLeaderboardPayload,
  NationParticipationRow,
  NationScoreRow,
  ReferralAnalyticsRow,
  SoccerversePlayer,
  TeamPoolPlayer,
  TeamSeed,
} from './types'
import type { ShareSnapshotPayload } from './sharePayload'
import { detectBrowserLocale } from './browserLocale'
import { clientFingerprintHeader } from './clientFingerprint'

interface AuthParticipantResponse {
  participant: ParticipantProfile
  budgetLimit: number
  squadSummary: ParticipantSquadSummary
  csrfToken?: string
}

let participantCsrfToken = ''
let adminCsrfToken = ''
let participantCsrfRefresh: Promise<void> | null = null

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

function needsParticipantCsrfRefresh(path: string, init?: RequestInit) {
  if (!isUnsafeMethod(init?.method)) {
    return false
  }
  return path.startsWith('/api/participant') || path === '/api/auth/set-password' || path === '/api/auth/logout'
}

function riskHeadersForPath(path: string) {
  return path.startsWith('/api/auth') || path.startsWith('/api/participant') ? clientFingerprintHeader() : {}
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

export class ApiError extends Error {
  readonly payload: Record<string, unknown> | null
  readonly status: number

  constructor(message: string, payload: Record<string, unknown> | null, status: number) {
    super(message)
    this.name = 'ApiError'
    this.payload = payload
    this.status = status
  }
}

// B2: fetch has no built-in timeout. Cap every request so a slow/hung backend can't leave a request
// pending until the browser default. Callers may also pass their own AbortSignal via init.signal
// (used by TablesPage to abort superseded loads).
const DEFAULT_TIMEOUT_MS = 15_000

// B2: bounded, selective retry for safe (GET/HEAD) reads only. A transient failure — a network error,
// our own timeout (408), or a gateway 5xx (502/503/504) — is retried up to MAX_GET_RETRIES times with a
// short linear backoff. A 4xx, a non-GET, a malformed-body parse error, or a caller-initiated abort is
// never retried, so this tolerates blips without amplifying load on real errors or replaying a write.
const MAX_GET_RETRIES = 2
const RETRY_BASE_DELAY_MS = 300

function isSafeMethod(method?: string) {
  const normalizedMethod = (method ?? 'GET').toUpperCase()
  return normalizedMethod === 'GET' || normalizedMethod === 'HEAD'
}

function isTransientFailure(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status === 408 || error.status === 502 || error.status === 503 || error.status === 504
  }
  // A network-level fetch failure rejects with TypeError → retry. Anything else (e.g. a malformed JSON
  // body throwing SyntaxError) is treated as non-transient. Caller aborts are filtered out before here.
  return error instanceof TypeError
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

function buildHeaders(path: string, init?: RequestInit): Record<string, string> {
  const csrfToken = isUnsafeMethod(init?.method) ? csrfTokenForPath(path) : ''
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...riskHeadersForPath(path),
    ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
  }
  if (init?.headers instanceof Headers) {
    init.headers.forEach((value, key) => {
      headers[key] = value
    })
  } else if (Array.isArray(init?.headers)) {
    for (const [key, value] of init.headers) {
      headers[key] = value
    }
  } else if (init?.headers) {
    Object.assign(headers, init.headers)
  }
  return headers
}

async function fetchJsonOnce<T>(path: string, init: RequestInit | undefined, headers: Record<string, string>): Promise<T> {
  // Internal timeout controller, linked to the caller's signal (if any) so either source aborts fetch.
  const timeoutController = new AbortController()
  const callerSignal = init?.signal ?? undefined
  if (callerSignal) {
    if (callerSignal.aborted) {
      timeoutController.abort(callerSignal.reason)
    } else {
      callerSignal.addEventListener('abort', () => timeoutController.abort(callerSignal.reason), { once: true })
    }
  }
  const timeoutId = setTimeout(
    () => timeoutController.abort(new DOMException('Request timed out', 'TimeoutError')),
    DEFAULT_TIMEOUT_MS,
  )

  let response: Response
  try {
    response = await fetch(path, {
      credentials: 'same-origin',
      ...init,
      headers,
      signal: timeoutController.signal,
    })
  } catch (error) {
    // Our timeout fired without the caller aborting → surface a clean 408 so the UI shows a load
    // error (and the retry layer can treat it as transient). A caller-initiated abort (unmount /
    // superseded request) propagates unchanged so the caller's cancellation guard can ignore it.
    if (timeoutController.signal.aborted && !callerSignal?.aborted) {
      throw new ApiError('Request timed out', null, 408)
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null
    const serverMessage = typeof payload?.error === 'string' ? payload.error : null
    throw new ApiError(serverMessage ?? `Request failed with status ${response.status}`, payload, response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  const payload = (await response.json()) as T
  storeCsrfToken(path, payload)
  return payload
}

function isCsrfError(error: unknown) {
  return (
    error instanceof ApiError &&
    error.status === 403 &&
    typeof error.payload?.error === 'string' &&
    /csrf/i.test(error.payload.error)
  )
}

async function refreshParticipantCsrfToken() {
  if (participantCsrfRefresh) {
    return participantCsrfRefresh
  }

  participantCsrfRefresh = fetchJsonOnce<AuthParticipantResponse>(
    '/api/auth/me',
    { method: 'GET', headers: {} },
    buildHeaders('/api/auth/me', { method: 'GET', headers: {} }),
  )
    .then(() => undefined)
    .finally(() => {
      participantCsrfRefresh = null
    })

  return participantCsrfRefresh
}

async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const callerSignal = init?.signal ?? undefined
  const maxRetries = isSafeMethod(init?.method) ? MAX_GET_RETRIES : 0
  const shouldRefreshParticipantCsrf = needsParticipantCsrfRefresh(path, init)

  if (shouldRefreshParticipantCsrf && !participantCsrfToken) {
    await refreshParticipantCsrfToken()
  }

  for (let attempt = 0; ; attempt += 1) {
    const headers = buildHeaders(path, init)
    try {
      return await fetchJsonOnce<T>(path, init, headers)
    } catch (error) {
      if (shouldRefreshParticipantCsrf && isCsrfError(error) && attempt === 0) {
        participantCsrfToken = ''
        await refreshParticipantCsrfToken()
        continue
      }
      // A caller-initiated abort (unmount / superseded request) is intentional — never retry it.
      if (callerSignal?.aborted || attempt >= maxRetries || !isTransientFailure(error)) {
        throw error
      }
      await delay(RETRY_BASE_DELAY_MS * (attempt + 1))
    }
  }
}

// Step 14 (B2): a tiny GET cache + in-flight dedup so revisiting a page doesn't refetch data that
// was just loaded, and two components asking for the same path at once share one request. Public
// reads only; callers that pass an AbortSignal use getJson directly so their cancellation semantics
// stay intact. The underlying getJson retries safe reads on transient failures (see its comment), so
// these cached reads inherit that resilience; a real error (4xx, malformed body) still rejects at once.
interface ApiCacheEntry {
  value: unknown
  expiresAt: number
}
const apiCache = new Map<string, ApiCacheEntry>()
const apiInflight = new Map<string, Promise<unknown>>()
const DEFAULT_CACHE_TTL_MS = 30_000

function getCachedJson<T>(path: string, ttlMs = DEFAULT_CACHE_TTL_MS): Promise<T> {
  const cached = apiCache.get(path)
  if (cached && cached.expiresAt > Date.now()) {
    return Promise.resolve(cached.value as T)
  }
  const existing = apiInflight.get(path)
  if (existing) {
    return existing as Promise<T>
  }
  const request = getJson<T>(path, { method: 'GET', headers: {} })
    .then((value) => {
      apiCache.set(path, { value, expiresAt: Date.now() + ttlMs })
      return value
    })
    .finally(() => {
      apiInflight.delete(path)
    })
  apiInflight.set(path, request)
  return request as Promise<T>
}

// Drop cached reads — for tests and for after a mutation that should force a fresh read.
export function clearApiCache() {
  apiCache.clear()
  apiInflight.clear()
}

export function clearApiClientState() {
  clearApiCache()
  participantCsrfToken = ''
  adminCsrfToken = ''
  participantCsrfRefresh = null
}

export function fetchBootstrap() {
  return getCachedJson<BootstrapPayload>('/api/public/bootstrap')
}

export function registerParticipant(payload: {
  email: string
  displayName: string
  soccerverseUsername?: string
  referrerSoccerverseUsername?: string
  marketingOptIn?: boolean
  browserLocale?: LocaleCode
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
    body: JSON.stringify({
      ...payload,
      browserLocale: payload.browserLocale ?? detectBrowserLocale(),
    }),
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
  return getCachedJson<{ items: TeamPoolPlayer[] }>(`/api/public/team-players/${teamCode}`)
}

export function fetchRookieLeaderboard(signal?: AbortSignal) {
  return getJson<{ items: ParticipantScoreRow[] }>('/api/public/leaderboards/rookie', {
    method: 'GET',
    headers: {},
    signal,
  })
}

export function fetchVeteranLeaderboard(signal?: AbortSignal) {
  return getJson<{ items: ParticipantScoreRow[] }>('/api/public/leaderboards/veteran', {
    method: 'GET',
    headers: {},
    signal,
  })
}

export function fetchNationLeaderboard(signal?: AbortSignal) {
  return getJson<{ items: NationScoreRow[] }>('/api/public/leaderboards/nations', {
    method: 'GET',
    headers: {},
    signal,
  })
}

export function fetchNationParticipation(signal?: AbortSignal) {
  return getJson<{ items: NationParticipationRow[] }>('/api/public/nation-participation', {
    method: 'GET',
    headers: {},
    signal,
  })
}

export function fetchFixtures(signal?: AbortSignal) {
  return getJson<{ items: FixtureSeed[] }>('/api/public/fixtures', {
    method: 'GET',
    headers: {},
    signal,
  })
}

export function fetchMatchResults() {
  return getCachedJson<{
    items: PublicFixtureResult[]
    summary: {
      totalFixtures: number
      finalFixtures: number
      pendingFixtures: number
    }
  }>('/api/public/match-results')
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

export function updateSquadBudget(budgetLimit: number) {
  return getJson<{ squad: ParticipantSquad }>('/api/participant/squad/budget', {
    method: 'POST',
    body: JSON.stringify({ budgetLimit }),
  })
}

export function lockSquad() {
  return getJson<{ squad: ParticipantSquad }>('/api/participant/squad/lock', {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export function fetchSwapState() {
  return getJson<SwapState>('/api/participant/squad/swaps', {
    method: 'GET',
    headers: {},
  })
}

export function fetchParticipantBoost(refresh = false) {
  const query = refresh ? '?refresh=1' : ''
  return getJson<ParticipantBoostResult>(`/api/participant/boost${query}`, {
    method: 'GET',
    headers: {},
  })
}

export function swapSquadPlayers(playerInId: number, playerOutId: number) {
  return getJson<{ swap: SwapResultSummary; squad: ParticipantSquad }>('/api/participant/squad/swap', {
    method: 'POST',
    body: JSON.stringify({ playerInId, playerOutId }),
  })
}

export function fetchParticipantLineup(fixtureId: string) {
  return getJson<{ lineup: ParticipantLineup }>(`/api/participant/lineups/${encodeURIComponent(fixtureId)}`, {
    method: 'GET',
    headers: {},
  })
}

export function assignLineupPlayer(fixtureId: string, slotKey: string, playerId: number) {
  return getJson<{ lineup: ParticipantLineup }>(`/api/participant/lineups/${encodeURIComponent(fixtureId)}/assign`, {
    method: 'POST',
    body: JSON.stringify({ slotKey, playerId }),
  })
}

export function removeLineupPlayer(fixtureId: string, slotKey: string) {
  return getJson<{ lineup: ParticipantLineup }>(
    `/api/participant/lineups/${encodeURIComponent(fixtureId)}/slots/${encodeURIComponent(slotKey)}`,
    {
      method: 'DELETE',
      headers: {},
    },
  )
}

export function resetLineup(fixtureId: string) {
  return getJson<{ lineup: ParticipantLineup }>(`/api/participant/lineups/${encodeURIComponent(fixtureId)}/reset`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export function lockLineup(fixtureId: string) {
  return getJson<{ lineup: ParticipantLineup }>(`/api/participant/lineups/${encodeURIComponent(fixtureId)}/lock`, {
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

export function linkSoccerverseAccount(soccerverseUsername: string) {
  return getJson<{ participant: ParticipantProfile }>('/api/participant/link-soccerverse', {
    method: 'POST',
    body: JSON.stringify({ soccerverseUsername }),
  })
}

export function adminSetParticipantLeague(participantId: string, leagueType: 'rookie' | 'veteran') {
  return getJson<{ participant: ParticipantProfile }>(
    `/api/admin/participants/${encodeURIComponent(participantId)}/league`,
    {
      method: 'POST',
      body: JSON.stringify({ leagueType }),
    },
  )
}

export function adminCorrectSoccerverseUsername(participantId: string, soccerverseUsername: string) {
  return getJson<{ participant: ParticipantProfile }>(
    `/api/admin/participants/${encodeURIComponent(participantId)}/soccerverse-username`,
    {
      method: 'POST',
      body: JSON.stringify({ soccerverseUsername }),
    },
  )
}

export function adminUpdateParticipantNations(
  participantId: string,
  primaryTeamCode: string,
  secondaryTeamCode: string | null,
) {
  return getJson<{ participant: ParticipantProfile }>(
    `/api/admin/participants/${encodeURIComponent(participantId)}/nations`,
    {
      method: 'POST',
      body: JSON.stringify({ primaryTeamCode, secondaryTeamCode }),
    },
  )
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
  return getCachedJson<{ item: PublicParticipantProfile }>(`/api/public/profiles/${encodeURIComponent(slug)}`)
}

export function fetchSquadUsage() {
  return getCachedJson<PublicSquadUsagePayload>('/api/public/squad-usage')
}

export function fetchPlayerPoints() {
  return getCachedJson<PlayerPointsPayload>('/api/public/player-points')
}

export function fetchBudgetStats() {
  return getCachedJson<BudgetStatsPayload>('/api/public/budget-stats')
}

export function fetchBoostLeaderboard() {
  return getCachedJson<BoostLeaderboardPayload>('/api/public/boost-leaderboard')
}

export function fetchAdminOverview(signal?: AbortSignal) {
  return getJson<AdminOverview>('/api/admin/overview', {
    method: 'GET',
    headers: {},
    signal,
  })
}

export function fetchAdminAuditLogs(limit = 50, signal?: AbortSignal) {
  return getJson<{ items: AuditLogEntry[] }>(`/api/admin/audit?limit=${encodeURIComponent(String(limit))}`, {
    method: 'GET',
    headers: {},
    signal,
  })
}

export function fetchAdminOperationEvents(limit = 50, signal?: AbortSignal) {
  return getJson<{ items: OperationEvent[] }>(`/api/admin/operations/events?limit=${encodeURIComponent(String(limit))}`, {
    method: 'GET',
    headers: {},
    signal,
  })
}

export function fetchAdminParticipants() {
  return getJson<{ items: AdminParticipantRecord[] }>('/api/admin/participants', {
    method: 'GET',
    headers: {},
  })
}

export function fetchAdminRiskCases() {
  return getJson<{ items: ParticipantRiskCase[] }>('/api/admin/risk-cases', {
    method: 'GET',
    headers: {},
  })
}

export function updateAdminRiskCaseStatus(caseId: string, status: ParticipantRiskCaseStatus, note?: string) {
  return getJson<{ item: ParticipantRiskCase }>(`/api/admin/risk-cases/${encodeURIComponent(caseId)}/status`, {
    method: 'POST',
    body: JSON.stringify({ status, note }),
  })
}

export function sendAdminRiskInquiryEmail(caseId: string, participantId: string) {
  return getJson<{ item: ParticipantRiskCase; inquiry: ParticipantRiskInquiryEmail }>(
    `/api/admin/risk-cases/${encodeURIComponent(caseId)}/members/${encodeURIComponent(participantId)}/inquiry-email`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
  )
}

export function fetchAdminParticipantTrash() {
  return getJson<{ items: ParticipantTrashEntry[] }>('/api/admin/participant-trash', {
    method: 'GET',
    headers: {},
  })
}

export function moveAdminParticipantToTrash(participantId: string, reason?: string) {
  return getJson<{ item: ParticipantTrashEntry }>(`/api/admin/participants/${encodeURIComponent(participantId)}/trash`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export function restoreAdminParticipantFromTrash(participantId: string) {
  return getJson<{ item: ParticipantTrashEntry }>(`/api/admin/participants/${encodeURIComponent(participantId)}/restore`, {
    method: 'POST',
    body: JSON.stringify({}),
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

export function recordLandingPageVisit(landingPath: string) {
  return getJson<void>('/api/public/landing-page-visit', {
    method: 'POST',
    body: JSON.stringify({ landingPath }),
  })
}

export function updateAdminScoring(scoring: ScoringConfig) {
  return getJson<{ item: ScoringConfig }>('/api/admin/scoring', {
    method: 'PUT',
    body: JSON.stringify(scoring),
  })
}

export function triggerGlobalReveal(payload: { revealProfiles: boolean; revealSquads: boolean }) {
  return getJson<{ eventControls: EventControls }>('/api/admin/reveal/global', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function fetchEmailCampaigns(signal?: AbortSignal) {
  return getJson<{ campaigns: EmailCampaignRecord[] }>('/api/admin/email-marketing/campaigns', {
    method: 'GET',
    headers: {},
    signal,
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

export function fetchTeamSelections(teamCode: string, signal?: AbortSignal) {
  return getJson<{ items: TeamPoolPlayer[] }>(`/api/admin/teams/${teamCode}/selections`, {
    method: 'GET',
    headers: {},
    signal,
  })
}

export function searchTeamCandidates(teamCode: string, query: string, allCountries = false) {
  const params = new URLSearchParams({ query })
  if (allCountries) {
    params.set('allCountries', 'true')
  }
  return getJson<{ items: SoccerversePlayer[] }>(
    `/api/admin/teams/${teamCode}/candidates?${params.toString()}`,
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

export function fetchMatchImportBatches(signal?: AbortSignal) {
  return getJson<{ items: PendingMatchBatch[] }>('/api/admin/match-import/batches', {
    method: 'GET',
    headers: {},
    signal,
  })
}

export function fetchMatchImportBatch(batchId: string) {
  return getJson<{ batch: PendingMatchBatch }>(
    `/api/admin/match-import/batches/${encodeURIComponent(batchId)}`,
    { method: 'GET', headers: {} },
  )
}

// Fix 7: parse + resolve without persisting. The admin resolves/skips every unresolved row
// from the returned resolution, then calls uploadMatchImport with the overrides.
export function parseMatchImport(payload: { fixtureId: string; input: MatchImportInput }) {
  return getJson<{ resolution: MatchResolution }>('/api/admin/match-import/parse', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function uploadMatchImport(payload: {
  fixtureId: string
  input: MatchImportInput
  overrides: ResolutionOverride[]
  replace?: boolean
}) {
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

// Official scoreline overrides: a display-only correction for the public results page when an
// own goal or skipped scorer makes the per-player goal sum read low. Keyed by fixtureId.
export function fetchOfficialScores() {
  return getJson<{ overrides: Record<string, { home: number; away: number }> }>(
    '/api/admin/match-import/official-scores',
    { method: 'GET', headers: {} },
  )
}

export function setOfficialScore(fixtureId: string, homeGoals: number, awayGoals: number) {
  return getJson<{ fixtureId: string; score: { home: number; away: number } }>(
    `/api/admin/match-import/fixtures/${encodeURIComponent(fixtureId)}/official-score`,
    { method: 'PUT', body: JSON.stringify({ homeGoals, awayGoals }) },
  )
}

export function clearOfficialScore(fixtureId: string) {
  return getJson<void>(
    `/api/admin/match-import/fixtures/${encodeURIComponent(fixtureId)}/official-score`,
    { method: 'DELETE', headers: {} },
  )
}
