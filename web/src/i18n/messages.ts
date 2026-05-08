import type { LocaleCode } from '../lib/types'

export const messages: Record<LocaleCode, Record<string, string>> = {
  en: {
    heroEyebrow: 'community event 2026',
    heroTitle: 'Draft a World Cup squad without giving veterans a free ride.',
    heroBody:
      'Build a hidden 15-player squad under the Soccerverse wage cap, reveal it on your terms, and compete in rookie, veteran, and nation tables.',
    heroPrimary: 'Open builder',
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
