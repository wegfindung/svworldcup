import { Link } from 'react-router-dom'
import { getMessages } from '../i18n/messages'
import type { LocaleCode } from '../lib/types'
import { LeadersPanel } from './LeadersPanel'
import { PlayerPointsPanel } from './PlayerPointsPanel'
import { UsageStatsPanel } from './SquadUsagePage'

type StatsTab = 'usage' | 'points' | 'leaders'

// The public Stats surface. One nav entry, two tabs: Usage (revealed-squad pick rate) and Points (most base
// points produced per position). Each tab is its own self-fetching panel; this page only owns the shared
// hero + the tab switcher (routed, so each tab is linkable: /stats and /stats/points).
export function StatsPage({ locale, active }: { locale: LocaleCode; active: StatsTab }) {
  const messages = getMessages(locale)
  const copy = messages.stats
  const tabs: Array<{ key: StatsTab; label: string; to: string }> = [
    { key: 'usage', label: copy.tabUsage, to: '/stats' },
    { key: 'points', label: copy.tabPoints, to: '/stats/points' },
    { key: 'leaders', label: messages.leaders.tab, to: '/stats/leaders' },
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

      {active === 'usage' ? <UsageStatsPanel /> : active === 'points' ? <PlayerPointsPanel locale={locale} /> : <LeadersPanel locale={locale} />}
    </div>
  )
}
