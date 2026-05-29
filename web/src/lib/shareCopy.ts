import type { LocaleCode } from './types'

export interface ShareStatementPreset {
  id: string
  template: string
}

interface ShareComposerCopy {
  eyebrow: string
  title: string
  body: string
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
  title: 'Create a polished Grand Tournament picks card.',
  body: 'Choose two or three featured players, fine-tune the names shown on the artwork, and publish a cleaner public preview link without locking your squad.',
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
  prizeCta: 'Join The Grand Tournament and compete for prizes.',
  presets: [
    { id: 'top-picks', template: 'My {count} top picks for the Grand Tournament.' },
    { id: 'backing', template: 'These are the {count} players I am backing for the Grand Tournament.' },
    { id: 'featured', template: 'My featured {count} for The Grand Tournament.' },
  ],
}

const germanCopy: ShareComposerCopy = {
  eyebrow: 'social sharing',
  title: 'Erstelle eine professionelle Grand Tournament-Picks-Grafik.',
  body: 'Wähle zwei oder drei Spieler aus, passe die angezeigten Namen bei Bedarf an und veröffentliche einen deutlich besseren Vorschaulink, ohne deinen Kader zu locken.',
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
  prizeCta: 'Mach bei The Grand Tournament mit und spiele um Preise.',
  presets: [
    { id: 'top-picks', template: 'Meine {count} Top Picks für The Grand Tournament.' },
    { id: 'backing', template: 'Auf diese {count} Spieler setze ich bei The Grand Tournament.' },
    { id: 'featured', template: 'Das sind meine {count} Featured Picks für The Grand Tournament.' },
  ],
}

const copyByLocale: Record<LocaleCode, ShareComposerCopy> = {
  en: englishCopy,
  es: englishCopy,
  it: englishCopy,
  de: germanCopy,
  fr: englishCopy,
  pt: englishCopy,
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
