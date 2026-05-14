import type { LocaleCode } from './types'

export interface ShareStatementPreset {
  id: string
  text: string
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
  previewLabel: string
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
  title: 'Create a shareable World Cup squad card.',
  body: 'Pick a statement, choose two or three featured players, and generate a public preview link. You can keep editing your squad afterwards.',
  statementLabel: 'Choose the player statement',
  statementHelp: 'Use one of the preset one-liners or write your own sentence.',
  presetsLabel: 'Preset lines',
  customLabel: 'Custom statement',
  customPlaceholder: 'Write one short sentence for your share graphic.',
  customCounter: 'characters',
  playersLabel: 'Choose 2-3 featured players',
  playersHelp: 'These players appear on the graphic. A round country flag is added automatically.',
  previewLabel: 'Live share preview',
  shareButton: 'Share now',
  copyButton: 'Copy public link',
  copiedLabel: 'Public link copied.',
  previewButton: 'Open public preview',
  backButton: 'Back to builder',
  lockedHint: 'Your full squad unlocks sharing. Locking is not required.',
  incompleteTitle: 'Complete all 15 squad slots first',
  incompleteBody: 'Return to the builder, fill every slot, then come back to generate a social sharing card.',
  loading: 'Loading your current squad…',
  errorTitle: 'Share composer unavailable',
  selectionHint: 'Select at least 2 and at most 3 players.',
  prizeCta: 'Build your World Cup squad and win prizes.',
  presets: [
    { id: 'big-stage', text: 'This is my World Cup squad for the big stage.' },
    { id: 'win-it-all', text: 'I built this squad to win it all.' },
    { id: 'my-picks', text: 'These are my picks for a World Cup run.' },
  ],
}

const germanCopy: ShareComposerCopy = {
  eyebrow: 'social sharing',
  title: 'Erstelle eine teilbare WM-Kader-Grafik.',
  body: 'Wähle einen Satz, markiere zwei oder drei Spieler und erzeuge einen öffentlichen Vorschaulink. Deinen Kader kannst du danach weiter ändern.',
  statementLabel: 'Wähle den Nutzersatz',
  statementHelp: 'Nutze eine der Vorlagen oder schreibe deinen eigenen Ein-Satz-Text.',
  presetsLabel: 'Vorlagen',
  customLabel: 'Benutzerdefiniert',
  customPlaceholder: 'Schreibe einen kurzen Satz für deine Share-Grafik.',
  customCounter: 'Zeichen',
  playersLabel: 'Wähle 2-3 Spieler für die Grafik',
  playersHelp: 'Diese Spieler erscheinen auf der Grafik. Die runde Länderflagge wird automatisch ergänzt.',
  previewLabel: 'Live-Vorschau',
  shareButton: 'Jetzt teilen',
  copyButton: 'Öffentlichen Link kopieren',
  copiedLabel: 'Öffentlicher Link kopiert.',
  previewButton: 'Öffentliche Vorschau öffnen',
  backButton: 'Zurück zum Builder',
  lockedHint: 'Das Teilen wird durch einen vollständigen Kader freigeschaltet. Ein Lock ist nicht nötig.',
  incompleteTitle: 'Fülle zuerst alle 15 Kaderplätze',
  incompleteBody: 'Gehe zurück in den Builder, fülle jeden Slot und erstelle danach deine Social-Sharing-Grafik.',
  loading: 'Dein aktueller Kader wird geladen…',
  errorTitle: 'Share-Composer nicht verfügbar',
  selectionHint: 'Wähle mindestens 2 und höchstens 3 Spieler.',
  prizeCta: 'Baue deinen WM-Kader und spiele um Preise.',
  presets: [
    { id: 'big-stage', text: 'Das ist mein WM-Kader für die große Bühne.' },
    { id: 'win-it-all', text: 'Diesen Kader habe ich gebaut, um alles zu gewinnen.' },
    { id: 'my-picks', text: 'Das sind meine Picks für einen tiefen WM-Run.' },
  ],
}

const copyByLocale: Record<LocaleCode, ShareComposerCopy> = {
  en: englishCopy,
  es: englishCopy,
  de: germanCopy,
  fr: englishCopy,
  pt: englishCopy,
  ru: englishCopy,
  zh: englishCopy,
}

export function getShareComposerCopy(locale: LocaleCode) {
  return copyByLocale[locale] ?? englishCopy
}
