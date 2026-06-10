import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { EmptyState } from '../EmptyState'
import { fetchAdminRiskCases, sendAdminRiskInquiryEmail, updateAdminRiskCaseStatus } from '../../lib/api'
import type { ParticipantRiskCase, ParticipantRiskCaseMember, ParticipantRiskCaseStatus } from '../../lib/types'

const statusOptions: ParticipantRiskCaseStatus[] = ['open', 'reviewing', 'confirmed', 'dismissed']

interface ConnectedAccountInsight {
  participantId: string
  displayName: string
  email: string
  leagueType: string
  status: string
  probability: number
  caseCount: number
  maxScore: number
  sharedReasonKeys: string[]
  sharedCaseTitles: string[]
  lastSignalAt?: string
}

interface ParticipantInsight {
  participantId: string
  displayName: string
  email: string
  leagueType: string
  status: string
  openCaseCount: number
  maxScore: number
  highestProbability: number
  reasonKeys: string[]
  connectedAccounts: ConnectedAccountInsight[]
}

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

function probabilityClass(probability: number) {
  if (probability >= 80) {
    return 'border-amber-300/30 bg-amber-300/10 text-amber-100'
  }
  if (probability >= 55) {
    return 'border-[var(--color-sand)]/30 bg-[var(--color-sand)]/10 text-[var(--color-sand)]'
  }
  return 'border-[var(--color-accent)]/25 bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
}

function calculateProbability(maxScore: number, caseCount: number, reasonCount: number) {
  const reinforcement = Math.min(18, Math.max(0, caseCount - 1) * 8 + Math.max(0, reasonCount - 1) * 4)
  return Math.min(98, Math.max(0, Math.round(maxScore + reinforcement)))
}

function latestDate(left?: string, right?: string) {
  if (!left) {
    return right
  }
  if (!right) {
    return left
  }
  return new Date(left).getTime() >= new Date(right).getTime() ? left : right
}

function buildParticipantInsight(cases: ParticipantRiskCase[], participantId: string): ParticipantInsight | null {
  const relatedCases = cases.filter((riskCase) => riskCase.members.some((member) => member.participantId === participantId))
  const selectedMember = relatedCases.flatMap((riskCase) => riskCase.members).find((member) => member.participantId === participantId)

  if (!selectedMember) {
    return null
  }

  const reasonKeys = new Set<string>()
  const connectedByParticipant = new Map<string, ConnectedAccountInsight>()
  let maxScore = 0

  for (const riskCase of relatedCases) {
    maxScore = Math.max(maxScore, riskCase.score)
    for (const reason of riskCase.reasonKeys) {
      reasonKeys.add(reason)
    }

    for (const member of riskCase.members) {
      if (member.participantId === participantId) {
        for (const reason of member.reasonKeys) {
          reasonKeys.add(reason)
        }
        continue
      }

      const existing = connectedByParticipant.get(member.participantId)
      const sharedReasonKeys = new Set([...(existing?.sharedReasonKeys ?? []), ...riskCase.reasonKeys, ...member.reasonKeys])
      const sharedCaseTitles = existing?.sharedCaseTitles ?? []
      const nextMaxScore = Math.max(existing?.maxScore ?? 0, riskCase.score, member.memberScore)
      const nextCaseCount = (existing?.caseCount ?? 0) + 1

      connectedByParticipant.set(member.participantId, {
        participantId: member.participantId,
        displayName: member.displayName,
        email: member.email,
        leagueType: member.leagueType,
        status: member.status,
        probability: calculateProbability(nextMaxScore, nextCaseCount, sharedReasonKeys.size),
        caseCount: nextCaseCount,
        maxScore: nextMaxScore,
        sharedReasonKeys: [...sharedReasonKeys],
        sharedCaseTitles: sharedCaseTitles.includes(riskCase.title) ? sharedCaseTitles : [...sharedCaseTitles, riskCase.title],
        lastSignalAt: latestDate(existing?.lastSignalAt, member.lastSignalAt),
      })
    }
  }

  const connectedAccounts = [...connectedByParticipant.values()].sort(
    (left, right) =>
      right.probability - left.probability ||
      right.caseCount - left.caseCount ||
      right.maxScore - left.maxScore ||
      left.displayName.localeCompare(right.displayName),
  )

  return {
    participantId: selectedMember.participantId,
    displayName: selectedMember.displayName,
    email: selectedMember.email,
    leagueType: selectedMember.leagueType,
    status: selectedMember.status,
    openCaseCount: relatedCases.filter((riskCase) => riskCase.status === 'open' || riskCase.status === 'reviewing').length,
    maxScore,
    highestProbability: connectedAccounts[0]?.probability ?? maxScore,
    reasonKeys: [...reasonKeys].sort(),
    connectedAccounts,
  }
}

