import type { LocaleCode } from './types'

export interface ShareStatementPreset {
  id: string
  template: string
}

interface ShareComposerCopy {
  eyebrow: string
  title: string
  body: string
  shareLanguageLabel: string
  shareLanguageHelp: string
  nativeShareTitle: string
  statementLabel: string
  statementHelp: string
  presetsLabel: string
  customLabel: string
  customPlaceholder: string
  customCounter: string
  playersLabel: string
  playersHelp: string
  selectedPlayersLabel: string
  selectedPlayersHelp: string
  playerNameLabel: string
  playerNameHelp: string
  playerNamePlaceholder: string
  previewLabel: string
  previewHelp: string
  referralTextLabel: string
  referralTextHelp: string
  referralTextCopyButton: string
  referralTextCopiedLabel: string
  shareButton: string
  copyButton: string
  copiedLabel: string
  previewButton: string
  backButton: string
  lockedHint: string
  incompleteTitle: string
  incompleteBody: string
  loading: string
  errorTitle: string
  selectionHint: string
  prizeCta: string
  presets: ShareStatementPreset[]
}

const englishCopy: ShareComposerCopy = {
  eyebrow: 'social sharing',
  title: 'Create a polished Grant Tournament picks card.',
  body: 'Choose two or three featured players, fine-tune the names shown on the artwork, and publish a cleaner public preview link without locking your squad.',
  shareLanguageLabel: 'Share language',
  shareLanguageHelp: 'Controls the public preview, social snippet, share image copy, and invite link language.',
  nativeShareTitle: 'The Grant Tournament',
  statementLabel: 'Choose the headline',
  statementHelp: 'Preset headlines adapt automatically to 2 or 3 selected players. You can also write your own.',
  presetsLabel: 'Preset headlines',
  customLabel: 'Custom headline',
  customPlaceholder: 'Write one short headline for the share graphic.',
  customCounter: 'characters',
  playersLabel: 'Choose 2-3 featured players',
  playersHelp: 'These players appear on the artwork. Their country flag is placed inside the portrait automatically.',
  selectedPlayersLabel: 'Names on the graphic',
  selectedPlayersHelp: 'Use an optional nickname or shorter label if you want something other than the official player name.',
  playerNameLabel: 'Display name on graphic',
  playerNameHelp: 'Optional. Leave empty to use the official name.',
  playerNamePlaceholder: 'Nickname or shorter display name',
  previewLabel: 'Live share preview',
  previewHelp: 'The image below is the same card used for the public preview and social share link.',
  referralTextLabel: 'Invite text',
  referralTextHelp: 'Copy this text for posts, DMs, or marketing emails. The link keeps your referral parameter.',
  referralTextCopyButton: 'Copy invite text',
  referralTextCopiedLabel: 'Invite text copied.',
  shareButton: 'Share now',
  copyButton: 'Copy public link',
  copiedLabel: 'Public link copied.',
  previewButton: 'Open public preview',
  backButton: 'Back to builder',
  lockedHint: 'A full 15-player squad unlocks sharing. Final submit is not required.',
  incompleteTitle: 'Complete all 15 squad slots first',
  incompleteBody: 'Return to the builder, fill every slot, then come back to generate a social sharing card.',
  loading: 'Loading your current squad…',
  errorTitle: 'Share composer unavailable',
  selectionHint: 'Select at least 2 and at most 3 players.',
  prizeCta: 'Join The Grant Tournament and compete for prizes.',
  presets: [
    { id: 'top-picks', template: 'My {count} top picks for The Grant Tournament.' },
    { id: 'backing', template: 'These are the {count} players I am backing for The Grant Tournament.' },
    { id: 'featured', template: 'My featured {count} for The Grant Tournament.' },
  ],
}

