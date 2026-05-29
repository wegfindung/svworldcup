export type LeagueType = 'rookie' | 'veteran'

export type SupportedLocale = 'en' | 'es' | 'it' | 'de' | 'fr' | 'pt' | 'ru' | 'zh' | 'ja'

export type ParticipantStatus = 'pending_verification' | 'active' | 'locked' | 'withdrawn'

export type SlotClass = 'GK' | 'DEF' | 'MID' | 'FWD'

export type SlotGroup = 'starter' | 'sub'

export interface TeamSeed {
  code: string
  slug: string
  nameEn: string
  groupKey: string
}

export interface FixtureSeed {
  fixtureId: string
  groupKey: string
  /** Kickoff date, UTC. */
  kickoffDate: string
  /** Kickoff wall-clock time in UTC (HH:MM:SS). Frontends format into the viewer's local timezone. */
  kickoffTimeUtc: string
  homeTeamCode: string
  awayTeamCode: string
}

export interface RegistrationInput {
  email: string
  displayName: string
  soccerverseUsername?: string
  referrerSoccerverseUsername?: string
  marketingOptIn?: boolean
  browserLocale?: SupportedLocale
  primaryTeamCode: string
  secondaryTeamCode?: string
}

export interface ParticipantProfile {
  participantId: string
  email: string
  displayName: string
  soccerverseUsername?: string
  referrerSoccerverseUsername?: string
  marketingOptIn: boolean
  marketingUnsubscribedAt?: string
  marketingUnsubscribeToken?: string
  browserLocale?: SupportedLocale
  leagueType: LeagueType
  primaryTeamCode: string
  secondaryTeamCode?: string
  status: ParticipantStatus
  verifiedAt?: string
  soccerverseLinkedAt?: string
  hasPassword: boolean
  revealProfile?: boolean
  revealSquad?: boolean
}

export interface AdminParticipantRecord extends ParticipantProfile {
  createdAt?: string
  updatedAt?: string
  verificationSentAt?: string
  passwordSetAt?: string
  riskSummary?: ParticipantRiskSummary
}

export type ParticipantRiskEventType = 'registration' | 'login' | 'verify' | 'squad_lock' | 'lineup_lock'

export type ParticipantRiskCaseStatus = 'open' | 'reviewing' | 'confirmed' | 'dismissed'

export interface ParticipantRiskSummary {
  participantId: string
  openCaseCount: number
  maxRiskScore: number
  caseIds: string[]
}

export interface ParticipantRiskSignalInput {
  participant: Pick<
    ParticipantProfile,
    'participantId' | 'email' | 'displayName' | 'leagueType' | 'primaryTeamCode' | 'secondaryTeamCode' | 'status'
  >
  eventType: ParticipantRiskEventType
  emailCanonicalHash?: string
  emailDomain?: string
  emailProvider?: string
  emailIsDisposable?: boolean
  emailMxStatus?: string
  emailMxHostCount?: number
  ipHash?: string
  ipv4Cidr24Hash?: string
  ipv4Cidr26Hash?: string
  ipv6Cidr64Hash?: string
  userAgentHash?: string
  acceptLanguageHash?: string
  acceptLanguage?: string
  clientFingerprintHash?: string
  clientFingerprint?: Record<string, unknown>
}

export interface ParticipantRiskCaseMember {
  participantId: string
  email: string
  displayName: string
  leagueType: LeagueType
  status: ParticipantStatus
  primaryTeamCode: string
  secondaryTeamCode?: string
  memberScore: number
  reasonKeys: string[]
  lastSignalAt?: string
}

export interface ParticipantRiskCase {
  caseId: string
  caseKey: string
  title: string
  status: ParticipantRiskCaseStatus
  score: number
  reasonKeys: string[]
  detail: Record<string, unknown>
  firstSeenAt: string
  lastSeenAt: string
  createdAt: string
  updatedAt: string
  members: ParticipantRiskCaseMember[]
}

export interface ReferralAnalyticsRow {
  referrerSoccerverseUsername: string
  clickCount: number
  registrationCount: number
  verifiedCount: number
  marketingOptInCount: number
  conversionRate: number
}

export interface RegistrationRecord extends ParticipantProfile {
  verificationTokenHash: string
  verificationTokenExpiresAt: string
  createdAt?: string
}

export interface RegistrationCreationResult {
  record: RegistrationRecord
  plainToken: string
}

export interface ParticipantSessionRecord {
  sessionId: string
  participantId: string
  tokenHash: string
  expiresAt: string
}

