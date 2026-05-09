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
}

export interface RegistrationRecord extends ParticipantProfile {
  verificationTokenHash: string
  verificationTokenExpiresAt: string
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
}
