import { useMemo, useState, type FormEvent } from 'react'
import { EmptyState } from '../components/EmptyState'
import { EmailMarketingPanel } from '../components/EmailMarketingPanel'
import { MatchImportPanel } from '../components/MatchImportPanel'
import { PlayerPortrait } from '../components/PlayerPortrait'
import { TeamFlag } from '../components/TeamFlag'
import { defaultScoring, eventTeams } from '../data/eventConfig'
import {
  fetchAdminMatchEntries,
  fetchAdminOverview,
  fetchAdminParticipants,
  fetchAdminTeams,
  fetchBootstrap,
  fetchTeamSelections,
  loginAdmin,
  logoutAdmin,
  saveTeamSelections,
  saveAdminMatchEntry,
  searchTeamCandidates,
  triggerGlobalReveal,
  updateAdminScoring,
} from '../lib/api'
import type { AdminOverview, AdminParticipantRecord, AdminProfile, FixtureSeed, LocaleCode, MatchEntryInput, MatchEntryRecord, ScoringConfig, SoccerversePlayer, TeamPoolPlayer, TeamSeed } from '../lib/types'

interface AdminPageProps {
  locale: LocaleCode
}

const scoringFields: Array<{ key: keyof ScoringConfig; label: string; step: string }> = [
  { key: 'goal', label: 'Goal', step: '1' },
  { key: 'assist', label: 'Assist', step: '1' },
  { key: 'cleanSheet', label: 'Clean sheet', step: '1' },
  { key: 'appearance', label: 'Appearance', step: '1' },
  { key: 'minutes', label: 'Minutes', step: '1' },
  { key: 'performancePointsMin', label: 'Perf min', step: '0.1' },
  { key: 'performancePointsMax', label: 'Perf max', step: '0.1' },
]

const initialMatchEntry: MatchEntryInput = {
  fixtureId: '',
  playerId: 0,
  inOfficialSquad: true,
  minutes: 0,
  goals: 0,
  assists: 0,
  cleanSheetEligible: false,
  performancePoints: undefined,
  sourceNote: '',
}

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