export interface AdminProfile {
  adminId: string
  email: string
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export interface AdminSessionRecord {
  sessionId: string
  adminId: string
  tokenHash: string
  expiresAt: string
}

export interface PerformanceCurveAnchor {
  rating: number
  points: number
}

export interface ScoringConfig {
  goal: number
  assist: number
  appearance: number
  minutes: number
  cleanSheet: Record<SlotClass, number>
  performanceCurve: PerformanceCurveAnchor[]
}

export interface BudgetOption {
  budgetLimit: number
  scoreMultiplier: number
}

export interface EventControls {
  globalRevealProfiles: boolean
  globalRevealSquads: boolean
}

export interface PublicBootstrapPayload {
  supportedLocales: SupportedLocale[]
  defaultLocale: SupportedLocale
  scoring: ScoringConfig
  budgetLimit: number
  budgetOptions: BudgetOption[]
  teams: TeamSeed[]
  fixtures: FixtureSeed[]
  leagues: {
    rookie: string
    veteran: string
  }
}

export interface SlotDefinition {
  key: string
  slotGroup: SlotGroup
  slotClass: SlotClass
  order: number
  label: string
}

export interface TeamPoolPlayer {
  teamCode: string
  playerId: number
  displayName: string
  nationalityCode: string
  rating: number
  capCost: number
  positions: string[]
  positionMain?: string
  positionClasses: SlotClass[]
  imageUrl: string
}

export interface SquadSlotState extends SlotDefinition {
  player: TeamPoolPlayer | null
}

export interface ParticipantSquad {
  squadId: string
  participantId: string
  budgetLimit: number
  scoreMultiplier: number
  budgetUsed: number
  budgetRemaining: number
  isLocked: boolean
  lockedAt: string | null
  slots: SquadSlotState[]
}

export interface ParticipantLineup {
  lineupId: string
  participantId: string
  fixtureId: string
  budgetLimit: number
  budgetUsed: number
  budgetRemaining: number
  isLocked: boolean
  slots: SquadSlotState[]
}

export interface ParticipantSquadSummary {
  budgetLimit: number
  scoreMultiplier: number
  budgetUsed: number
  budgetRemaining: number
  draftedCount: number
  isLocked: boolean
}

export interface AssignPlayerInput {
  slotKey: string
  playerId: number
}

// A mid-tournament player swap: bring a reserve on for a same-class starter. Identified by player
// ids (the server validates class + current starter/reserve status). See SOP "Player Swaps".
export interface SwapPlayersInput {
  playerInId: number // the reserve being promoted to starter
  playerOutId: number // the starter being demoted to reserve
}

// One per-round lineup snapshot slot (squad_round_lineup row), used by scoring's as-of-round lookup.
export interface RoundLineupSlot {
  participantId: string
  roundKey: number
  slotKey: string
  slotGroup: SlotGroup
  slotClass: SlotClass
  playerId: number
  positionCodes: string[]
}

// One recorded swap (squad_swaps row): the queryable history + per-window limit counter.
export interface SwapRecord {
  swapId: string
  squadId: string
  participantId: string
  windowKey: string
  roundKey: number
  slotClass: SlotClass
  slotIn: string
  slotOut: string
  playerInId: number
  playerOutId: number
  appliedAt: string
}

// Outcome of a committed swap, returned to the endpoint/UI.
export interface SwapResultSummary {
  swap: SwapRecord
  windowKey: string
  targetRound: number
  swapsUsedInWindow: number // including this swap
  swapLimit: number
}

export interface SoccerversePlayerRecord {
  playerId: number
  displayName: string
  nationalityCode: string
  rating: number
  clubId: number
  positions: string[]
  positionMain?: string
  imageUrl?: string
}

export interface MatchEntryInput {
  fixtureId: string
  playerId: number
  inOfficialSquad: boolean
  minutes: number
  goals: number
  assists: number
  cleanSheetEligible: boolean
  performancePoints?: number
  // D19: rating is a raw captured fact; performance_points derivation from it is parked.
  rating?: number
  sourceNote?: string
}

export interface MatchEntryRecord extends MatchEntryInput {
  entryId: string
}

export interface ParticipantInfluenceSnapshotRecord {
  participantId: string
  fixtureId: string
  playerId: number
  netShares: number
  bonusPercent: number
  snapshotAt: string
}

export type EmailCampaignKind = 'newsletter' | 'autoresponder'
export type EmailCampaignStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'sending' | 'sent'
export type EmailCampaignTrigger = 'manual' | 'registration_created' | 'registration_verified'
export type EmailCampaignAudienceStatus = 'all' | 'pending_verification' | 'active'
export type EmailCampaignAudienceLeague = 'all' | 'rookie' | 'veteran'
export type EmailRecipientStatus = 'pending' | 'sent' | 'failed' | 'skipped'

export interface EmailCampaignInput {
  campaignId?: string
  kind: EmailCampaignKind
  status?: EmailCampaignStatus
  triggerKey?: EmailCampaignTrigger
  subject: string
  bodyHtml: string
  subjectByLocale?: Partial<Record<SupportedLocale, string>>
  bodyHtmlByLocale?: Partial<Record<SupportedLocale, string>>
  audienceStatus: EmailCampaignAudienceStatus
  audienceLeague?: EmailCampaignAudienceLeague
  audienceTeamCode?: string
  audienceReferrer?: string
  scheduledAt?: string
  delayMinutes?: number
  batchSize?: number
  requiresMarketingOptIn?: boolean
}

export interface EmailCampaignRecord extends EmailCampaignInput {
  campaignId: string
  status: EmailCampaignStatus
  triggerKey: EmailCampaignTrigger
  delayMinutes: number
  batchSize: number
  createdBy: string
  updatedBy: string
  sentAt?: string
  createdAt: string
  updatedAt: string
  previewRecipientCount: number
  queuedCount: number
  pendingCount: number
  sentCount: number
  failedCount: number
}

export interface EmailCampaignRecipient {
  recipientId: string
  campaignId: string
  participantId?: string
  email: string
  displayName: string
  leagueType?: LeagueType
  primaryTeamCode?: string
  secondaryTeamCode?: string
  referrerSoccerverseUsername?: string
  marketingUnsubscribeToken?: string
  browserLocale?: SupportedLocale
  status: EmailRecipientStatus
  queuedAt: string
  sentAt?: string
  error?: string
}

export interface EmailCampaignDispatchSummary {
  campaignId: string
  sent: number
  failed: number
  skipped: number
  pending: number
  status: EmailCampaignStatus
}

// --- Match data import engine (see architecture/SOP_match_data_import.md) ---

export type LineupStatus = 'starter' | 'substitute'

export interface MatchImportJsonMatch {
  homeTeam: string
  awayTeam: string
  homeGoals: number
  awayGoals: number
  // Optional in a raw paste — it may be supplied via the import panel's source URL form
  // field instead. buildMatchImportJson resolves the two before the pipeline runs.
  sourceUrl?: string
}

export interface MatchImportJsonPlayer {
  name: string
  team: string
  lineupStatus: LineupStatus
  minutes: number
  goals: number
  assists: number
  rating: number
}

export interface MatchImportJson {
  match: MatchImportJsonMatch
  players: MatchImportJsonPlayer[]
}

// D9 resolution outcome for one source name.
export type PlayerResolution =
  | { status: 'resolved'; playerId: number }
  | { status: 'skipped' }
  | { status: 'unresolved'; reason: string }

export interface PendingMatchStatRow {
  rowId: string
  batchId: string
  sourceName: string
  teamCode: string
  playerId: number | null
  lineupStatus: LineupStatus
  minutes: number
  goals: number
  assists: number
  rating?: number
  cleanSheetEligible: boolean
}

export interface PendingMatchConfirmation {
  confirmationId: string
  batchId: string
  adminEmail: string
  dataVersion: number
  createdAt: string
}

export interface PendingMatchBatch {
  batchId: string
  fixtureId: string
  sourceUrl: string
  // Fixture-level final score (D16 review display, D11 clean-sheet judgement). Stored on the
  // batch only — not propagated to admin_match_entries.
  homeGoals: number
  awayGoals: number
  dataVersion: number
  createdBy: string
  lastEditedBy?: string
  createdAt: string
  updatedAt: string
  rows: PendingMatchStatRow[]
  confirmations: PendingMatchConfirmation[]
}

export interface CreateMatchBatchRowInput {
  sourceName: string
  teamCode: string
  playerId: number | null
  lineupStatus: LineupStatus
  minutes: number
  goals: number
  assists: number
  rating?: number
  cleanSheetEligible: boolean
}

export interface CreateMatchBatchInput {
  fixtureId: string
  sourceUrl: string
  homeGoals: number
  awayGoals: number
  createdBy: string
  rows: CreateMatchBatchRowInput[]
}

export interface UpdateMatchRowInput {
  playerId?: number | null
  lineupStatus?: LineupStatus
  minutes?: number
  goals?: number
  assists?: number
  rating?: number
  cleanSheetEligible?: boolean
}

export interface MatchImportPlayerMapEntry {
  mapId: string
  teamCode: string
  normalizedSourceName: string
  playerId: number
  createdBy: string
  createdAt: string
}

export interface UpsertPlayerMapInput {
  teamCode: string
  normalizedSourceName: string
  playerId: number
  createdBy: string
}

export interface MatchImportSkipNameEntry {
  skipId: string
  teamCode: string
  normalizedSourceName: string
  createdBy: string
  createdAt: string
}

export interface AddSkipNameInput {
  teamCode: string
  normalizedSourceName: string
  createdBy: string
}

// One parsed player row plus its resolution outcome. Produced by a MatchStatsImporter
// adapter for the pre-persist resolve stage; skipped names are reported separately, so a
// row here is always 'resolved' or 'unresolved' at parse time (an override can later make
// it 'skipped').
export interface ResolvedMatchRow {
  sourceName: string
  teamCode: string
  lineupStatus: LineupStatus
  minutes: number
  goals: number
  assists: number
  rating: number
  resolution: PlayerResolution
}

// Output of a MatchStatsImporter adapter: the parsed + auto-resolved match, before any
// persistence. The admin resolves or skips every unresolved row, then it is finalized
// into a CreateMatchBatchInput.
export interface MatchResolution {
  fixtureId: string
  sourceUrl: string
  // The fixture's two sides, so a row's teamCode can be mapped to the goals it conceded
  // (the opposing side's goals) when deriving clean-sheet eligibility at finalize.
  homeTeamCode: string
  awayTeamCode: string
  homeGoals: number
  awayGoals: number
  rows: ResolvedMatchRow[]
  skippedNames: string[]
}

// An admin's pre-persist choices for one row, keyed by the row's (teamCode, sourceName):
// a resolve (playerId) or skip choice, plus optional stat edits (Fix A). A stat field, when
// present, overrides the parsed value for that field. Clean-sheet eligibility is deliberately
// absent here — it is auto-derived at finalize (60+ minutes AND the team conceded none) and
// corrected, when needed, via the post-promote row edit (UpdateMatchRowInput.cleanSheetEligible),
// which lets an admin fix own-goal / feed mistakes; that manual override wins.
export interface ResolutionOverride {
  sourceName: string
  teamCode: string
  playerId?: number
  skip?: true
  minutes?: number
  goals?: number
  assists?: number
  rating?: number
  lineupStatus?: LineupStatus
}

// --- Audit log (see architecture/SOP_match_data_import.md, audit logging) ---

export interface AuditLogInput {
  actorEmail: string
  actionKey: string
  entityType: string
  entityId: string
  detail?: Record<string, unknown>
}

export interface AuditLogEntry {
  auditId: string
  actorEmail: string
  actionKey: string
  entityType: string
  entityId: string
  detail: Record<string, unknown>
  createdAt: string
}

export interface ParticipantScoreRow {
  participantId: string
  displayName: string
  leagueType: LeagueType
  primaryTeamCode: string
  secondaryTeamCode?: string
  totalScore: number
  baseScore: number
  bonusPercent: number
  scoreMultiplier: number
  breakdown: ParticipantScoreBreakdown
  fixtures: ParticipantScoreFixtureDetail[]
  rank: number
}

export interface ParticipantScoreBreakdown {
  goals: { count: number; points: number }
  assists: { count: number; points: number }
  appearances: { count: number; points: number }
  minutes: { count: number; points: number }
  cleanSheets: { count: number; points: number }
  performance: { points: number }
}

export interface ParticipantScoreFixtureDetail {
  fixtureId: string
  totalPoints: number
  players: ParticipantScorePlayerDetail[]
}

export interface ParticipantScorePlayerDetail {
  fixtureId: string
  playerId: number
  displayName: string
  teamCode: string
  imageUrl?: string
  slotKey: string
  slotGroup: SlotGroup
  slotClass: SlotClass
  minutes: number
  goals: number
  assists: number
  cleanSheetEligible: boolean
  rating?: number
  sourceNote?: string
  goalPoints: number
  assistPoints: number
  appearancePoints: number
  minutesPoints: number
  cleanSheetPoints: number
  performancePoints: number
  totalPoints: number
}

export interface NationScoreRow {
  teamCode: string
  participantCount: number
  averageScore: number
  topScore: number
  contributors: NationScoreContributor[]
  rank: number
}

export interface NationScoreContributor {
  participantId: string
  displayName: string
  leagueType: LeagueType
  primaryTeamCode: string
  secondaryTeamCode?: string
  totalScore: number
  rank: number
}

export interface PublicParticipantProfile {
  slug: string
  participantId: string
  displayName: string
  soccerverseUsername?: string
  leagueType: LeagueType
  primaryTeamCode: string
  secondaryTeamCode?: string
  revealProfile: boolean
  revealSquad: boolean
  score?: ParticipantScoreRow
  // squad.slots reflect the effective (post-swap) lineup, not the lock-time draft.
  squad?: ParticipantSquad
  // Public swap history, present when the squad is revealed (empty if no swaps made).
  swaps?: SwapRecord[]
}
