import { startTransition, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { PlayerPortrait } from '../components/PlayerPortrait'
import { TeamFlag } from '../components/TeamFlag'
import { TeamSelect } from '../components/TeamSelect'
import { budgetLimit as defaultBudgetLimit, eventTeams, leagueCopy } from '../data/eventConfig'
import {
  assignSquadPlayer,
  fetchParticipantSession,
  fetchParticipantSquad,
  fetchTeamPlayers,
  logoutParticipant,
  lockSquad,
  revealParticipantProfile,
  registerParticipant,
  removeSquadPlayer,
  resendVerificationEmail,
  resetSquad,
  setParticipantPassword,
} from '../lib/api'
import {
  clearParticipantReady,
  readParticipantReady,
  writeParticipantReady,
  type ParticipantReadyState,
} from '../lib/participantReady'
import { withReferral } from '../lib/referral'
import { playUnlockSound } from '../lib/unlockSound'
import type {
  LeagueType,
  LocaleCode,
  ParticipantProfile,
  ParticipantSquad,
  ParticipantSquadSummary,
  TeamPoolPlayer,
} from '../lib/types'

interface BuilderPageProps {
  locale: LocaleCode
  referrerSoccerverseUsername?: string
  mode?: 'builder' | 'register'
}

interface RegistrationFormState {
  mode: LeagueType
  displayName: string
  email: string
  soccerverseUsername: string
  marketingOptIn: boolean
  primaryTeamCode?: string
  secondaryTeamCode?: string
}

interface PasswordFormState {
  password: string
  confirmPassword: string
}

const initialRegistrationForm: RegistrationFormState = {
  mode: 'rookie',
  displayName: '',
  email: '',
  soccerverseUsername: '',
  marketingOptIn: false,
}

const initialPasswordForm: PasswordFormState = {
  password: '',
  confirmPassword: '',
}

function leagueLabel(mode: LeagueType) {
  return leagueCopy[mode]
}

function formatBudget(value: number) {
  return `${value.toLocaleString('en-US')} SVC`
}

function compactSlotLabel(label: string) {
  return label.replace('Starting ', '').replace('Reserve ', 'Sub ')
}

function buildSquadSummaryFromSquad(squad: Pick<ParticipantSquad, 'budgetLimit' | 'budgetUsed' | 'budgetRemaining' | 'isLocked' | 'slots'>): ParticipantSquadSummary {
  return {
    budgetLimit: squad.budgetLimit,
    budgetUsed: squad.budgetUsed,
    budgetRemaining: squad.budgetRemaining,
    draftedCount: squad.slots.filter((slot) => slot.player).length,
    isLocked: squad.isLocked,
  }
}

function buildReadyState(
  participant: ParticipantProfile,
  budgetLimit: number,
  squadSummary?: ParticipantSquadSummary,
): ParticipantReadyState {
  return {
    displayName: participant.displayName,
    email: participant.email,
    leagueType: participant.leagueType,
    budgetLimit: squadSummary?.budgetLimit ?? budgetLimit,
    budgetRemaining: squadSummary?.budgetRemaining,
    budgetUsed: squadSummary?.budgetUsed,
    draftedCount: squadSummary?.draftedCount,
    isLocked: squadSummary?.isLocked,
    hasPassword: participant.hasPassword,
  }
}

function buildPublicProfileUrl(participant: Pick<ParticipantProfile, 'displayName' | 'participantId'>) {
  const slug = participant.displayName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `/profiles/${slug || 'manager'}-${participant.participantId.slice(0, 8)}`
}

export function BuilderPage({ locale: _locale, referrerSoccerverseUsername = '', mode = 'builder' }: BuilderPageProps) {
  void _locale

  const initialReadyState = readParticipantReady()
  const [dashboardSeed, setDashboardSeed] = useState<ParticipantReadyState | null>(initialReadyState)
  const [accessState, setAccessState] = useState<'locked' | 'guest' | 'pending' | 'registered' | 'ready' | 'active'>(() =>
    initialReadyState ? (mode === 'register' ? 'registered' : 'ready') : mode === 'register' ? 'guest' : 'locked',
  )
  const [participant, setParticipant] = useState<ParticipantProfile | null>(null)
  const [budgetLimit, setBudgetLimit] = useState(initialReadyState?.budgetLimit ?? defaultBudgetLimit)
  const [squad, setSquad] = useState<ParticipantSquad | null>(null)
  const [selectedTeamCode, setSelectedTeamCode] = useState<string | undefined>()
  const [loadedTeamCode, setLoadedTeamCode] = useState<string | null>(null)
  const [teamPlayers, setTeamPlayers] = useState<TeamPoolPlayer[]>([])
  const [teamPlayersLoading, setTeamPlayersLoading] = useState(false)
  const [builderError, setBuilderError] = useState<string | null>(null)
  const [publicProfileUrl, setPublicProfileUrl] = useState<string | null>(null)

  const [registrationForm, setRegistrationForm] = useState<RegistrationFormState>(initialRegistrationForm)
  const [registrationBusy, setRegistrationBusy] = useState(false)
  const [registrationError, setRegistrationError] = useState<string | null>(null)
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle')

  const [passwordForm, setPasswordForm] = useState<PasswordFormState>(initialPasswordForm)
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)

  const [sessionBusy, setSessionBusy] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)

  const selectedTeam = useMemo(
    () => eventTeams.find((team) => team.code === selectedTeamCode) ?? null,
    [selectedTeamCode],
  )
  const groupedSquadSlots = useMemo(() => {
    const slots = squad?.slots ?? []
    return {
      starters: slots.filter((slot) => slot.slotGroup === 'starter'),
      subs: slots.filter((slot) => slot.slotGroup === 'sub'),
    }
  }, [squad])

  const draftedCount = useMemo(() => squad?.slots.filter((slot) => slot.player).length ?? 0, [squad])
  const draftedPlayerIds = useMemo(
    () =>
      new Set(
        (squad?.slots ?? [])
          .map((slot) => slot.player?.playerId)
          .filter((playerId): playerId is number => typeof playerId === 'number'),
      ),
    [squad],
  )
  const budgetUsedRatio = squad ? Math.min(100, (squad.budgetUsed / squad.budgetLimit) * 100) : 0
  const socialSharingUnlocked = draftedCount === 15
  const previousDraftedCountRef = useRef<number | null>(null)
  const readyBudgetLabel = dashboardSeed?.budgetRemaining !== undefined ? 'Budget left' : 'Budget'
  const readyBudgetValue = dashboardSeed?.budgetRemaining ?? dashboardSeed?.budgetLimit ?? budgetLimit

  function getOpenEligibleSlots(player: TeamPoolPlayer) {
    if (draftedPlayerIds.has(player.playerId)) {
      return []
    }

    return (squad?.slots ?? []).filter((slot) => !slot.player && player.positionClasses.includes(slot.slotClass))
  }

  useEffect(() => {
    if (!squad) {
      previousDraftedCountRef.current = null
      return
    }

    if (previousDraftedCountRef.current !== null && previousDraftedCountRef.current < 15 && draftedCount === 15) {
      playUnlockSound()
    }

    previousDraftedCountRef.current = draftedCount
  }, [draftedCount, squad])

  function storeReadyState(state: ParticipantReadyState) {
    writeParticipantReady(state)
    setDashboardSeed(state)
    setBudgetLimit(state.budgetLimit)
  }

  function persistReadyState(state: ParticipantReadyState) {
    storeReadyState(state)
  }

  function syncReadyStateWithSquad(nextParticipant: ParticipantProfile | null, nextSquad: ParticipantSquad | null) {
    if (!nextParticipant || !nextSquad) {
      return
    }

    storeReadyState(buildReadyState(nextParticipant, nextSquad.budgetLimit, buildSquadSummaryFromSquad(nextSquad)))
  }

  function clearBuilderState() {
    setParticipant(null)
    setSquad(null)
    setSelectedTeamCode(undefined)
    setLoadedTeamCode(null)
    setTeamPlayers([])
    setPublicProfileUrl(null)
    setBuilderError(null)
  }

  function moveToGuestState() {
    clearParticipantReady()
    setDashboardSeed(null)
    clearBuilderState()
    setPasswordForm(initialPasswordForm)
    setPasswordError(null)
    setPasswordMessage(null)
    setAccessState(mode === 'register' ? 'guest' : 'locked')
  }

  async function handleOpenBuilder() {
    setSessionBusy(true)
    setSessionError(null)

    try {
      const session = await fetchParticipantSession()
      const squadResponse = await fetchParticipantSquad()
      persistReadyState(buildReadyState(session.participant, session.budgetLimit, session.squadSummary))
      syncReadyStateWithSquad(session.participant, squadResponse.squad)
      setParticipant(session.participant)
      setSquad(squadResponse.squad)
      setPublicProfileUrl(session.participant.revealProfile ? buildPublicProfileUrl(session.participant) : null)
      setSelectedTeamCode(session.participant.primaryTeamCode)
      setAccessState('active')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not open the protected builder.'
      if (/session/i.test(message)) {
        moveToGuestState()
        setSessionError('Your browser session expired. Restore access before opening the builder again.')
      } else {
        setSessionError(message)
      }
    } finally {
      setSessionBusy(false)
    }
  }

  async function handleLoadTeamPlayers() {
    if (!selectedTeamCode) {
      return
    }

    setTeamPlayersLoading(true)
    setBuilderError(null)

    try {
      const response = await fetchTeamPlayers(selectedTeamCode)
      startTransition(() => {
        setTeamPlayers(response.items)
      })
      setLoadedTeamCode(selectedTeamCode)
    } catch (error) {
      setBuilderError(error instanceof Error ? error.message : 'Could not load the team pool.')
      setTeamPlayers([])
      setLoadedTeamCode(null)
    } finally {
      setTeamPlayersLoading(false)
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setRegistrationBusy(true)
    setRegistrationError(null)
    setSessionError(null)
    setResendState('idle')

    try {
      if (!registrationForm.primaryTeamCode) {
        throw new Error('Choose a registration country first.')
      }

      const response = await registerParticipant({
        email: registrationForm.email,
        displayName: registrationForm.displayName,
        soccerverseUsername:
          registrationForm.mode === 'veteran' ? registrationForm.soccerverseUsername.trim() || undefined : undefined,
        referrerSoccerverseUsername: referrerSoccerverseUsername || undefined,
        marketingOptIn: registrationForm.marketingOptIn,
        primaryTeamCode: registrationForm.primaryTeamCode,
        secondaryTeamCode: registrationForm.secondaryTeamCode,
      })

      clearParticipantReady()
      setDashboardSeed(null)
      setSubmittedEmail(response.email)
      setAccessState('pending')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed.'
      setRegistrationError(message)
    } finally {
      setRegistrationBusy(false)
    }
  }

  async function handleResend() {
    if (!submittedEmail) {
      return
    }

    setResendState('sending')
    setRegistrationError(null)
    try {
      await resendVerificationEmail(submittedEmail)
      setResendState('sent')
    } catch (error) {
      setRegistrationError(error instanceof Error ? error.message : 'Could not resend the email.')
      setResendState('idle')
    }
  }

  async function handleSetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPasswordError(null)
    setPasswordMessage(null)

    if (passwordForm.password !== passwordForm.confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }

    setPasswordBusy(true)
    try {
      const response = await setParticipantPassword(passwordForm.password)
      persistReadyState(buildReadyState(response.participant, response.budgetLimit, response.squadSummary))
      setParticipant((current) => (current ? response.participant : current))
      setPasswordForm(initialPasswordForm)
      setPasswordMessage('Password saved. You can now sign in from the dedicated login page.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Password could not be saved.'
      if (/session/i.test(message)) {
        moveToGuestState()
        setSessionError('Your browser session expired. Sign in again, then set a password.')
      } else {
        setPasswordError(message)
      }
    } finally {
      setPasswordBusy(false)
    }
  }

  async function handleAssign(slotKey: string, playerId: number) {
    setBuilderError(null)
    try {
      const response = await assignSquadPlayer(slotKey, playerId)
      syncReadyStateWithSquad(participant, response.squad)
      setSquad(response.squad)
    } catch (error) {
      setBuilderError(error instanceof Error ? error.message : 'Player could not be assigned.')
    }
  }

  async function handleRemove(slotKey: string) {
    setBuilderError(null)
    try {
      const response = await removeSquadPlayer(slotKey)
      syncReadyStateWithSquad(participant, response.squad)
      setSquad(response.squad)
    } catch (error) {
      setBuilderError(error instanceof Error ? error.message : 'Player could not be removed.')
    }
  }

  async function handleReset() {
    const approved = window.confirm('Reset this competition squad and restore the full budget?')
    if (!approved) {
      return
    }

    setBuilderError(null)
    try {
      const response = await resetSquad()
      syncReadyStateWithSquad(participant, response.squad)
      setSquad(response.squad)
    } catch (error) {
      setBuilderError(error instanceof Error ? error.message : 'Squad reset failed.')
    }
  }

  async function handleLockSquad() {
    const approved = window.confirm('Lock this competition squad? You will not be able to edit it afterwards.')
    if (!approved) {
      return
    }

    setBuilderError(null)
    try {
      const response = await lockSquad()
      syncReadyStateWithSquad(participant, response.squad)
      setSquad(response.squad)
    } catch (error) {
      setBuilderError(error instanceof Error ? error.message : 'Squad could not be locked.')
    }
  }

  async function handleReveal(revealSquad: boolean) {
    const approved = window.confirm(revealSquad ? 'Reveal your public profile and submitted squad?' : 'Reveal your public profile without showing the squad?')
    if (!approved) {
      return
    }

    setBuilderError(null)
    try {
      const response = await revealParticipantProfile(revealSquad)
      setParticipant(response.participant)
      setPublicProfileUrl(response.publicProfileUrl || buildPublicProfileUrl(response.participant))
    } catch (error) {
      setBuilderError(error instanceof Error ? error.message : 'Profile reveal failed.')
    }
  }

  async function handleSignOut() {
    try {
      await logoutParticipant()
    } finally {
      moveToGuestState()
      setSessionError(null)
      setSubmittedEmail('')
    }
  }

  return (
    <div className="space-y-4 pb-10">
      {accessState === 'locked' ? (
        <section className="hero-card rounded-[1.25rem] px-5 py-6 sm:px-6 lg:px-7">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
              Builder access
            </span>
            <span className="rounded-full border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
              Verification required
            </span>
          </div>
          <h2 className="mt-7 max-w-[11ch] text-[clamp(2.6rem,2.8vw+1rem,4.5rem)] font-semibold leading-[0.94] tracking-[-0.05em] text-white">
            Builder opens after registration.
          </h2>
          <p className="mt-6 max-w-[58ch] text-lg leading-relaxed text-[var(--color-muted)]">
            Create an entry first, confirm the email link, then return here to open your protected squad dashboard.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to={withReferral('/register', referrerSoccerverseUsername)}
              className="premium-button px-7 py-4 text-base font-semibold"
            >
              Register an entry
            </Link>
          </div>
        </section>
      ) : null}

      {accessState === 'guest' ? (
        <section className="grid gap-6">
          <div className="hero-card allow-dropdown-overflow rounded-[1.25rem] px-5 py-6 sm:px-6 lg:px-7">
            <p className="eyebrow">registration workflow</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-sand)]">
                No multi-accounting allowed
              </span>
              <span className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                One email, one hidden squad
              </span>
            </div>
            <h2 className="mt-7 max-w-[10ch] text-[clamp(2.8rem,3vw+1.1rem,5rem)] font-semibold leading-[0.92] tracking-[-0.05em] text-white">
              Register first. Draft after verification.
            </h2>
            <p className="mt-6 max-w-[60ch] text-lg leading-relaxed text-[var(--color-muted)]">
              Pick rookie or veteran, set your countries, confirm your email, then unlock the protected squad builder with the full{' '}
              {formatBudget(budgetLimit)} wage budget.
            </p>

            <form onSubmit={handleRegister} className="mt-8 grid gap-5">
              <div className="grid gap-3 sm:grid-cols-2">
                {(['rookie', 'veteran'] as LeagueType[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() =>
                      setRegistrationForm((current) => ({
                        ...current,
                        mode,
                        soccerverseUsername: mode === 'rookie' ? '' : current.soccerverseUsername,
                      }))
                    }
                    className={[
                      'rounded-[1.7rem] border px-5 py-5 text-left transition duration-300 ease-out active:scale-[0.99]',
                      registrationForm.mode === mode
                        ? 'border-[var(--color-accent)]/35 bg-[rgba(24,180,133,0.12)]'
                        : 'border-white/10 bg-[rgba(8,13,12,0.62)] hover:border-white/16 hover:bg-[rgba(12,18,16,0.8)]',
                    ].join(' ')}
                  >
                    <p className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">{mode}</p>
                    <p className="mt-3 text-lg font-semibold text-white">
                      {mode === 'rookie' ? 'I have no Soccerverse account' : 'I have at least 1 Soccerverse account'}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
                      {mode === 'rookie'
                        ? 'Beginner-friendly entry with no ownership bonus.'
                        : 'Provide your main Soccerverse account and enter the veteran league.'}
                    </p>
                  </button>
                ))}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">Nickname</span>
                  <input
                    required
                    autoComplete="nickname"
                    value={registrationForm.displayName}
                    onChange={(event) =>
                      setRegistrationForm((current) => ({
                        ...current,
                        displayName: event.target.value,
                      }))
                    }
                    placeholder="Display name"
                    className="rounded-[1.2rem] border border-white/10 bg-[rgba(8,13,12,0.72)] px-4 py-3 text-white outline-none transition focus:border-[var(--color-accent)]"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">Email address</span>
                  <input
                    required
                    type="email"
                    autoComplete="email"
                    value={registrationForm.email}
                    onChange={(event) =>
                      setRegistrationForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    placeholder="name@example.com"
                    className="rounded-[1.2rem] border border-white/10 bg-[rgba(8,13,12,0.72)] px-4 py-3 text-white outline-none transition focus:border-[var(--color-accent)]"
                  />
                </label>
              </div>

              {registrationForm.mode === 'veteran' ? (
                <label className="grid gap-2">
                  <span className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">Main Soccerverse account</span>
                  <input
                    required
                    autoComplete="username"
                    value={registrationForm.soccerverseUsername}
                    onChange={(event) =>
                      setRegistrationForm((current) => ({
                        ...current,
                        soccerverseUsername: event.target.value,
                      }))
                    }
                    placeholder="Soccerverse username"
                    className="rounded-[1.2rem] border border-white/10 bg-[rgba(8,13,12,0.72)] px-4 py-3 text-white outline-none transition focus:border-[var(--color-accent)]"
                  />
                </label>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <TeamSelect
                  label="Registration country"
                  teams={eventTeams}
                  value={registrationForm.primaryTeamCode}
                  placeholder="Choose your main country"
                  onChange={(teamCode) =>
                    setRegistrationForm((current) => ({
                      ...current,
                      primaryTeamCode: teamCode,
                      secondaryTeamCode: current.secondaryTeamCode === teamCode ? undefined : current.secondaryTeamCode,
                    }))
                  }
                />
                <TeamSelect
                  label="Secondary country"
                  teams={eventTeams}
                  value={registrationForm.secondaryTeamCode}
                  placeholder="Optional second country"
                  excludeTeamCode={registrationForm.primaryTeamCode}
                  onChange={(teamCode) =>
                    setRegistrationForm((current) => ({
                      ...current,
                      secondaryTeamCode: teamCode,
                    }))
                  }
                />
              </div>

              <label className="flex items-start gap-3 rounded-[1.2rem] border border-white/10 bg-[rgba(8,13,12,0.62)] px-4 py-3 text-sm leading-relaxed text-[var(--color-muted)]">
                <input
                  type="checkbox"
                  checked={registrationForm.marketingOptIn}
                  onChange={(event) =>
                    setRegistrationForm((current) => ({
                      ...current,
                      marketingOptIn: event.target.checked,
                    }))
                  }
                  className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-accent)]"
                />
                <span>
                  I want to receive Soccerverse World Cup news, reminders, and event updates by email. I can unsubscribe any time.
                </span>
              </label>

              {registrationError ? (
                <div className="rounded-[1.3rem] border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-sm text-[var(--color-paper)]">
                  {registrationError}
                </div>
              ) : null}
              {sessionError ? (
                <div className="rounded-[1.3rem] border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-sm text-[var(--color-paper)]">
                  {sessionError}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={registrationBusy}
                className="inline-flex w-fit items-center rounded-full bg-[var(--color-accent)] px-8 py-4 text-base font-semibold text-[var(--color-ink)] shadow-[0_20px_30px_-20px_rgba(24,180,133,0.8)] transition hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
              >
                {registrationBusy ? 'Submitting registration…' : 'Register and send confirmation email'}
              </button>
            </form>
          </div>

        </section>
      ) : null}

      {accessState === 'pending' ? (
        <section className="grid gap-6 lg:grid-cols-[1.04fr_0.96fr]">
          <div className="hero-card rounded-[1.25rem] px-5 py-6 sm:px-6">
            <p className="eyebrow">step 2 · verify email</p>
            <h2 className="mt-6 max-w-[11ch] text-[clamp(2.6rem,2.8vw+1rem,4.4rem)] font-semibold leading-[0.94] tracking-[-0.05em] text-white">
              Confirm the link to unlock the budget.
            </h2>
            <p className="mt-6 max-w-[56ch] text-lg leading-relaxed text-[var(--color-muted)]">
              We sent the access link to <span className="font-medium text-white">{submittedEmail}</span>. Once you open it, your
              participant session becomes active and the protected dashboard is ready.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleResend}
                disabled={resendState === 'sending'}
                className="rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
              >
                {resendState === 'sending' ? 'Sending…' : resendState === 'sent' ? 'Email sent again' : 'Resend verification email'}
              </button>
              <button
                type="button"
                onClick={() => setAccessState('guest')}
                className="rounded-full border border-white/12 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]"
              >
                Back to registration
              </button>
            </div>

            {registrationError ? (
              <div className="mt-6 rounded-[1.3rem] border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-sm text-[var(--color-paper)]">
                {registrationError}
              </div>
            ) : null}
          </div>

          <div className="grid gap-4">
            <div className="glass-panel rounded-[1.15rem] p-4 sm:p-5">
              <p className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">what happens next</p>
              <div className="mt-5 space-y-3">
                {[
                  ['1', 'Open the email', 'Use the verification link from the same device if possible.'],
                  ['2', 'Land on the dashboard', 'The confirmation page stores your verified participant state locally.'],
                  ['3', 'Start the builder', 'Your protected squad and session only load after the CTA press.'],
                ].map(([step, title, body]) => (
                  <div key={step} className="rounded-[1.4rem] border border-white/8 bg-[rgba(8,13,12,0.68)] px-4 py-4">
                    <div className="flex items-center gap-3">
                      <span className="mono inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/10 text-[11px] uppercase tracking-[0.18em] text-[var(--color-accent)]">
                        {step}
                      </span>
                      <p className="text-base font-semibold text-white">{title}</p>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">{body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {accessState === 'registered' && dashboardSeed ? (
        <section className="hero-card rounded-[1.25rem] px-5 py-6 sm:px-6 lg:px-7">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/12 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
              Entry active
            </span>
            <span className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
              {leagueLabel(dashboardSeed.leagueType)}
            </span>
          </div>
          <h2 className="mt-7 max-w-[12ch] text-[clamp(2.4rem,2.4vw+1rem,4rem)] font-semibold leading-[0.94] tracking-[-0.05em] text-white">
            Your entry is already registered.
          </h2>
          <p className="mt-6 max-w-[56ch] text-lg leading-relaxed text-[var(--color-muted)]">
            Continue to the Builder tab to open the protected squad dashboard for{' '}
            <span className="font-semibold text-white">{dashboardSeed.displayName}</span>.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to={withReferral('/builder', referrerSoccerverseUsername)}
              className="premium-button px-7 py-4 text-base font-semibold"
            >
              Open builder
            </Link>
            <Link
              to={withReferral('/tables', referrerSoccerverseUsername)}
              className="inline-flex items-center rounded-full border border-white/12 px-6 py-4 text-base font-semibold text-white transition hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]"
            >
              View public tables
            </Link>
          </div>
        </section>
      ) : null}

      {accessState === 'ready' && dashboardSeed ? (
        <section>
          <div className="hero-card rounded-[1.25rem] px-5 py-6 sm:px-6 lg:px-7">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/12 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
                Verified
              </span>
              <span className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                {leagueLabel(dashboardSeed.leagueType)}
              </span>
              <span className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                Hidden squad entry
              </span>
            </div>

            <div className="mt-7 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
              <div>
                <p className="eyebrow">participant dashboard</p>
                <h2 className="mt-4 max-w-[16ch] text-[clamp(2.1rem,1.6vw+1rem,3.35rem)] font-semibold leading-[0.95] tracking-[-0.045em] text-white">
                  Your entry is live. The draft starts when you do.
                </h2>
                <p className="mt-4 max-w-[58ch] text-base leading-relaxed text-[var(--color-muted)]">
                  Welcome back, <span className="font-semibold text-white">{dashboardSeed.displayName}</span>. Your email is confirmed,
                  your budget is reserved, and the protected builder only opens after your main CTA.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void handleOpenBuilder()}
                    disabled={sessionBusy}
                    className="premium-button px-6 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {sessionBusy ? 'Opening builder…' : 'Start building my squad'}
                  </button>
                  <Link
                    to={withReferral('/tables', referrerSoccerverseUsername)}
                    className="inline-flex items-center rounded-full border border-white/12 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]"
                  >
                    View public tables
                  </Link>
                </div>

                {sessionError ? (
                  <div className="mt-6 rounded-[1.3rem] border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-sm text-[var(--color-paper)]">
                    {sessionError}
                  </div>
                ) : null}

                <div className="data-strip mt-6 max-w-[34rem]">
                  <div>
                    <p className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">Status</p>
                    <p className="mt-2 text-sm font-semibold text-white">Verified</p>
                  </div>
                  <div>
                    <p className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">League</p>
                    <p className="mt-2 text-sm font-semibold text-white">{leagueLabel(dashboardSeed.leagueType)}</p>
                  </div>
                  <div>
                    <p className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">{readyBudgetLabel}</p>
                    <p className="mono mt-2 text-sm font-semibold text-[var(--color-accent)]">{formatBudget(readyBudgetValue)}</p>
                    {dashboardSeed.budgetUsed !== undefined ? (
                      <p className="mt-1 text-xs text-[var(--color-muted)]">{formatBudget(dashboardSeed.budgetUsed)} used</p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="surface-row rounded-[1rem] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <p className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">account snapshot</p>
                  <div className="mt-5 grid gap-3">
                    <div className="rounded-[0.95rem] border border-white/8 bg-[rgba(255,255,255,0.03)] px-4 py-3">
                      <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">Nickname</p>
                      <p className="mt-2 text-lg font-semibold text-white">{dashboardSeed.displayName}</p>
                    </div>
                    <div className="rounded-[0.95rem] border border-white/8 bg-[rgba(255,255,255,0.03)] px-4 py-3">
                      <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">Email</p>
                      <p className="mt-2 break-all text-sm font-medium text-white">{dashboardSeed.email}</p>
                    </div>
                    <div className="grid gap-3">
                      <div className="rounded-[0.95rem] border border-white/8 bg-[rgba(255,255,255,0.03)] px-4 py-3">
                        <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">League</p>
                        <p className="mt-2 text-base font-semibold text-white">{leagueLabel(dashboardSeed.leagueType)}</p>
                      </div>
                      <div className="rounded-[0.95rem] border border-white/8 bg-[rgba(255,255,255,0.03)] px-4 py-3">
                        <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">{readyBudgetLabel}</p>
                        <p className="mt-2 text-base font-semibold text-[var(--color-accent)]">{formatBudget(readyBudgetValue)}</p>
                        {dashboardSeed.budgetUsed !== undefined ? (
                          <p className="mt-1 text-xs text-[var(--color-muted)]">
                            {formatBudget(dashboardSeed.budgetUsed)} used
                            {dashboardSeed.draftedCount !== undefined ? ` · ${dashboardSeed.draftedCount}/15 filled` : ''}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="surface-row rounded-[1rem] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">security</p>
                      <h3 className="mt-3 max-w-[16rem] text-xl font-semibold tracking-tight text-white">
                        {dashboardSeed.hasPassword ? 'Password login is active' : 'Set a password for later sign-ins'}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleSignOut()}
                      className="whitespace-nowrap rounded-full border border-white/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]"
                    >
                      Sign out
                    </button>
                  </div>

                  {!dashboardSeed.hasPassword ? (
                    <form onSubmit={handleSetPassword} className="mt-5 grid gap-4">
                      <p className="text-sm leading-relaxed text-[var(--color-muted)]">
                        This browser session is already verified. Add a password now so you can return later through the dedicated login
                        screen.
                      </p>
                      <div className="grid gap-3 2xl:grid-cols-2">
                        <label className="grid gap-2">
                          <span className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">New password</span>
                          <input
                            required
                            type="password"
                            minLength={8}
                            autoComplete="new-password"
                            value={passwordForm.password}
                            onChange={(event) =>
                              setPasswordForm((current) => ({
                                ...current,
                                password: event.target.value,
                              }))
                            }
                            className="min-w-0 rounded-[0.95rem] border border-white/10 bg-[rgba(255,255,255,0.03)] px-4 py-3 text-white outline-none transition focus:border-[var(--color-accent)]"
                          />
                        </label>
                        <label className="grid gap-2">
                          <span className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">Repeat password</span>
                          <input
                            required
                            type="password"
                            minLength={8}
                            autoComplete="new-password"
                            value={passwordForm.confirmPassword}
                            onChange={(event) =>
                              setPasswordForm((current) => ({
                                ...current,
                                confirmPassword: event.target.value,
                              }))
                            }
                            className="min-w-0 rounded-[0.95rem] border border-white/10 bg-[rgba(255,255,255,0.03)] px-4 py-3 text-white outline-none transition focus:border-[var(--color-accent)]"
                          />
                        </label>
                      </div>

                      {passwordError ? (
                        <div className="rounded-[1.3rem] border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-sm text-[var(--color-paper)]">
                          {passwordError}
                        </div>
                      ) : null}
                      {passwordMessage ? (
                        <div className="rounded-[1.3rem] border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/10 px-4 py-3 text-sm text-[var(--color-paper)]">
                          {passwordMessage}
                        </div>
                      ) : null}

                      <button
                        type="submit"
                        disabled={passwordBusy}
                        className="inline-flex w-fit items-center rounded-full border border-white/12 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-[1px] hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
                      >
                        {passwordBusy ? 'Saving password…' : 'Save password access'}
                      </button>
                    </form>
                  ) : (
                    <div className="mt-5 rounded-[1.4rem] border border-white/8 bg-[rgba(255,255,255,0.03)] px-4 py-4">
                      <p className="text-sm leading-relaxed text-[var(--color-muted)]">
                        You can sign in later from the Login screen with your email and password, or request a recovery link if you lose
                        access.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {accessState === 'active' && participant && squad ? (
        <section className="space-y-4">
          <div className="hero-card rounded-[1.15rem] px-4 py-5 sm:px-5">
            <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/12 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
                    Builder unlocked
                  </span>
                  <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                    {leagueLabel(participant.leagueType)}
                  </span>
                  <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                    {draftedCount}/15 selected
                  </span>
                  {squad.isLocked ? (
                    <span className="rounded-full border border-[var(--color-sand)]/30 bg-[var(--color-sand)]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-sand)]">
                      Squad locked
                    </span>
                  ) : null}
                </div>

                <p className="eyebrow mt-5">step 3 · squad builder</p>
                <h2 className="mt-3 max-w-[13ch] text-[clamp(2rem,1.7vw+1rem,3.25rem)] font-semibold leading-[0.96] tracking-[-0.045em] text-white">
                  Draft the one hidden squad that counts.
                </h2>
                <p className="mt-4 max-w-[58ch] text-sm leading-7 text-[var(--color-muted)]">
                  Verified as <span className="font-medium text-white">{participant.displayName}</span>. Load one team pool at a time,
                  build your competition squad once, and stay under the fixed {formatBudget(squad.budgetLimit)} cap.
                  {squad.isLocked ? ' This squad is now locked and cannot be edited.' : ''}
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-[1.05fr_0.95fr] lg:grid-cols-1 xl:grid-cols-[1.05fr_0.95fr]">
                <div className="surface-row rounded-[0.9rem] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted)]">account</p>
                      <p className="mt-2 text-base font-semibold text-white">{participant.displayName}</p>
                      <p className="mt-1 break-all text-xs text-[var(--color-muted)]">{participant.email}</p>
                      {participant.soccerverseUsername ? (
                        <p className="mt-1 text-xs text-[var(--color-muted)]">Main Soccerverse account: {participant.soccerverseUsername}</p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleSignOut()}
                      className="rounded-full border border-white/12 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white transition hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]"
                    >
                      Sign out
                    </button>
                  </div>
                </div>

                <div className="surface-row rounded-[0.9rem] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <p className="mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted)]">draft progress</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-[0.85rem] border border-white/8 bg-[rgba(255,255,255,0.03)] px-3 py-3">
                      <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">Budget left</p>
                      <p className="mt-1 text-lg font-semibold tracking-tight text-[var(--color-accent)]">
                        {formatBudget(squad.budgetRemaining)}
                      </p>
                    </div>
                    <div className="rounded-[0.85rem] border border-white/8 bg-[rgba(255,255,255,0.03)] px-3 py-3">
                      <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">Slots filled</p>
                      <p className="mt-1 text-lg font-semibold tracking-tight text-white">{draftedCount} / 15</p>
                    </div>
                  </div>
                  {socialSharingUnlocked ? (
                    <div className="mt-4 rounded-[1.4rem] border border-[var(--color-accent)]/24 bg-[var(--color-accent)]/10 px-4 py-4">
                      <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-accent)]">share status</p>
                      <p className="mt-2 text-base font-semibold text-white">Social sharing unlocked.</p>
                      <p className="mt-1 text-sm text-[var(--color-muted)]">
                        Your competition squad is complete. Lock it once before kickoff, then it carries the whole event.
                      </p>
                      <div className="mt-4">
                        <Link
                          to="/builder/share"
                          className="inline-flex rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:-translate-y-[1px] active:scale-[0.98]"
                        >
                          Open share page
                        </Link>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.12fr_0.88fr]">
            <div className="space-y-4">
              <div className="glass-panel rounded-[1.15rem] p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="eyebrow">team pool</p>
                    <h3 className="mt-2 text-xl font-semibold tracking-tight text-white sm:text-2xl">Scouting board</h3>
                  </div>
                  {selectedTeam ? (
                    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-[rgba(8,13,12,0.7)] px-3 py-1.5">
                      <TeamFlag teamCode={selectedTeam.code} label={selectedTeam.nameEn} size="sm" />
                      <span className="text-xs font-medium text-white">{selectedTeam.nameEn}</span>
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 max-w-xl">
                  <TeamSelect
                    label="World Cup team"
                    teams={eventTeams}
                    value={selectedTeamCode}
                    placeholder="Select a World Cup team"
                    onChange={(teamCode) => {
                      setSelectedTeamCode(teamCode)
                      setLoadedTeamCode(null)
                      setTeamPlayers([])
                      setBuilderError(null)
                    }}
                  />
                </div>

                <div className="mt-3 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void handleLoadTeamPlayers()}
                    disabled={teamPlayersLoading || !selectedTeamCode}
                    className="rounded-full bg-[var(--color-accent)] px-4 py-2.5 text-xs font-semibold text-[var(--color-ink)] transition hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
                  >
                    {teamPlayersLoading ? 'Loading team pool…' : 'Load selected team pool'}
                  </button>
                  <p className="self-center text-xs text-[var(--color-muted)]">No request is sent until you load the team.</p>
                </div>

                {builderError ? (
                  <div className="mt-4 rounded-[0.9rem] border border-amber-300/20 bg-amber-300/8 px-3 py-2.5 text-sm text-[var(--color-paper)]">
                    {builderError}
                  </div>
                ) : null}

                {teamPlayersLoading ? (
                  <div className="mt-4 space-y-2">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div key={index} className="skeleton h-20 rounded-[0.85rem]" />
                    ))}
                  </div>
                ) : null}

                {!teamPlayersLoading && !selectedTeamCode ? (
                  <div className="mt-6">
                    <EmptyState title="No team selected yet" body="Pick a World Cup team from the dropdown to load the preselected player pool." />
                  </div>
                ) : null}

                {!teamPlayersLoading && selectedTeamCode && loadedTeamCode !== selectedTeamCode ? (
                  <div className="mt-6">
                    <EmptyState title="Team pool is waiting" body="Choose a nation, then press load to fetch its preselected World Cup squad." />
                  </div>
                ) : null}

                {!teamPlayersLoading && selectedTeamCode && loadedTeamCode === selectedTeamCode && teamPlayers.length === 0 ? (
                  <div className="mt-6">
                    <EmptyState
                      title="This team pool is still empty"
                      body="An admin still has to preselect the eligible World Cup squad for this nation before participants can draft from it."
                    />
                  </div>
                ) : null}

                {teamPlayers.length > 0 ? (
                  <div className="mt-4 max-h-[44rem] space-y-2 overflow-y-auto pr-1">
                    {teamPlayers.map((player) => {
                      const isAlreadyDrafted = draftedPlayerIds.has(player.playerId)
                      const openSlots = getOpenEligibleSlots(player)
                      return (
                        <article
                          key={player.playerId}
                          className="surface-row rounded-[0.85rem] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:bg-white/5"
                        >
                          <div className="grid gap-3 xl:grid-cols-[minmax(16rem,1fr)_minmax(0,35rem)] xl:items-center">
                            <div className="flex min-w-0 items-center gap-3">
                              <PlayerPortrait
                                src={player.imageUrl}
                                alt={player.displayName}
                                width={56}
                                height={56}
                                className="h-14 w-14 shrink-0 rounded-[0.8rem] border border-white/10 object-cover"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex min-w-0 items-center gap-2">
                                  <p className="truncate text-sm font-semibold text-white">{player.displayName}</p>
                                  <span className="mono shrink-0 rounded-full border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/8 px-2 py-0.5 text-[11px] text-[var(--color-accent)]">
                                    {player.rating}
                                  </span>
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                                  <span className="mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">
                                    ID {player.playerId}
                                  </span>
                                  <span className="mono text-[10px] uppercase tracking-[0.12em] text-white/80">
                                    {formatBudget(player.capCost)}
                                  </span>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {player.positions.map((positionCode) => (
                                    <span
                                      key={`${player.playerId}-${positionCode}`}
                                      className="mono rounded-full border border-white/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] text-[var(--color-muted)]"
                                    >
                                      {positionCode}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className="flex min-w-0 flex-wrap gap-1.5 xl:justify-end">
                              {squad.isLocked ? (
                                <span className="rounded-full border border-[var(--color-sand)]/20 bg-[var(--color-sand)]/8 px-2.5 py-1.5 text-[11px] text-[var(--color-sand)]">
                                  Squad locked
                                </span>
                              ) : isAlreadyDrafted ? (
                                <span className="rounded-full border border-[var(--color-accent)]/24 bg-[var(--color-accent)]/10 px-2.5 py-1.5 text-[11px] text-[var(--color-accent)]">
                                  Already in squad
                                </span>
                              ) : openSlots.length === 0 ? (
                                <span className="rounded-full border border-white/10 px-2.5 py-1.5 text-[11px] text-[var(--color-muted)]">
                                  No eligible slot
                                </span>
                              ) : (
                                openSlots.map((slot) => (
                                  <button
                                    key={`${player.playerId}-${slot.key}`}
                                    type="button"
                                    aria-label={`Add ${player.displayName} to ${slot.label}`}
                                    title={`Add to ${slot.label}`}
                                    onClick={() => void handleAssign(slot.key, player.playerId)}
                                    className="rounded-full border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/10 px-2.5 py-1.5 text-[11px] font-semibold text-[var(--color-accent)] transition hover:-translate-y-[1px] hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/15 active:scale-[0.98]"
                                  >
                                    + {compactSlotLabel(slot.label)}
                                  </button>
                                ))
                              )}
                            </div>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-4">
              <div className="glass-panel rounded-[1.15rem] p-4">
                <p className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">budget monitor</p>
                <div className="mt-4 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-2xl font-semibold tracking-tight text-[var(--color-accent)]">{formatBudget(squad.budgetRemaining)}</p>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">Remaining of {formatBudget(squad.budgetLimit)}</p>
                  </div>
                  <div className="rounded-full border border-white/10 px-3 py-1.5">
                    <span className="mono text-xs text-white">{formatBudget(squad.budgetUsed)} used</span>
                  </div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/6">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-accent),#d7a85b)] transition-all duration-300"
                    style={{ width: `${budgetUsedRatio}%` }}
                  />
                </div>
              </div>

              <div className="glass-panel rounded-[1.15rem] p-4">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">current squad</p>
                    <h3 className="mt-2 text-xl font-semibold tracking-tight text-white">4-3-3 starters + 4 locked subs</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleReset()}
                    disabled={squad.isLocked}
                    className="rounded-full border border-white/12 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white transition hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]"
                  >
                    Reset
                  </button>
                </div>

                <div className="mt-4 rounded-[1rem] border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/10 px-3 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {squad.isLocked ? 'Squad locked' : 'Ready to lock your squad?'}
                      </p>
                      <p className="mt-1 text-xs leading-6 text-[var(--color-muted)]">
                        {squad.isLocked
                          ? 'This competition squad is immutable unless an admin unlock flow is added later.'
                          : 'Fill all 15 slots, then lock the squad for the full competition.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleLockSquad()}
                      disabled={squad.isLocked || draftedCount !== 15}
                      className="rounded-full bg-[var(--color-accent)] px-4 py-2 text-xs font-semibold text-[var(--color-ink)] transition hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
                    >
                      {squad.isLocked ? 'Locked' : 'Lock squad'}
                    </button>
                  </div>
                </div>

                {squad.isLocked ? (
                  <div className="mt-4 rounded-[1.4rem] border border-white/10 bg-black/15 px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {participant?.revealProfile ? 'Public profile is live' : 'Ready to share?'}
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted)]">
                          {participant?.revealSquad
                            ? 'Your submitted squad is visible on your public profile.'
                            : 'Reveal the profile first, then choose whether the locked squad should also be public.'}
                        </p>
                        {publicProfileUrl ? (
                          <Link to={publicProfileUrl} className="mt-3 inline-flex text-sm font-semibold text-[var(--color-accent)]">
                            Open public profile
                          </Link>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void handleReveal(false)}
                          disabled={participant?.revealProfile}
                          className="rounded-full border border-white/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:-translate-y-[1px] hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
                        >
                          Reveal profile
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleReveal(true)}
                          disabled={participant?.revealSquad}
                          className="rounded-full bg-[var(--color-accent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-ink)] transition hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
                        >
                          Reveal squad
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="mt-5 space-y-4">
                  <div className="space-y-2">
                    <p className="mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-muted)]">starters</p>
                    {groupedSquadSlots.starters.map((slot) => (
                      <div key={slot.key} className="rounded-[0.85rem] border border-white/8 bg-[rgba(8,13,12,0.74)] px-3 py-2.5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold text-white">{slot.label}</p>
                            <p className="mono mt-1 text-[9px] uppercase tracking-[0.18em] text-[var(--color-muted)]">{slot.slotClass}</p>
                          </div>
                          {slot.player && !squad.isLocked ? (
                            <button
                              type="button"
                              onClick={() => void handleRemove(slot.key)}
                              className="rounded-full border border-white/12 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white transition hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]"
                            >
                              Delete
                            </button>
                          ) : null}
                        </div>
                        {slot.player ? (
                          <div className="mt-2 flex items-center gap-2.5">
                            <PlayerPortrait
                              src={slot.player.imageUrl}
                              alt={slot.player.displayName}
                              width={44}
                              height={44}
                              className="h-11 w-11 rounded-[0.75rem] border border-white/10 object-cover"
                            />
                            <div className="min-w-0">
                              <p className="truncate text-xs font-medium text-white">{slot.player.displayName}</p>
                              <p className="mt-1 text-[11px] text-[var(--color-muted)]">{formatBudget(slot.player.capCost)}</p>
                            </div>
                          </div>
                        ) : (
                          <p className="mt-2 text-xs text-[var(--color-muted)]">Empty slot</p>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <p className="mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-muted)]">subs</p>
                    {groupedSquadSlots.subs.map((slot) => (
                      <div key={slot.key} className="rounded-[0.85rem] border border-white/8 bg-[rgba(8,13,12,0.74)] px-3 py-2.5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold text-white">{slot.label}</p>
                            <p className="mono mt-1 text-[9px] uppercase tracking-[0.18em] text-[var(--color-muted)]">{slot.slotClass}</p>
                          </div>
                          {slot.player && !squad.isLocked ? (
                            <button
                              type="button"
                              onClick={() => void handleRemove(slot.key)}
                              className="rounded-full border border-white/12 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white transition hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]"
                            >
                              Delete
                            </button>
                          ) : null}
                        </div>
                        {slot.player ? (
                          <div className="mt-2 flex items-center gap-2.5">
                            <PlayerPortrait
                              src={slot.player.imageUrl}
                              alt={slot.player.displayName}
                              width={44}
                              height={44}
                              className="h-11 w-11 rounded-[0.75rem] border border-white/10 object-cover"
                            />
                            <div className="min-w-0">
                              <p className="truncate text-xs font-medium text-white">{slot.player.displayName}</p>
                              <p className="mt-1 text-[11px] text-[var(--color-muted)]">{formatBudget(slot.player.capCost)}</p>
                            </div>
                          </div>
                        ) : (
                          <p className="mt-2 text-xs text-[var(--color-muted)]">Empty slot</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}
