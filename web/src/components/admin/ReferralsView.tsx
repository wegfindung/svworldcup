import { useEffect, useState } from 'react'
import { EmptyState } from '../EmptyState'
import { fetchAdminReferralAnalytics } from '../../lib/api'
import type { ReferralAnalyticsRow } from '../../lib/types'

export function ReferralsView() {
  const [referralAnalytics, setReferralAnalytics] = useState<ReferralAnalyticsRow[]>([])
  const [referralAnalyticsBusy, setReferralAnalyticsBusy] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function handleRefreshReferralAnalytics() {
    setReferralAnalyticsBusy(true)
    setError(null)
    try {
      const response = await fetchAdminReferralAnalytics()
      setReferralAnalytics(response.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load referral analytics.')
    } finally {
      setReferralAnalyticsBusy(false)
    }
  }

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const response = await fetchAdminReferralAnalytics()
        if (active) {
          setReferralAnalytics(response.items)
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Could not load referral analytics.')
        }
      } finally {
        if (active) {
          setReferralAnalyticsBusy(false)
        }
      }
    })()
    return () => {
      active = false
    }
  }, [])

  return (
    <section className="glass-panel rounded-[1.15rem] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="eyebrow">referral analytics</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">Landing-page referral performance.</h3>
          <p className="mt-3 max-w-[72ch] text-sm leading-relaxed text-[var(--color-muted)]">
            Compare tracked landing visits with account registrations, verified accounts, and marketing opt-ins per Soccerverse referrer.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleRefreshReferralAnalytics()}
          disabled={referralAnalyticsBusy}
          className="rounded-full border border-white/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:-translate-y-[1px] hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
        >
          {referralAnalyticsBusy ? 'Refreshing...' : 'Refresh referrals'}
        </button>
      </div>

      {error ? (
        <div className="mt-5 rounded-[1.3rem] border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-sm text-[var(--color-paper)]">
          {error}
        </div>
      ) : null}

      <div className="mt-5 overflow-x-auto rounded-[1rem] border border-white/8">
        {referralAnalyticsBusy && referralAnalytics.length === 0 ? (
          <div className="grid gap-2 p-3">
            <div className="skeleton h-14 rounded-[1rem]" />
            <div className="skeleton h-14 rounded-[1rem]" />
          </div>
        ) : referralAnalytics.length === 0 ? (
          <div className="p-3">
            <EmptyState title="No referral activity yet" body="Tracked referral links will appear here after visitors open a landing page with a ref parameter." />
          </div>
        ) : (
          <table className="min-w-[780px] w-full border-collapse text-left text-sm">
            <thead className="border-b border-white/8 bg-black/20">
              <tr>
                {['Referrer', 'Clicks', 'Registrations', 'Verified', 'Opt-ins', 'Conversion'].map((heading) => (
                  <th key={heading} className="mono px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {referralAnalytics.map((row) => (
                <tr key={row.referrerSoccerverseUsername} className="border-b border-white/8 bg-black/10 last:border-b-0">
                  <td className="px-4 py-3 font-semibold text-white">{row.referrerSoccerverseUsername}</td>
                  <td className="px-4 py-3 text-[var(--color-muted)]">{row.clickCount}</td>
                  <td className="px-4 py-3 text-[var(--color-muted)]">{row.registrationCount}</td>
                  <td className="px-4 py-3 text-[var(--color-muted)]">{row.verifiedCount}</td>
                  <td className="px-4 py-3 text-[var(--color-muted)]">{row.marketingOptInCount}</td>
                  <td className="px-4 py-3">
                    <span className="mono rounded-full border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/8 px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-[var(--color-accent)]">
                      {Math.round(row.conversionRate * 1000) / 10}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
