import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { EmptyState } from '../EmptyState'
import { fetchAdminRiskCases, updateAdminRiskCaseStatus } from '../../lib/api'
import type { ParticipantRiskCase, ParticipantRiskCaseStatus } from '../../lib/types'

const statusOptions: ParticipantRiskCaseStatus[] = ['open', 'reviewing', 'confirmed', 'dismissed']

function formatAdminDate(value?: string) {
  if (!value) {
    return 'Not set'
  }
  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function reasonLabel(reason: string) {
  return reason.replace(/_/g, ' ')
}

function scoreClass(score: number) {
  if (score >= 70) {
    return 'border-amber-300/30 bg-amber-300/10 text-amber-100'
  }
  if (score >= 45) {
    return 'border-[var(--color-sand)]/30 bg-[var(--color-sand)]/10 text-[var(--color-sand)]'
  }
  return 'border-white/10 text-white'
}

export function MultiAccountingView() {
  const [searchParams] = useSearchParams()
  const focusedParticipantId = searchParams.get('participant') ?? ''
  const [cases, setCases] = useState<ParticipantRiskCase[]>([])
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null)

  async function loadCases() {
    setLoadState('loading')
    setError(null)
    try {
      const response = await fetchAdminRiskCases()
      setCases(response.items)
      setLoadState('ready')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load multi-accounting cases.')
      setLoadState('error')
    }
  }

  async function handleStatus(caseId: string, status: ParticipantRiskCaseStatus) {
    setStatusBusyId(caseId)
    setError(null)
    try {
      const response = await updateAdminRiskCaseStatus(caseId, status)
      setCases((current) => current.map((riskCase) => (riskCase.caseId === caseId ? response.item : riskCase)))
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Could not update review status.')
    } finally {
      setStatusBusyId(null)
    }
  }

  useEffect(() => {
    let active = true
    void fetchAdminRiskCases()
      .then((response) => {
        if (!active) {
          return
        }
        setCases(response.items)
        setLoadState('ready')
      })
      .catch((loadError) => {
        if (!active) {
          return
        }
        setError(loadError instanceof Error ? loadError.message : 'Could not load multi-accounting cases.')
        setLoadState('error')
      })
    return () => {
      active = false
    }
  }, [])

  const visibleCases = useMemo(() => {
    if (!focusedParticipantId) {
      return cases
    }
    return cases.filter((riskCase) => riskCase.members.some((member) => member.participantId === focusedParticipantId))
  }, [cases, focusedParticipantId])

  const counts = useMemo(
    () => ({
      open: cases.filter((riskCase) => riskCase.status === 'open').length,
      reviewing: cases.filter((riskCase) => riskCase.status === 'reviewing').length,
      confirmed: cases.filter((riskCase) => riskCase.status === 'confirmed').length,
      dismissed: cases.filter((riskCase) => riskCase.status === 'dismissed').length,
    }),
    [cases],
  )

  return (
    <section className="glass-panel rounded-[1.15rem] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="eyebrow">multi-accounting review</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">Risk cases without automatic blocking.</h3>
          <p className="mt-3 max-w-[78ch] text-sm leading-relaxed text-[var(--color-muted)]">
            Review canonical email collisions, disposable or weak email domains, subnet bursts, shared browser signatures, and basic automation indicators.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadCases()}
          disabled={loadState === 'loading'}
          className="rounded-full border border-white/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:-translate-y-[1px] hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
        >
          {loadState === 'loading' ? 'Refreshing...' : 'Refresh cases'}
        </button>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {statusOptions.map((status) => (
          <div key={status} className="rounded-[1rem] border border-white/8 bg-black/15 px-4 py-3">
            <p className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">{status}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{counts[status]}</p>
          </div>
        ))}
      </div>

      {focusedParticipantId ? (
        <div className="mt-5 rounded-[1rem] border border-white/10 bg-black/15 px-4 py-3 text-sm text-[var(--color-muted)]">
          Showing cases for participant ID <span className="mono text-white">{focusedParticipantId.slice(0, 8)}</span>.
        </div>
      ) : null}

      {error ? (
        <div className="mt-5 rounded-[1.3rem] border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-sm text-[var(--color-paper)]">
          {error}
        </div>
      ) : null}

      <div className="mt-5 space-y-3">
        {loadState === 'loading' && cases.length === 0 ? (
          <>
            <div className="skeleton h-36 rounded-[1rem]" />
            <div className="skeleton h-36 rounded-[1rem]" />
          </>
        ) : visibleCases.length === 0 ? (
          <EmptyState title="No review cases" body="Risk cases will appear here after participant events produce matching signals." />
        ) : (
          visibleCases.map((riskCase) => (
            <article key={riskCase.caseId} className="rounded-[1rem] border border-white/8 bg-black/15 p-4">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={['mono rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.16em]', scoreClass(riskCase.score)].join(' ')}>
                      score {riskCase.score}
                    </span>
                    <span className="mono rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white">
                      {riskCase.status}
                    </span>
                  </div>
                  <h4 className="mt-3 text-lg font-semibold tracking-tight text-white">{riskCase.title}</h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {riskCase.reasonKeys.map((reason) => (
                      <span key={reason} className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-[var(--color-muted)]">
                        {reasonLabel(reason)}
                      </span>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-[var(--color-muted)]">
                    First seen {formatAdminDate(riskCase.firstSeenAt)} - last seen {formatAdminDate(riskCase.lastSeenAt)}
                  </p>
                </div>

                <div className="flex flex-wrap items-start gap-2 lg:justify-end">
                  {statusOptions.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => void handleStatus(riskCase.caseId, status)}
                      disabled={statusBusyId === riskCase.caseId || riskCase.status === status}
                      className={[
                        'rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] transition disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]',
                        riskCase.status === status
                          ? 'border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                          : 'border-white/10 text-white hover:bg-white/6',
                      ].join(' ')}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 overflow-x-auto rounded-[0.95rem] border border-white/8">
                <table className="min-w-[760px] w-full border-collapse text-left text-sm">
                  <thead className="border-b border-white/8 bg-black/20">
                    <tr>
                      {['Participant', 'League', 'State', 'Signal', 'Last seen'].map((heading) => (
                        <th key={heading} className="mono px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {riskCase.members.map((member) => (
                      <tr
                        key={member.participantId}
                        className={[
                          'border-b border-white/8 last:border-b-0',
                          member.participantId === focusedParticipantId ? 'bg-[var(--color-accent)]/10' : 'bg-black/10',
                        ].join(' ')}
                      >
                        <td className="px-3 py-3 align-top">
                          <p className="font-semibold text-white">{member.displayName}</p>
                          <p className="mt-1 text-xs text-[var(--color-muted)]">{member.email}</p>
                          <p className="mono mt-1 text-[10px] uppercase tracking-[0.14em] text-[var(--color-muted)]">
                            ID {member.participantId.slice(0, 8)}
                          </p>
                        </td>
                        <td className="px-3 py-3 align-top text-xs text-white">{member.leagueType}</td>
                        <td className="px-3 py-3 align-top text-xs text-[var(--color-muted)]">{member.status.replace('_', ' ')}</td>
                        <td className="px-3 py-3 align-top">
                          <div className="flex flex-wrap gap-1.5">
                            {member.reasonKeys.map((reason) => (
                              <span key={reason} className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-[var(--color-muted)]">
                                {reasonLabel(reason)}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-3 align-top text-xs text-[var(--color-muted)]">{formatAdminDate(member.lastSignalAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