export function MultiAccountingView() {
  const [searchParams] = useSearchParams()
  const focusedParticipantId = searchParams.get('participant') ?? ''
  const [cases, setCases] = useState<ParticipantRiskCase[]>([])
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null)
  const [inquiryBusyKey, setInquiryBusyKey] = useState<string | null>(null)
  const [manualSelection, setManualSelection] = useState<{ focusId: string; participantId: string } | null>(null)
  const selectedParticipantId = manualSelection?.focusId === focusedParticipantId ? manualSelection.participantId : focusedParticipantId

  async function loadCases() {
    setLoadState('loading')
    setError(null)
    setMessage(null)
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
    setMessage(null)
    try {
      const response = await updateAdminRiskCaseStatus(caseId, status)
      setCases((current) => current.map((riskCase) => (riskCase.caseId === caseId ? response.item : riskCase)))
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Could not update review status.')
    } finally {
      setStatusBusyId(null)
    }
  }

  async function handleInquiryEmail(riskCase: ParticipantRiskCase, member: ParticipantRiskCaseMember) {
    const busyKey = `${riskCase.caseId}:${member.participantId}`
    setInquiryBusyKey(busyKey)
    setError(null)
    setMessage(null)
    try {
      const response = await sendAdminRiskInquiryEmail(riskCase.caseId, member.participantId)
      setCases((current) => current.map((item) => (item.caseId === response.item.caseId ? response.item : item)))
      setMessage(`Inquiry email sent to ${member.displayName}.`)
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Could not send inquiry email.')
    } finally {
      setInquiryBusyKey(null)
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

  const selectedInsight = useMemo(
    () => (selectedParticipantId ? buildParticipantInsight(cases, selectedParticipantId) : null),
    [cases, selectedParticipantId],
  )

  function selectParticipant(participantId: string) {
    setManualSelection({ focusId: focusedParticipantId, participantId })
  }

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

      {selectedInsight ? (
        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(21rem,0.65fr)]">
          <div className="rounded-[1rem] border border-white/8 bg-black/15 p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">selected account</p>
                <h4 className="mt-2 text-xl font-semibold tracking-tight text-white">{selectedInsight.displayName}</h4>
                <p className="mt-1 text-sm text-[var(--color-muted)]">{selectedInsight.email}</p>
                <p className="mono mt-2 text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  ID {selectedInsight.participantId.slice(0, 8)}
                </p>
              </div>
              <span
                className={[
                  'mono rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.16em]',
                  probabilityClass(selectedInsight.highestProbability),
                ].join(' ')}
              >
                {selectedInsight.highestProbability}% likelihood
              </span>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {[
                ['cases', selectedInsight.openCaseCount],
                ['max score', selectedInsight.maxScore],
                ['criteria', selectedInsight.reasonKeys.length],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[0.85rem] border border-white/8 bg-black/20 px-3 py-2">
                  <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">{label}</p>
                  <p className="mt-1 text-lg font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-500"
                style={{ width: `${selectedInsight.highestProbability}%` }}
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {selectedInsight.reasonKeys.map((reason) => (
                <span key={reason} className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-[var(--color-muted)]">
                  {reasonLabel(reason)}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-[1rem] border border-white/8 bg-black/15 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">connected accounts</p>
                <p className="mt-1 text-sm font-semibold text-white">{selectedInsight.connectedAccounts.length} linked</p>
              </div>
              <span className="mono rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">
                {selectedInsight.leagueType}
              </span>
            </div>

            <div className="mt-4 grid max-h-[25rem] gap-2 overflow-y-auto pr-1">
              {selectedInsight.connectedAccounts.length === 0 ? (
                <div className="rounded-[0.85rem] border border-white/8 bg-black/20 px-3 py-3 text-sm text-[var(--color-muted)]">
                  No linked accounts in shared cases.
                </div>
              ) : (
                selectedInsight.connectedAccounts.map((account) => (
                  <button
                    key={account.participantId}
                    type="button"
                    onClick={() => selectParticipant(account.participantId)}
                    className="rounded-[0.85rem] border border-white/8 bg-black/20 px-3 py-3 text-left transition hover:-translate-y-[1px] hover:border-[var(--color-accent)]/30 hover:bg-white/6 active:scale-[0.98]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-white">{account.displayName}</p>
                        <p className="mt-1 truncate text-xs text-[var(--color-muted)]">{account.email}</p>
                      </div>
                      <span
                        className={[
                          'mono shrink-0 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em]',
                          probabilityClass(account.probability),
                        ].join(' ')}
                      >
                        {account.probability}%
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-[var(--color-muted)]">
                        {account.caseCount} {account.caseCount === 1 ? 'case' : 'cases'}
                      </span>
                      <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-[var(--color-muted)]">
                        {account.status.replace('_', ' ')}
                      </span>
                      {account.sharedReasonKeys.slice(0, 3).map((reason) => (
                        <span key={reason} className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-[var(--color-muted)]">
                          {reasonLabel(reason)}
                        </span>
                      ))}
                    </div>
                    <p className="mono mt-3 text-[10px] uppercase tracking-[0.14em] text-[var(--color-muted)]">
                      ID {account.participantId.slice(0, 8)}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      ) : loadState === 'ready' && cases.length > 0 ? (
        <div className="mt-5 rounded-[1rem] border border-white/8 bg-black/15 px-4 py-3 text-sm text-[var(--color-muted)]">
          Select an account row to inspect linked accounts and multi-account likelihood.
        </div>
      ) : null}

      {error ? (
        <div className="mt-5 rounded-[1.3rem] border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-sm text-[var(--color-paper)]">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="mt-5 rounded-[1.3rem] border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/10 px-4 py-3 text-sm text-[var(--color-paper)]">
          {message}
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
                <table className="min-w-[920px] w-full border-collapse text-left text-sm">
                  <thead className="border-b border-white/8 bg-black/20">
                    <tr>
                      {['Participant', 'League', 'State', 'Signal', 'Last seen', 'Inquiry'].map((heading) => (
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
                          'border-b border-white/8 transition last:border-b-0 hover:bg-white/5',
                          member.participantId === selectedParticipantId
                            ? 'bg-[var(--color-accent)]/14'
                            : member.participantId === focusedParticipantId
                              ? 'bg-[var(--color-accent)]/8'
                              : 'bg-black/10',
                        ].join(' ')}
                      >
                        <td className="px-3 py-3 align-top">
                          <button
                            type="button"
                            aria-pressed={member.participantId === selectedParticipantId}
                            onClick={() => selectParticipant(member.participantId)}
                            className="block w-full rounded-[0.75rem] p-2 text-left transition hover:bg-white/6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] active:scale-[0.98]"
                          >
                            <span className="block font-semibold text-white">{member.displayName}</span>
                            <span className="mt-1 block text-xs text-[var(--color-muted)]">{member.email}</span>
                            <span className="mono mt-1 block text-[10px] uppercase tracking-[0.14em] text-[var(--color-muted)]">
                              ID {member.participantId.slice(0, 8)}
                            </span>
                          </button>
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
                        <td className="px-3 py-3 align-top">
                          {member.inquiryEmailSentAt ? (
                            <div className="min-w-[9rem]">
                              <span className="mono rounded-full border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-[var(--color-accent)]">
                                inquiry sent
                              </span>
                              <p className="mt-2 text-xs text-[var(--color-muted)]">
                                {formatAdminDate(member.inquiryEmailSentAt)}
                                {member.inquiryEmailSentCount && member.inquiryEmailSentCount > 1 ? ` (${member.inquiryEmailSentCount}x)` : ''}
                              </p>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void handleInquiryEmail(riskCase, member)}
                              disabled={inquiryBusyKey === `${riskCase.caseId}:${member.participantId}`}
                              className="rounded-full border border-[var(--color-accent)]/35 bg-[var(--color-accent)]/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent)] transition hover:bg-[var(--color-accent)]/16 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
                            >
                              {inquiryBusyKey === `${riskCase.caseId}:${member.participantId}` ? 'Sending...' : 'Tag + send'}
                            </button>
                          )}
                        </td>
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