const germanCopy: ShareComposerCopy = {
  eyebrow: 'social sharing',
  title: 'Erstelle eine professionelle Grant Tournament-Picks-Grafik.',
  body: 'Wähle zwei oder drei Spieler aus, passe die angezeigten Namen bei Bedarf an und veröffentliche einen deutlich besseren Vorschaulink, ohne deinen Kader zu locken.',
  shareLanguageLabel: 'Share-Sprache',
  shareLanguageHelp: 'Steuert den öffentlichen Preview-Link, das Social Snippet, die Share-Grafik und die Sprache des Einladungstexts.',
  nativeShareTitle: 'The Grant Tournament',
  statementLabel: 'Wähle die Überschrift',
  statementHelp: 'Die Vorlagen passen sich automatisch an 2 oder 3 ausgewählte Spieler an. Du kannst auch deine eigene Überschrift schreiben.',
  presetsLabel: 'Vorlagen',
  customLabel: 'Eigene Überschrift',
  customPlaceholder: 'Schreibe eine kurze Überschrift für die Share-Grafik.',
  customCounter: 'Zeichen',
  playersLabel: 'Wähle 2-3 Spieler für die Grafik',
  playersHelp: 'Diese Spieler erscheinen auf der Grafik. Die Länderflagge sitzt automatisch im Portrait.',
  selectedPlayersLabel: 'Namen auf der Grafik',
  selectedPlayersHelp: 'Hier kannst du optional Spitznamen oder kürzere Anzeigenamen verwenden statt des offiziellen Spielnamens.',
  playerNameLabel: 'Anzeigename auf der Grafik',
  playerNameHelp: 'Optional. Leer lassen, um den offiziellen Namen zu verwenden.',
  playerNamePlaceholder: 'Spitzname oder kürzerer Anzeigename',
  previewLabel: 'Live-Vorschau',
  previewHelp: 'Das Bild unten ist dieselbe Karte, die auch im öffentlichen Preview-Link und beim Teilen verwendet wird.',
  referralTextLabel: 'Einladungstext',
  referralTextHelp: 'Kopiere diesen Text für Posts, DMs oder Marketing-Mails. Der Link enthält deinen Referral-Parameter.',
  referralTextCopyButton: 'Einladungstext kopieren',
  referralTextCopiedLabel: 'Einladungstext kopiert.',
  shareButton: 'Jetzt teilen',
  copyButton: 'Öffentlichen Link kopieren',
  copiedLabel: 'Öffentlicher Link kopiert.',
  previewButton: 'Öffentliche Vorschau öffnen',
  backButton: 'Zurück zum Builder',
  lockedHint: 'Ein vollständiger 15er-Kader schaltet das Teilen frei. Ein Final Submit ist nicht nötig.',
  incompleteTitle: 'Fülle zuerst alle 15 Kaderplätze',
  incompleteBody: 'Gehe zurück in den Builder, fülle jeden Slot und erstelle danach deine Social-Sharing-Grafik.',
  loading: 'Dein aktueller Kader wird geladen…',
  errorTitle: 'Share-Composer nicht verfügbar',
  selectionHint: 'Wähle mindestens 2 und höchstens 3 Spieler.',
  prizeCta: 'Mach bei The Grant Tournament mit und spiele um Preise.',
  presets: [
    { id: 'top-picks', template: 'Meine {count} Top Picks für The Grant Tournament.' },
    { id: 'backing', template: 'Auf diese {count} Spieler setze ich bei The Grant Tournament.' },
    { id: 'featured', template: 'Das sind meine {count} Featured Picks für The Grant Tournament.' },
  ],
}

const spanishCopy: ShareComposerCopy = {
  eyebrow: 'social sharing',
  title: 'Crea una card pulida de picks para Grant Tournament.',
  body: 'Elige dos o tres jugadores destacados, ajusta los nombres que salen en la imagen y publica un enlace de vista previa limpio sin bloquear tu plantilla.',
  shareLanguageLabel: 'Idioma para compartir',
  shareLanguageHelp: 'Controla la vista publica, el snippet social, la imagen compartida y el idioma del texto de invitacion.',
  nativeShareTitle: 'The Grant Tournament',
  statementLabel: 'Elige el titular',
  statementHelp: 'Los titulares predefinidos se adaptan automaticamente a 2 o 3 jugadores seleccionados. Tambien puedes escribir el tuyo.',
  presetsLabel: 'Titulares predefinidos',
  customLabel: 'Titular propio',
  customPlaceholder: 'Escribe un titular corto para la imagen compartida.',
  customCounter: 'caracteres',
  playersLabel: 'Elige 2-3 jugadores destacados',
  playersHelp: 'Estos jugadores aparecen en la imagen. La bandera del pais se coloca automaticamente dentro del retrato.',
  selectedPlayersLabel: 'Nombres en la imagen',
  selectedPlayersHelp: 'Puedes usar un apodo o un nombre mas corto si no quieres mostrar el nombre oficial.',
  playerNameLabel: 'Nombre mostrado en la imagen',
  playerNameHelp: 'Opcional. Dejalo vacio para usar el nombre oficial.',
  playerNamePlaceholder: 'Apodo o nombre mas corto',
  previewLabel: 'Vista previa en vivo',
  previewHelp: 'La imagen de abajo es la misma card que se usa en el enlace publico y al compartir en redes.',
  referralTextLabel: 'Texto de invitacion',
  referralTextHelp: 'Copia este texto para posts, DMs o emails de marketing. El enlace mantiene tu parametro de referral.',
  referralTextCopyButton: 'Copiar invitacion',
  referralTextCopiedLabel: 'Texto de invitacion copiado.',
  shareButton: 'Compartir ahora',
  copyButton: 'Copiar enlace publico',
  copiedLabel: 'Enlace publico copiado.',
  previewButton: 'Abrir vista publica',
  backButton: 'Volver al builder',
  lockedHint: 'Una plantilla completa de 15 jugadores desbloquea el sharing. No necesitas hacer final submit.',
  incompleteTitle: 'Completa primero los 15 puestos',
  incompleteBody: 'Vuelve al builder, rellena cada puesto y despues genera tu card para redes.',
  loading: 'Cargando tu plantilla actual...',
  errorTitle: 'Share composer no disponible',
  selectionHint: 'Selecciona al menos 2 y como maximo 3 jugadores.',
  prizeCta: 'Unete a The Grant Tournament y compite por premios.',
  presets: [
    { id: 'top-picks', template: 'Mis {count} top picks para The Grant Tournament.' },
    { id: 'backing', template: 'Estos son los {count} jugadores por los que apuesto en The Grant Tournament.' },
    { id: 'featured', template: 'Mis {count} destacados para The Grant Tournament.' },
  ],
}

