export interface RuleKnowledgeEntry {
  id: string
  category: string
  question: string
  answer: string
  source: string
  keywords: string[]
  links?: Array<{
    label: string
    to: string
  }>
}

export const ruleKnowledgeEntries: RuleKnowledgeEntry[] = [
  {
    id: 'nations-leaderboard-ranking',
    category: 'Nations Leaderboard',
    question: 'How does the Nations Leaderboard work?',
    answer:
      'Each manager contributes their full total score to their primary nation and, if selected, their secondary nation. Nations qualify once they have at least 2 manager entries. Qualified nations are ranked by average score, with highest individual manager score used as the tiebreaker.',
    source: 'National Tables / Nation winner determination',
    keywords: ['nation', 'nations', 'leaderboard', 'average', 'secondary', 'primary', 'country', 'ranking', 'tie', 'tiebreak'],
    links: [{ label: 'Open tables', to: '/tables' }],
  },
  {
    id: 'nations-qualification',
    category: 'Nations Leaderboard',
    question: 'Why is my nation not showing on the table?',
    answer:
      'A nation only appears on the public Nations Leaderboard after it has at least 2 manager entries. Primary and secondary picks both count. A single active manager is not enough for the public ranking.',
    source: 'Nation qualification rule',
    keywords: ['missing', 'not showing', 'hidden', 'qualification', 'qualify', 'one manager', 'single manager', 'nation'],
    links: [{ label: 'Open tables', to: '/tables' }],
  },
  {
    id: 'secondary-nation-full-score',
    category: 'Nations Leaderboard',
    question: 'Does my secondary nation get my full score?',
    answer:
      'Yes. Your score is not split between nations. If you picked a secondary nation, your full total score counts for both your primary nation and your secondary nation.',
    source: 'Primary and secondary nation scoring',
    keywords: ['secondary', 'full score', 'split', 'half', 'primary', 'nation'],
  },
  {
    id: 'rookie-veteran-nations',
    category: 'Leagues',
    question: 'Do Rookie and Veteran managers both count for nations?',
    answer:
      'Yes. Rookie and Veteran decide which individual leaderboard you appear on, but both leagues feed into the Nations Leaderboard through the nations selected at registration.',
    source: 'League and nation table separation',
    keywords: ['rookie', 'veteran', 'league', 'nations', 'count', 'individual leaderboard'],
    links: [{ label: 'Open rules', to: '/rules' }],
  },
  {
    id: 'locked-squads-only',
    category: 'Squads',
    question: 'Do unlocked squads score points?',
    answer:
      'No. Public leaderboards are calculated from active managers with locked squads only. A squad starts scoring only for fixtures that kick off after the squad was locked.',
    source: 'Squad lock and late-entry rules',
    keywords: ['locked', 'unlock', 'unlocked', 'score', 'points', 'late', 'fixture', 'kickoff'],
    links: [{ label: 'Open builder', to: '/builder' }],
  },
  {
    id: 'max-four-national-team',
    category: 'Squads',
    question: 'Can I draft more than 4 players from the same national team?',
    answer:
      'No. Your 15-player squad can contain at most 4 players from the same Grand Tournament national team, counting starters and reserves together. This team cap is separate from the nations you pick for the Nation League.',
    source: 'Squad-building cap',
    keywords: ['4 players', 'four players', 'same team', 'national team', 'cap', 'squad', 'starters', 'reserves'],
    links: [{ label: 'Open rules', to: '/rules' }],
  },
  {
    id: 'scoring-rubric',
    category: 'Scoring',
    question: 'How are player points calculated?',
    answer:
      'Players score from real match entries: goals, assists, appearance, 60+ minutes, clean sheets by eligible position, and performance rating. The squad budget multiplier and any ownership boost are then applied to produce the manager total score.',
    source: 'Scoring rubric',
    keywords: ['scoring', 'points', 'goal', 'assist', 'minutes', 'clean sheet', 'rating', 'performance', 'multiplier'],
    links: [{ label: 'Open score calculator', to: '/#score-calculator' }],
  },
  {
    id: 'substitutes-half-points',
    category: 'Scoring',
    question: 'How do substitutes score?',
    answer:
      'Every reserve always contributes 50% of the points it earns from its own real match entries. Starters contribute 100%. There is no automatic activation based on whether a starter played.',
    source: 'Substitute scoring rule',
    keywords: ['sub', 'subs', 'substitute', 'reserve', 'bench', '50%', 'half', 'starter', 'activation'],
    links: [{ label: 'Open rules', to: '/rules' }],
  },
  {
    id: 'swap-windows',
    category: 'Swaps',
    question: 'When can I swap players?',
    answer:
      'Swaps are only allowed inside timed swap windows. A swap exchanges a reserve with a starter of the same position, uses players already in your locked squad, affects future rounds only, and never rewrites points already earned.',
    source: 'Player swaps',
    keywords: ['swap', 'swaps', 'lineup', 'change', 'window', 'reserve', 'starter', 'future rounds'],
    links: [{ label: 'Open builder', to: '/builder' }],
  },
  {
    id: 'ownership-boost',
    category: 'Ownership Boost',
    question: 'How does the Soccerverse ownership boost work?',
    answer:
      'Linked Soccerverse accounts can earn a per-player boost based on net influence bought after the manager registration or link cutoff and before that player fixture kickoff. It is +1% per 10 net shares, capped at +10% per player, and never applies retroactively.',
    source: 'Ownership boost',
    keywords: ['boost', 'ownership', 'influence', 'shares', 'link', 'soccerverse', 'cutoff', 'retroactive', 'veteran'],
    links: [{ label: 'Open rules', to: '/rules' }],
  },
  {
    id: 'budget-multiplier',
    category: 'Budget',
    question: 'Why does a bigger budget get a lower multiplier?',
    answer:
      'The chosen budget cap sets the score multiplier. A tighter cap is harder to build under and earns a stronger multiplier. A bigger cap makes drafting expensive stars easier, so it uses a lower multiplier.',
    source: 'Salary cap and multiplier',
    keywords: ['budget', 'cap', 'multiplier', 'salary', 'bigger budget', 'lower', 'spend'],
    links: [{ label: 'Open rules', to: '/rules' }],
  },
  {
    id: 'results-delay',
    category: 'Results',
    question: 'Why has my score not updated yet?',
    answer:
      'Scores update after match data has been processed. Results may not appear the moment a match ends, and public leaderboards refresh after the scoring data is imported.',
    source: 'Results and points expectation',
    keywords: ['score not updated', 'delay', 'results', 'match data', 'processed', 'import', 'leaderboard refresh'],
    links: [{ label: 'Open results', to: '/results' }],
  },
  {
    id: 'nation-prizes',
    category: 'Prizes',
    question: 'How are nation prizes distributed?',
    answer:
      'Each paying nation pool is split equally among the top 10 managers, paid as if every nation had 10 managers. If a nation has fewer than 10 qualifying managers, the leftover share spills to the next ranked nation or nations, with a minimum 10 SVV payout.',
    source: 'Prize-pool payout rule',
    keywords: ['prize', 'prizes', 'payout', 'top 10', 'svv', 'nation prize', 'leftover', 'spill'],
    links: [{ label: 'Open prizes', to: '/prizes' }],
  },
  {
    id: 'one-account',
    category: 'Fair Play',
    question: 'How many accounts may I use?',
    answer: 'One account only. Multi-accounting is not allowed and can lead to disqualification.',
    source: 'Fair play rule',
    keywords: ['account', 'accounts', 'multi-account', 'multiaccount', 'fair play', 'disqualification'],
  },
]

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9%+ -]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function searchRuleKnowledge(query: string, entries: RuleKnowledgeEntry[] = ruleKnowledgeEntries) {
  const normalizedQuery = normalizeSearchText(query)
  if (!normalizedQuery) {
    return entries.slice(0, 6)
  }

  const tokens = normalizedQuery.split(' ').filter((token) => token.length > 1)

  return entries
    .map((entry) => {
      const category = normalizeSearchText(entry.category)
      const question = normalizeSearchText(entry.question)
      const answer = normalizeSearchText(entry.answer)
      const keywords = entry.keywords.map(normalizeSearchText)
      const haystack = `${category} ${question} ${answer} ${keywords.join(' ')}`
      let score = 0

      if (question.includes(normalizedQuery)) score += 14
      if (keywords.some((keyword) => keyword.includes(normalizedQuery))) score += 12
      if (category.includes(normalizedQuery)) score += 6
      if (answer.includes(normalizedQuery)) score += 4

      for (const token of tokens) {
        if (keywords.some((keyword) => keyword.includes(token))) score += 5
        if (question.includes(token)) score += 4
        if (category.includes(token)) score += 2
        if (answer.includes(token)) score += 1
        if (!haystack.includes(token)) score -= 1
      }

      return { entry, score }
    })
    .filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score || left.entry.question.localeCompare(right.entry.question))
    .map((result) => result.entry)
}

export function groupRuleKnowledgeByCategory(entries: RuleKnowledgeEntry[] = ruleKnowledgeEntries) {
  const groups = new Map<string, RuleKnowledgeEntry[]>()
  for (const entry of entries) {
    const group = groups.get(entry.category) ?? []
    group.push(entry)
    groups.set(entry.category, group)
  }
  return [...groups.entries()].map(([category, items]) => ({ category, items }))
}
