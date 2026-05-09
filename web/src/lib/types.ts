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

export interface AdminProfile {
  adminId: string
  email: string
  isActive: boolean
}
