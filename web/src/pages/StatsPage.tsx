import { Link } from 'react-router-dom'
import { BackToTopButton } from '../components/BackToTopButton'
import { getMessages } from '../i18n/messages'
import type { LocaleCode } from '../lib/types'
import { BestXIPanel } from './BestXIPanel'
import { BoostsPanel } from './BoostsPanel'
import { BudgetStatsPanel } from './BudgetStatsPanel'
import { LeadersPanel } from './LeadersPanel'
import { NationPoolsPanel } from './NationPoolsPanel'
import { PlayerPointsPanel } from './PlayerPointsPanel'
import { RepresentedNationPanel } from './RepresentedNationPanel'
import { UsageStatsPanel } from './SquadUsagePage'
import { SurvivorsPanel } from './SurvivorsPanel'
import { ValueStatsPanel } from './ValueStatsPanel'

type StatsTab = 'usage' | 'points' | 'leaders' | 'value' | 'bestxi' | 'boosts' | 'budgets' | 'nationpools' | 'allegiance' | 'survivors'

// The public Stats surface. One nav entry, seven tabs: Usage (revealed-squad pick rate), Points (most base
// points produced per position), Leaders (per-metric rankings), Value (most base points per unit of budget
// cost), Best XI (consensus People's XI + the points-maximizing squad per budget), Boosts (total ownership
// boost spent per player across all competitors), and Budgets (how managers spread across the salary-budget
// tiers). Each tab is its own self-fetching panel; this page only owns the shared hero + the tab switcher
// (routed, so each tab is linkable: /stats, /stats/points, …).
export function StatsPage({ locale, active }: { locale: LocaleCode; active: StatsTab }) {
  const messages = getMessages(locale)
  const copy = messages.stats
  const tabs: Array<{ key: StatsTab; label: string; to: string }> = [
    { key: 'usage', label: copy.tabUsage, to: '/stats' },
    { key: 'points', label: copy.tabPoints, to: '/stats/points' },
    { key: 'leaders', label: messages.leaders.tab, to: '/stats/leaders' },
    { key: 'value', label: copy.tabValue, to: '/stats/value' },
    { key: 'bestxi', label: copy.tabBestXI, to: '/stats/best-xi' },
    { key: 'boosts', label: copy.tabBoosts, to: '/stats/boosts' },
    { key: 'budgets', label: copy.tabBudgets, to: '/stats/budgets' },
    { key: 'nationpools', label: copy.tabNationPools, to: '/stats/nation-pools' },
    { key: 'allegiance', label: copy.tabAllegiance, to: '/stats/by-nation' },
    { key: 'survivors', label: copy.tabSurvivors, to: '/stats/survivors' },
  ]

  return (
    <div className="space-y-4 pb-10">
      <section className="hero-card rounded-[1.25rem] px-5 py-6 sm:px-6">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h2 className="section-title mt-5 max-w-[14ch]">{copy.title}</h2>
        <p className="mt-4 max-w-[66ch] text-base leading-relaxed text-[var(--color-muted)]">{copy.body}</p>
        <div className="mt-5 inline-flex gap-1 rounded-full border border-white/8 bg-black/18 p-1">
          {tabs.map((tab) => (
            <Link
              key={tab.key}
              to={tab.to}
              className={[
                'rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-[0.14em] transition',
                active === tab.key
                  ? 'bg-[var(--color-accent)] text-[var(--color-ink)]'
                  : 'text-[var(--color-muted)] hover:bg-white/7 hover:text-white',
              ].join(' ')}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </section>

      {active === 'usage' ? (
        <UsageStatsPanel locale={locale} />
      ) : active === 'bestxi' ? (
        <BestXIPanel locale={locale} />
      ) : active === 'points' ? (
        <PlayerPointsPanel locale={locale} />
      ) : active === 'leaders' ? (
        <LeadersPanel locale={locale} />
      ) : active === 'value' ? (
        <ValueStatsPanel locale={locale} />
      ) : active === 'boosts' ? (
        <BoostsPanel locale={locale} />
      ) : active === 'budgets' ? (
        <BudgetStatsPanel locale={locale} />
      ) : active === 'nationpools' ? (
        <NationPoolsPanel locale={locale} />
      ) : active === 'allegiance' ? (
        <RepresentedNationPanel locale={locale} />
      ) : (
        <SurvivorsPanel locale={locale} />
      )}

      {/* One viewport-fixed control covers every tab, sub-tab and paginated page since they all window-scroll.
          Reuses the shared label already translated under `tables` (same generic "Back to top" string). */}
      <BackToTopButton label={messages.tables.backToTop} />
    </div>
  )
}
