import type { ShareLocale } from './sharePayload.js'

interface ShareLocaleCopy {
  pageTitleSuffix: string
  pageDescriptionPrefix: string
  cta: string
  bodyBadge: string
  bodyHeading: string
  bodyIntro: string
  bodyButton: string
  bodyBylinePrefix: string
  inviteLabel: string
  inviteButton: string
  inviteCopyButton: string
}

const englishCopy: ShareLocaleCopy = {
  pageTitleSuffix: 'World Cup top picks',
  pageDescriptionPrefix: 'Featured picks',
  cta: 'Join the Soccerverse World Cup and compete for prizes.',
  bodyBadge: 'Soccerverse World Cup',
  bodyHeading: 'World Cup top picks',
  bodyIntro: 'A shareable snapshot built in the Soccerverse World Cup squad builder.',
  bodyButton: 'Open the squad builder',
  bodyBylinePrefix: 'Shared by',
  inviteLabel: 'Invite text',
  inviteButton: 'Open competition link',
  inviteCopyButton: 'Copy invite text',
}

const copyByLocale: Record<ShareLocale, ShareLocaleCopy> = {
  en: englishCopy,
  es: englishCopy,
  it: englishCopy,
  de: {
    pageTitleSuffix: 'WM Top Picks',
    pageDescriptionPrefix: 'Ausgewählte Picks',
    cta: 'Mach beim Soccerverse World Cup mit und spiele um Preise.',
    bodyBadge: 'Soccerverse World Cup',
    bodyHeading: 'WM Top Picks',
    bodyIntro: 'Eine teilbare Vorschau aus dem Soccerverse World Cup Kader-Builder.',
    bodyButton: 'Zum Kader-Builder',
    bodyBylinePrefix: 'Geteilt von',
    inviteLabel: 'Einladungstext',
    inviteButton: 'Wettbewerbslink öffnen',
    inviteCopyButton: 'Einladungstext kopieren',
  },
  fr: englishCopy,
  pt: englishCopy,
  ru: englishCopy,
  zh: englishCopy,
  ja: englishCopy,
}

export function getShareCopy(locale: ShareLocale): ShareLocaleCopy {
  return copyByLocale[locale] ?? englishCopy
}
