export type LocaleCode = 'en' | 'es' | 'de' | 'fr' | 'pt' | 'ru' | 'zh'

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
  kickoffTimeLocal: string
  homeTeamCode: string
  awayTeamCode: string
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

export interface BootstrapPayload {
  supportedLocales: LocaleCode[]
  defaultLocale: LocaleCode
  scoring: ScoringConfig
  budgetLimit: number
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
  leagueType: LeagueType
  primaryTeamCode: string
  secondaryTeamCode?: string
  status: 'pending_verification' | 'active' | 'locked' | 'withdrawn'
  verifiedAt?: string
  hasPassword: boolean
  revealProfile?: boolean
  revealSquad?: boolean
}

export interface AdminParticipantRecord extends ParticipantProfile {
  createdAt?: string
  updatedAt?: string
  verificationSentAt?: string
  passwordSetAt?: string
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

export interface MatchEntryInput {
  fixtureId: string
  playerId: number
  inOfficialSquad: boolean
  minutes: number
  goals: number
  assists: number
  cleanSheetEligible: boolean
  performancePoints?: number
  sourceNote?: string
}

export interface MatchEntryRecord extends MatchEntryInput {
  entryId: string
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
  referrerSoccerverseUsername?: string
  marketingUnsubscribeToken?: string
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
