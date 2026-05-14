export type LeagueType = 'rookie' | 'veteran'

export type SupportedLocale = 'en' | 'es' | 'de' | 'fr' | 'pt' | 'ru' | 'zh'

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
  kickoffDate: string
  kickoffTimeLocal: string
  homeTeamCode: string
  awayTeamCode: string
}

export interface RegistrationInput {
  email: string
  displayName: string
  soccerverseUsername?: string
  primaryTeamCode: string
  secondaryTeamCode?: string
}

export interface ParticipantProfile {
  participantId: string
  email: string
  displayName: string
  soccerverseUsername?: string
  leagueType: LeagueType
  primaryTeamCode: string
  secondaryTeamCode?: string
  status: ParticipantStatus
  verifiedAt?: string
  hasPassword: boolean
  revealProfile?: boolean
  revealSquad?: boolean
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

export interface ScoringConfig {
  goal: number
  assist: number
  cleanSheet: number
  appearance: number
  minutes: number
  performancePointsMin: number
  performancePointsMax: number
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
  budgetUsed: number
  budgetRemaining: number
  isLocked: boolean
  slots: SquadSlotState[]
}

export interface ParticipantSquadSummary {
  budgetLimit: number
  budgetUsed: number
  budgetRemaining: number
  draftedCount: number
  isLocked: boolean
}

export interface AssignPlayerInput {
  slotKey: string
  playerId: number
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

export type EmailCampaignKind = 'newsletter' | 'autoresponder'
export type EmailCampaignStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'sending' | 'sent'
export type EmailCampaignTrigger = 'manual' | 'registration_created' | 'registration_verified'
export type EmailCampaignAudienceStatus = 'all' | 'pending_verification' | 'active'
export type EmailRecipientStatus = 'pending' | 'sent' | 'failed' | 'skipped'

export interface EmailCampaignInput {
  campaignId?: string
  kind: EmailCampaignKind
  status?: EmailCampaignStatus
  triggerKey?: EmailCampaignTrigger
  subject: string
  bodyHtml: string
  audienceStatus: EmailCampaignAudienceStatus
  scheduledAt?: string
  delayMinutes?: number
  batchSize?: number
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
  sourceUrl: string
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

// Output of a MatchStatsImporter adapter: a batch ready to create, plus the names the
// adapter deliberately skipped (D12 skip list) for the review summary.
export interface ImportedMatch {
  batchInput: CreateMatchBatchInput
  skippedNames: string[]
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
  rank: number
}

export interface NationScoreRow {
  teamCode: string
  participantCount: number
  averageScore: number
  topScore: number
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
