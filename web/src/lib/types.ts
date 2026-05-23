export type LocaleCode = 'en' | 'es' | 'it' | 'de' | 'fr' | 'pt' | 'ru' | 'zh'

export type LeagueType = 'rookie' | 'veteran'

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
  kickoffDate: string
  /** Kickoff wall-clock time in UTC (HH:MM:SS). Frontends format into the viewer's local timezone. */
  kickoffTimeUtc: string
  homeTeamCode: string
  awayTeamCode: string
}

export interface PublicFixtureResult extends FixtureSeed {
  homeGoals: number | null
  awayGoals: number | null
  status: 'final' | 'pending'
  entryCount: number
  homePlayers: PublicFixturePlayerResult[]
  awayPlayers: PublicFixturePlayerResult[]
}

export interface PublicFixturePlayerResult {
  playerId: number
  displayName: string
  teamCode: string
  imageUrl?: string
  minutes: number
  goals: number
  assists: number
  cleanSheetEligible: boolean
  rating?: number
  sourceNote?: string
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

export interface BootstrapPayload {
  supportedLocales: LocaleCode[]
  defaultLocale: LocaleCode
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

export interface SoccerversePlayer {
  playerId: number
  displayName: string
  clubId: number
  nationalityCode: string
  rating: number
  imageUrl: string
  positions: string[]
  positionMain?: string
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
  browserLocale?: LocaleCode
  leagueType: LeagueType
  primaryTeamCode: string
  secondaryTeamCode?: string
  status: 'pending_verification' | 'active' | 'locked' | 'withdrawn'
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

export type ParticipantRiskCaseStatus = 'open' | 'reviewing' | 'confirmed' | 'dismissed'

export interface ParticipantRiskSummary {
  participantId: string
  openCaseCount: number
  maxRiskScore: number
  caseIds: string[]
}

export interface ParticipantRiskCaseMember {
  participantId: string
  email: string
  displayName: string
  leagueType: LeagueType
  status: ParticipantProfile['status']
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

export interface SquadSlotState {
  key: string
  slotGroup: SlotGroup
  slotClass: SlotClass
  order: number
  label: string
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

export interface AdminProfile {
  adminId: string
  email: string
  isActive: boolean
}

export interface AdminOverview {
  counts: {
    pending: number
    active: number
  }
  scoring: ScoringConfig
  eventControls: EventControls
  scoringLocked: boolean
  defaults: ScoringConfig
  teamSelectionCounts: Record<string, number>
}

export interface EventControls {
  globalRevealProfiles: boolean
  globalRevealSquads: boolean
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
  squad?: ParticipantSquad
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
  subjectByLocale?: Partial<Record<LocaleCode, string>>
  bodyHtmlByLocale?: Partial<Record<LocaleCode, string>>
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
  browserLocale?: LocaleCode
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

export interface AuditLogEntry {
  auditId: string
  actorEmail: string
  actionKey: string
  entityType: string
  entityId: string
  detail: Record<string, unknown>
  createdAt: string
}

export type OperationEventType = 'email_scheduler' | 'soccerverse_api'
export type OperationEventStatus = 'ok' | 'warning' | 'error'

export interface OperationEvent {
  eventId: string
  type: OperationEventType
  status: OperationEventStatus
  message: string
  detail: Record<string, unknown>
  createdAt: string
}

// --- Match data import engine (see architecture/SOP_match_data_import.md) ---
// Frontend mirrors of the server domain types in server/src/domain/types.ts.

export type LineupStatus = 'starter' | 'substitute'

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

// Stat-only edit of a pending row (D17). playerId is excluded — remapping goes through the
// dedicated resolve route so the D9 mapping write-back happens.
export interface MatchImportRowEdit {
  minutes?: number
  goals?: number
  assists?: number
  rating?: number
  lineupStatus?: LineupStatus
  cleanSheetEligible?: boolean
}

export interface MatchImportPromotionResult {
  promoted: boolean
  promotedRowCount: number
}

export interface MatchImportSkipNameEntry {
  skipId: string
  teamCode: string
  normalizedSourceName: string
  createdBy: string
  createdAt: string
}

// Resolution outcome for one source name — mirrors the server (D9).
export type PlayerResolution =
  | { status: 'resolved'; playerId: number }
  | { status: 'skipped' }
  | { status: 'unresolved'; reason: string }

// One parsed player row plus its resolution, from POST /match-import/parse.
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

// The pre-persist parse result — nothing is persisted until /upload (Fix 7).
export interface MatchResolution {
  fixtureId: string
  sourceUrl: string
  homeGoals: number
  awayGoals: number
  rows: ResolvedMatchRow[]
  skippedNames: string[]
}

// The admin's pre-persist choices for one row — a resolve/skip choice plus optional stat
// edits (Fix A). Mirrors the server ResolutionOverride. A stat field, when present, overrides
// the parsed value; clean-sheet eligibility is not here — it stays a review-screen judgement.
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

// What the import panel submits — structured JSON, or a CSV/TSV player-rows paste whose
// match-level fields come from form inputs (Fix 12).
export type MatchImportInput =
  | { format: 'json'; json: unknown; sourceUrl?: string }
  | { format: 'csv'; text: string; homeGoals: number; awayGoals: number; sourceUrl: string }
