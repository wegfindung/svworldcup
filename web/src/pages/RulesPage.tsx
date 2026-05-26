import { Link } from 'react-router-dom'
import { ScoringCalculator } from '../components/ScoringCalculator'
import { budgetOptions as defaultBudgetOptions, defaultScoring } from '../data/eventConfig'
import { useBootstrap } from '../hooks/useBootstrap'
import { getMessages } from '../i18n/messages'
import type { LocaleCode } from '../lib/types'

interface RulesPageProps {
  locale: LocaleCode
}

// English is authoritative for now; other locales fall back to it (see the "coming soon" note about
// translations). The interactive scoring calculator embedded below is already fully localised through
// messages.ts, so the worked example stays in the viewer's language even while this prose is English.
const englishCopy = {
  eyebrow: 'how it works',
  title: 'Event rules, in full.',
  intro:
    'One squad. One lock. Forty-plus days of World Cup football moving your rank. Everything described on this page is live in the current build — only mechanics that already work are written as rules. Anything still in progress is listed under “Coming soon” at the end.',
  cta: 'Register your squad',

  squad: {
    eyebrow: 'registration & squad',
    title: 'Build one squad, then lock it',
    body:
      'You draft a single 15-player squad in a 4-3-3 with one reserve per position. Players come from the official World Cup team pools mapped into Soccerverse. It is set-and-forget: once you lock, there is no mid-tournament management.',
    formationTitle: 'Squad shape (15 players)',
    starters: [
      { label: 'GK', value: '1' },
      { label: 'DEF', value: '4' },
      { label: 'MID', value: '3' },
      { label: 'FWD', value: '3' },
    ],
    subsTitle: 'Reserves (one per position)',
    subs: [
      { label: 'GK', value: '1' },
      { label: 'DEF', value: '1' },
      { label: 'MID', value: '1' },
      { label: 'FWD', value: '1' },
    ],
    points: [
      'Register as a Veteran (you have a Soccerverse account) or a Rookie (you do not).',
      'Pick two nations — your home country and one free choice. They must be different, and they drive the Nation League.',
      'Every player is available to everyone. There is no exclusivity, and two managers may end up with identical squads.',
      'You cannot pick the same player twice in your squad.',
      'A verified email is required before you can enter the squad builder.',
    ],
  },

  salary: {
    eyebrow: 'salary cap & multiplier',
    title: 'Spend less, score more',
    body:
      'Every player has a wage in Soccerverse Coins (SVC) derived from their rating — the higher the rating, the steeper the wage. You choose a budget cap before you draft, and that cap sets a score multiplier applied to everything your squad earns. Pick a low cap and your points are boosted; load up on superstars under a high cap and your points are cut.',
    scaleLow: 'Spend less · bigger boost',
    scaleMid: 'Neutral ×1.0',
    scaleHigh: 'Spend more · bigger penalty',
    tiersTitle: 'Budget caps and their multipliers',
    boostLabel: 'Boost',
    neutralLabel: 'Neutral',
    penaltyLabel: 'Penalty',
    capExamplesTitle: 'Example wages by rating',
    capExamplesNote: 'Wage rises sharply with rating — a handful of superstars can swallow most of a high cap.',
    capExamples: [
      { rating: '70', cost: '9,288' },
      { rating: '80', cost: '57,506' },
      { rating: '90', cost: '356,064' },
      { rating: '97', cost: '1,275,843' },
    ],
    unit: 'SVC',
  },

  scoring: {
    eyebrow: 'scoring rubric',
    title: 'How points are earned',
    body:
      'A fixed rubric is applied to each player’s real World Cup performance, match by match. Clean-sheet value depends on position. On top of that, each player earns up to 2 performance points scaled from their match rating.',
    rubric: [
      { label: 'Goal', value: '+5', detail: 'per goal scored' },
      { label: 'Assist', value: '+3', detail: 'per assist' },
      { label: 'Appearance', value: '+1', detail: 'for any time on the pitch' },
      { label: '60+ minutes', value: '+1', detail: 'extra, for playing 60 minutes or more' },
      { label: 'Clean sheet', value: '+4 / +1 / 0', detail: 'GK & DEF +4, MID +1, FWD 0 — only if the player lasted 60+ minutes and their team conceded none' },
      { label: 'Performance', value: 'up to +2', detail: 'scaled from match rating (6.0→0.5, 8.0→1.0, 9.5→1.5, 10.0→2.0)' },
    ],
    calculatorIntro: 'Try the exact maths yourself — adjust a player, your cap, and your boost:',
  },

  example: {
    eyebrow: 'worked example',
    title: 'One match, one player',
    intro:
      'A midfielder in your starting XI plays 78 minutes, scores 1 goal and 1 assist, keeps a clean sheet, and earns a match rating of 8.0.',
    steps: [
      { label: 'Goal', value: '+5' },
      { label: 'Assist', value: '+3' },
      { label: 'Appearance', value: '+1' },
      { label: '60+ minutes', value: '+1' },
      { label: 'Clean sheet (MID)', value: '+1' },
      { label: 'Performance (8.0)', value: '+1' },
    ],
    baseLabel: 'Base points',
    baseValue: '12',
    boostLabel: 'With +5% ownership boost',
    boostValue: '12.6',
    finalLabel: 'Under the 1,500,000 SVC cap (×1.3)',
    finalValue: '16.38',
  },

  subs: {
    eyebrow: 'substitutes',
    title: 'Reserves always chip in at 50%',
    body:
      'Your squad runs itself — there is nothing to manage on matchday. Every reserve always banks 50% of the points it earns from its own real performances, every match. Your starters always count at full points.',
    points: [
      'All four reserves score every match — no activation, no dependency on whether a starter played.',
      'A reserve earns half of what it generates on the normal rubric: goals, assists, minutes, clean sheets, and performance.',
      'A reserve that does not feature in a match simply earns nothing for it.',
    ],
  },

  boost: {
    eyebrow: 'ownership boost',
    title: 'Reward for backing your players',
    scaleZero: 'no boost',
    scaleCaption: '+1% per 10 net shares',
    scaleCap: '+10% cap',
    body:
      'If you link a Soccerverse account, influence you buy in your own squad’s players during the event adds a small multiplier to the points those players earn for you. It rewards conviction without letting big pre-existing portfolios dominate.',
    points: [
      'Only influence bought during the event window counts — holdings you owned before the event started do not.',
      'The boost is +1% per 10 net shares bought, capped at +10% per player.',
      'It is measured per player, per match, and applied before your squad multiplier.',
      'Purchases never apply retroactively to a match that has already kicked off.',
      'Available to any manager with a linked Soccerverse account — Veteran or Rookie.',
    ],
  },

  leagues: {
    eyebrow: 'the three leagues',
    title: 'Where you compete',
    items: [
      { name: 'Veteran League', body: 'Veterans ranked individually against each other.' },
      { name: 'Rookie League', body: 'Rookies ranked individually against each other.' },
      {
        name: 'Nation League',
        body:
          'Everyone represents both nations they picked. A nation needs at least 2 members to qualify, and nations are ranked by the average score of their members.',
      },
    ],
  },

  timing: {
    eyebrow: 'dates & locks',
    title: 'When things happen',
    items: [
      { label: 'World Cup', value: '11 Jun – 19 Jul 2026', detail: 'Every official match moves the tables.' },
      { label: 'Registration closes', value: '4 Jul 2026, 00:00 UTC', detail: 'No new entries or squad changes after this instant.' },
      {
        label: 'Squad lock',
        value: 'On submission',
        detail: 'You lock once all 15 players are drafted; edits also freeze once the competition starts.',
      },
      {
        label: 'No retroactive points',
        value: 'Lock before kickoff',
        detail: 'A squad only scores from matches that kick off after it was locked.',
      },
    ],
  },

  coming: {
    eyebrow: 'coming soon',
    title: 'Not final yet',
    note: 'These parts are either provisional or still being built. They are listed here so nothing is hidden.',
    items: [
      'Performance points currently come from match data entered by the event team. Automatic API-Football match ratings are planned.',
      'Reserves currently bank a flat 50% of their points as a failsafe. A richer model — for example activating a reserve when a starter is confirmed out — may replace it later if a reliable player-availability feed is added.',
      'The salary multiplier is set by the budget cap you choose today; a refinement tied to your squad’s actual total wage is under consideration.',
      'Prize amounts and payout logic are provisional — see the Prizes page.',
      'This page is in English first; full translations are on the way.',
      'Official Soccerverse player photos are being added; some players currently show a placeholder.',
    ],
  },
}

