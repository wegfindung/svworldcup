import { startTransition, useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { PlayerPortrait } from '../components/PlayerPortrait'
import { TeamFlag } from '../components/TeamFlag'
import { TeamSelect } from '../components/TeamSelect'
import { budgetLimit as defaultBudgetLimit, budgetOptions, eventTeams, getBudgetScoreMultiplier, leagueCopy } from '../data/eventConfig'
import { useBootstrap } from '../hooks/useBootstrap'
import {
  ApiError,
  assignSquadPlayer,
  fetchParticipantSession,
  fetchParticipantSquad,
  fetchTeamPlayers,
  linkSoccerverseAccount,
  logoutParticipant,
  lockSquad,
  revealParticipantProfile,
  registerParticipant,
  removeSquadPlayer,
  resendVerificationEmail,
  resetSquad,
  setParticipantPassword,
  updateSquadBudget,
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
  FixtureSeed,
  ParticipantProfile,
  ParticipantSquad,
  ParticipantSquadSummary,
  SlotClass,
  SquadSlotState,
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
  return `${value.toLocaleString(undefined)} SVC`
}

function formatMultiplier(value: number) {
  return `x${value.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: value % 1 === 0 ? 0 : 2 })}`
}

function compactSlotLabel(label: string) {
  return label.replace('Starting ', '').replace('Reserve ', 'Sub ')
}

const slotClassOrder: SlotClass[] = ['GK', 'DEF', 'MID', 'FWD']

const slotClassCopy: Record<SlotClass, { label: string; pickLabel: string }> = {
  GK: { label: 'Goalkeepers', pickLabel: 'Pick a goalkeeper' },
  DEF: { label: 'Defenders', pickLabel: 'Pick a defender' },
  MID: { label: 'Midfielders', pickLabel: 'Pick a midfielder' },
  FWD: { label: 'Forwards', pickLabel: 'Pick a forward' },
}

function getNextDraftSlotKey(squad: ParticipantSquad, currentSlotKey?: string | null) {
  const slots = squad.slots
  if (currentSlotKey) {
    const currentIndex = slots.findIndex((slot) => slot.key === currentSlotKey)
    const nextEmptySlot = slots.slice(Math.max(0, currentIndex + 1)).find((slot) => !slot.player) ?? slots.find((slot) => !slot.player)
    if (nextEmptySlot) {
      return nextEmptySlot.key
    }
  }

  return slots.find((slot) => !slot.player)?.key ?? slots[0]?.key ?? null
}

function getSlotKeyForClass(squad: ParticipantSquad, slotClass: SlotClass) {
  const classSlots = squad.slots.filter((slot) => slot.slotClass === slotClass)
  return classSlots.find((slot) => !slot.player)?.key ?? classSlots[0]?.key ?? null
}

function playerMatchesSearch(player: TeamPoolPlayer, searchTerm: string) {
  const query = searchTerm.trim().toLowerCase()
  if (!query) {
    return true
  }

  return (
    player.displayName.toLowerCase().includes(query) ||
    String(player.playerId).includes(query) ||
    player.positions.some((position) => position.toLowerCase().includes(query))
  )
}

function buildSquadSummaryFromSquad(
  squad: Pick<ParticipantSquad, 'budgetLimit' | 'scoreMultiplier' | 'budgetUsed' | 'budgetRemaining' | 'isLocked' | 'slots'>,
): ParticipantSquadSummary {
  return {
    budgetLimit: squad.budgetLimit,
    scoreMultiplier: squad.scoreMultiplier,
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
    scoreMultiplier: squadSummary?.scoreMultiplier ?? getBudgetScoreMultiplier(squadSummary?.budgetLimit ?? budgetLimit),
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

function getCompetitionStartEpoch(fixtures: FixtureSeed[]) {
  const kickoffEpochs = fixtures
    .map((fixture) => new Date(`${fixture.kickoffDate}T${fixture.kickoffTimeUtc}Z`).getTime())
    .filter((epoch) => Number.isFinite(epoch))

  return kickoffEpochs.length ? Math.min(...kickoffEpochs) : null
}

export function BuilderPage({ locale: _locale, referrerSoccerverseUsername = '', mode = 'builder' }: BuilderPageProps) {
  void _locale
  const { data: bootstrap } = useBootstrap()

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
  const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null)
  const [playerSearch, setPlayerSearch] = useState('')
  const [builderError, setBuilderError] = useState<string | null>(null)
  const [publicProfileUrl, setPublicProfileUrl] = useState<string | null>(null)
  const [budgetMenuOpen, setBudgetMenuOpen] = useState(false)

  const [registrationForm, setRegistrationForm] = useState<RegistrationFormState>(initialRegistrationForm)
  const [registrationBusy, setRegistrationBusy] = useState(false)
  const [registrationError, setRegistrationError] = useState<string | null>(null)
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle')

  const [passwordForm, setPasswordForm] = useState<PasswordFormState>(initialPasswordForm)
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)

  const [linkUsername, setLinkUsername] = useState('')
  const [linkBusy, setLinkBusy] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [linkMessage, setLinkMessage] = useState<string | null>(null)

  const [sessionBusy, setSessionBusy] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [competitionStarted, setCompetitionStarted] = useState(false)

  const selectedTeam = useMemo(
    () => eventTeams.find((team) => team.code === selectedTeamCode) ?? null,
    [selectedTeamCode],
  )
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
  const selectedSlot = useMemo(() => {
    const slots = squad?.slots ?? []
    return slots.find((slot) => slot.key === selectedSlotKey) ?? slots.find((slot) => !slot.player) ?? slots[0] ?? null
  }, [selectedSlotKey, squad])
  const squadSlotBuckets = useMemo(
    () =>
      slotClassOrder
        .map((slotClass) => ({
          slotClass,
          ...slotClassCopy[slotClass],
          slots: (squad?.slots ?? []).filter((slot) => slot.slotClass === slotClass),
        }))
        .filter((bucket) => bucket.slots.length > 0),
    [squad],
  )
  const visibleTeamPlayers = useMemo(() => {
    return teamPlayers.filter((player) => {
      if (selectedSlot && !player.positionClasses.includes(selectedSlot.slotClass)) {
        return false
      }

      if (draftedPlayerIds.has(player.playerId)) {
        return false
      }

      return playerMatchesSearch(player, playerSearch)
    })
  }, [draftedPlayerIds, playerSearch, selectedSlot, teamPlayers])
  const budgetUsedRatio = squad ? Math.min(100, (squad.budgetUsed / squad.budgetLimit) * 100) : 0
  const activeScoreMultiplier = squad?.scoreMultiplier ?? getBudgetScoreMultiplier(budgetLimit)
  const competitionStart = useMemo(() => getCompetitionStartEpoch(bootstrap?.fixtures ?? []), [bootstrap?.fixtures])
  const canEditSquad = !squad?.isLocked || !competitionStarted
  const socialSharingUnlocked = draftedCount === 15
  const totalSlotCount = squad?.slots.length ?? 15
  const draftCompletionRatio = Math.round((draftedCount / Math.max(totalSlotCount, 1)) * 100)
  const selectedSlotLabel = selectedSlot ? compactSlotLabel(selectedSlot.label) : 'No slot selected'
  const previousDraftedCountRef = useRef<number | null>(null)
  const readyBudgetLabel = dashboardSeed?.budgetRemaining !== undefined ? 'Budget left' : 'Budget'
  const readyBudgetValue = dashboardSeed?.budgetRemaining ?? dashboardSeed?.budgetLimit ?? budgetLimit

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

  useEffect(() => {
    let active = true

    function updateCompetitionStarted() {
      if (!active) {
        return
      }

      setCompetitionStarted(competitionStart !== null && Date.now() >= competitionStart)
    }

    const immediate = window.setTimeout(updateCompetitionStarted, 0)
    const interval = window.setInterval(updateCompetitionStarted, 60_000)

    return () => {
      active = false
      window.clearTimeout(immediate)
      window.clearInterval(interval)
    }
  }, [competitionStart])

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
    setSelectedSlotKey(null)
    setPlayerSearch('')
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
      setSelectedSlotKey(getNextDraftSlotKey(squadResponse.squad))
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

  const loadTeamPlayersForCode = useCallback(async (teamCode: string) => {
    setTeamPlayersLoading(true)
    setBuilderError(null)

    try {
      const response = await fetchTeamPlayers(teamCode)
      startTransition(() => {
        setTeamPlayers(response.items)
      })
      setLoadedTeamCode(teamCode)
      setPlayerSearch('')
    } catch (error) {
      setBuilderError(error instanceof Error ? error.message : 'Could not load the team pool.')
      setTeamPlayers([])
      setLoadedTeamCode(null)
    } finally {
      setTeamPlayersLoading(false)
    }
  }, [])

  async function handleLoadTeamPlayers() {
    if (!selectedTeamCode) {
      return
    }

    await loadTeamPlayersForCode(selectedTeamCode)
  }

  useEffect(() => {
    if (accessState !== 'active' || !selectedTeamCode || loadedTeamCode === selectedTeamCode || teamPlayersLoading) {
      return
    }

    const timeout = window.setTimeout(() => {
      void loadTeamPlayersForCode(selectedTeamCode)
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [accessState, loadedTeamCode, loadTeamPlayersForCode, selectedTeamCode, teamPlayersLoading])

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

  function linkSoccerverseErrorMessage(error: unknown): string {
    if (error instanceof ApiError) {
      const reason = typeof error.payload?.reason === 'string' ? (error.payload.reason as string) : null
      switch (reason) {
        case 'invalid_username':
          return 'Soccerverse username must be 1–60 characters.'
        case 'username_taken':
          return 'That Soccerverse username is already linked to another participant.'
        case 'already_linked':
          return 'A Soccerverse account is already linked to this participant.'
        case 'not_found':
          return 'Participant not found. Please sign out and back in.'
      }
      return error.message
    }
    return error instanceof Error ? error.message : 'Could not link the Soccerverse account.'
  }

  async function handleLinkSoccerverse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLinkError(null)
    setLinkMessage(null)
    const trimmed = linkUsername.trim()
    if (!trimmed) {
      setLinkError('Enter your Soccerverse username.')
      return
    }
    setLinkBusy(true)
    try {
      const response = await linkSoccerverseAccount(trimmed)
      setParticipant((current) => (current ? { ...current, ...response.participant } : response.participant))
      setLinkUsername('')
      setLinkMessage('Soccerverse account linked. An admin can move you into the Veteran league when ready.')
    } catch (error) {
      setLinkError(linkSoccerverseErrorMessage(error))
    } finally {
      setLinkBusy(false)
    }
  }

  async function handleAssign(slotKey: string, playerId: number) {
    setBuilderError(null)
    try {
      const response = await assignSquadPlayer(slotKey, playerId)
      syncReadyStateWithSquad(participant, response.squad)
      setSquad(response.squad)
      setSelectedSlotKey(getNextDraftSlotKey(response.squad, slotKey))
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
      setSelectedSlotKey(slotKey)
    } catch (error) {
      setBuilderError(error instanceof Error ? error.message : 'Player could not be removed.')
    }
  }

  async function handleReset() {
    const approved = window.confirm('Reset this competition squad and restore the selected budget?')
    if (!approved) {
      return
    }

    setBuilderError(null)
    try {
      const response = await resetSquad()
      syncReadyStateWithSquad(participant, response.squad)
      setSquad(response.squad)
      setSelectedSlotKey(getNextDraftSlotKey(response.squad))
    } catch (error) {
      setBuilderError(error instanceof Error ? error.message : 'Squad reset failed.')
    }
  }

  async function handleBudgetChange(nextBudgetLimit: number) {
    if (!squad || nextBudgetLimit === squad.budgetLimit) {
      return
    }

    setBuilderError(null)
    try {
      const response = await updateSquadBudget(nextBudgetLimit)
      syncReadyStateWithSquad(participant, response.squad)
      setSquad(response.squad)
    } catch (error) {
      setBuilderError(error instanceof Error ? error.message : 'Budget could not be changed.')
    }
  }

  async function handleLockSquad() {
    const approved = window.confirm('Submit this squad? You can still edit it until the competition starts.')
    if (!approved) {
      return
    }

    setBuilderError(null)
    try {
      const response = await lockSquad()
      syncReadyStateWithSquad(participant, response.squad)
      setSquad(response.squad)
    } catch (error) {
      setBuilderError(error instanceof Error ? error.message : 'Squad could not be submitted.')
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

  function handleSelectSlotClass(slotClass: SlotClass) {
    if (!squad) {
      return
    }

    setSelectedSlotKey(getSlotKeyForClass(squad, slotClass))
  }

  function renderPitchSlot(slot: SquadSlotState, index: number) {
    const isSelected = selectedSlot?.key === slot.key

    return (
      <button
        key={slot.key}
        type="button"
        onClick={() => setSelectedSlotKey(slot.key)}
        style={{ animationDelay: `${index * 45}ms` }}
        className={[
          'pitch-slot-card reveal-in',
          isSelected ? 'is-selected' : '',
          slot.player ? 'is-filled' : 'is-open',
        ].join(' ')}
      >
        <span className="pitch-slot-meta">
          <span>{compactSlotLabel(slot.label)}</span>
          <span>{slot.slotClass}</span>
        </span>
        {slot.player ? (
          <span className="mt-2 flex min-w-0 items-center gap-2.5">
            <PlayerPortrait
              src={slot.player.imageUrl}
              alt={slot.player.displayName}
              width={42}
              height={42}
              className="h-11 w-11 shrink-0 rounded-[0.8rem] border border-white/10 bg-black/20 object-cover"
            />
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-xs font-semibold text-white">{slot.player.displayName}</span>
              <span className="mono mt-1 block text-[9px] uppercase tracking-[0.12em] text-[var(--color-muted)]">
                {formatBudget(slot.player.capCost)}
              </span>
            </span>
          </span>
        ) : (
          <span className="pitch-empty-copy">Tap to draft</span>
        )}
      </button>
    )
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
              Pick rookie or veteran, set your countries, confirm your email, then unlock the protected squad builder and choose your SVC budget.
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
                        ? 'Beginner-friendly entry. Link a Soccerverse account later to earn the ownership boost while keeping your Rookie standing.'
                        : 'Provide your main Soccerverse account and enter the veteran league. Ownership boost earned from post-registration buys.'}
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
                        <p className="mt-1 text-xs text-[var(--color-muted)]">
                          {formatMultiplier(dashboardSeed.scoreMultiplier ?? getBudgetScoreMultiplier(dashboardSeed.budgetLimit))}
                        </p>
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

                  {!participant?.soccerverseUsername ? (
                    <form onSubmit={handleLinkSoccerverse} className="mt-5 grid gap-3 rounded-[1rem] border border-[var(--color-accent)]/15 bg-[var(--color-accent)]/5 p-4">
                      <div>
                        <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-accent)]">Optional · link your Soccerverse account</p>
                        <p className="mt-2 text-sm leading-relaxed text-[var(--color-paper)]">
                          Link your Soccerverse account to keep it associated with this entry. You stay in the {leagueLabel(dashboardSeed.leagueType)} league for now — an admin can move you to the Veteran league later if you want to compete for the bigger prize pool.
                        </p>
                      </div>
                      <label className="grid gap-2">
                        <span className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">Soccerverse username</span>
                        <input
                          required
                          type="text"
                          maxLength={60}
                          autoComplete="off"
                          value={linkUsername}
                          onChange={(event) => setLinkUsername(event.target.value)}
                          placeholder="your-soccerverse-name"
                          className="rounded-[0.95rem] border border-white/10 bg-[rgba(255,255,255,0.03)] px-4 py-3 text-white outline-none transition focus:border-[var(--color-accent)]"
                        />
                      </label>
                      {linkError ? (
                        <div className="rounded-[1.3rem] border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-sm text-[var(--color-paper)]">
                          {linkError}
                        </div>
                      ) : null}
                      {linkMessage ? (
                        <div className="rounded-[1.3rem] border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/10 px-4 py-3 text-sm text-[var(--color-paper)]">
                          {linkMessage}
                        </div>
                      ) : null}
                      <button
                        type="submit"
                        disabled={linkBusy}
                        className="inline-flex w-fit items-center rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
                      >
                        {linkBusy ? 'Linking…' : 'Link Soccerverse account'}
                      </button>
                    </form>
                  ) : null}

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
          <div className="hero-card builder-command rounded-[1.15rem] px-4 py-5 sm:px-5">
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
                      {competitionStarted ? 'Squad locked' : 'Submitted, editable'}
                    </span>
                  ) : null}
                </div>

                <p className="eyebrow mt-5">step 3 · squad builder</p>
                <h2 className="mt-3 max-w-[18ch] text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl">
                  Build, adjust, submit.
                </h2>
                <p className="mt-4 max-w-[58ch] text-sm leading-7 text-[var(--color-muted)]">
                  Verified as <span className="font-medium text-white">{participant.displayName}</span>. Choose a team pool, fill the open slots,
                  and stay under the selected {formatBudget(squad.budgetLimit)} cap.
                  Your score multiplier is <span className="font-medium text-white">{formatMultiplier(activeScoreMultiplier)}</span>.
                  {squad.isLocked && canEditSquad ? ' Your squad is submitted, but you can still edit it until kickoff.' : ''}
                  {!canEditSquad ? ' The competition has started, so submitted squads are now locked.' : ''}
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
                    <div className="rounded-[0.85rem] border border-white/8 bg-[rgba(255,255,255,0.03)] px-3 py-3 sm:col-span-2">
                      <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">Score multiplier</p>
                      <p className="mt-1 text-lg font-semibold tracking-tight text-white">{formatMultiplier(activeScoreMultiplier)}</p>
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

          <div className="builder-flow-strip">
            <div>
              <p className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">active slot</p>
              <p className="mt-1 text-base font-semibold text-white">{selectedSlotLabel}</p>
            </div>
            <div className="budget-menu-anchor">
              <button
                type="button"
                aria-expanded={budgetMenuOpen}
                onClick={() => setBudgetMenuOpen((current) => !current)}
                className={['budget-command-button', budgetMenuOpen ? 'is-open' : ''].join(' ')}
              >
                <span className="budget-command-main">
                  <span className="mono block whitespace-nowrap text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">budget left</span>
                  <span className="mt-1 block whitespace-nowrap text-base font-semibold text-[var(--color-accent)]">{formatBudget(squad.budgetRemaining)}</span>
                  <span className="mono mt-1 block whitespace-nowrap text-[10px] uppercase tracking-[0.14em] text-white/60">
                    cap {formatBudget(squad.budgetLimit)}
                  </span>
                </span>
                <span className="budget-command-action">
                  <span className="mono text-[10px] uppercase tracking-[0.14em]">Change cap</span>
                  <svg
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                    className={['h-4 w-4 text-[var(--color-accent)] transition', budgetMenuOpen ? 'rotate-180' : 'rotate-0'].join(' ')}
                  >
                    <path d="M5 7.5 10 12.5 15 7.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </button>

              {budgetMenuOpen ? (
                <div className="budget-popover">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-accent)]">budget menu</p>
                      <p className="mt-1 text-sm text-[var(--color-muted)]">Lower cap, bigger multiplier. Disabled caps need players removed first.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBudgetMenuOpen(false)}
                      className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/6"
                    >
                      Close
                    </button>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {budgetOptions.map((option) => {
                      const isSelected = option.budgetLimit === squad.budgetLimit
                      const isTooLow = option.budgetLimit < squad.budgetUsed
                      return (
                        <button
                          key={option.budgetLimit}
                          type="button"
                          onClick={() => {
                            setBudgetMenuOpen(false)
                            void handleBudgetChange(option.budgetLimit)
                          }}
                          disabled={!canEditSquad || isSelected || isTooLow}
                          className={[
                            'grid grid-cols-[1fr_auto] items-center gap-3 rounded-[0.75rem] border px-3 py-2.5 text-left transition hover:-translate-y-[1px] active:scale-[0.98]',
                            isSelected
                              ? 'border-[var(--color-accent)]/45 bg-[var(--color-accent)]/12 text-white'
                              : 'border-white/8 bg-white/[0.03] text-[var(--color-muted)] hover:border-white/14 hover:text-white',
                            !canEditSquad || isTooLow ? 'disabled:cursor-not-allowed disabled:opacity-50' : '',
                          ].join(' ')}
                        >
                          <span>
                            <span className="block text-sm font-semibold">{formatBudget(option.budgetLimit)}</span>
                            {isTooLow ? <span className="mt-0.5 block text-[11px] text-[var(--color-sand)]">Remove players first</span> : null}
                          </span>
                          <span className="mono text-xs text-[var(--color-accent)]">{formatMultiplier(option.scoreMultiplier)}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </div>
            <div>
              <p className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">drafted</p>
              <p className="mt-1 text-base font-semibold text-white">{draftedCount} / {totalSlotCount}</p>
            </div>
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-3">
                <p className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">completion</p>
                <p className="mono text-xs text-white">{draftCompletionRatio}%</p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/7">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-accent),var(--color-sand))] transition-all duration-300"
                  style={{ width: `${draftCompletionRatio}%` }}
                />
              </div>
            </div>
          </div>

          <div className="builder-workbench grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="space-y-4 lg:order-2 lg:sticky lg:top-4 lg:self-start">
              <div className="glass-panel rounded-[1.15rem] p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="eyebrow">team pool</p>
                    <h3 className="mt-2 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                      {selectedSlot ? slotClassCopy[selectedSlot.slotClass].pickLabel : 'Scouting board'}
                    </h3>
                    <p className="mt-2 text-sm text-[var(--color-muted)]">
                      {selectedSlot
                        ? `${compactSlotLabel(selectedSlot.label)} is active. Only compatible players are shown.`
                        : 'Select a squad slot to filter the pool by position.'}
                    </p>
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
                      setPlayerSearch('')
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
                    {teamPlayersLoading ? 'Loading team pool...' : 'Refresh team pool'}
                  </button>
                  <p className="self-center text-xs text-[var(--color-muted)]">The selected team pool loads automatically.</p>
                </div>

                <div className="mt-5 grid gap-3">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {squadSlotBuckets.map((bucket) => {
                      const filledCount = bucket.slots.filter((slot) => slot.player).length
                      const isActive = selectedSlot?.slotClass === bucket.slotClass

                      return (
                        <button
                          key={bucket.slotClass}
                          type="button"
                          onClick={() => handleSelectSlotClass(bucket.slotClass)}
                          className={[
                            'rounded-[0.85rem] border px-3 py-2.5 text-left transition hover:-translate-y-[1px] active:scale-[0.98]',
                            isActive
                              ? 'border-[var(--color-accent)]/45 bg-[var(--color-accent)]/12 text-white'
                              : 'border-white/8 bg-white/[0.03] text-[var(--color-muted)] hover:border-white/14 hover:text-white',
                          ].join(' ')}
                        >
                          <span className="mono text-[10px] uppercase tracking-[0.18em]">{bucket.slotClass}</span>
                          <span className="mt-1 block text-xs font-semibold">
                            {filledCount} / {bucket.slots.length}
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                    <label className="block">
                      <span className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">Search players</span>
                      <input
                        type="search"
                        value={playerSearch}
                        onChange={(event) => setPlayerSearch(event.target.value)}
                        placeholder="Name, ID, position..."
                        className="mt-2 w-full rounded-[0.9rem] border border-white/10 bg-[rgba(8,13,12,0.78)] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)]/45"
                      />
                    </label>
                    <div className="rounded-[0.9rem] border border-white/8 bg-white/[0.03] px-4 py-3">
                      <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">Shown</p>
                      <p className="mt-1 text-sm font-semibold text-white">{visibleTeamPlayers.length} players</p>
                    </div>
                  </div>
                </div>

                {selectedSlot?.player ? (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[0.9rem] border border-[var(--color-sand)]/20 bg-[var(--color-sand)]/8 px-3 py-2.5 text-sm text-[var(--color-paper)]">
                    <span>This slot has {selectedSlot.player.displayName}. Remove them to assign another compatible player.</span>
                    {canEditSquad ? (
                      <button
                        type="button"
                        onClick={() => void handleRemove(selectedSlot.key)}
                        className="rounded-full border border-white/12 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-white/6"
                      >
                        Remove from slot
                      </button>
                    ) : null}
                  </div>
                ) : null}

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
                    <EmptyState title="Team pool is loading" body="The player list starts automatically when a nation is selected." />
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

                {!teamPlayersLoading && teamPlayers.length > 0 && visibleTeamPlayers.length === 0 ? (
                  <div className="mt-6">
                    <EmptyState title="No compatible players" body="Try another slot, clear the search, or free budget by removing a drafted player." />
                  </div>
                ) : null}

                {visibleTeamPlayers.length > 0 ? (
                  <div className="mt-4 max-h-[54rem] space-y-2 overflow-y-auto pr-1">
                    {visibleTeamPlayers.map((player) => {
                      const selectedSlotIsOpen = Boolean(selectedSlot && !selectedSlot.player)
                      const isOverBudget = selectedSlotIsOpen && player.capCost > squad.budgetRemaining
                      const actionDisabled = !canEditSquad || !selectedSlotIsOpen || isOverBudget
                      const actionLabel = !canEditSquad
                        ? 'Locked after kickoff'
                        : !selectedSlot
                          ? 'Select a slot'
                          : selectedSlot.player
                            ? 'Clear slot first'
                            : isOverBudget
                              ? 'Over budget'
                              : `Add to ${compactSlotLabel(selectedSlot.label)}`
                      return (
                        <article
                          key={player.playerId}
                          className="scout-player-card rounded-[0.85rem] px-3 py-2.5 transition hover:-translate-y-[1px]"
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
                              <button
                                type="button"
                                disabled={actionDisabled}
                                onClick={() => {
                                  if (selectedSlot) {
                                    void handleAssign(selectedSlot.key, player.playerId)
                                  }
                                }}
                                className="rounded-full border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/10 px-4 py-2 text-xs font-semibold text-[var(--color-accent)] transition hover:-translate-y-[1px] hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/15 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.03] disabled:text-[var(--color-muted)] active:scale-[0.98]"
                              >
                                {actionLabel}
                              </button>
                            </div>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 lg:order-1">
              <div className="glass-panel rounded-[1.15rem] p-4 lg:order-3">
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

              <div className="glass-panel rounded-[1.15rem] p-4 lg:order-1">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">current squad</p>
                    <h3 className="mt-2 text-xl font-semibold tracking-tight text-white">4-3-3 + bench</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleReset()}
                    disabled={!canEditSquad}
                    className="rounded-full border border-white/12 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white transition hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]"
                  >
                    Reset
                  </button>
                </div>

                <div className="mt-4 rounded-[1rem] border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/10 px-3 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {squad.isLocked ? (competitionStarted ? 'Squad locked' : 'Squad submitted') : 'Ready to submit your squad?'}
                      </p>
                      <p className="mt-1 text-xs leading-6 text-[var(--color-muted)]">
                        {squad.isLocked
                          ? canEditSquad
                            ? 'You can keep editing until the first World Cup fixture kicks off. Submit again is not needed.'
                            : 'The competition has started, so submitted squads are now locked.'
                          : 'Fill all 15 slots, then submit the squad. You can still edit it until kickoff.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleLockSquad()}
                      disabled={squad.isLocked || draftedCount !== 15}
                      className="rounded-full bg-[var(--color-accent)] px-4 py-2 text-xs font-semibold text-[var(--color-ink)] transition hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
                    >
                      {squad.isLocked ? 'Submitted' : 'Submit squad'}
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
                            : 'Reveal the profile first, then choose whether the submitted squad should also be public.'}
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

                <div className="mt-5">
                  <div className="squad-pitch">
                    {squadSlotBuckets.map((bucket) => (
                      <div key={bucket.slotClass} className={['pitch-line', `pitch-line-${bucket.slotClass.toLowerCase()}`].join(' ')}>
                        <div className="pitch-line-heading">
                          <span>{bucket.label}</span>
                          <button type="button" onClick={() => handleSelectSlotClass(bucket.slotClass)}>
                            Scout {bucket.slotClass}
                          </button>
                        </div>
                        <div className="pitch-line-slots">
                          {bucket.slots.map((slot, index) => renderPitchSlot(slot, index))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedSlot ? (
                    <div className="selected-slot-dock mt-4">
                      <div className="min-w-0">
                        <p className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">selected slot</p>
                        <h4 className="mt-1 truncate text-lg font-semibold text-white">{selectedSlotLabel}</h4>
                        <p className="mt-1 text-sm leading-6 text-[var(--color-muted)]">
                          {selectedSlot.player
                            ? `${selectedSlot.player.displayName} is currently assigned here.`
                            : `Pick a compatible ${selectedSlot.slotClass} from the scouting board.`}
                        </p>
                      </div>
                      {selectedSlot.player && canEditSquad ? (
                        <button
                          type="button"
                          onClick={() => void handleRemove(selectedSlot.key)}
                          className="rounded-full border border-white/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]"
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}
