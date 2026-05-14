import type { ShareLocale } from './sharePayload.js'

interface ShareLocaleCopy {
  pageTitleSuffix: string
  pageDescriptionPrefix: string
  cta: string
  bodyHeading: string
  bodyIntro: string
  bodyButton: string
}

const englishCopy: ShareLocaleCopy = {
  pageTitleSuffix: 'World Cup squad picks',
  pageDescriptionPrefix: 'Featured players',
  cta: 'Build your World Cup squad and win prizes.',
  bodyHeading: 'World Cup squad snapshot',
  bodyIntro: 'Build your own squad, share it with friends, and compete for prizes.',
  bodyButton: 'Open the squad builder',
}

const copyByLocale: Record<ShareLocale, ShareLocaleCopy> = {
  en: englishCopy,
  es: englishCopy,
  de: {
    pageTitleSuffix: 'WM-Kader-Picks',
    pageDescriptionPrefix: 'Ausgewählte Spieler',
    cta: 'Baue deinen WM-Kader und spiele um Preise.',
    bodyHeading: 'WM-Kader-Snapshot',
    bodyIntro: 'Baue deinen eigenen Kader, teile ihn mit Freunden und spiele um Preise.',
    bodyButton: 'Zum Kader-Builder',
  },
  fr: englishCopy,
  pt: englishCopy,
  ru: englishCopy,
  zh: englishCopy,
}

export function getShareCopy(locale: ShareLocale): ShareLocaleCopy {
  return copyByLocale[locale] ?? englishCopy
}
