import { useEffect, useMemo, useState } from 'react'
import { EmptyState } from '../EmptyState'
import { eventTeams } from '../../data/eventConfig'
import { fetchAdminParticipants } from '../../lib/api'
import type { AdminParticipantRecord } from '../../lib/types'

function formatAdminDate(value?: string) {
  if (!value) {
    return 'Not set'
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function teamLabel(teamCode?: string) {
  if (!teamCode) {
    return 'None'
  }

  return eventTeams.find((team) => team.code === teamCode)?.nameEn ?? teamCode
}

export function AccountsView() {
  const [participants, setParticipants] = useState<AdminParticipantRecord[]>([])
  const [participantsBusy, setParticipantsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const participantCounts = useMemo(
    () =>
      participants.reduce(
        (counts, participant) => {
          counts.total += 1
          counts[participant.status] += 1
          counts[participant.leagueType] += 1
          return counts
        },
        {
          total: 0,
          pending_verification: 0,
          active: 0,
          locked: 0,
          withdrawn: 0,
          rookie: 0,
          veteran: 0,
        },
      ),
    [participants],
  )

  async function handleRefreshParticipants() {
    setParticipantsBusy(true)
    setError(null)
    try {
      const response = await fetchAdminParticipants()
      setParticipants(response.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load registered accounts.')
    } finally {
      setParticipantsBusy(false)
    }
  }

  useEffect(() => {
    void handleRefreshParticipants()
  }, [])

  return (
    <section className="glass-panel rounded-[1.15rem] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="eyebrow">registered accounts</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">Account situation overview.</h3>
          <p className="mt-3 max-w-[72ch] text-sm leading-relaxed text-[var(--color-muted)]">
            Review every submitted registration with its league, Soccerverse details, selected teams, verification state, password state, and reveal flags.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleRefreshParticipants()}
          disabled={participantsBusy}
          className="rounded-full border border-white/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:-translate-y-[1px] hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
        >
          {participantsBusy ? 'Refreshing...' : 'Refresh accounts'}
        </button>
      </div>

      {error ? (
        <div className="mt-5 rounded-[1.3rem] border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-sm text-[var(--color-paper)]">
          {error}
        </div>
      ) : null}

      <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ['Total', participantCounts.total],
          ['Active', participantCounts.active],
          ['Pending', participantCounts.pending_verification],
          ['Rookies', participantCounts.rookie],
          ['Veterans', participantCounts.veteran],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[1rem] border border-white/8 bg-black/15 px-4 py-3">
            <p className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 overflow-x-auto rounded-[1rem] border border-white/8">
        {participantsBusy && participants.length === 0 ? (
          <div className="grid gap-2 p-3">
            <div className="skeleton h-16 rounded-[1rem]" />
            <div className="skeleton h-16 rounded-[1rem]" />
            <div className="skeleton h-16 rounded-[1rem]" />
          </div>
        ) : participants.length === 0 ? (
          <div className="p-3">
            <EmptyState title="No registrations yet" body="Registered accounts will appear here after participants submit the signup form." />
          </div>
        ) : (
          <table className="min-w-[1080px] w-full border-collapse text-left text-sm">
            <thead className="border-b border-white/8 bg-black/20">
              <tr>
                {['Manager', 'League', 'Teams', 'Referral', 'State', 'Dates'].map((heading) => (
                  <th key={heading} className="mono px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {participants.map((participant) => (
                <tr key={participant.participantId} className="border-b border-white/8 bg-black/10 last:border-b-0">
                  <td className="px-4 py-4 align-top">
                    <p className="font-semibold text-white">{participant.displayName}</p>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">{participant.email}</p>
                    <p className="mono mt-2 text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">
                      ID {participant.participantId.slice(0, 8)}
                    </p>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <span className="mono rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-[var(--color-accent)]">
                      {participant.leagueType}
                    </span>
                    <p className="mt-3 text-xs text-[var(--color-muted)]">
                      Soccerverse: <span className="text-white">{participant.soccerverseUsername || 'None'}</span>
                    </p>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <p className="text-xs text-white">{teamLabel(participant.primaryTeamCode)}</p>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                      Secondary: <span className="text-white">{teamLabel(participant.secondaryTeamCode)}</span>
                    </p>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <p className="text-xs text-white">{participant.referrerSoccerverseUsername || 'None'}</p>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <span
                      className={[
                        'mono rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.16em]',
                        participant.status === 'active'
                          ? 'border-[var(--color-accent)]/25 bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                          : 'border-amber-300/25 bg-amber-300/10 text-amber-200',
                      ].join(' ')}
                    >
                      {participant.status.replace('_', ' ')}
                    </span>
                    <div className="mt-3 grid gap-1 text-xs text-[var(--color-muted)]">
                      <span>Password: {participant.hasPassword ? 'set' : 'missing'}</span>
                      <span>Profile: {participant.revealProfile ? 'public' : 'hidden'}</span>
                      <span>Squad: {participant.revealSquad ? 'public' : 'hidden'}</span>
                      <span>
                        Marketing:{' '}
                        {participant.marketingUnsubscribedAt
                          ? 'unsubscribed'
                          : participant.marketingOptIn
                            ? 'opted in'
                            : 'off'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <div className="grid gap-1 text-xs text-[var(--color-muted)]">
                      <span>Created: {formatAdminDate(participant.createdAt)}</span>
                      <span>Verified: {formatAdminDate(participant.verifiedAt)}</span>
                      <span>Verification sent: {formatAdminDate(participant.verificationSentAt)}</span>
                    </div>
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
