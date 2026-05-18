import type { LocaleCode } from '../lib/types'

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends ReadonlyArray<infer U>
    ? ReadonlyArray<DeepPartial<U>>
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K]
}

const englishMessages = {
  nav: {
    primary: [
      { to: '/', label: 'Overview' },
      { to: '/builder', label: 'Builder' },
      { to: '/results', label: 'Results' },
      { to: '/tables', label: 'Tables' },
    ],
    account: [
      { to: '/login', label: 'Login' },
      { to: '/admin', label: 'Admin' },
    ],
    register: 'Register',
    logoAlt: 'Soccerverse World Cup Community Event',
    toggle: 'Toggle navigation',
  },
  home: {
    hero: {
      eyebrow: 'community event 2026',
      badge: 'one locked entry',
      kicker: 'Hidden squads. Public pressure. Nation pride.',
      titleLines: ['Draft 15.', 'Hide the squad.', 'Beat your nation.'],
      body:
        'Build one Soccerverse World Cup squad under your chosen cap, lock it for the full competition, then watch every official match swing the rookie, veteran, and nation rankings.',
      primaryCta: 'Register your entry',
      secondaryCta: 'Start building',
      playerWallLabel: 'Featured Soccerverse players',
    },
    mechanics: [
      { step: '01', title: 'Draft hidden', body: 'Pick 15 players under the live SVC cap before the first whistle.' },
      { step: '02', title: 'Lock once', body: 'Your squad stays fixed for the whole competition. No matchday tinkering.' },
      { step: '03', title: 'Climb tables', body: 'Every goal, assist, clean sheet, and performance point hits the public race.' },
    ],
    squadBlueprint: {
      eyebrow: 'locked squad',
      badge: '15 players',
      body: 'One entry, one cap, one squad for the full tournament.',
    },
    dataStrip: {
      teams: 'Teams',
      squad: 'Squad',
      matches: 'Matches',
    },
    proof: {
      eyebrow: 'what moves the table',
      goal: 'Goal',
      assist: 'Assist',
      cleanSheet: 'Clean sheet',
    },
    rankingTracks: {
      eyebrow: 'three races at once',
      items: [
        { title: 'Rookie', body: 'New managers fight the open table from day one.' },
        { title: 'Veteran', body: 'Established accounts get their own pressure lane.' },
        { title: 'Nation', body: 'Every selected country carries its managers into a country ranking.' },
      ],
    },
    nations: {
      eyebrow: 'Top football nations',
    },
    discord: {
      eyebrow: 'Join Discord',
      title: 'Find builders, rivals, and reveal pressure.',
      body: 'The Discord server is the fastest route into the event before registrations spike.',
      cta: 'Open community invite',
    },
    nextKickoff: {
      eyebrow: 'next live window',
      title: 'Next kickoff',
      timezone: 'BST schedule',
      fallbackDay: 'Schedule pending',
      fallbackTime: 'TBC',
      groupPrefix: 'Group',
      versus: 'vs',
      empty: 'Match schedule will appear here once the public bootstrap is available.',
      cta: 'Open results centre',
    },
    rules: {
      eyebrow: 'Tournament rules',
      title: 'Lock the event logic before kickoff',
      body: 'These values are loaded from the current public event configuration.',
      scroll: 'scroll',
      eligibilityTitle: 'eligibility',
      eligibility: [
        'No multi-accounts.',
        'All teams use the 4-3-3 structure with four locked substitutes.',
        'Squads stay hidden until the participant reveals them or an admin reveals all squads at kickoff.',
      ],
      budgetTitle: 'salary budget',
      budgetBody: 'Choose a tighter budget for a stronger multiplier, or spend more with a lower multiplier.',
      pointsTitle: 'points',
      goal: 'Goal',
      assist: 'Assist',
      appearance: 'Appearance',
      minutes: '60+ minutes',
      cleanSheet: 'Clean sheet',
      performance: 'Performance',
      performanceMaxPrefix: 'Up to',
      performanceMaxSuffix: 'Points',
      pointsBody: 'Performance points are based on real performance data and are entered by admins.',
      requestPolicyTitle: 'request policy',
      requestPolicyBody:
        'Public pages may load live read-only event data automatically. Registration, verification, protected builder loading, and backend tools still require explicit user or admin action.',
    },
  },
  scoringCalculator: {
    eyebrow: 'score calculator',
    title: 'Try a player result.',
    body:
      'Estimate one drafted player score from the live scoring config. The calculator mirrors appearance, 60-minute, clean-sheet, rating, budget multiplier, and ownership boost logic.',
    slotClass: 'Slot class',
    goals: 'Goals',
    assists: 'Assists',
    minutes: 'Minutes',
    rating: 'Match rating',
    cleanSheet: 'Clean sheet eligible',
    budget: 'Budget multiplier',
    boost: 'Ownership boost',
    baseScore: 'Base player points',
    bonusScore: 'Boost points',
    finalScore: 'Final after budget',
    breakdown: 'Breakdown',
    reset: 'Reset example',
    components: {
      goals: 'Goals',
      assists: 'Assists',
      appearance: 'Appearance',
      minutes: '60+ minutes',
      cleanSheet: 'Clean sheet',
      performance: 'Performance',
    },
  },
  tables: {
    heroEyebrow: 'public standings',
    heroTitle: 'Rookie and veteran tables in one place.',
    heroBody:
      'Every active participant can appear here, even before the first points land. Scores update as match data is entered, and ties are resolved by earlier registration.',
    refresh: 'Refresh tables',
  },
  legacy: {
    builderTitle: 'Player search',
    profileTitle: 'Public profile',
    loading: 'Loading live tournament bootstrap...',
    backendOffline: 'Backend not reachable. Start the server on port 3000 to load live data.',
  },
} as const

export type AppMessages = typeof englishMessages

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function mergeMessages<T>(base: T, override: DeepPartial<T> | undefined): T {
  if (!override) {
    return base
  }

  if (Array.isArray(base)) {
    return (Array.isArray(override) && override.length ? override : base) as T
  }

  if (!isRecord(base) || !isRecord(override)) {
    return (override ?? base) as T
  }

  const merged: Record<string, unknown> = { ...base }
  for (const key of Object.keys(override)) {
    merged[key] = mergeMessages((base as Record<string, unknown>)[key], override[key as keyof typeof override] as never)
  }
  return merged as T
}

export const messages: Record<LocaleCode, DeepPartial<AppMessages>> = {
  en: englishMessages,
  es: {},
  de: {},
  fr: {},
  pt: {},
  ru: {},
  zh: {},
}

export function getMessages(locale: LocaleCode): AppMessages {
  return mergeMessages(englishMessages, messages[locale])
}

export function t(locale: LocaleCode, key: string) {
  const copy = getMessages(locale)
  const legacyMap: Record<string, string> = {
    heroEyebrow: copy.home.hero.eyebrow,
    heroTitle: copy.home.hero.titleLines.join(' '),
    heroBody: copy.home.hero.body,
    heroPrimary: copy.home.hero.primaryCta,
    heroSecondary: copy.home.hero.secondaryCta,
    scoringTitle: copy.home.rules.eyebrow,
    builderTitle: copy.legacy.builderTitle,
    tablesTitle: copy.tables.heroEyebrow,
    profileTitle: copy.legacy.profileTitle,
    loading: copy.legacy.loading,
    backendOffline: copy.legacy.backendOffline,
  }

  return legacyMap[key] ?? key
}
