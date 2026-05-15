import type { LeagueType, LocaleCode, ScoringConfig, TeamSeed } from '../lib/types'

export const supportedLocales: LocaleCode[] = ['en', 'es', 'de', 'fr', 'pt', 'ru', 'zh']

export const defaultLocale: LocaleCode = 'en'

export const budgetLimit = 3_000_000

export const defaultScoring: ScoringConfig = {
  goal: 5,
  assist: 3,
  appearance: 1,
  minutes: 1,
  cleanSheet: { GK: 4, DEF: 4, MID: 1, FWD: 0 },
  performanceCurve: [
    { rating: 6.0, points: 0.5 },
    { rating: 8.0, points: 1.0 },
    { rating: 9.5, points: 1.5 },
    { rating: 10.0, points: 2.0 },
  ],
}

export const leagueCopy: Record<LeagueType, string> = {
  rookie: 'Rookie league',
  veteran: 'Veteran league',
}

export const eventTeams: TeamSeed[] = [
  { code: 'MEX', slug: 'mexico', nameEn: 'Mexico', groupKey: 'A' },
  { code: 'RSA', slug: 'south-africa', nameEn: 'South Africa', groupKey: 'A' },
  { code: 'KOR', slug: 'south-korea', nameEn: 'South Korea', groupKey: 'A' },
  { code: 'CZE', slug: 'czech-republic', nameEn: 'Czech Republic', groupKey: 'A' },
  { code: 'CAN', slug: 'canada', nameEn: 'Canada', groupKey: 'B' },
  { code: 'BIH', slug: 'bosnia-and-herzegovina', nameEn: 'Bosnia and Herzegovina', groupKey: 'B' },
  { code: 'QAT', slug: 'qatar', nameEn: 'Qatar', groupKey: 'B' },
  { code: 'SUI', slug: 'switzerland', nameEn: 'Switzerland', groupKey: 'B' },
  { code: 'BRA', slug: 'brazil', nameEn: 'Brazil', groupKey: 'C' },
  { code: 'MAR', slug: 'morocco', nameEn: 'Morocco', groupKey: 'C' },
  { code: 'HAI', slug: 'haiti', nameEn: 'Haiti', groupKey: 'C' },
  { code: 'SCO', slug: 'scotland', nameEn: 'Scotland', groupKey: 'C' },
  { code: 'USA', slug: 'united-states', nameEn: 'United States', groupKey: 'D' },
  { code: 'PAR', slug: 'paraguay', nameEn: 'Paraguay', groupKey: 'D' },
  { code: 'AUS', slug: 'australia', nameEn: 'Australia', groupKey: 'D' },
  { code: 'TUR', slug: 'turkey', nameEn: 'Turkey', groupKey: 'D' },
  { code: 'CIV', slug: 'ivory-coast', nameEn: 'Ivory Coast', groupKey: 'E' },
  { code: 'ECU', slug: 'ecuador', nameEn: 'Ecuador', groupKey: 'E' },
  { code: 'GER', slug: 'germany', nameEn: 'Germany', groupKey: 'E' },
  { code: 'CUW', slug: 'curacao', nameEn: 'Curacao', groupKey: 'E' },
  { code: 'NED', slug: 'netherlands', nameEn: 'Netherlands', groupKey: 'F' },
  { code: 'JPN', slug: 'japan', nameEn: 'Japan', groupKey: 'F' },
  { code: 'SWE', slug: 'sweden', nameEn: 'Sweden', groupKey: 'F' },
  { code: 'TUN', slug: 'tunisia', nameEn: 'Tunisia', groupKey: 'F' },
  { code: 'BEL', slug: 'belgium', nameEn: 'Belgium', groupKey: 'G' },
  { code: 'EGY', slug: 'egypt', nameEn: 'Egypt', groupKey: 'G' },
  { code: 'IRN', slug: 'iran', nameEn: 'Iran', groupKey: 'G' },
  { code: 'NZL', slug: 'new-zealand', nameEn: 'New Zealand', groupKey: 'G' },
  { code: 'KSA', slug: 'saudi-arabia', nameEn: 'Saudi Arabia', groupKey: 'H' },
  { code: 'URU', slug: 'uruguay', nameEn: 'Uruguay', groupKey: 'H' },
  { code: 'ESP', slug: 'spain', nameEn: 'Spain', groupKey: 'H' },
  { code: 'CPV', slug: 'cape-verde', nameEn: 'Cape Verde', groupKey: 'H' },
  { code: 'IRQ', slug: 'iraq', nameEn: 'Iraq', groupKey: 'I' },
  { code: 'NOR', slug: 'norway', nameEn: 'Norway', groupKey: 'I' },
  { code: 'FRA', slug: 'france', nameEn: 'France', groupKey: 'I' },
  { code: 'SEN', slug: 'senegal', nameEn: 'Senegal', groupKey: 'I' },
  { code: 'ARG', slug: 'argentina', nameEn: 'Argentina', groupKey: 'J' },
  { code: 'ALG', slug: 'algeria', nameEn: 'Algeria', groupKey: 'J' },
  { code: 'AUT', slug: 'austria', nameEn: 'Austria', groupKey: 'J' },
  { code: 'JOR', slug: 'jordan', nameEn: 'Jordan', groupKey: 'J' },
  { code: 'POR', slug: 'portugal', nameEn: 'Portugal', groupKey: 'K' },
  { code: 'COD', slug: 'dr-congo', nameEn: 'Democratic Republic of the Congo', groupKey: 'K' },
  { code: 'UZB', slug: 'uzbekistan', nameEn: 'Uzbekistan', groupKey: 'K' },
  { code: 'COL', slug: 'colombia', nameEn: 'Colombia', groupKey: 'K' },
  { code: 'GHA', slug: 'ghana', nameEn: 'Ghana', groupKey: 'L' },
  { code: 'PAN', slug: 'panama', nameEn: 'Panama', groupKey: 'L' },
  { code: 'ENG', slug: 'england', nameEn: 'England', groupKey: 'L' },
  { code: 'CRO', slug: 'croatia', nameEn: 'Croatia', groupKey: 'L' },
]
