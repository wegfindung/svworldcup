import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../EmptyState'
import { NationSelect } from '../NationSelect'
import { eventTeams } from '../../data/eventConfig'
import { getNationName, soccerverseNations } from '../../data/soccerverseNations'
import {
  ApiError,
  adminCorrectSoccerverseUsername,
  adminSetParticipantLeague,
  adminUpdateParticipantNations,
  fetchAdminParticipants,
} from '../../lib/api'
import type { AdminParticipantRecord, LeagueType } from '../../lib/types'

function correctUsernameErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const reason = typeof error.payload?.reason === 'string' ? (error.payload.reason as string) : null
    switch (reason) {
      case 'invalid_username':
        return 'Enter a valid Soccerverse username (1–60 characters, not an email address).'
      case 'username_taken':
        return 'That Soccerverse username is already linked to another participant.'
      case 'not_linked':
        return 'This participant has no Soccerverse username to correct.'
      case 'not_found':
        return 'Participant not found.'
    }
    return error.message
  }
  return error instanceof Error ? error.message : 'Could not correct the username.'
}

function nationUpdateErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const reason = typeof error.payload?.reason === 'string' ? (error.payload.reason as string) : null
    switch (reason) {
      case 'locked':
        return 'Nation picks are locked — the tournament has already started.'
      case 'invalid_primary':
        return 'Choose a valid primary nation.'
      case 'invalid_secondary':
        return 'Choose a valid secondary nation.'
      case 'same_nation':
        return 'Secondary nation must be different from the primary nation.'
      case 'not_found':
        return 'Participant not found.'
    }
    return error.message
  }
  return error instanceof Error ? error.message : 'Could not update the nations.'
}

function leagueChangeErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const reason = typeof error.payload?.reason === 'string' ? (error.payload.reason as string) : null
    switch (reason) {
      case 'requires_soccerverse_username':
        return 'Participant needs to link a Soccerverse account before being moved to the Veteran league.'
      case 'invalid_league':
        return 'League must be either Rookie or Veteran.'
      case 'not_found':
        return 'Participant not found.'
    }
    return error.message
  }
  return error instanceof Error ? error.message : 'Could not change league.'
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

function teamLabel(teamCode?: string) {
  if (!teamCode) {
    return 'None'
  }

  // Nation pick uses Soccerverse nation codes; fall back to WC team names for any legacy codes.
  return eventTeams.find((team) => team.code === teamCode)?.nameEn ?? getNationName(teamCode)
}