const italianCopy: ShareComposerCopy = {
  ...englishCopy,
  title: 'Crea una card pulita con i tuoi pick per Grant Tournament.',
  shareLanguageLabel: 'Lingua di condivisione',
  shareLanguageHelp: 'Controlla anteprima pubblica, snippet social, immagine condivisa e lingua del testo invito.',
  statementLabel: 'Scegli il titolo',
  presetsLabel: 'Titoli predefiniti',
  customLabel: 'Titolo personalizzato',
  copyButton: 'Copia link pubblico',
  previewButton: 'Apri anteprima pubblica',
  backButton: 'Torna al builder',
  selectionHint: 'Seleziona almeno 2 e al massimo 3 giocatori.',
  prizeCta: 'Partecipa a The Grant Tournament e competi per i premi.',
  presets: [
    { id: 'top-picks', template: 'I miei {count} top pick per The Grant Tournament.' },
    { id: 'backing', template: 'Questi sono i {count} giocatori su cui punto in The Grant Tournament.' },
    { id: 'featured', template: 'I miei {count} giocatori in evidenza per The Grant Tournament.' },
  ],
}

const frenchCopy: ShareComposerCopy = {
  ...englishCopy,
  title: 'Cree une carte soignee avec tes choix Grant Tournament.',
  shareLanguageLabel: 'Langue du partage',
  shareLanguageHelp: 'Controle l apercu public, le snippet social, l image partagee et la langue du texte d invitation.',
  statementLabel: 'Choisis le titre',
  presetsLabel: 'Titres predefinis',
  customLabel: 'Titre personnalise',
  copyButton: 'Copier le lien public',
  previewButton: 'Ouvrir l apercu public',
  backButton: 'Retour au builder',
  selectionHint: 'Selectionne au moins 2 et au plus 3 joueurs.',
  prizeCta: 'Rejoins The Grant Tournament et joue pour les prix.',
  presets: [
    { id: 'top-picks', template: 'Mes {count} meilleurs choix pour The Grant Tournament.' },
    { id: 'backing', template: 'Voici les {count} joueurs que je soutiens dans The Grant Tournament.' },
    { id: 'featured', template: 'Mes {count} joueurs en vedette pour The Grant Tournament.' },
  ],
}

const portugueseCopy: ShareComposerCopy = {
  ...englishCopy,
  title: 'Cria uma card polida com as tuas escolhas Grant Tournament.',
  shareLanguageLabel: 'Idioma de partilha',
  shareLanguageHelp: 'Controla a pre-visualizacao publica, o snippet social, a imagem partilhada e o idioma do convite.',
  statementLabel: 'Escolhe o titulo',
  presetsLabel: 'Titulos predefinidos',
  customLabel: 'Titulo proprio',
  copyButton: 'Copiar link publico',
  previewButton: 'Abrir pre-visualizacao publica',
  backButton: 'Voltar ao builder',
  selectionHint: 'Seleciona pelo menos 2 e no maximo 3 jogadores.',
  prizeCta: 'Entra no The Grant Tournament e compete por premios.',
  presets: [
    { id: 'top-picks', template: 'As minhas {count} principais escolhas para The Grant Tournament.' },
    { id: 'backing', template: 'Estes sao os {count} jogadores em que aposto no The Grant Tournament.' },
    { id: 'featured', template: 'Os meus {count} destaques para The Grant Tournament.' },
  ],
}

const copyByLocale: Record<LocaleCode, ShareComposerCopy> = {
  en: englishCopy,
  es: spanishCopy,
  it: italianCopy,
  de: germanCopy,
  fr: frenchCopy,
  pt: portugueseCopy,
  ru: englishCopy,
  zh: englishCopy,
  ja: englishCopy,
}

export function getShareComposerCopy(locale: LocaleCode) {
  return copyByLocale[locale] ?? englishCopy
}

export function renderSharePreset(template: string, playerCount: number) {
  return template.replaceAll('{count}', String(playerCount))
}
