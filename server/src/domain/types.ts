export type LeagueType = 'rookie' | 'veteran'

export type SupportedLocale = 'en' | 'es' | 'de' | 'fr' | 'pt' | 'ru' | 'zh'

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

export interface RegistrationRecord {
  participantId: string
  email: string
  displayName: string
  soccerverseUsername?: string
  leagueType: LeagueType
  primaryTeamCode: string
  secondaryTeamCode?: string
  status: 'pending_verification' | 'active' | 'locked' | 'withdrawn'
  verificationTokenHash: string
  verificationTokenExpiresAt: string
  verifiedAt?: string
}

export interface RegistrationCreationResult {
  record: RegistrationRecord
  plainToken: string
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
  teams: TeamSeed[]
  fixtures: FixtureSeed[]
  leagues: {
    rookie: string
    veteran: string
  }
}
