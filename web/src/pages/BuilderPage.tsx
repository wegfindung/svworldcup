import { startTransition, useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { NationSelect } from '../components/NationSelect'
import { PlayerPortrait } from '../components/PlayerPortrait'
import { PlayerTooltip } from '../components/PlayerTooltip'
import { SwapPanel } from '../components/SwapPanel'
import { TeamFlag } from '../components/TeamFlag'
import { TeamSelect } from '../components/TeamSelect'
import { MAX_PLAYERS_PER_NATION, budgetLimit as defaultBudgetLimit, budgetOptions, eventTeams, getBudgetScoreMultiplier } from '../data/eventConfig'
import { soccerverseNations } from '../data/soccerverseNations'
import { useBootstrap } from '../hooks/useBootstrap'
import { hasRegistrationClosed, resolveRegistrationCloseEpoch } from '../lib/competitionWindow'
import { getMessages, type AppMessages } from '../i18n/messages'
import {
  ApiError,
  assignSquadPlayer,
  fetchParticipantSession,
  fetchParticipantSquad,
  fetchSwapState,
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
  SwapState,
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

type BuilderCopy = AppMessages['builder']

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

function leagueLabel(mode: LeagueType, copy: BuilderCopy) {
  return copy.leagueLabels[mode]
}

function formatBudget(value: number) {
  return `${value.toLocaleString(undefined)} SVC`
}

function formatMultiplier(value: number) {
  return `x${value.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: value % 1 === 0 ? 0 : 2 })}`
}

function compactSlotLabel(label: string, copy: BuilderCopy) {
  return label.replace('Starting ', copy.slots.startingPrefix).replace('Reserve ', copy.slots.reservePrefix)
}

const slotClassOrder: SlotClass[] = ['GK', 'DEF', 'MID', 'FWD']

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

export function BuilderPage({ locale, referrerSoccerverseUsername = '', mode = 'builder' }: BuilderPageProps) {
  const copy = getMessages(locale).builder
  const slotClassCopy = copy.slotClasses
  const { data: bootstrap } = useBootstrap()
  const registrationClosed = hasRegistrationClosed(resolveRegistrationCloseEpoch(bootstrap?.registrationCloseEpoch))

  const initialReadyState = readParticipantReady()
  const [dashboardSeed, setDashboardSeed] = useState<ParticipantReadyState | null>(initialReadyState)
  const [accessState, setAccessState] = useState<'locked' | 'guest' | 'pending' | 'registered' | 'ready' | 'active'>(() =>
    initialReadyState ? (mode === 'register' ? 'registered' : 'ready') : mode === 'register' ? 'guest' : 'locked',
  )
  const [participant, setParticipant] = useState<ParticipantProfile | null>(null)
  const [budgetLimit, setBudgetLimit] = useState(initialReadyState?.budgetLimit ?? defaultBudgetLimit)
  const [squad, setSquad] = useState<ParticipantSquad | null>(null)
  const [swapState, setSwapState] = useState<SwapState | null>(null)
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
  // How many drafted players each Grand Tournament team already contributes, for the per-team cap
  // (max 4 from one team). Keyed by teamCode, falling back to nationalityCode like the server does.
  const teamCountByCode = useMemo(() => {
    const counts = new Map<string, number>()
    for (const slot of squad?.slots ?? []) {
      const code = slot.player?.teamCode || slot.player?.nationalityCode
      if (code) {
        counts.set(code, (counts.get(code) ?? 0) + 1)
      }
    }
    return counts
  }, [squad])
  const squadViolatesNationCap = useMemo(
    () => [...teamCountByCode.values()].some((count) => count > MAX_PLAYERS_PER_NATION),
    [teamCountByCode],
  )
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
  // Once a squad is locked, the effective lineup (which 11 start vs which 4 are reserves) is the
  // round-lineup snapshot, not the lock-time squad_slots — so a committed swap shows on the pitch.
  // swapState.currentLineup maps slotKey -> playerId for the lineup in effect; remap the displayed
  // players accordingly. No snapshot (unlocked, or never swapped) => the raw squad slots are used.
  const activeSwapState = squad?.isLocked ? swapState : null
  const effectiveSlots = useMemo<SquadSlotState[]>(() => {
    const slots = squad?.slots ?? []
    const lineup = activeSwapState?.currentLineup
    if (!lineup || lineup.length === 0) {
      return slots
    }
    const playerById = new Map(slots.filter((slot) => slot.player).map((slot) => [slot.player!.playerId, slot.player!]))
    const playerBySlotKey = new Map(lineup.map((entry) => [entry.slotKey, entry.playerId]))
    return slots.map((slot) => {
      const playerId = playerBySlotKey.get(slot.key)
      if (playerId === undefined) {
        return slot
      }
      return { ...slot, player: playerById.get(playerId) ?? slot.player }
    })
  }, [activeSwapState, squad])
  const squadSlotBuckets = slotClassOrder
    .map((slotClass) => ({
      slotClass,
      ...slotClassCopy[slotClass],
      slots: effectiveSlots.filter((slot) => slot.slotClass === slotClass),
    }))
    .filter((bucket) => bucket.slots.length > 0)
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

  // Load swap state (windows + effective lineup) once the squad is locked; the SwapPanel and the
  // pitch both read from it. Refetched after each committed swap so the pitch updates immediately.
  const refreshSwapState = useCallback(async () => {
    if (!squad?.isLocked) {
      return
    }
    try {
      setSwapState(await fetchSwapState())
    } catch {
      setSwapState(null)
    }
  }, [squad?.isLocked])

  useEffect(() => {
    if (!squad?.isLocked) {
      return
    }
    let active = true
    void (async () => {
      try {
        const nextSwapState = await fetchSwapState()
        if (active) {
          setSwapState(nextSwapState)
        }
      } catch {
        if (active) {
          setSwapState(null)
        }
      }
    })()
    return () => {
      active = false
    }
  }, [squad?.isLocked])
  const socialSharingUnlocked = draftedCount === 15
  const totalSlotCount = squad?.slots.length ?? 15
  const draftCompletionRatio = Math.round((draftedCount / Math.max(totalSlotCount, 1)) * 100)
  const selectedSlotLabel = selectedSlot ? compactSlotLabel(selectedSlot.label, copy) : copy.slots.noSlotSelected
  const previousDraftedCountRef = useRef<number | null>(null)
  const readyBudgetLabel = dashboardSeed?.budgetRemaining !== undefined ? copy.common.budgetLeft : copy.common.budget
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
      // The picked nation only feeds the Nation League — it never selects a draft pool. The user
      // chooses which Grand Tournament team's players to browse from the pool selector below.
      setSelectedTeamCode(undefined)
      setAccessState('active')
    } catch (error) {
      const message = error instanceof Error ? error.message : copy.errors.openBuilder
      if (/session/i.test(message)) {
        moveToGuestState()
        setSessionError(copy.errors.sessionExpired)
      } else {
        setSessionError(message)
      }
    } finally {
      setSessionBusy(false)
    }
  }

  const loadTeamPlayersForCode = useCallback(async (teamCode: string, loadErrorMessage: string) => {
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
      setBuilderError(error instanceof Error ? error.message : loadErrorMessage)
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

    await loadTeamPlayersForCode(selectedTeamCode, copy.errors.loadTeamPool)
  }

  useEffect(() => {
    if (accessState !== 'active' || !selectedTeamCode || loadedTeamCode === selectedTeamCode || teamPlayersLoading) {
      return
    }

    const timeout = window.setTimeout(() => {
      void loadTeamPlayersForCode(selectedTeamCode, copy.errors.loadTeamPool)
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [accessState, copy.errors.loadTeamPool, loadedTeamCode, loadTeamPlayersForCode, selectedTeamCode, teamPlayersLoading])

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setRegistrationBusy(true)
    setRegistrationError(null)
    setSessionError(null)
    setResendState('idle')

    try {
      if (!registrationForm.primaryTeamCode) {
        throw new Error(copy.errors.chooseCountry)
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
      const message = error instanceof Error ? error.message : copy.errors.registrationFailed
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
      setRegistrationError(error instanceof Error ? error.message : copy.errors.resendFailed)
      setResendState('idle')
    }
  }

  async function handleSetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPasswordError(null)
    setPasswordMessage(null)

    if (passwordForm.password !== passwordForm.confirmPassword) {
      setPasswordError(copy.errors.passwordsMismatch)
      return
    }

    setPasswordBusy(true)
    try {
      const response = await setParticipantPassword(passwordForm.password)
      persistReadyState(buildReadyState(response.participant, response.budgetLimit, response.squadSummary))
      setParticipant((current) => (current ? response.participant : current))
      setPasswordForm(initialPasswordForm)
      setPasswordMessage(copy.errors.passwordSaved)
    } catch (error) {
      const message = error instanceof Error ? error.message : copy.errors.passwordFailed
      if (/session/i.test(message)) {
        moveToGuestState()
        setSessionError(copy.errors.passwordSessionExpired)
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
          return copy.errors.invalidUsername
        case 'username_taken':
          return copy.errors.usernameTaken
        case 'already_linked':
          return copy.errors.alreadyLinked
        case 'not_found':
          return copy.errors.participantNotFound
      }
      return error.message
    }
    return error instanceof Error ? error.message : copy.errors.linkFailed
  }

  async function handleLinkSoccerverse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLinkError(null)
    setLinkMessage(null)
    const trimmed = linkUsername.trim()
    if (!trimmed) {
      setLinkError(copy.errors.enterUsername)
      return
    }
    setLinkBusy(true)
    try {
      const response = await linkSoccerverseAccount(trimmed)
      setParticipant((current) => (current ? { ...current, ...response.participant } : response.participant))
      setLinkUsername('')
      setLinkMessage(copy.errors.linkSaved)
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
      setSwapState(null)
      setSquad(response.squad)
      setSelectedSlotKey(getNextDraftSlotKey(response.squad, slotKey))
    } catch (error) {
      setBuilderError(error instanceof Error ? error.message : copy.errors.assignFailed)
    }
  }

  async function handleRemove(slotKey: string) {
    setBuilderError(null)
    try {
      const response = await removeSquadPlayer(slotKey)
      syncReadyStateWithSquad(participant, response.squad)
      setSwapState(null)
      setSquad(response.squad)
      setSelectedSlotKey(slotKey)
    } catch (error) {
      setBuilderError(error instanceof Error ? error.message : copy.errors.removeFailed)
    }
  }

  async function handleReset() {
    const approved = window.confirm(copy.confirms.reset)
    if (!approved) {
      return
    }

    setBuilderError(null)
    try {
      const response = await resetSquad()
      syncReadyStateWithSquad(participant, response.squad)
      setSwapState(null)
      setSquad(response.squad)
      setSelectedSlotKey(getNextDraftSlotKey(response.squad))
    } catch (error) {
      setBuilderError(error instanceof Error ? error.message : copy.errors.resetFailed)
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
      setBuilderError(error instanceof Error ? error.message : copy.errors.budgetFailed)
    }
  }

  async function handleLockSquad() {
    if (squadViolatesNationCap) {
      setBuilderError(copy.active.nationCapBreach)
      return
    }

    const approved = window.confirm(copy.confirms.submit)
    if (!approved) {
      return
    }

    setBuilderError(null)
    try {
      const response = await lockSquad()
      syncReadyStateWithSquad(participant, response.squad)
      setSwapState(null)
      setSquad(response.squad)
    } catch (error) {
      setBuilderError(error instanceof Error ? error.message : copy.errors.submitFailed)
    }
  }

  async function handleReveal(revealSquad: boolean) {
    const approved = window.confirm(revealSquad ? copy.confirms.revealWithSquad : copy.confirms.revealProfile)
    if (!approved) {
      return
    }

    setBuilderError(null)
    try {
      const response = await revealParticipantProfile(revealSquad)
      setParticipant(response.participant)
      setPublicProfileUrl(response.publicProfileUrl || buildPublicProfileUrl(response.participant))
    } catch (error) {
      setBuilderError(error instanceof Error ? error.message : copy.errors.revealFailed)
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
          <span>{compactSlotLabel(slot.label, copy)}</span>
          <span>{slot.slotClass}</span>
        </span>
        {slot.player ? (
          <PlayerTooltip
            as="span"
            className="mt-2 flex min-w-0 items-center gap-2.5"
            info={{
              name: slot.player.displayName,
              nationCode: slot.player.teamCode || slot.player.nationalityCode,
              imageUrl: slot.player.imageUrl,
              meta: [
                { label: 'Rating', value: String(slot.player.rating) },
                { label: 'Cost', value: formatBudget(slot.player.capCost) },
                { label: 'Pos', value: slot.player.positionMain ?? slot.player.positions.join('/') },
              ],
            }}
          >
            <span className="pitch-player-portrait">
              <PlayerPortrait
                src={slot.player.imageUrl}
                alt={slot.player.displayName}
                width={42}
                height={42}
                className="h-11 w-11 rounded-[0.8rem] border border-white/10 bg-black/20 object-cover"
              />
              <img
                src={`/team-flags/${slot.player.teamCode || slot.player.nationalityCode}.svg`}
                alt={`${slot.player.displayName} country flag`}
                loading="lazy"
                width={22}
                height={22}
                className="pitch-player-flag"
              />
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-xs font-semibold text-white">{slot.player.displayName}</span>
              <span className="mono mt-1 block text-[9px] uppercase tracking-[0.12em] text-[var(--color-muted)]">
                {formatBudget(slot.player.capCost)}
              </span>
            </span>
          </PlayerTooltip>
        ) : (
          <span className="pitch-empty-copy">{copy.slots.tapToDraft}</span>
        )}
      </button>
    )
  }

  return (
    <div className="space-y-4 pb-10">
      {registrationClosed ? (
        <section className="glass-panel rounded-[1.15rem] border border-[var(--color-sand)]/25 bg-[var(--color-sand)]/8 px-5 py-4 sm:px-6">
          <p className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-sand)]">{copy.registrationClosedBanner.eyebrow}</p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-paper)]">{copy.registrationClosedBanner.body}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              to="/tables"
              className="rounded-full border border-white/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]"
            >
              {copy.registrationClosedBanner.leaderboardsCta}
            </Link>
            <Link
              to="/results"
              className="rounded-full border border-white/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]"
            >
              {copy.registrationClosedBanner.resultsCta}
            </Link>
          </div>
        </section>
      ) : null}
      {accessState === 'locked' ? (
        <section className="hero-card rounded-[1.25rem] px-5 py-6 sm:px-6 lg:px-7">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
              {copy.locked.access}
            </span>
            <span className="rounded-full border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
              {copy.locked.verificationRequired}
            </span>
          </div>
          <h2 className="mt-7 max-w-[11ch] text-[clamp(2.6rem,2.8vw+1rem,4.5rem)] font-semibold leading-[0.94] tracking-[-0.05em] text-white">
            {copy.locked.title}
          </h2>
          <p className="mt-6 max-w-[58ch] text-lg leading-relaxed text-[var(--color-muted)]">
            {copy.locked.body}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to={withReferral('/register', referrerSoccerverseUsername)}
              className="premium-button px-7 py-4 text-base font-semibold"
            >
              {copy.locked.cta}
            </Link>
          </div>
        </section>
      ) : null}

      {accessState === 'guest' ? (
        <section className="grid gap-6">
          <div className="hero-card allow-dropdown-overflow rounded-[1.25rem] px-5 py-5 sm:px-6 sm:py-6 lg:px-7">
            <p className="eyebrow">{copy.register.eyebrow}</p>
            <div className="mt-5 flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-sand)]">
                {copy.register.noMulti}
              </span>
              <span className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                {copy.register.oneEmail}
              </span>
            </div>
            <h2 className="mt-5 max-w-[10ch] text-[clamp(2.25rem,3vw+1rem,5rem)] font-semibold leading-[0.92] tracking-[-0.05em] text-white sm:mt-7">
              {copy.register.title}
            </h2>
            <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-[var(--color-muted)] sm:mt-6 sm:text-lg">
              {copy.register.body}
            </p>

            <div className="mt-5 grid grid-cols-4 gap-1.5 rounded-[1rem] border border-white/8 bg-black/16 p-1.5 sm:mt-7">
              {copy.register.steps.map((step, index) => (
                <span
                  key={step}
                  className="mono rounded-[0.65rem] bg-white/[0.03] px-2 py-2 text-center text-[9px] uppercase tracking-[0.12em] text-[var(--color-muted)]"
                >
                  <span className="text-[var(--color-accent)]">{index + 1}</span> {step}
                </span>
              ))}
            </div>

            <form onSubmit={handleRegister} className="mt-5 grid gap-4 sm:mt-8 sm:gap-5">
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
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
                      'rounded-[1.05rem] border px-3 py-3 text-left transition duration-300 ease-out active:scale-[0.99] sm:rounded-[1.7rem] sm:px-5 sm:py-5',
                      registrationForm.mode === mode
                        ? 'border-[var(--color-accent)]/35 bg-[rgba(24,180,133,0.12)]'
                        : 'border-white/10 bg-[rgba(8,13,12,0.62)] hover:border-white/16 hover:bg-[rgba(12,18,16,0.8)]',
                    ].join(' ')}
                  >
                    <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)] sm:text-[11px] sm:tracking-[0.24em]">{mode}</p>
                    <p className="mt-2 text-sm font-semibold leading-tight text-white sm:mt-3 sm:text-lg">
                      {mode === 'rookie' ? copy.register.rookieTitle : copy.register.veteranTitle}
                    </p>
                    <p className="mt-2 hidden text-sm leading-relaxed text-[var(--color-muted)] sm:block">
                      {mode === 'rookie'
                        ? copy.register.rookieBody
                        : copy.register.veteranBody}
                    </p>
                  </button>
                ))}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">{copy.register.nickname}</span>
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
                    placeholder={copy.register.displayNamePlaceholder}
                    className="rounded-[1.2rem] border border-white/10 bg-[rgba(8,13,12,0.72)] px-4 py-3 text-white outline-none transition focus:border-[var(--color-accent)]"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">{copy.register.emailAddress}</span>
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
                    placeholder={copy.register.emailPlaceholder}
                    className="rounded-[1.2rem] border border-white/10 bg-[rgba(8,13,12,0.72)] px-4 py-3 text-white outline-none transition focus:border-[var(--color-accent)]"
                  />
                </label>
              </div>

              {registrationForm.mode === 'veteran' ? (
                <label className="grid gap-2">
                  <span className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">{copy.register.mainAccount}</span>
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
                    placeholder={copy.register.accountPlaceholder}
                    className="rounded-[1.2rem] border border-white/10 bg-[rgba(8,13,12,0.72)] px-4 py-3 text-white outline-none transition focus:border-[var(--color-accent)]"
                  />
                </label>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <NationSelect
                  label={copy.register.registrationCountry}
                  nations={soccerverseNations}
                  value={registrationForm.primaryTeamCode}
                  placeholder={copy.register.registrationCountryPlaceholder}
                  onChange={(code) =>
                    setRegistrationForm((current) => ({
                      ...current,
                      primaryTeamCode: code,
                      secondaryTeamCode: current.secondaryTeamCode === code ? undefined : current.secondaryTeamCode,
                    }))
                  }
                />
                <NationSelect
                  label={copy.register.secondaryCountry}
                  nations={soccerverseNations}
                  value={registrationForm.secondaryTeamCode}
                  placeholder={copy.register.secondaryCountryPlaceholder}
                  excludeCode={registrationForm.primaryTeamCode}
                  onChange={(code) =>
                    setRegistrationForm((current) => ({
                      ...current,
                      secondaryTeamCode: code,
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
                  {copy.register.marketingOptIn}
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
                {registrationBusy ? copy.register.submitting : copy.register.submit}
              </button>
            </form>
          </div>

        </section>
      ) : null}

      {accessState === 'pending' ? (
        <section className="grid gap-6 lg:grid-cols-[1.04fr_0.96fr]">
          <div className="hero-card rounded-[1.25rem] px-5 py-6 sm:px-6">
            <p className="eyebrow">{copy.pending.eyebrow}</p>
            <h2 className="mt-6 max-w-[11ch] text-[clamp(2.6rem,2.8vw+1rem,4.4rem)] font-semibold leading-[0.94] tracking-[-0.05em] text-white">
              {copy.pending.title}
            </h2>
            <p className="mt-6 max-w-[56ch] text-lg leading-relaxed text-[var(--color-muted)]">
              {copy.pending.bodyPrefix} <span className="font-medium text-white">{submittedEmail}</span>. {copy.pending.bodySuffix}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleResend}
                disabled={resendState === 'sending'}
                className="rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
              >
                {resendState === 'sending' ? copy.pending.sending : resendState === 'sent' ? copy.pending.sent : copy.pending.resend}
              </button>
              <button
                type="button"
                onClick={() => setAccessState('guest')}
                className="rounded-full border border-white/12 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]"
              >
                {copy.pending.back}
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
              <p className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">{copy.pending.nextTitle}</p>
              <div className="mt-5 space-y-3">
                {copy.pending.steps.map(({ step, title, body }) => (
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
              {copy.registered.active}
            </span>
            <span className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
              {leagueLabel(dashboardSeed.leagueType, copy)}
            </span>
          </div>
          <h2 className="mt-7 max-w-[12ch] text-[clamp(2.4rem,2.4vw+1rem,4rem)] font-semibold leading-[0.94] tracking-[-0.05em] text-white">
            {copy.registered.title}
          </h2>
          <p className="mt-6 max-w-[56ch] text-lg leading-relaxed text-[var(--color-muted)]">
            {copy.registered.bodyPrefix}{' '}
            <span className="font-semibold text-white">{dashboardSeed.displayName}</span>.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to={withReferral('/builder', referrerSoccerverseUsername)}
              className="premium-button px-7 py-4 text-base font-semibold"
            >
              {copy.common.openBuilder}
            </Link>
            <Link
              to={withReferral('/tables', referrerSoccerverseUsername)}
              className="inline-flex items-center rounded-full border border-white/12 px-6 py-4 text-base font-semibold text-white transition hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]"
            >
              {copy.common.viewTables}
            </Link>
          </div>
        </section>
      ) : null}

      {accessState === 'ready' && dashboardSeed ? (
        <section>
          <div className="hero-card rounded-[1.25rem] px-5 py-6 sm:px-6 lg:px-7">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/12 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
                {copy.common.verified}
              </span>
              <span className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                {leagueLabel(dashboardSeed.leagueType, copy)}
              </span>
              <span className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                {copy.common.hiddenSquadEntry}
              </span>
            </div>

            <div className="mt-7 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
              <div>
                <p className="eyebrow">{copy.ready.eyebrow}</p>
                <h2 className="mt-4 max-w-[16ch] text-[clamp(2.1rem,1.6vw+1rem,3.35rem)] font-semibold leading-[0.95] tracking-[-0.045em] text-white">
                  {copy.ready.title}
                </h2>
                <p className="mt-4 max-w-[58ch] text-base leading-relaxed text-[var(--color-muted)]">
                  {copy.ready.welcomePrefix} <span className="font-semibold text-white">{dashboardSeed.displayName}</span>. {copy.ready.welcomeSuffix}
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void handleOpenBuilder()}
                    disabled={sessionBusy}
                    className="premium-button px-6 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {sessionBusy ? copy.ready.opening : copy.ready.start}
                  </button>
                  <Link
                    to={withReferral('/tables', referrerSoccerverseUsername)}
                    className="inline-flex items-center rounded-full border border-white/12 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]"
                  >
                    {copy.common.viewTables}
                  </Link>
                </div>

                {sessionError ? (
                  <div className="mt-6 rounded-[1.3rem] border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-sm text-[var(--color-paper)]">
                    {sessionError}
                  </div>
                ) : null}

                <div className="data-strip mt-6 max-w-[34rem]">
                  <div>
                    <p className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">{copy.common.status}</p>
                    <p className="mt-2 text-sm font-semibold text-white">{copy.common.verified}</p>
                  </div>
                  <div>
                    <p className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">{copy.common.league}</p>
                    <p className="mt-2 text-sm font-semibold text-white">{leagueLabel(dashboardSeed.leagueType, copy)}</p>
                  </div>
                  <div>
                    <p className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">{readyBudgetLabel}</p>
                    <p className="mono mt-2 text-sm font-semibold text-[var(--color-accent)]">{formatBudget(readyBudgetValue)}</p>
                    {dashboardSeed.budgetUsed !== undefined ? (
                      <p className="mt-1 text-xs text-[var(--color-muted)]">{formatBudget(dashboardSeed.budgetUsed)} {copy.common.used}</p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="surface-row rounded-[1rem] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <p className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">{copy.ready.accountSnapshot}</p>
                  <div className="mt-5 grid gap-3">
                    <div className="rounded-[0.95rem] border border-white/8 bg-[rgba(255,255,255,0.03)] px-4 py-3">
                      <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">{copy.common.nickname}</p>
                      <p className="mt-2 text-lg font-semibold text-white">{dashboardSeed.displayName}</p>
                    </div>
                    <div className="rounded-[0.95rem] border border-white/8 bg-[rgba(255,255,255,0.03)] px-4 py-3">
                      <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">{copy.common.email}</p>
                      <p className="mt-2 break-all text-sm font-medium text-white">{dashboardSeed.email}</p>
                    </div>
                    <div className="grid gap-3">
                      <div className="rounded-[0.95rem] border border-white/8 bg-[rgba(255,255,255,0.03)] px-4 py-3">
                        <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">{copy.common.league}</p>
                        <p className="mt-2 text-base font-semibold text-white">{leagueLabel(dashboardSeed.leagueType, copy)}</p>
                      </div>
                      <div className="rounded-[0.95rem] border border-white/8 bg-[rgba(255,255,255,0.03)] px-4 py-3">
                        <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">{readyBudgetLabel}</p>
                        <p className="mt-2 text-base font-semibold text-[var(--color-accent)]">{formatBudget(readyBudgetValue)}</p>
                        <p className="mt-1 text-xs text-[var(--color-muted)]">
                          {formatMultiplier(dashboardSeed.scoreMultiplier ?? getBudgetScoreMultiplier(dashboardSeed.budgetLimit))}
                        </p>
                        {dashboardSeed.budgetUsed !== undefined ? (
                          <p className="mt-1 text-xs text-[var(--color-muted)]">
                            {formatBudget(dashboardSeed.budgetUsed)} {copy.common.used}
                            {dashboardSeed.draftedCount !== undefined ? ` · ${dashboardSeed.draftedCount}/15 ${copy.ready.filledSuffix}` : ''}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="surface-row rounded-[1rem] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">{copy.ready.security}</p>
                      <h3 className="mt-3 max-w-[16rem] text-xl font-semibold tracking-tight text-white">
                        {dashboardSeed.hasPassword ? copy.ready.passwordActive : copy.ready.setPasswordTitle}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleSignOut()}
                      className="whitespace-nowrap rounded-full border border-white/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]"
                    >
                      {copy.common.signOut}
                    </button>
                  </div>

                  {!participant?.soccerverseUsername ? (
                    <form onSubmit={handleLinkSoccerverse} className="mt-5 grid gap-3 rounded-[1rem] border border-[var(--color-accent)]/15 bg-[var(--color-accent)]/5 p-4">
                      <div>
                        <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-accent)]">{copy.ready.linkTitle}</p>
                        <p className="mt-2 text-sm leading-relaxed text-[var(--color-paper)]">
                          {copy.ready.linkBodyPrefix} {leagueLabel(dashboardSeed.leagueType, copy)} {copy.ready.linkBodySuffix}
                        </p>
                      </div>
                      <label className="grid gap-2">
                        <span className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">{copy.ready.soccerverseUsername}</span>
                        <input
                          required
                          type="text"
                          maxLength={60}
                          autoComplete="off"
                          value={linkUsername}
                          onChange={(event) => setLinkUsername(event.target.value)}
                          placeholder={copy.ready.linkPlaceholder}
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
                        {linkBusy ? copy.ready.linking : copy.ready.linkCta}
                      </button>
                    </form>
                  ) : null}

                  {!dashboardSeed.hasPassword ? (
                    <form onSubmit={handleSetPassword} className="mt-5 grid gap-4">
                      <p className="text-sm leading-relaxed text-[var(--color-muted)]">
                        {copy.ready.passwordHelp}
                      </p>
                      <div className="grid gap-3 2xl:grid-cols-2">
                        <label className="grid gap-2">
                          <span className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">{copy.ready.newPassword}</span>
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
                          <span className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">{copy.ready.repeatPassword}</span>
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
                        {passwordBusy ? copy.ready.savingPassword : copy.ready.savePassword}
                      </button>
                    </form>
                  ) : (
                    <div className="mt-5 rounded-[1.4rem] border border-white/8 bg-[rgba(255,255,255,0.03)] px-4 py-4">
                      <p className="text-sm leading-relaxed text-[var(--color-muted)]">
                        {copy.ready.passwordReady}
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
                    {copy.active.unlocked}
                  </span>
                  <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                    {leagueLabel(participant.leagueType, copy)}
                  </span>
                  <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                    {draftedCount}/15 {copy.common.selected}
                  </span>
                  {squad.isLocked ? (
                    <span className="rounded-full border border-[var(--color-sand)]/30 bg-[var(--color-sand)]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-sand)]">
                      {competitionStarted ? copy.active.squadLocked : copy.active.submittedEditable}
                    </span>
                  ) : null}
                </div>

                <p className="eyebrow mt-5">{copy.active.eyebrow}</p>
                <h2 className="mt-3 max-w-[18ch] text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl">
                  {copy.active.title}
                </h2>
                <p className="mt-4 max-w-[58ch] text-sm leading-7 text-[var(--color-muted)]">
                  {copy.active.verifiedAs} <span className="font-medium text-white">{participant.displayName}</span>. {copy.active.bodyMiddle}{' '}
                  {formatBudget(squad.budgetLimit)} {copy.active.capSuffix}{' '}
                  {copy.active.multiplierPrefix} <span className="font-medium text-white">{formatMultiplier(activeScoreMultiplier)}</span>.
                  {squad.isLocked && canEditSquad ? ` ${copy.active.submittedEditableNote}` : ''}
                  {!canEditSquad ? ` ${copy.active.lockedNote}` : ''}
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-[1.05fr_0.95fr] lg:grid-cols-1 xl:grid-cols-[1.05fr_0.95fr]">
                <div className="surface-row rounded-[0.9rem] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted)]">{copy.common.account}</p>
                      <p className="mt-2 text-base font-semibold text-white">{participant.displayName}</p>
                      <p className="mt-1 break-all text-xs text-[var(--color-muted)]">{participant.email}</p>
                      {participant.soccerverseUsername ? (
                        <p className="mt-1 text-xs text-[var(--color-muted)]">{copy.active.mainAccount} {participant.soccerverseUsername}</p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleSignOut()}
                      className="rounded-full border border-white/12 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white transition hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]"
                    >
                      {copy.common.signOut}
                    </button>
                  </div>
                </div>

                <div className="surface-row rounded-[0.9rem] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <p className="mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted)]">{copy.active.draftProgress}</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-[0.85rem] border border-white/8 bg-[rgba(255,255,255,0.03)] px-3 py-3">
                      <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">{copy.common.budgetLeft}</p>
                      <p className="mt-1 text-lg font-semibold tracking-tight text-[var(--color-accent)]">
                        {formatBudget(squad.budgetRemaining)}
                      </p>
                    </div>
                    <div className="rounded-[0.85rem] border border-white/8 bg-[rgba(255,255,255,0.03)] px-3 py-3">
                      <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">{copy.active.slotsFilled}</p>
                      <p className="mt-1 text-lg font-semibold tracking-tight text-white">{draftedCount} / 15</p>
                    </div>
                    <div className="rounded-[0.85rem] border border-white/8 bg-[rgba(255,255,255,0.03)] px-3 py-3 sm:col-span-2">
                      <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">{copy.active.scoreMultiplier}</p>
                      <p className="mt-1 text-lg font-semibold tracking-tight text-white">{formatMultiplier(activeScoreMultiplier)}</p>
                    </div>
                  </div>
                  {socialSharingUnlocked ? (
                    <div className="mt-4 rounded-[1.4rem] border border-[var(--color-accent)]/24 bg-[var(--color-accent)]/10 px-4 py-4">
                      <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-accent)]">{copy.active.shareStatus}</p>
                      <p className="mt-2 text-base font-semibold text-white">{copy.active.shareUnlocked}</p>
                      <p className="mt-1 text-sm text-[var(--color-muted)]">
                        {copy.active.shareBody}
                      </p>
                      <div className="mt-4">
                        <Link
                          to="/builder/share"
                          className="inline-flex rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:-translate-y-[1px] active:scale-[0.98]"
                        >
                          {copy.active.shareCta}
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
              <p className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">{copy.active.activeSlot}</p>
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
                  <span className="mono block whitespace-nowrap text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">{copy.common.budgetLeft}</span>
                  <span className="mt-1 block whitespace-nowrap text-base font-semibold text-[var(--color-accent)]">{formatBudget(squad.budgetRemaining)}</span>
                  <span className="mono mt-1 block whitespace-nowrap text-[10px] uppercase tracking-[0.14em] text-white/60">
                    {copy.active.cap} {formatBudget(squad.budgetLimit)}
                  </span>
                </span>
                <span className="budget-command-action">
                  <span className="mono text-[10px] uppercase tracking-[0.14em]">{copy.active.changeCap}</span>
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
                      <p className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-accent)]">{copy.active.budgetMenu}</p>
                      <p className="mt-1 text-sm text-[var(--color-muted)]">{copy.active.budgetMenuBody}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBudgetMenuOpen(false)}
                      className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/6"
                    >
                      {copy.common.close}
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
                            {isTooLow ? <span className="mt-0.5 block text-[11px] text-[var(--color-sand)]">{copy.active.removePlayersFirst}</span> : null}
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
              <p className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">{copy.active.drafted}</p>
              <p className="mt-1 text-base font-semibold text-white">{draftedCount} / {totalSlotCount}</p>
            </div>
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-3">
                <p className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">{copy.active.completion}</p>
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
                    <p className="eyebrow">{copy.active.teamPool}</p>
                    <h3 className="mt-2 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                      {selectedSlot ? slotClassCopy[selectedSlot.slotClass].pickLabel : copy.active.scoutingBoard}
                    </h3>
                    <p className="mt-2 text-sm text-[var(--color-muted)]">
                      {selectedSlot
                        ? `${compactSlotLabel(selectedSlot.label, copy)} ${copy.active.activeSlotSuffix}`
                        : copy.active.selectSlotToFilter}
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
                    label={copy.active.worldCupTeam}
                    teams={eventTeams}
                    value={selectedTeamCode}
                    placeholder={copy.active.worldCupTeamPlaceholder}
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
                    {teamPlayersLoading ? copy.active.loadingTeamPool : copy.active.refreshTeamPool}
                  </button>
                  <p className="self-center text-xs text-[var(--color-muted)]">{copy.active.autoLoad}</p>
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
                      <span className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">{copy.active.searchPlayers}</span>
                      <input
                        type="search"
                        value={playerSearch}
                        onChange={(event) => setPlayerSearch(event.target.value)}
                        placeholder={copy.active.searchPlaceholder}
                        className="mt-2 w-full rounded-[0.9rem] border border-white/10 bg-[rgba(8,13,12,0.78)] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)]/45"
                      />
                    </label>
                    <div className="rounded-[0.9rem] border border-white/8 bg-white/[0.03] px-4 py-3">
                      <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">{copy.active.shown}</p>
                      <p className="mt-1 text-sm font-semibold text-white">{visibleTeamPlayers.length} {copy.common.players}</p>
                    </div>
                  </div>
                </div>

                {selectedSlot?.player ? (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[0.9rem] border border-[var(--color-sand)]/20 bg-[var(--color-sand)]/8 px-3 py-2.5 text-sm text-[var(--color-paper)]">
                    <span>{copy.active.slotHasPrefix} {selectedSlot.player.displayName}. {copy.active.slotHasSuffix}</span>
                    {canEditSquad ? (
                      <button
                        type="button"
                        onClick={() => void handleRemove(selectedSlot.key)}
                        className="rounded-full border border-white/12 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-white/6"
                      >
                        {copy.active.removeFromSlot}
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
                    <EmptyState title={copy.active.noTeamTitle} body={copy.active.noTeamBody} />
                  </div>
                ) : null}

                {!teamPlayersLoading && selectedTeamCode && loadedTeamCode !== selectedTeamCode ? (
                  <div className="mt-6">
                    <EmptyState title={copy.active.teamLoadingTitle} body={copy.active.teamLoadingBody} />
                  </div>
                ) : null}

                {!teamPlayersLoading && selectedTeamCode && loadedTeamCode === selectedTeamCode && teamPlayers.length === 0 ? (
                  <div className="mt-6">
                    <EmptyState
                      title={copy.active.emptyTeamTitle}
                      body={copy.active.emptyTeamBody}
                    />
                  </div>
                ) : null}

                {!teamPlayersLoading && teamPlayers.length > 0 && visibleTeamPlayers.length === 0 ? (
                  <div className="mt-6">
                    <EmptyState title={copy.active.noPlayersTitle} body={copy.active.noPlayersBody} />
                  </div>
                ) : null}

                {visibleTeamPlayers.length > 0 ? (
                  <div className="mt-4 max-h-[54rem] space-y-2 overflow-y-auto pr-1">
                    {visibleTeamPlayers.map((player) => {
                      const selectedSlotIsOpen = Boolean(selectedSlot && !selectedSlot.player)
                      const isOverBudget = selectedSlotIsOpen && player.capCost > squad.budgetRemaining
                      const isNationFull =
                        selectedSlotIsOpen &&
                        (teamCountByCode.get(player.teamCode || player.nationalityCode) ?? 0) >= MAX_PLAYERS_PER_NATION
                      const actionDisabled = !canEditSquad || !selectedSlotIsOpen || isOverBudget || isNationFull
                      const actionLabel = !canEditSquad
                        ? copy.active.lockedAfterKickoff
                        : !selectedSlot
                          ? copy.active.selectSlot
                          : selectedSlot.player
                            ? copy.active.clearSlotFirst
                            : isOverBudget
                              ? copy.active.overBudget
                              : isNationFull
                                ? copy.active.nationFull
                                : `${copy.active.addTo} ${compactSlotLabel(selectedSlot.label, copy)}`
                      return (
                        <article
                          key={player.playerId}
                          className="scout-player-card rounded-[0.85rem] px-3 py-2.5 transition hover:-translate-y-[1px]"
                        >
                          <div className="grid gap-3 xl:grid-cols-[minmax(16rem,1fr)_minmax(0,35rem)] xl:items-center">
                            <PlayerTooltip
                              as="div"
                              className="flex min-w-0 items-center gap-3"
                              info={{
                                name: player.displayName,
                                nationCode: player.teamCode || player.nationalityCode,
                                imageUrl: player.imageUrl,
                                meta: [
                                  { label: 'Pos', value: player.positionMain ?? player.positions.join('/') },
                                ],
                              }}
                            >
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
                            </PlayerTooltip>

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
                <p className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">{copy.active.budgetMonitor}</p>
                <div className="mt-4 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-2xl font-semibold tracking-tight text-[var(--color-accent)]">{formatBudget(squad.budgetRemaining)}</p>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">{copy.active.remainingOf} {formatBudget(squad.budgetLimit)}</p>
                  </div>
                  <div className="rounded-full border border-white/10 px-3 py-1.5">
                    <span className="mono text-xs text-white">{formatBudget(squad.budgetUsed)} {copy.common.used}</span>
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
                    <p className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">{copy.active.currentSquad}</p>
                    <h3 className="mt-2 text-xl font-semibold tracking-tight text-white">4-3-3 + bench</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleReset()}
                    disabled={!canEditSquad}
                    className="rounded-full border border-white/12 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white transition hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]"
                  >
                    {copy.common.reset}
                  </button>
                </div>

                <div className="mt-4 rounded-[1rem] border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/10 px-3 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {squad.isLocked ? (competitionStarted ? copy.active.squadLocked : copy.active.squadSubmitted) : copy.active.readySubmit}
                      </p>
                      <p className="mt-1 text-xs leading-6 text-[var(--color-muted)]">
                        {squad.isLocked
                          ? canEditSquad
                            ? copy.active.editUntilKickoff
                            : copy.active.lockedAfterStart
                          : squadViolatesNationCap
                            ? copy.active.nationCapBreach
                            : copy.active.fillThenSubmit}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleLockSquad()}
                      disabled={squad.isLocked || draftedCount !== 15 || squadViolatesNationCap}
                      className="rounded-full bg-[var(--color-accent)] px-4 py-2 text-xs font-semibold text-[var(--color-ink)] transition hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
                    >
                      {squad.isLocked ? copy.active.submitted : copy.active.submitSquad}
                    </button>
                  </div>
                </div>

                {squad.isLocked ? (
                  <div className="mt-4 rounded-[1.4rem] border border-white/10 bg-black/15 px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {participant?.revealProfile ? copy.active.publicProfileLive : copy.active.readyToShare}
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted)]">
                          {participant?.revealSquad
                            ? copy.active.squadVisible
                            : copy.active.revealHelp}
                        </p>
                        {publicProfileUrl ? (
                          <Link to={publicProfileUrl} className="mt-3 inline-flex text-sm font-semibold text-[var(--color-accent)]">
                            {copy.active.openPublicProfile}
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
                          {copy.active.revealProfile}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleReveal(true)}
                          disabled={participant?.revealSquad}
                          className="rounded-full bg-[var(--color-accent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-ink)] transition hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
                        >
                          {copy.active.revealSquad}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}

                {squad.isLocked ? (
                  <SwapPanel squad={squad} copy={copy.swap} locale={locale} state={activeSwapState} onSwapped={refreshSwapState} />
                ) : null}

                <div className="mt-5">
                  <div className="squad-pitch">
                    {squadSlotBuckets.map((bucket) => (
                      <div key={bucket.slotClass} className={['pitch-line', `pitch-line-${bucket.slotClass.toLowerCase()}`].join(' ')}>
                        <div className="pitch-line-heading">
                          <span>{bucket.label}</span>
                          <button type="button" onClick={() => handleSelectSlotClass(bucket.slotClass)}>
                            {copy.active.scout} {bucket.slotClass}
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
                        <p className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">{copy.slots.selectedSlot}</p>
                        <h4 className="mt-1 truncate text-lg font-semibold text-white">{selectedSlotLabel}</h4>
                        <p className="mt-1 text-sm leading-6 text-[var(--color-muted)]">
                          {selectedSlot.player
                            ? `${selectedSlot.player.displayName} ${copy.slots.assignedHere}`
                            : `${copy.slots.pickCompatiblePrefix} ${selectedSlot.slotClass} ${copy.slots.pickCompatibleSuffix}`}
                        </p>
                      </div>
                      {selectedSlot.player && canEditSquad ? (
                        <button
                          type="button"
                          onClick={() => void handleRemove(selectedSlot.key)}
                          className="rounded-full border border-white/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]"
                        >
                          {copy.common.remove}
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