export function AdminPage({ locale: _locale }: AdminPageProps) {
  void _locale
  const [authState, setAuthState] = useState<'guest' | 'active'>('guest')
  const [admin, setAdmin] = useState<AdminProfile | null>(null)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loginBusy, setLoginBusy] = useState(false)
  const [teams, setTeams] = useState<Array<TeamSeed & { selectedCount: number }>>(() =>
    eventTeams.map((team) => ({
      ...team,
      selectedCount: 0,
    })),
  )
  const [teamsBusy, setTeamsBusy] = useState(false)
  const [selectedTeamCode, setSelectedTeamCode] = useState<string>('GER')
  const [loadedTeamCode, setLoadedTeamCode] = useState<string | null>(null)
  const [selections, setSelections] = useState<TeamPoolPlayer[]>([])
  const [candidates, setCandidates] = useState<SoccerversePlayer[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchBusy, setSearchBusy] = useState(false)
  const [saveBusy, setSaveBusy] = useState(false)
  const [panelError, setPanelError] = useState<string | null>(null)
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [scoringForm, setScoringForm] = useState<ScoringConfig>(defaultScoring)
  const [scoringBusy, setScoringBusy] = useState(false)
  const [scoringMessage, setScoringMessage] = useState<string | null>(null)
  const [matchEntry, setMatchEntry] = useState<MatchEntryInput>(initialMatchEntry)
  const [matchEntries, setMatchEntries] = useState<MatchEntryRecord[]>([])
  const [matchBusy, setMatchBusy] = useState(false)
  const [matchMessage, setMatchMessage] = useState<string | null>(null)
  const [revealBusy, setRevealBusy] = useState(false)
  const [revealMessage, setRevealMessage] = useState<string | null>(null)
  const [fixtures, setFixtures] = useState<FixtureSeed[]>([])
  const [participants, setParticipants] = useState<AdminParticipantRecord[]>([])
  const [participantsBusy, setParticipantsBusy] = useState(false)

  const selectedTeam = useMemo(
    () => teams.find((team) => team.code === selectedTeamCode) ?? null,
    [teams, selectedTeamCode],
  )

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
    setPanelError(null)

    try {
      const response = await fetchAdminParticipants()
      setParticipants(response.items)
    } catch (error) {
      setPanelError(error instanceof Error ? error.message : 'Could not load registered accounts.')
    } finally {
      setParticipantsBusy(false)
    }
  }

  async function handleLoadTeamSelections(teamCode: string) {
    setSelectedTeamCode(teamCode)
    setLoadedTeamCode(null)
    setSelections([])
    setCandidates([])
    setSearchQuery('')
    setPanelError(null)

    try {
      const response = await fetchTeamSelections(teamCode)
      setSelections(response.items)
      setLoadedTeamCode(teamCode)
    } catch (error) {
      setPanelError(error instanceof Error ? error.message : 'Could not load team selections.')
      setLoadedTeamCode(null)
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoginBusy(true)
    setLoginError(null)
    setPanelError(null)

    try {
      const response = await loginAdmin(loginEmail, loginPassword)
      setTeamsBusy(true)
      setParticipantsBusy(true)
      const [teamResponse, overviewResponse, bootstrapResponse, participantResponse] = await Promise.all([
        fetchAdminTeams(),
        fetchAdminOverview(),
        fetchBootstrap(),
        fetchAdminParticipants(),
      ])
      setAdmin(response.admin)
      setTeams(teamResponse.items)
      setOverview(overviewResponse)
      setScoringForm(overviewResponse.scoring)
      setFixtures(bootstrapResponse.fixtures)
      setParticipants(participantResponse.items)
      if (!teamResponse.items.some((team) => team.code === selectedTeamCode)) {
        setSelectedTeamCode(teamResponse.items[0]?.code ?? 'GER')
      }
      setSelections([])
      setCandidates([])
      setLoadedTeamCode(null)
      setAuthState('active')
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Login failed.')
    } finally {
      setLoginBusy(false)
      setTeamsBusy(false)
      setParticipantsBusy(false)
    }
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedTeamCode) {
      return
    }

    setSearchBusy(true)
    setPanelError(null)
    try {
      const response = await searchTeamCandidates(selectedTeamCode, searchQuery)
      setCandidates(response.items)
    } catch (error) {
      setPanelError(error instanceof Error ? error.message : 'Candidate search failed.')
      setCandidates([])
    } finally {
      setSearchBusy(false)
    }
  }

  function handleAddCandidate(player: SoccerversePlayer) {
    setSelections((current) => {
      if (current.some((item) => item.playerId === player.playerId)) {
        return current
      }

      return [
        ...current,
        {
          teamCode: selectedTeamCode,
          playerId: player.playerId,
          displayName: player.displayName,
          nationalityCode: player.nationalityCode,
          rating: player.rating,
          capCost: 0,
          positions: player.positions,
          positionMain: player.positionMain,
          positionClasses: [],
          imageUrl: player.imageUrl,
        },
      ].sort((left, right) => right.rating - left.rating || left.displayName.localeCompare(right.displayName))
    })
  }

  async function handleSave() {
    if (!selectedTeamCode) {
      return
    }

    setSaveBusy(true)
    setPanelError(null)
    try {
      const response = await saveTeamSelections(selectedTeamCode, selections)
      setSelections(response.items)
      setTeams((current) =>
        current.map((team) =>
          team.code === selectedTeamCode
            ? {
                ...team,
                selectedCount: response.items.length,
              }
            : team,
        ),
      )
    } catch (error) {
      setPanelError(error instanceof Error ? error.message : 'Saving team selections failed.')
    } finally {
      setSaveBusy(false)
    }
  }

  async function handleSaveScoring(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setScoringBusy(true)
    setPanelError(null)
    setScoringMessage(null)

    try {
      const response = await updateAdminScoring(scoringForm)
      setScoringForm(response.item)
      setOverview((current) => (current ? { ...current, scoring: response.item } : current))
      setScoringMessage('Scoring settings saved.')
    } catch (error) {
      setPanelError(error instanceof Error ? error.message : 'Scoring update failed.')
    } finally {
      setScoringBusy(false)
    }
  }

  async function handleSaveMatchEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMatchBusy(true)
    setPanelError(null)
    setMatchMessage(null)

    try {
      const payload: MatchEntryInput = {
        ...matchEntry,
        sourceNote: matchEntry.sourceNote?.trim() || undefined,
        performancePoints: matchEntry.performancePoints === undefined ? undefined : matchEntry.performancePoints,
      }
      const response = await saveAdminMatchEntry(payload)
      const nextEntries = await fetchAdminMatchEntries(payload.fixtureId)
      setMatchEntries(nextEntries.items)
      setMatchEntry((current) => ({
        ...initialMatchEntry,
        fixtureId: current.fixtureId,
        inOfficialSquad: true,
      }))
      setMatchMessage(`Saved entry for player ${response.item.playerId}.`)
    } catch (error) {
      setPanelError(error instanceof Error ? error.message : 'Match entry save failed.')
    } finally {
      setMatchBusy(false)
    }
  }

  async function handleGlobalReveal(revealSquads: boolean) {
    const approved = window.confirm(
      revealSquads
        ? 'Reveal all public profiles and all submitted squads globally?'
        : 'Reveal all public profiles globally while keeping squads hidden?',
    )
    if (!approved) {
      return
    }

    setRevealBusy(true)
    setPanelError(null)
    setRevealMessage(null)
    try {
      const response = await triggerGlobalReveal({ revealProfiles: true, revealSquads })
      setOverview((current) => (current ? { ...current, eventControls: response.eventControls } : current))
      setRevealMessage(revealSquads ? 'Global squad reveal is active.' : 'Global profile reveal is active.')
    } catch (error) {
      setPanelError(error instanceof Error ? error.message : 'Global reveal failed.')
    } finally {
      setRevealBusy(false)
    }
  }

  if (authState === 'guest') {
    return (
      <div className="mx-auto max-w-3xl pb-12">
        <section className="hero-card rounded-[1.25rem] px-5 py-6 sm:px-6">
          <p className="eyebrow">admin access</p>
          <h2 className="section-title mt-6 max-w-[11ch]">Email and password backend access.</h2>
          <p className="mt-6 max-w-[58ch] text-lg leading-relaxed text-[var(--color-muted)]">
            Use the protected backend to preselect all 48 World Cup team pools before public drafting opens.
          </p>

          <form onSubmit={handleLogin} className="mt-7 grid gap-4 rounded-[1.1rem] border border-white/10 bg-black/15 p-4 sm:p-5">
            <label className="grid gap-2">
              <span className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">Admin email</span>
              <input
                required
                type="email"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                placeholder="admin@example.com"
                className="rounded-[1.2rem] border border-white/10 bg-black/15 px-4 py-3 text-white outline-none transition focus:border-[var(--color-accent)]"
              />
            </label>
            <label className="grid gap-2">
              <span className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">Password</span>
              <input
                required
                type="password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                placeholder="Password"
                className="rounded-[1.2rem] border border-white/10 bg-black/15 px-4 py-3 text-white outline-none transition focus:border-[var(--color-accent)]"
              />
            </label>
            {loginError ? (
              <div className="rounded-[1.3rem] border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-sm text-[var(--color-paper)]">
                {loginError}
              </div>
            ) : null}
            <button
              type="submit"
              disabled={loginBusy}
              className="inline-flex w-fit items-center rounded-full bg-[var(--color-accent)] px-8 py-4 text-base font-semibold text-[var(--color-ink)] shadow-[0_20px_30px_-20px_rgba(24,180,133,0.8)] transition hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
            >
              {loginBusy ? 'Signing in…' : 'Open admin backend'}
            </button>
          </form>
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-10">
      <section className="hero-card rounded-[1.25rem] px-5 py-6 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="eyebrow">team preselection backend</p>
            <h2 className="section-title mt-6 max-w-[11ch]">Build the official World Cup team pools.</h2>
            <p className="mt-6 max-w-[58ch] text-lg leading-relaxed text-[var(--color-muted)]">
              Logged in as <span className="font-medium text-white">{admin?.email}</span>. Search by name or player ID, add candidates,
              then save the player pool for each nation.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">
              Team and player requests only start after button presses. Switching the highlighted nation alone does not hit the API.
            </p>
          </div>

          <button
            type="button"
            onClick={async () => {
              await logoutAdmin()
              setAdmin(null)
              setSelections([])
              setCandidates([])
              setParticipants([])
              setLoadedTeamCode(null)
              setPanelError(null)
              setAuthState('guest')
            }}
            className="rounded-full border border-white/12 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]"
          >
            Sign out
          </button>
        </div>
      </section>

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

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <form onSubmit={handleSaveScoring} className="glass-panel rounded-[1.15rem] p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow">scoring settings</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">Retouch event rules.</h3>
              <p className="mt-3 max-w-[58ch] text-sm leading-relaxed text-[var(--color-muted)]">
                These values drive the public leaderboards. Once kickoff lock is active, the backend rejects scoring changes.
              </p>
            </div>
            <span
              className={[
                'mono rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.18em]',
                overview?.scoringLocked
                  ? 'border-amber-300/25 bg-amber-300/10 text-amber-200'
                  : 'border-[var(--color-accent)]/25 bg-[var(--color-accent)]/10 text-[var(--color-accent)]',
              ].join(' ')}
            >
              {overview?.scoringLocked ? 'locked' : 'editable'}
            </span>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {scoringFields.map((field) => (
              <label key={field.key} className="grid gap-2">
                <span className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">{field.label}</span>
                <input
                  type="number"
                  min={0}
                  max={field.key.startsWith('performance') ? 5 : 20}
                  step={field.step}
                  value={scoringForm[field.key]}
                  onChange={(event) =>
                    setScoringForm((current) => ({
                      ...current,
                      [field.key]: Number(event.target.value),
                    }))
                  }
                  className="h-11 rounded-[1rem] border border-white/10 bg-black/15 px-3 text-sm text-white outline-none transition focus:border-[var(--color-accent)]"
                />
              </label>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={scoringBusy || overview?.scoringLocked}
              className="rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--color-ink)] transition hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
            >
              {scoringBusy ? 'Saving...' : 'Save scoring'}
            </button>
            {scoringMessage ? <p className="text-sm text-[var(--color-accent)]">{scoringMessage}</p> : null}
          </div>
        </form>

        <form onSubmit={handleSaveMatchEntry} className="glass-panel rounded-[1.15rem] p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow">match stat entry</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">Enter player performance.</h3>
              <p className="mt-3 max-w-[58ch] text-sm leading-relaxed text-[var(--color-muted)]">
                One entry per fixture and player. Saving the same pair updates the stat line used by public tables.
              </p>
            </div>
            <button
              type="button"
              disabled={!matchEntry.fixtureId || matchBusy}
              onClick={async () => {
                setMatchBusy(true)
                setPanelError(null)
                try {
                  const response = await fetchAdminMatchEntries(matchEntry.fixtureId)
                  setMatchEntries(response.items)
                } catch (error) {
                  setPanelError(error instanceof Error ? error.message : 'Could not load match entries.')
                } finally {
                  setMatchBusy(false)
                }
              }}
              className="rounded-full border border-white/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:-translate-y-[1px] hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
            >
              Load fixture
            </button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="grid gap-2 sm:col-span-2">
              <span className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">Fixture ID</span>
              <input
                required
                value={matchEntry.fixtureId}
                onChange={(event) => setMatchEntry((current) => ({ ...current, fixtureId: event.target.value }))}
                placeholder="group-a-mex-rsa"
                className="h-11 rounded-[1rem] border border-white/10 bg-black/15 px-3 text-sm text-white outline-none transition focus:border-[var(--color-accent)]"
              />
            </label>
            <label className="grid gap-2 sm:col-span-2">
              <span className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">Player ID</span>
              <input
                required
                type="number"
                min={1}
                value={matchEntry.playerId || ''}
                onChange={(event) => setMatchEntry((current) => ({ ...current, playerId: Number(event.target.value) }))}
                placeholder="12345"
                className="h-11 rounded-[1rem] border border-white/10 bg-black/15 px-3 text-sm text-white outline-none transition focus:border-[var(--color-accent)]"
              />
            </label>
            {(['minutes', 'goals', 'assists'] as const).map((key) => (
              <label key={key} className="grid gap-2">
                <span className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">{key}</span>
                <input
                  type="number"
                  min={0}
                  max={key === 'minutes' ? 130 : 20}
                  value={matchEntry[key]}
                  onChange={(event) => setMatchEntry((current) => ({ ...current, [key]: Number(event.target.value) }))}
                  className="h-11 rounded-[1rem] border border-white/10 bg-black/15 px-3 text-sm text-white outline-none transition focus:border-[var(--color-accent)]"
                />
              </label>
            ))}
            <label className="grid gap-2">
              <span className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">Performance</span>
              <input
                type="number"
                min={0}
                max={5}
                step={0.1}
                value={matchEntry.performancePoints ?? ''}
                onChange={(event) =>
                  setMatchEntry((current) => ({
                    ...current,
                    performancePoints: event.target.value === '' ? undefined : Number(event.target.value),
                  }))
                }
                placeholder="0.8"
                className="h-11 rounded-[1rem] border border-white/10 bg-black/15 px-3 text-sm text-white outline-none transition focus:border-[var(--color-accent)]"
              />
            </label>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-3 rounded-[1rem] border border-white/8 bg-black/12 px-4 py-3 text-sm text-white">
              <input
                type="checkbox"
                checked={matchEntry.inOfficialSquad}
                onChange={(event) => setMatchEntry((current) => ({ ...current, inOfficialSquad: event.target.checked }))}
                className="h-4 w-4 accent-[var(--color-accent)]"
              />
              In official squad
            </label>
            <label className="flex items-center gap-3 rounded-[1rem] border border-white/8 bg-black/12 px-4 py-3 text-sm text-white">
              <input
                type="checkbox"
                checked={matchEntry.cleanSheetEligible}
                onChange={(event) => setMatchEntry((current) => ({ ...current, cleanSheetEligible: event.target.checked }))}
                className="h-4 w-4 accent-[var(--color-accent)]"
              />
              Clean sheet eligible
            </label>
          </div>

          <label className="mt-4 grid gap-2">
            <span className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">Source note</span>
            <input
              value={matchEntry.sourceNote ?? ''}
              onChange={(event) => setMatchEntry((current) => ({ ...current, sourceNote: event.target.value }))}
              placeholder="manual admin entry"
              className="h-11 rounded-[1rem] border border-white/10 bg-black/15 px-3 text-sm text-white outline-none transition focus:border-[var(--color-accent)]"
            />
          </label>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={matchBusy}
              className="rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--color-ink)] transition hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
            >
              {matchBusy ? 'Saving...' : 'Save stat line'}
            </button>
            {matchMessage ? <p className="text-sm text-[var(--color-accent)]">{matchMessage}</p> : null}
          </div>

          {matchEntries.length ? (
            <div className="mt-5 overflow-hidden rounded-[1rem] border border-white/8">
              {matchEntries.slice(0, 6).map((entry) => (
                <div key={entry.entryId} className="grid grid-cols-[1fr_auto] gap-3 border-b border-white/8 bg-black/12 px-4 py-3 last:border-b-0">
                  <div>
                    <p className="mono text-xs text-white">Player {entry.playerId}</p>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                      {entry.minutes} min · {entry.goals} G · {entry.assists} A
                    </p>
                  </div>
                  <span className="mono text-xs text-[var(--color-accent)]">{entry.inOfficialSquad ? 'IN' : 'OUT'}</span>
                </div>
              ))}
            </div>
          ) : null}
        </form>
      </section>

      <MatchImportPanel fixtures={fixtures} teams={teams} adminEmail={admin?.email ?? ''} />

      <EmailMarketingPanel adminEmail={admin?.email ?? ''} />

      <section className="glass-panel rounded-[1.15rem] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="eyebrow">reveal controls</p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">Control public visibility.</h3>
            <p className="mt-3 max-w-[68ch] text-sm leading-relaxed text-[var(--color-muted)]">
              Participant reveals still work individually. These controls turn on event-level visibility for every active profile, and optionally every submitted squad.
            </p>
          </div>
          <div className="grid gap-2 text-right">
            <span className="mono rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">
              profiles {overview?.eventControls.globalRevealProfiles ? 'public' : 'manual'}
            </span>
            <span className="mono rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">
              squads {overview?.eventControls.globalRevealSquads ? 'public' : 'hidden'}
            </span>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void handleGlobalReveal(false)}
            disabled={revealBusy || overview?.eventControls.globalRevealProfiles}
            className="rounded-full border border-white/12 px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-[1px] hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
          >
            Reveal all profiles
          </button>
          <button
            type="button"
            onClick={() => void handleGlobalReveal(true)}
            disabled={revealBusy || overview?.eventControls.globalRevealSquads}
            className="rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--color-ink)] transition hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
          >
            Reveal all squads
          </button>
          {revealMessage ? <p className="text-sm text-[var(--color-accent)]">{revealMessage}</p> : null}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="glass-panel rounded-[1.15rem] p-4 sm:p-5">
          <p className="eyebrow">teams</p>
          {teamsBusy ? (
            <div className="mt-5 grid gap-3">
              <div className="skeleton h-20 rounded-[1.4rem]" />
              <div className="skeleton h-20 rounded-[1.4rem]" />
              <div className="skeleton h-20 rounded-[1.4rem]" />
            </div>
          ) : null}
          <div className="mt-5 grid gap-2">
            {teams.map((team) => (
              <button
                key={team.code}
                type="button"
                onClick={() => void handleLoadTeamSelections(team.code)}
                className={[
                  'flex w-full items-center justify-between gap-3 rounded-[1.4rem] border px-4 py-3 text-left transition duration-300 ease-out active:scale-[0.99]',
                  team.code === selectedTeamCode
                    ? 'border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10'
                    : 'border-white/8 bg-black/15 hover:border-white/18 hover:bg-white/6',
                ].join(' ')}
              >
                <span className="flex items-center gap-3">
                  <TeamFlag teamCode={team.code} label={team.nameEn} size="sm" />
                  <span>
                    <span className="block text-sm font-medium text-white">{team.nameEn}</span>
                    <span className="mono mt-1 block text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">
                      Group {team.groupKey}
                    </span>
                  </span>
                </span>
                <span className="mono rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  {team.selectedCount}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-panel rounded-[1.15rem] p-4 sm:p-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow">selected team</p>
                <div className="mt-4 flex items-center gap-3">
                  {selectedTeam ? <TeamFlag teamCode={selectedTeam.code} label={selectedTeam.nameEn} size="lg" /> : null}
                  <div>
                    <h3 className="text-3xl font-semibold tracking-tight text-white">{selectedTeam?.nameEn ?? 'Choose a team'}</h3>
                    <p className="mt-2 text-sm text-[var(--color-muted)]">{selections.length} players currently selected</p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saveBusy || !selectedTeamCode || loadedTeamCode !== selectedTeamCode}
                className="rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
              >
                {saveBusy ? 'Saving…' : 'Save team pool'}
              </button>
            </div>

            {panelError ? (
              <div className="mt-5 rounded-[1.3rem] border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-sm text-[var(--color-paper)]">
                {panelError}
              </div>
            ) : null}

            <form onSubmit={handleSearch} className="mt-6 flex flex-col gap-3 sm:flex-row">
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by player name or player ID"
                className="min-h-12 flex-1 rounded-[1.2rem] border border-white/10 bg-black/15 px-4 py-3 text-white outline-none transition focus:border-[var(--color-accent)]"
              />
              <button
                type="submit"
                disabled={searchBusy || !selectedTeamCode}
                className="rounded-full border border-white/12 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-[1px] hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
              >
                {searchBusy ? 'Searching…' : 'Search candidates'}
              </button>
            </form>

            <div className="mt-6 grid gap-3 xl:grid-cols-2">
              <div className="space-y-3">
                <p className="mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-muted)]">search results</p>
                {candidates.length === 0 ? (
                  <EmptyState title="No candidates yet" body="Run a search to pull Soccerverse players into this nation pool." />
                ) : (
                  candidates.map((player) => (
                    <article key={player.playerId} className="rounded-[1.4rem] border border-white/8 bg-black/15 p-4">
                      <div className="flex items-start gap-4">
                        <PlayerPortrait
                          src={player.imageUrl}
                          alt={player.displayName}
                          width={68}
                          height={68}
                          className="h-16 w-16 rounded-[1rem] border border-white/10 object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="truncate text-base font-semibold text-white">{player.displayName}</p>
                              <p className="mt-1 text-sm text-[var(--color-muted)]">ID {player.playerId}</p>
                            </div>
                            <span className="mono rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[var(--color-accent)]">
                              {player.rating}
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {player.positions.map((position) => (
                              <span
                                key={`${player.playerId}-${position}`}
                                className="mono rounded-full border border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]"
                              >
                                {position}
                              </span>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddCandidate(player)}
                            className="mt-4 rounded-full bg-[var(--color-accent)]/12 px-4 py-2 text-xs font-semibold text-[var(--color-accent)] transition hover:-translate-y-[1px] hover:bg-[var(--color-accent)]/18 active:scale-[0.98]"
                          >
                            Add to pool
                          </button>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>

              <div className="space-y-3">
                <p className="mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-muted)]">selected players</p>
                {loadedTeamCode !== selectedTeamCode ? (
                  <EmptyState
                    title="Saved pool not loaded yet"
                    body="Choose a nation from the left and press that team button to load the current saved player pool."
                  />
                ) : selections.length === 0 ? (
                  <EmptyState title="This team is still empty" body="Germany will already contain your first seed list once the backend seed is active." />
                ) : (
                  selections.map((player) => (
                    <article key={player.playerId} className="rounded-[1.4rem] border border-white/8 bg-black/15 p-4">
                      <div className="flex items-start gap-4">
                        <PlayerPortrait
                          src={player.imageUrl}
                          alt={player.displayName}
                          width={68}
                          height={68}
                          className="h-16 w-16 rounded-[1rem] border border-white/10 object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="truncate text-base font-semibold text-white">{player.displayName}</p>
                              <p className="mt-1 text-sm text-[var(--color-muted)]">ID {player.playerId}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setSelections((current) => current.filter((item) => item.playerId !== player.playerId))
                              }
                              className="rounded-full border border-white/12 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white transition hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]"
                            >
                              Remove
                            </button>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {player.positions.map((position) => (
                              <span
                                key={`${player.playerId}-${position}`}
                                className="mono rounded-full border border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]"
                              >
                                {position}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
