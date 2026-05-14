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
  leagueType: LeagueType
  primaryTeamCode: string
  secondaryTeamCode?: string
  status: 'pending_verification' | 'active' | 'locked' | 'withdrawn'
  verifiedAt?: string
  hasPassword: boolean
  revealProfile?: boolean
  revealSquad?: boolean
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
