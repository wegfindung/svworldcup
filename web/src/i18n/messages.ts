import type { LocaleCode } from '../lib/types'

export const messages: Record<LocaleCode, Record<string, string>> = {
  en: {
    heroEyebrow: 'community event 2026',
    heroTitle: 'Build a hidden World Cup squad worth revealing.',
    heroBody:
      'Pick your 15 under the Soccerverse wage cap, lock one free entry, and compete across rookie, veteran, and nation tables once kickoff arrives.',
    heroPrimary: 'Register your entry',
    heroSecondary: 'View public tables',
    scoringTitle: 'Tournament rules',
    builderTitle: 'Player search',
    tablesTitle: 'Public tables',
    profileTitle: 'Public profile',
    loading: 'Loading live tournament bootstrap…',
    backendOffline: 'Backend not reachable. Start the server on port 3000 to load live data.',
  },
  es: {},
  de: {},
  fr: {},
  pt: {},
  ru: {},
  zh: {},
}

export function t(locale: LocaleCode, key: string) {
  return messages[locale][key] ?? messages.en[key] ?? key
}
