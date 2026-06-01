import type { ShareLocale } from './sharePayload.js'

interface ShareLocaleCopy {
  pageTitleSuffix: string
  pageDescriptionPrefix: string
  cta: string
  imageCta?: string
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
  pageTitleSuffix: 'Grant Tournament top picks',
  pageDescriptionPrefix: 'Featured picks',
  cta: 'Join The Grant Tournament and compete for prizes.',
  bodyBadge: 'The Grant Tournament',
  bodyHeading: 'Grant Tournament top picks',
  bodyIntro: 'A shareable snapshot built in The Grant Tournament squad builder.',
  bodyButton: 'Open the squad builder',
  bodyBylinePrefix: 'Shared by',
  inviteLabel: 'Invite text',
  inviteButton: 'Open competition link',
  inviteCopyButton: 'Copy invite text',
}

const copyByLocale: Record<ShareLocale, ShareLocaleCopy> = {
  en: englishCopy,
  es: {
    pageTitleSuffix: 'picks principales de Grant Tournament',
    pageDescriptionPrefix: 'Picks destacados',
    cta: 'Unete a The Grant Tournament y compite por premios.',
    bodyBadge: 'The Grant Tournament',
    bodyHeading: 'Picks principales de Grant Tournament',
    bodyIntro: 'Una vista previa compartible creada en el squad builder de The Grant Tournament.',
    bodyButton: 'Abrir el squad builder',
    bodyBylinePrefix: 'Compartido por',
    inviteLabel: 'Texto de invitacion',
    inviteButton: 'Abrir enlace de la competicion',
    inviteCopyButton: 'Copiar texto de invitacion',
  },
  it: {
    pageTitleSuffix: 'top pick Grant Tournament',
    pageDescriptionPrefix: 'Pick in evidenza',
    cta: 'Partecipa a The Grant Tournament e competi per i premi.',
    bodyBadge: 'The Grant Tournament',
    bodyHeading: 'Top pick Grant Tournament',
    bodyIntro: 'Un anteprima condivisibile creata nello squad builder di The Grant Tournament.',
    bodyButton: 'Apri lo squad builder',
    bodyBylinePrefix: 'Condiviso da',
    inviteLabel: 'Testo invito',
    inviteButton: 'Apri il link della competizione',
    inviteCopyButton: 'Copia testo invito',
  },
  de: {
    pageTitleSuffix: 'Grant Tournament Top Picks',
    pageDescriptionPrefix: 'Ausgewählte Picks',
    cta: 'Mach bei The Grant Tournament mit und spiele um Preise.',
    bodyBadge: 'The Grant Tournament',
    bodyHeading: 'Grant Tournament Top Picks',
    bodyIntro: 'Eine teilbare Vorschau aus dem The Grant Tournament-Kader-Builder.',
    bodyButton: 'Zum Kader-Builder',
    bodyBylinePrefix: 'Geteilt von',
    inviteLabel: 'Einladungstext',
    inviteButton: 'Wettbewerbslink öffnen',
    inviteCopyButton: 'Einladungstext kopieren',
  },
  fr: {
    pageTitleSuffix: 'meilleurs choix Grant Tournament',
    pageDescriptionPrefix: 'Choix en vedette',
    cta: 'Rejoins The Grant Tournament et joue pour les prix.',
    bodyBadge: 'The Grant Tournament',
    bodyHeading: 'Meilleurs choix Grant Tournament',
    bodyIntro: 'Un apercu partageable cree dans le squad builder de The Grant Tournament.',
    bodyButton: 'Ouvrir le squad builder',
    bodyBylinePrefix: 'Partage par',
    inviteLabel: 'Texte d invitation',
    inviteButton: 'Ouvrir le lien de competition',
    inviteCopyButton: 'Copier le texte d invitation',
  },
  pt: {
    pageTitleSuffix: 'principais escolhas Grant Tournament',
    pageDescriptionPrefix: 'Escolhas em destaque',
    cta: 'Entra no The Grant Tournament e compete por premios.',
    bodyBadge: 'The Grant Tournament',
    bodyHeading: 'Principais escolhas Grant Tournament',
    bodyIntro: 'Uma pre-visualizacao partilhavel criada no squad builder de The Grant Tournament.',
    bodyButton: 'Abrir o squad builder',
    bodyBylinePrefix: 'Partilhado por',
    inviteLabel: 'Texto de convite',
    inviteButton: 'Abrir link da competicao',
    inviteCopyButton: 'Copiar texto de convite',
  },
  ru: {
    ...englishCopy,
    cta: 'Присоединяйся к The Grant Tournament и соревнуйся за призы.',
    imageCta: englishCopy.cta,
  },
  zh: {
    ...englishCopy,
    cta: '加入 The Grant Tournament，争夺奖励。',
    imageCta: englishCopy.cta,
  },
  ja: {
    ...englishCopy,
    cta: 'The Grant Tournament に参加して賞品を目指そう。',
    imageCta: englishCopy.cta,
  },
}

export function getShareCopy(locale: ShareLocale): ShareLocaleCopy {
  return copyByLocale[locale] ?? englishCopy
}
