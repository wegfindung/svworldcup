import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAdminOverview, fetchMatchImportBatches } from '../../lib/api'
import type { AdminOverview } from '../../lib/types'

const views: Array<{ to: string; label: string; blurb: string }> = [
  { to: '/admin/match-import', label: 'Match import', blurb: 'Upload, review and confirm match-stat batches.' },
  { to: '/admin/team-pools', label: 'Team pools', blurb: 'Curate the Soccerverse player pool for each nation.' },
  { to: '/admin/scoring', label: 'Scoring', blurb: 'Tune the scoring rules behind the leaderboards.' },
  { to: '/admin/accounts', label: 'Accounts', blurb: 'Review every registered participant account.' },
  { to: '/admin/multi-accounting', label: 'Multi-accounting', blurb: 'Review duplicate-account risk cases and signal clusters.' },
  { to: '/admin/referrals', label: 'Referrals', blurb: 'Landing-page referral performance per referrer.' },
  { to: '/admin/reveal', label: 'Reveal controls', blurb: 'Toggle event-level profile and squad visibility.' },
  { to: '/admin/email-marketing', label: 'Email marketing', blurb: 'Draft, schedule and send campaigns.' },
  { to: '/admin/operations', label: 'Operations', blurb: 'Monitor audit logs, import work and mail queue health.' },
]

export function DashboardLanding() {
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [pendingImports, setPendingImports] = useState<number | null>(null)
  // B3: load each source independently so one failed fetch degrades only its own card, never the
  // whole landing. The overview feeds three cards; pending imports is its own.
  const [failedSources, setFailedSources] = useState<string[]>([])

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    void (async () => {
      const [overviewResult, batchesResult] = await Promise.allSettled([
        fetchAdminOverview(controller.signal),
        fetchMatchImportBatches(controller.signal),
      ])
      if (!active) {
        return
      }
      const failed: string[] = []
      if (overviewResult.status === 'fulfilled') {
        setOverview(overviewResult.value)
      } else {
        failed.push('overview')
      }
      if (batchesResult.status === 'fulfilled') {
        setPendingImports(batchesResult.value.items.length)
      } else {
        failed.push('pending imports')
      }
      setFailedSources(failed)
    })()
    // B5: abort in-flight fetches when the component unmounts.
    return () => {
      active = false
      controller.abort()
    }
  }, [])

  const poolCounts = overview ? Object.values(overview.teamSelectionCounts) : []
  const filledPools = poolCounts.filter((count) => count > 0).length

  const cards: Array<{ label: string; value: string }> = [
    {
      label: 'Accounts',
      value: overview ? `${overview.counts.active} active · ${overview.counts.pending} pending` : '—',
    },
    { label: 'Scoring', value: overview ? (overview.scoringLocked ? 'locked' : 'editable') : '—' },
    { label: 'Team pools', value: overview ? `${filledPools}/${poolCounts.length} filled` : '—' },
    { label: 'Pending imports', value: pendingImports === null ? '—' : String(pendingImports) },
  ]

  return (
    <div className="space-y-4">
      <section className="glass-panel rounded-[1.15rem] p-4 sm:p-5">
        <p className="eyebrow">overview</p>
        <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">At a glance.</h3>

        {failedSources.length ? (
          <div className="mt-5 rounded-[1.3rem] border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-sm text-[var(--color-paper)]">
            Could not load: {failedSources.join(', ')}. Other cards still reflect what loaded.
          </div>
        ) : null}

        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <div key={card.label} className="rounded-[1rem] border border-white/8 bg-black/15 px-4 py-3">
              <p className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">{card.label}</p>
              <p className="mt-2 text-lg font-semibold text-white">{card.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-panel rounded-[1.15rem] p-4 sm:p-5">
        <p className="eyebrow">go to</p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {views.map((view) => (
            <Link
              key={view.to}
              to={view.to}
              className="rounded-[1.4rem] border border-white/8 bg-black/15 p-4 transition duration-300 ease-out hover:border-white/18 hover:bg-white/6 active:scale-[0.99]"
            >
              <p className="text-sm font-semibold text-white">{view.label}</p>
              <p className="mt-1 text-xs text-[var(--color-muted)]">{view.blurb}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