type RulesCopy = typeof englishCopy

const copyByLocale: Partial<Record<LocaleCode, RulesCopy>> = {}
copyByLocale.en = englishCopy

function getRulesCopy(locale: LocaleCode): RulesCopy {
  return copyByLocale[locale] ?? englishCopy
}

function FormationGrid({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {items.map((slot) => (
        <div key={slot.label} className="surface-row grid place-items-center gap-1 rounded-[0.9rem] p-3 text-center">
          <span className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">{slot.label}</span>
          <strong className="text-xl font-semibold text-white">{slot.value}</strong>
        </div>
      ))}
    </div>
  )
}

export function RulesPage({ locale }: RulesPageProps) {
  const copy = getRulesCopy(locale)
  const messages = getMessages(locale)
  const { data: bootstrap } = useBootstrap()
  const scoring = bootstrap?.scoring ?? defaultScoring
  const budgetOptions = bootstrap?.budgetOptions ?? defaultBudgetOptions

  function multiplierTag(multiplier: number) {
    if (multiplier > 1) {
      return { label: copy.salary.boostLabel, className: 'text-[var(--color-accent)]' }
    }
    if (multiplier < 1) {
      return { label: copy.salary.penaltyLabel, className: 'text-[var(--color-sand)]' }
    }
    return { label: copy.salary.neutralLabel, className: 'text-[var(--color-muted)]' }
  }

  return (
    <div className="space-y-4 pb-10">
      {/* Intro */}
      <section className="hero-card rounded-[1.25rem] p-5 sm:p-6 lg:p-7">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1 className="section-title mt-4 max-w-[18ch] text-white">{copy.title}</h1>
        <p className="mt-5 max-w-[70ch] text-base leading-relaxed text-[var(--color-muted)]">{copy.intro}</p>
        <Link to="/register" className="premium-button mt-6 px-6 py-3 text-sm font-semibold">
          {copy.cta}
        </Link>
      </section>

      {/* Registration & squad */}
      <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <article className="glass-panel rounded-[1.25rem] p-5 sm:p-6">
          <p className="eyebrow">{copy.squad.eyebrow}</p>
          <h2 className="section-title mt-4 text-white">{copy.squad.title}</h2>
          <p className="mt-4 max-w-[60ch] text-sm leading-relaxed text-[var(--color-muted)]">{copy.squad.body}</p>
          <ul className="mt-5 space-y-2.5">
            {copy.squad.points.map((point, index) => (
              <li key={point} className="surface-row rounded-[0.9rem] p-3 text-sm leading-relaxed text-[var(--color-paper)]">
                <span className="mono mr-2 text-[var(--color-accent)]">{String(index + 1).padStart(2, '0')}</span>
                {point}
              </li>
            ))}
          </ul>
        </article>

        <article className="glass-panel rounded-[1.25rem] p-5 sm:p-6">
          <p className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">{copy.squad.formationTitle}</p>
          <div className="mt-4">
            <FormationGrid items={copy.squad.starters} />
          </div>
          <p className="mono mt-6 text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">{copy.squad.subsTitle}</p>
          <div className="mt-4">
            <FormationGrid items={copy.squad.subs} />
          </div>
        </article>
      </section>

      {/* Salary cap & multiplier */}
      <section className="glass-panel rounded-[1.25rem] p-5 sm:p-6">
        <p className="eyebrow">{copy.salary.eyebrow}</p>
        <h2 className="section-title mt-4 text-white">{copy.salary.title}</h2>
        <p className="mt-4 max-w-[70ch] text-sm leading-relaxed text-[var(--color-muted)]">{copy.salary.body}</p>

        <div className="mt-6">
          <div className="h-3 rounded-full bg-gradient-to-r from-[var(--color-accent)] via-white/25 to-[var(--color-sand)]" />
          <div className="mono mt-2 flex justify-between text-[10px] uppercase tracking-[0.14em] text-[var(--color-muted)]">
            <span className="text-[var(--color-accent)]">{copy.salary.scaleLow}</span>
            <span className="hidden sm:inline">{copy.salary.scaleMid}</span>
            <span className="text-[var(--color-sand)]">{copy.salary.scaleHigh}</span>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">{copy.salary.tiersTitle}</p>
            <div className="mt-4 space-y-2">
              {budgetOptions.map((option) => {
                const tag = multiplierTag(option.scoreMultiplier)
                return (
                  <div key={option.budgetLimit} className="surface-row flex items-center justify-between gap-3 rounded-[0.9rem] p-3">
                    <span className="mono text-sm text-white">
                      {option.budgetLimit.toLocaleString('en-US')} {copy.salary.unit}
                    </span>
                    <span className="flex items-center gap-3">
                      <span className={['mono text-[10px] uppercase tracking-[0.16em]', tag.className].join(' ')}>{tag.label}</span>
                      <span className="mono text-lg font-semibold text-white">×{option.scoreMultiplier}</span>
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div>
            <p className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">{copy.salary.capExamplesTitle}</p>
            <div className="mt-4 space-y-2">
              {copy.salary.capExamples.map((example) => (
                <div key={example.rating} className="surface-row flex items-center justify-between gap-3 rounded-[0.9rem] p-3">
                  <span className="text-sm text-[var(--color-muted)]">
                    <span className="mono text-[var(--color-accent)]">{example.rating}</span> rated
                  </span>
                  <span className="mono text-sm text-white">
                    {example.cost} {copy.salary.unit}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-[var(--color-muted)]">{copy.salary.capExamplesNote}</p>
          </div>
        </div>
      </section>

      {/* Scoring rubric + interactive calculator */}
      <section className="space-y-4">
        <div className="glass-panel rounded-[1.25rem] p-5 sm:p-6">
          <p className="eyebrow">{copy.scoring.eyebrow}</p>
          <h2 className="section-title mt-4 text-white">{copy.scoring.title}</h2>
          <p className="mt-4 max-w-[70ch] text-sm leading-relaxed text-[var(--color-muted)]">{copy.scoring.body}</p>
          <div className="mt-6 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {copy.scoring.rubric.map((item) => (
              <div key={item.label} className="surface-row rounded-[0.9rem] p-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-semibold text-white">{item.label}</span>
                  <span className="mono text-base text-[var(--color-accent)]">{item.value}</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted)]">{item.detail}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm leading-relaxed text-[var(--color-muted)]">{copy.scoring.calculatorIntro}</p>
        </div>

        <ScoringCalculator budgetOptions={budgetOptions} copy={messages.scoringCalculator} scoring={scoring} />
      </section>

      {/* Worked example */}
      <section className="glass-panel rounded-[1.25rem] p-5 sm:p-6">
        <p className="eyebrow">{copy.example.eyebrow}</p>
        <h2 className="section-title mt-4 text-white">{copy.example.title}</h2>
        <p className="mt-4 max-w-[70ch] text-sm leading-relaxed text-[var(--color-muted)]">{copy.example.intro}</p>
        <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-2 sm:grid-cols-2">
            {copy.example.steps.map((step) => (
              <div key={step.label} className="surface-row flex items-center justify-between gap-3 rounded-[0.9rem] p-3">
                <span className="text-sm text-[var(--color-paper)]">{step.label}</span>
                <span className="mono text-base text-[var(--color-accent)]">{step.value}</span>
              </div>
            ))}
          </div>
          <aside className="rounded-[1rem] border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/8 p-4">
            <div className="flex items-center justify-between gap-3 border-b border-white/8 pb-2 text-sm">
              <span className="text-[var(--color-muted)]">{copy.example.baseLabel}</span>
              <span className="mono text-white">{copy.example.baseValue}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 border-b border-white/8 pb-2 text-sm">
              <span className="text-[var(--color-muted)]">{copy.example.boostLabel}</span>
              <span className="mono text-white">{copy.example.boostValue}</span>
            </div>
            <div className="mt-4">
              <p className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-accent)]">{copy.example.finalLabel}</p>
              <p className="mono mt-2 text-4xl text-white">{copy.example.finalValue}</p>
            </div>
          </aside>
        </div>
      </section>

      {/* Substitutes */}
      <section className="glass-panel rounded-[1.25rem] p-5 sm:p-6">
        <p className="eyebrow">{copy.subs.eyebrow}</p>
        <h2 className="section-title mt-4 text-white">{copy.subs.title}</h2>
        <p className="mt-4 max-w-[70ch] text-sm leading-relaxed text-[var(--color-muted)]">{copy.subs.body}</p>
        <ul className="mt-5 grid gap-2.5 md:grid-cols-3">
          {copy.subs.points.map((point) => (
            <li key={point} className="surface-row rounded-[0.9rem] p-3 text-sm leading-relaxed text-[var(--color-paper)]">
              {point}
            </li>
          ))}
        </ul>
      </section>

      {/* Ownership boost */}
      <section className="glass-panel rounded-[1.25rem] p-5 sm:p-6">
        <p className="eyebrow">{copy.boost.eyebrow}</p>
        <h2 className="section-title mt-4 text-white">{copy.boost.title}</h2>
        <p className="mt-4 max-w-[70ch] text-sm leading-relaxed text-[var(--color-muted)]">{copy.boost.body}</p>
        <div className="mt-6 max-w-[34rem]">
          <div className="h-3 overflow-hidden rounded-full border border-white/10 bg-black/30">
            <div className="h-full w-full bg-gradient-to-r from-[var(--color-accent)]/25 to-[var(--color-accent)]" />
          </div>
          <div className="mono mt-2 flex justify-between text-[10px] uppercase tracking-[0.14em] text-[var(--color-muted)]">
            <span>{copy.boost.scaleZero}</span>
            <span className="hidden sm:inline">{copy.boost.scaleCaption}</span>
            <span className="text-[var(--color-accent)]">{copy.boost.scaleCap}</span>
          </div>
        </div>
        <ul className="mt-5 space-y-2.5">
          {copy.boost.points.map((point, index) => (
            <li key={point} className="surface-row rounded-[0.9rem] p-3 text-sm leading-relaxed text-[var(--color-paper)]">
              <span className="mono mr-2 text-[var(--color-accent)]">{String(index + 1).padStart(2, '0')}</span>
              {point}
            </li>
          ))}
        </ul>
      </section>

      {/* Leagues + timing */}
      <section className="grid gap-4 lg:grid-cols-2">
        <article className="glass-panel rounded-[1.25rem] p-5 sm:p-6">
          <p className="eyebrow">{copy.leagues.eyebrow}</p>
          <h2 className="section-title mt-4 text-white">{copy.leagues.title}</h2>
          <div className="mt-5 space-y-2.5">
            {copy.leagues.items.map((item) => (
              <div key={item.name} className="surface-row rounded-[0.9rem] p-3">
                <p className="text-sm font-semibold text-white">{item.name}</p>
                <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted)]">{item.body}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="glass-panel rounded-[1.25rem] p-5 sm:p-6">
          <p className="eyebrow">{copy.timing.eyebrow}</p>
          <h2 className="section-title mt-4 text-white">{copy.timing.title}</h2>
          <div className="mt-5 space-y-2.5">
            {copy.timing.items.map((item) => (
              <div key={item.label} className="surface-row rounded-[0.9rem] p-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-semibold text-white">{item.label}</span>
                  <span className="mono text-sm text-[var(--color-accent)]">{item.value}</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted)]">{item.detail}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      {/* Coming soon */}
      <section className="glass-panel rounded-[1.25rem] border border-[var(--color-sand)]/20 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <p className="eyebrow">{copy.coming.eyebrow}</p>
          <span className="mono rounded-full border border-[var(--color-sand)]/25 bg-[var(--color-sand)]/10 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[var(--color-sand)]">
            {copy.coming.title}
          </span>
        </div>
        <p className="mt-4 max-w-[70ch] text-sm leading-relaxed text-[var(--color-muted)]">{copy.coming.note}</p>
        <ul className="mt-5 space-y-2.5">
          {copy.coming.items.map((item) => (
            <li key={item} className="surface-row rounded-[0.9rem] p-3 text-sm leading-relaxed text-[var(--color-paper)]">
              <span className="mono mr-2 text-[var(--color-sand)]">›</span>
              {item}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