export function AccountsView() {
  const [participants, setParticipants] = useState<AdminParticipantRecord[]>([])
  const [participantsBusy, setParticipantsBusy] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [leagueBusyId, setLeagueBusyId] = useState<string | null>(null)
  const [leagueError, setLeagueError] = useState<string | null>(null)
  const [editingUsernameId, setEditingUsernameId] = useState<string | null>(null)
  const [usernameDraft, setUsernameDraft] = useState('')
  const [usernameBusyId, setUsernameBusyId] = useState<string | null>(null)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [editingNationsId, setEditingNationsId] = useState<string | null>(null)
  const [nationPrimaryDraft, setNationPrimaryDraft] = useState<string | undefined>(undefined)
  const [nationSecondaryDraft, setNationSecondaryDraft] = useState<string | undefined>(undefined)
  const [nationBusyId, setNationBusyId] = useState<string | null>(null)
  const [nationError, setNationError] = useState<string | null>(null)

  function startEditNations(participant: AdminParticipantRecord) {
    setEditingNationsId(participant.participantId)
    setNationPrimaryDraft(participant.primaryTeamCode || undefined)
    setNationSecondaryDraft(participant.secondaryTeamCode || undefined)
    setNationError(null)
  }

  async function handleSaveNations(participantId: string) {
    if (!nationPrimaryDraft) {
      setNationError('Choose a primary nation.')
      return
    }
    if (nationSecondaryDraft && nationSecondaryDraft === nationPrimaryDraft) {
      setNationError('Secondary nation must be different from the primary nation.')
      return
    }
    setNationBusyId(participantId)
    setNationError(null)
    try {
      const response = await adminUpdateParticipantNations(
        participantId,
        nationPrimaryDraft,
        nationSecondaryDraft ?? null,
      )
      setParticipants((current) =>
        current.map((row) => (row.participantId === participantId ? { ...row, ...response.participant } : row)),
      )
      setEditingNationsId(null)
    } catch (err) {
      setNationError(nationUpdateErrorMessage(err))
    } finally {
      setNationBusyId(null)
    }
  }

  function startEditUsername(participant: AdminParticipantRecord) {
    setEditingUsernameId(participant.participantId)
    setUsernameDraft(participant.soccerverseUsername ?? '')
    setUsernameError(null)
  }

  async function handleCorrectUsername(participantId: string) {
    const next = usernameDraft.trim()
    if (!next) {
      setUsernameError('Enter a Soccerverse username.')
      return
    }
    if (next.includes('@')) {
      setUsernameError('That looks like an email — enter the Soccerverse username instead.')
      return
    }
    setUsernameBusyId(participantId)
    setUsernameError(null)
    try {
      const response = await adminCorrectSoccerverseUsername(participantId, next)
      setParticipants((current) =>
        current.map((row) => (row.participantId === participantId ? { ...row, ...response.participant } : row)),
      )
      setEditingUsernameId(null)
      setUsernameDraft('')
    } catch (err) {
      setUsernameError(correctUsernameErrorMessage(err))
    } finally {
      setUsernameBusyId(null)
    }
  }

  async function handleMoveLeague(participantId: string, target: LeagueType) {
    setLeagueBusyId(participantId)
    setLeagueError(null)
    try {
      const response = await adminSetParticipantLeague(participantId, target)
      setParticipants((current) =>
        current.map((row) => (row.participantId === participantId ? { ...row, ...response.participant } : row)),
      )
    } catch (err) {
      setLeagueError(leagueChangeErrorMessage(err))
    } finally {
      setLeagueBusyId(null)
    }
  }

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
    let active = true
    void (async () => {
      try {
        const response = await fetchAdminParticipants()
        if (active) {
          setParticipants(response.items)
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Could not load registered accounts.')
        }
      } finally {
        if (active) {
          setParticipantsBusy(false)
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

      {leagueError ? (
        <div className="mt-5 rounded-[1.3rem] border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-sm text-[var(--color-paper)]">
          {leagueError}
        </div>
      ) : null}

      {usernameError ? (
        <div className="mt-5 rounded-[1.3rem] border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-sm text-[var(--color-paper)]">
          {usernameError}
        </div>
      ) : null}

      {nationError ? (
        <div className="mt-5 rounded-[1.3rem] border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-sm text-[var(--color-paper)]">
          {nationError}
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
          <table className="min-w-[1180px] w-full border-collapse text-left text-sm">
            <thead className="border-b border-white/8 bg-black/20">
              <tr>
                {['Manager', 'League', 'Teams', 'Referral', 'Risk', 'State', 'Dates'].map((heading) => (
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
                    {participant.soccerverseUsername ? (
                      editingUsernameId === participant.participantId ? (
                        <div className="mt-2 grid gap-1.5">
                          <input
                            value={usernameDraft}
                            onChange={(event) => setUsernameDraft(event.target.value)}
                            maxLength={60}
                            autoComplete="off"
                            placeholder="Soccerverse username"
                            className="rounded-[0.6rem] border border-white/12 bg-black/30 px-2 py-1 text-xs text-white outline-none transition focus:border-[var(--color-accent)]"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => void handleCorrectUsername(participant.participantId)}
                              disabled={usernameBusyId === participant.participantId}
                              className="rounded-full bg-[var(--color-accent)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-ink)] transition hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
                            >
                              {usernameBusyId === participant.participantId ? 'Saving…' : 'Save'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingUsernameId(null)
                                setUsernameError(null)
                              }}
                              className="rounded-full border border-white/12 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-white/6 active:scale-[0.98]"
                            >
                              Cancel
                            </button>
                          </div>
                          <p className="text-[10px] leading-relaxed text-[var(--color-muted)]">
                            Keeps the original link date — only fixes the username.
                          </p>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEditUsername(participant)}
                          className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)] transition hover:underline"
                        >
                          Correct username
                        </button>
                      )
                    ) : null}
                    {participant.leagueType === 'rookie' ? (
                      <button
                        type="button"
                        onClick={() => void handleMoveLeague(participant.participantId, 'veteran')}
                        disabled={leagueBusyId === participant.participantId || !participant.soccerverseUsername}
                        title={!participant.soccerverseUsername ? 'Participant must link a Soccerverse account first.' : undefined}
                        className="mt-3 rounded-full border border-white/12 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white transition hover:-translate-y-[1px] hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
                      >
                        {leagueBusyId === participant.participantId ? 'Moving…' : 'Move to Veteran'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleMoveLeague(participant.participantId, 'rookie')}
                        disabled={leagueBusyId === participant.participantId}
                        className="mt-3 rounded-full border border-white/12 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white transition hover:-translate-y-[1px] hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
                      >
                        {leagueBusyId === participant.participantId ? 'Moving…' : 'Move to Rookie'}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-4 align-top">
                    {editingNationsId === participant.participantId ? (
                      <div className="grid w-60 gap-2">
                        <NationSelect
                          label="Primary nation"
                          nations={soccerverseNations}
                          value={nationPrimaryDraft}
                          placeholder="Select nation"
                          excludeCode={nationSecondaryDraft}
                          onChange={(code) => setNationPrimaryDraft(code)}
                        />
                        <NationSelect
                          label="Secondary nation (optional)"
                          nations={soccerverseNations}
                          value={nationSecondaryDraft}
                          placeholder="None"
                          excludeCode={nationPrimaryDraft}
                          onChange={(code) => setNationSecondaryDraft(code)}
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => void handleSaveNations(participant.participantId)}
                            disabled={nationBusyId === participant.participantId}
                            className="rounded-full bg-[var(--color-accent)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-ink)] transition hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
                          >
                            {nationBusyId === participant.participantId ? 'Saving…' : 'Save'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingNationsId(null)
                              setNationError(null)
                            }}
                            className="rounded-full border border-white/12 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-white/6 active:scale-[0.98]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-white">{teamLabel(participant.primaryTeamCode)}</p>
                        <p className="mt-1 text-xs text-[var(--color-muted)]">
                          Secondary: <span className="text-white">{teamLabel(participant.secondaryTeamCode)}</span>
                        </p>
                        <button
                          type="button"
                          onClick={() => startEditNations(participant)}
                          className="mt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)] transition hover:underline"
                        >
                          Edit nations
                        </button>
                      </>
                    )}
                  </td>
                  <td className="px-4 py-4 align-top">
                    <p className="text-xs text-white">{participant.referrerSoccerverseUsername || 'None'}</p>
                  </td>
                  <td className="px-4 py-4 align-top">
                    {participant.riskSummary?.openCaseCount ? (
                      <Link
                        to={`/admin/multi-accounting?participant=${encodeURIComponent(participant.participantId)}`}
                        className="inline-flex flex-col rounded-[0.9rem] border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-xs text-amber-100 transition hover:-translate-y-[1px] hover:bg-amber-300/15 active:scale-[0.98]"
                      >
                        <span className="font-semibold">{participant.riskSummary.openCaseCount} active</span>
                        <span className="mono mt-1 text-[10px] uppercase tracking-[0.14em]">
                          score {participant.riskSummary.maxRiskScore}
                        </span>
                      </Link>
                    ) : (
                      <span className="text-xs text-[var(--color-muted)]">No open cases</span>
                    )}
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
                      <span>Linked: {formatAdminDate(participant.soccerverseLinkedAt)}</span>
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
