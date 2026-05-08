export type LocaleCode = 'en' | 'es' | 'de' | 'fr' | 'pt' | 'ru' | 'zh'

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
  teams: TeamSeed[]
  fixtures: FixtureSeed[]
  leagues: {
    rookie: string
    veteran: string
  }
}

export interface SoccerversePlayer {
  playerId: number
  name: string
  clubId: number
  nationality: string
  rating: number
  positions: string[]
  positionMain?: string
}
