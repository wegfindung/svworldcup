import { Link } from 'react-router-dom'
import type { LocaleCode } from '../lib/types'

interface HowToPlayPageProps {
  locale: LocaleCode
}

interface HowToStep {
  title: string
  body: string
  to?: string
  cta?: string
}

interface HowToCopy {
  eyebrow: string
  title: string
  intro: string
  freeNote: string
  stepsTitle: string
  steps: HowToStep[]
  learnTitle: string
  learnBody: string
  rulesCta: string
  helpCta: string
  registerCta: string
}

// First-timer onboarding. Deliberately the short version — the full scoring rules live on /rules and
// the FAQ on /help; this page links out to them rather than duplicating them (see
// architecture/SOP_system_overview.md "Beginner onboarding"). English-first; other locales fall back
// to English until translated.
const englishCopy: HowToCopy = {
  eyebrow: 'how to play',
  title: 'New here? The whole game in five steps.',
  intro:
    'The Grand Tournament is a free fantasy football game for the 2026 World Cup. You pick a squad of real tournament players, lock it in, and earn points from what those players actually do on the pitch. You do not need to know Soccerverse, and you do not need a Soccerverse account to take part.',
  freeNote: 'Free to enter · No entry fee · No Soccerverse account required',
  stepsTitle: 'Five steps to join',
  steps: [
    {
      title: 'Register — it is free',
      body: 'Sign up with your email. If you are new and have no Soccerverse account, choose the Rookie path — that is all you need to compete for prizes.',
      to: '/register',
      cta: 'Register',
    },
    {
      title: 'Confirm your email',
      body: 'Click the link in the confirmation email we send you. That verifies your entry and opens your squad builder.',
    },
    {
      title: 'Build your squad',
      body: 'Pick 15 players — a starting eleven in a 4-3-3 plus four substitutes — under your chosen budget. At most four players may come from the same national team, so you mix players from across the tournament.',
      to: '/builder',
      cta: 'Open the builder',
    },
    {
      title: 'Lock it before kickoff',
      body: 'Submit (lock) your squad before the first match. A locked squad starts scoring from the matches played after you lock it, so lock in early.',
    },
    {
      title: 'Climb the leaderboards',
      body: 'Every goal, assist, clean sheet and rating your players earn moves you up the Rookie, Veteran and Nation tables as the tournament plays out.',
      to: '/tables',
      cta: 'See the tables',
    },
  ],
  learnTitle: 'Want the detail?',
  learnBody:
    'This page is the quick version. The full scoring, budgets and swap windows are on the Rules page, and common questions are answered in Help.',
  rulesCta: 'Read the full rules',
  helpCta: 'Help & FAQ',
  registerCta: 'Register your squad',
}

const copyByLocale: Partial<Record<LocaleCode, HowToCopy>> = {
  en: englishCopy,
}

export function HowToPlayPage({ locale }: HowToPlayPageProps) {
  const copy = copyByLocale[locale] ?? englishCopy

  return (
    <div className="mx-auto max-w-4xl space-y-4 pb-12">
      <section className="hero-card rounded-[1.25rem] px-5 py-7 sm:px-7">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1 className="section-title mt-4 max-w-[20ch]">{copy.title}</h1>
        <p className="mt-5 max-w-[68ch] text-base leading-relaxed text-[var(--color-muted)]">{copy.intro}</p>
        <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/10 px-3.5 py-1.5 text-xs font-semibold text-[var(--color-accent)]">
          <span aria-hidden>✓</span>
          {copy.freeNote}
        </p>
      </section>

      <section className="glass-panel rounded-[1.25rem] p-5 sm:p-6">
        <h2 className="text-2xl font-semibold tracking-tight text-white">{copy.stepsTitle}</h2>
        <ol className="mt-5 space-y-3">
          {copy.steps.map((step, index) => (
            <li key={step.title} className="surface-row rounded-[0.95rem] p-4">
              <div className="flex items-start gap-4">
                <span className="mono mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 text-sm font-bold text-[var(--color-accent)]">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-white">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-muted)]">{step.body}</p>
                  {step.to && step.cta ? (
                    <Link
                      to={step.to}
                      className="mt-3 inline-flex items-center rounded-full border border-white/12 px-3 py-1.5 text-xs font-semibold text-white hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]"
                    >
                      {step.cta} →
                    </Link>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="glass-panel rounded-[1.25rem] p-5 sm:p-6">
        <h2 className="text-2xl font-semibold tracking-tight text-white">{copy.learnTitle}</h2>
        <p className="mt-3 max-w-[68ch] text-sm leading-relaxed text-[var(--color-muted)]">{copy.learnBody}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/register" className="premium-button px-6 py-3 text-sm font-semibold">
            {copy.registerCta}
          </Link>
          <Link
            to="/rules"
            className="inline-flex items-center rounded-full border border-white/12 bg-black/20 px-5 py-3 text-sm font-semibold text-white hover:-translate-y-[2px] hover:bg-white/7 active:scale-[0.98]"
          >
            {copy.rulesCta}
          </Link>
          <Link
            to="/help"
            className="inline-flex items-center rounded-full border border-white/12 bg-black/20 px-5 py-3 text-sm font-semibold text-white hover:-translate-y-[2px] hover:bg-white/7 active:scale-[0.98]"
          >
            {copy.helpCta}
          </Link>
        </div>
      </section>
    </div>
  )
}
