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
  pageTitleSuffix: 'Grand Tournament top picks',
  pageDescriptionPrefix: 'Featured picks',
  cta: 'Join The Grand Tournament and compete for prizes.',
  bodyBadge: 'The Grand Tournament',
  bodyHeading: 'Grand Tournament top picks',
  bodyIntro: 'A shareable snapshot built in The Grand Tournament squad builder.',
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
    pageTitleSuffix: 'Grand Tournament Top Picks',
    pageDescriptionPrefix: 'Ausgewählte Picks',
    cta: 'Mach bei The Grand Tournament mit und spiele um Preise.',
    bodyBadge: 'The Grand Tournament',
    bodyHeading: 'Grand Tournament Top Picks',
    bodyIntro: 'Eine teilbare Vorschau aus dem The Grand Tournament-Kader-Builder.',
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
