import { startTransition, useEffect, useMemo, useState, type FormEvent } from 'react'
import { EmptyState } from '../components/EmptyState'
import { TeamFlag } from '../components/TeamFlag'
import { TeamSelect } from '../components/TeamSelect'
import { useBootstrap } from '../hooks/useBootstrap'
import {
  assignSquadPlayer,
  fetchParticipantSession,
  fetchParticipantSquad,
  fetchTeamPlayers,
  logoutParticipant,
  registerParticipant,
  removeSquadPlayer,
  resendVerificationEmail,
  resetSquad,
} from '../lib/api'
import type { LeagueType, LocaleCode, ParticipantProfile, ParticipantSquad, TeamPoolPlayer } from '../lib/types'

interface BuilderPageProps {
  locale: LocaleCode
}

interface RegistrationFormState {
  mode: LeagueType
  displayName: string
  email: string
  soccerverseUsername: string
  primaryTeamCode?: string
  secondaryTeamCode?: string
}

const initialRegistrationForm: RegistrationFormState = {
  mode: 'rookie',
  displayName: '',
  email: '',
  soccerverseUsername: '',
}

function leagueLabel(mode: LeagueType) {
  return mode === 'veteran' ? 'Veteran league' : 'Rookie league'
}

function formatBudget(value: number) {
  return `${value.toLocaleString('en-US')} SVC`
}

export function BuilderPage({ locale: _locale }: BuilderPageProps) {
  void _locale
  const { data } = useBootstrap()
  const [accessState, setAccessState] = useState<'loading' | 'guest' | 'pending' | 'active'>('loading')
  const [participant, setParticipant] = useState<ParticipantProfile | null>(null)
  const [budgetLimit, setBudgetLimit] = useState(3_000_000)
  const [squad, setSquad] = useState<ParticipantSquad | null>(null)
  const [selectedTeamCode, setSelectedTeamCode] = useState<string | undefined>()
  const [teamPlayers, setTeamPlayers] = useState<TeamPoolPlayer[]>([])
  const [teamPlayersLoading, setTeamPlayersLoading] = useState(false)
  const [builderError, setBuilderError] = useState<string | null>(null)
  const [registrationForm, setRegistrationForm] = useState<RegistrationFormState>(initialRegistrationForm)
  const [registrationBusy, setRegistrationBusy] = useState(false)
  const [registrationError, setRegistrationError] = useState<string | null>(null)
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle')

  useEffect(() => {
    let active = true

    async function loadSession() {
      try {
        const session = await fetchParticipantSession()
        if (!active) {
          return
        }

        const squadResponse = await fetchParticipantSquad()
        if (!active) {
          return
        }

        setParticipant(session.participant)
        setBudgetLimit(session.budgetLimit)
        setSquad(squadResponse.squad)
        setSelectedTeamCode((current) => current ?? session.participant.primaryTeamCode)
        setAccessState('active')
      } catch {
        if (!active) {
          return
        }
        setAccessState('guest')
      }
    }

    void loadSession()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (accessState !== 'active' || !selectedTeamCode) {
      return
    }

    let active = true
    const teamCode = selectedTeamCode

    async function loadTeamPlayers() {
      setTeamPlayersLoading(true)
      setBuilderError(null)

      try {
        const response = await fetchTeamPlayers(teamCode)
        if (!active) {
          return
        }
        startTransition(() => {
          setTeamPlayers(response.items)
        })
      } catch (error) {
        if (!active) {
          return
        }
        setBuilderError(error instanceof Error ? error.message : 'Could not load the team pool.')
        setTeamPlayers([])
      } finally {
        if (active) {
          setTeamPlayersLoading(false)
        }
      }
    }

    void loadTeamPlayers()

    return () => {
      active = false
    }
  }, [accessState, selectedTeamCode])

  const selectedTeam = useMemo(
    () => data?.teams.find((team) => team.code === selectedTeamCode) ?? null,
    [data?.teams, selectedTeamCode],
  )

  const groupedSquadSlots = useMemo(() => {
    const slots = squad?.slots ?? []
    return {
      starters: slots.filter((slot) => slot.slotGroup === 'starter'),
      subs: slots.filter((slot) => slot.slotGroup === 'sub'),
    }
  }, [squad])

  function getOpenEligibleSlots(player: TeamPoolPlayer) {
    return (squad?.slots ?? []).filter((slot) => !slot.player && player.positionClasses.includes(slot.slotClass))
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setRegistrationBusy(true)
    setRegistrationError(null)
    setResendState('idle')

    try {
      if (!registrationForm.primaryTeamCode) {
        throw new Error('Choose a registration country first.')
      }

      const response = await registerParticipant({
        email: registrationForm.email,
        displayName: registrationForm.displayName,
        soccerverseUsername: registrationForm.mode === 'veteran' ? registrationForm.soccerverseUsername : undefined,
        primaryTeamCode: registrationForm.primaryTeamCode,
        secondaryTeamCode: registrationForm.secondaryTeamCode,
      })

      setSubmittedEmail(response.email)
      setAccessState('pending')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed.'
      if (message.toLowerCase().includes('already active')) {
        setSubmittedEmail(registrationForm.email)
        setAccessState('pending')
      }
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

  async function handleAssign(slotKey: string, playerId: number) {
    setBuilderError(null)
    try {
      const response = await assignSquadPlayer(slotKey, playerId)
      setSquad(response.squad)
    } catch (error) {
      setBuilderError(error instanceof Error ? error.message : 'Player could not be assigned.')
    }
  }

  async function handleRemove(slotKey: string) {
    setBuilderError(null)
    try {
      const response = await removeSquadPlayer(slotKey)
      setSquad(response.squad)
    } catch (error) {
      setBuilderError(error instanceof Error ? error.message : 'Player could not be removed.')
    }
  }

  async function handleReset() {
    const approved = window.confirm('Reset the full squad and restore the full budget?')
    if (!approved) {
      return
    }

    setBuilderError(null)
    try {
      const response = await resetSquad()
      setSquad(response.squad)
    } catch (error) {
      setBuilderError(error instanceof Error ? error.message : 'Squad reset failed.')
    }
  }

  if (accessState === 'loading') {
    return (
      <div className="space-y-6 pb-12">
        <section className="hero-card rounded-[2.4rem] px-6 py-8 sm:px-8 sm:py-10">
          <p className="eyebrow">builder workflow</p>
          <div className="mt-8 grid gap-3">
            <div className="skeleton h-28 rounded-[1.8rem]" />
            <div className="skeleton h-28 rounded-[1.8rem]" />
            <div className="skeleton h-48 rounded-[1.8rem]" />
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      {accessState !== 'active' ? (
        <section className="grid gap-6 lg:grid-cols-[1.18fr_0.82fr]">
          <div className="hero-card rounded-[2.4rem] px-6 py-8 sm:px-8 sm:py-10">
            <p className="eyebrow">registration workflow</p>
            <h2 className="section-title mt-6 max-w-[11ch]">Register first. Build after email confirmation.</h2>
            <p className="mt-6 max-w-[58ch] text-lg leading-relaxed text-[var(--color-muted)]">
              One email, one entry, one hidden draft. The verification link is what unlocks the builder and your starting wage budget.
            </p>

            <div className="mt-8 rounded-[1.6rem] border border-amber-300/20 bg-amber-300/8 p-4">
              <p className="mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-sand)]">policy</p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-paper)]">No multi-accounting allowed.</p>
            </div>

            {accessState === 'guest' ? (
              <form onSubmit={handleRegister} className="mt-8 grid gap-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  {(['rookie', 'veteran'] as LeagueType[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setRegistrationForm((current) => ({ ...current, mode, soccerverseUsername: mode === 'rookie' ? '' : current.soccerverseUsername }))}
                      className={[
                        'rounded-[1.7rem] border px-5 py-5 text-left transition duration-300 ease-out active:scale-[0.99]',
                        registrationForm.mode === mode
                          ? 'border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10'
                          : 'border-white/10 bg-black/15 hover:border-white/20 hover:bg-white/6',
                      ].join(' ')}
                    >
                      <p className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">{mode}</p>
                      <p className="mt-3 text-lg font-semibold text-white">
                        {mode === 'rookie' ? 'I have no Soccerverse account' : 'I have at least 1 Soccerverse account'}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
                        {mode === 'rookie'
                          ? 'Beginner-friendly entry with no ownership bonus.'
                          : 'Provide your main Soccerverse account and enter the veteran table.'}
                      </p>
                    </button>
                  ))}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">Nickname</span>
                    <input
                      required
                      value={registrationForm.displayName}
                      onChange={(event) =>
                        setRegistrationForm((current) => ({
                          ...current,
                          displayName: event.target.value,
                        }))
                      }
                      placeholder="Display name"
                      className="rounded-[1.2rem] border border-white/10 bg-black/15 px-4 py-3 text-white outline-none transition focus:border-[var(--color-accent)]"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">Email address</span>
                    <input
                      required
                      type="email"
                      value={registrationForm.email}
                      onChange={(event) =>
                        setRegistrationForm((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                      placeholder="name@example.com"
                      className="rounded-[1.2rem] border border-white/10 bg-black/15 px-4 py-3 text-white outline-none transition focus:border-[var(--color-accent)]"
                    />
                  </label>
                </div>

                {registrationForm.mode === 'veteran' ? (
                  <label className="grid gap-2">
                    <span className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">Main Soccerverse account</span>
                    <input
                      required
                      value={registrationForm.soccerverseUsername}
                      onChange={(event) =>
                        setRegistrationForm((current) => ({
                          ...current,
                          soccerverseUsername: event.target.value,
                        }))
                      }
                      placeholder="Soccerverse username"
                      className="rounded-[1.2rem] border border-white/10 bg-black/15 px-4 py-3 text-white outline-none transition focus:border-[var(--color-accent)]"
                    />
                  </label>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <TeamSelect
                    label="Registration country"
                    teams={data?.teams ?? []}
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
                    teams={data?.teams ?? []}
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

                {registrationError ? (
                  <div className="rounded-[1.3rem] border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-sm text-[var(--color-paper)]">
                    {registrationError}
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
            ) : null}

            {accessState === 'pending' ? (
              <div className="mt-8 space-y-5 rounded-[1.8rem] border border-white/10 bg-black/15 p-6">
                <p className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-accent)]">step 2</p>
                <h3 className="text-3xl font-semibold tracking-tight text-white">Confirm the email to unlock the builder.</h3>
                <p className="max-w-[58ch] text-base leading-relaxed text-[var(--color-muted)]">
                  We sent the access link to <span className="font-medium text-white">{submittedEmail}</span>. Once you open it, your
                  participant session is activated and the full {formatBudget(budgetLimit)} budget becomes available.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendState === 'sending'}
                    className="rounded-full border border-white/12 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-[1px] hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
                  >
                    {resendState === 'sending' ? 'Sending…' : resendState === 'sent' ? 'Email sent again' : 'Resend email'}
                  </button>
                </div>
                {registrationError ? (
                  <div className="rounded-[1.3rem] border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-sm text-[var(--color-paper)]">
                    {registrationError}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="grid gap-4">
            <div className="glass-panel rounded-[1.9rem] p-5">
              <p className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">workflow</p>
              <div className="mt-5 space-y-3">
                {[
                  ['1', 'Register', 'Choose rookie or veteran, then enter nickname, email, and countries.'],
                  ['2', 'Verify email', 'The confirmation link activates the participant session.'],
                  ['3', 'Build squad', 'Draft from the preselected World Cup team pools under the cap.'],
                ].map(([step, title, body]) => (
                  <div key={step} className="rounded-[1.4rem] border border-white/8 bg-black/15 px-4 py-4">
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

            <div className="glass-panel rounded-[1.9rem] p-5">
              <p className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">league split</p>
              <div className="mt-5 grid gap-3">
                {(['rookie', 'veteran'] as LeagueType[]).map((mode) => (
                  <div key={mode} className="rounded-[1.4rem] border border-white/8 bg-black/15 px-4 py-4">
                    <p className="text-base font-semibold text-white">{leagueLabel(mode)}</p>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
                      {mode === 'rookie'
                        ? 'No ownership bonus. Enter without a Soccerverse account.'
                        : '1% bonus for every 10 influence on drafted players, capped at 10%.'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {accessState === 'active' && participant && squad ? (
        <section className="space-y-6">
          <div className="hero-card rounded-[2.4rem] px-6 py-8 sm:px-8 sm:py-10">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div>
                <p className="eyebrow">step 3 · squad builder</p>
                <h2 className="section-title mt-6 max-w-[10ch]">Draft the hidden squad under one fixed cap.</h2>
                <p className="mt-6 max-w-[60ch] text-lg leading-relaxed text-[var(--color-muted)]">
                  Verified as <span className="font-medium text-white">{participant.displayName}</span> in the{' '}
                  <span className="font-medium text-[var(--color-accent)]">{leagueLabel(participant.leagueType)}</span>. Draft from the
                  admin-curated team pools and lock every slot before kickoff.
                </p>
              </div>

              <div className="glass-panel min-w-[17rem] rounded-[1.8rem] p-5">
                <p className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">account</p>
                <p className="mt-3 text-xl font-semibold text-white">{participant.displayName}</p>
                <p className="mt-2 text-sm text-[var(--color-muted)]">{participant.email}</p>
                {participant.soccerverseUsername ? (
                  <p className="mt-2 text-sm text-[var(--color-muted)]">Main Soccerverse account: {participant.soccerverseUsername}</p>
                ) : null}
                <button
                  type="button"
                  onClick={async () => {
                    await logoutParticipant()
                    setParticipant(null)
                    setSquad(null)
                    setTeamPlayers([])
                    setSelectedTeamCode(undefined)
                    setAccessState('guest')
                    setRegistrationForm(initialRegistrationForm)
                  }}
                  className="mt-5 rounded-full border border-white/12 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.14fr_0.86fr]">
            <div className="space-y-6">
              <div className="glass-panel rounded-[2rem] p-5 sm:p-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="eyebrow">team pool</p>
                    <h3 className="mt-3 text-3xl font-semibold tracking-tight text-white">Choose one nation, then one player.</h3>
                  </div>
                  {selectedTeam ? (
                    <div className="flex items-center gap-3 rounded-full border border-white/10 bg-black/15 px-4 py-2">
                      <TeamFlag teamCode={selectedTeam.code} label={selectedTeam.nameEn} size="sm" />
                      <span className="text-sm font-medium text-white">{selectedTeam.nameEn}</span>
                    </div>
                  ) : null}
                </div>

                <div className="mt-6 max-w-xl">
                  <TeamSelect
                    label="World Cup team"
                    teams={data?.teams ?? []}
                    value={selectedTeamCode}
                    placeholder="Select a World Cup team"
                    onChange={setSelectedTeamCode}
                  />
                </div>

                {builderError ? (
                  <div className="mt-5 rounded-[1.3rem] border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-sm text-[var(--color-paper)]">
                    {builderError}
                  </div>
                ) : null}

                {teamPlayersLoading ? (
                  <div className="mt-6 grid gap-3 md:grid-cols-2">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div key={index} className="skeleton h-44 rounded-[1.6rem]" />
                    ))}
                  </div>
                ) : null}

                {!teamPlayersLoading && !selectedTeamCode ? (
                  <div className="mt-6">
                    <EmptyState title="No team selected yet" body="Pick a World Cup team from the dropdown to load the preselected player pool." />
                  </div>
                ) : null}

                {!teamPlayersLoading && selectedTeamCode && teamPlayers.length === 0 ? (
                  <div className="mt-6">
                    <EmptyState
                      title="This team pool is still empty"
                      body="An admin still has to preselect the eligible World Cup squad for this nation before participants can draft from it."
                    />
                  </div>
                ) : null}

                {teamPlayers.length > 0 ? (
                  <div className="mt-6 grid gap-3 md:grid-cols-2">
                    {teamPlayers.map((player) => {
                      const openSlots = getOpenEligibleSlots(player)
                      return (
                        <article key={player.playerId} className="rounded-[1.6rem] border border-white/8 bg-black/15 p-4">
                          <div className="flex items-start gap-4">
                            <img
                              src={player.imageUrl}
                              alt={player.displayName}
                              loading="lazy"
                              width={84}
                              height={84}
                              className="h-20 w-20 rounded-[1.2rem] border border-white/10 object-cover"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-lg font-semibold text-white">{player.displayName}</p>
                                  <p className="mt-1 text-sm text-[var(--color-muted)]">{player.playerId}</p>
                                </div>
                                <div className="rounded-full border border-white/10 px-3 py-1">
                                  <span className="mono text-sm text-[var(--color-accent)]">{player.rating}</span>
                                </div>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {player.positions.map((positionCode) => (
                                  <span
                                    key={`${player.playerId}-${positionCode}`}
                                    className="mono rounded-full border border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]"
                                  >
                                    {positionCode}
                                  </span>
                                ))}
                              </div>
                              <p className="mt-4 text-sm font-medium text-white">{formatBudget(player.capCost)}</p>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            {openSlots.length === 0 ? (
                              <span className="rounded-full border border-white/10 px-3 py-2 text-xs text-[var(--color-muted)]">
                                No open eligible slot
                              </span>
                            ) : (
                              openSlots.map((slot) => (
                                <button
                                  key={`${player.playerId}-${slot.key}`}
                                  type="button"
                                  onClick={() => void handleAssign(slot.key, player.playerId)}
                                  className="rounded-full bg-[var(--color-accent)]/12 px-3 py-2 text-xs font-semibold text-[var(--color-accent)] transition hover:-translate-y-[1px] hover:bg-[var(--color-accent)]/18 active:scale-[0.98]"
                                >
                                  Add to {slot.label}
                                </button>
                              ))
                            )}
                          </div>
                        </article>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-4">
              <div className="glass-panel rounded-[1.9rem] p-5">
                <p className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">budget monitor</p>
                <div className="mt-5 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-3xl font-semibold tracking-tight text-[var(--color-accent)]">{formatBudget(squad.budgetRemaining)}</p>
                    <p className="mt-2 text-sm text-[var(--color-muted)]">Remaining of {formatBudget(squad.budgetLimit)}</p>
                  </div>
                  <div className="rounded-full border border-white/10 px-4 py-2">
                    <span className="mono text-sm text-white">{formatBudget(squad.budgetUsed)} used</span>
                  </div>
                </div>
                <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/6">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-accent),#d7a85b)] transition-all duration-300"
                    style={{ width: `${Math.min(100, (squad.budgetUsed / squad.budgetLimit) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="glass-panel rounded-[1.9rem] p-5">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">current squad</p>
                    <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">4-3-3 starters + 4 locked subs</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleReset()}
                    className="rounded-full border border-white/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]"
                  >
                    Reset
                  </button>
                </div>

                <div className="mt-5 space-y-4">
                  <div className="space-y-2">
                    <p className="mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-muted)]">starters</p>
                    {groupedSquadSlots.starters.map((slot) => (
                      <div key={slot.key} className="rounded-[1.3rem] border border-white/8 bg-black/15 px-4 py-3">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-white">{slot.label}</p>
                            <p className="mono mt-1 text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">{slot.slotClass}</p>
                          </div>
                          {slot.player ? (
                            <button
                              type="button"
                              onClick={() => void handleRemove(slot.key)}
                              className="rounded-full border border-white/12 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white transition hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]"
                            >
                              Delete
                            </button>
                          ) : null}
                        </div>
                        {slot.player ? (
                          <div className="mt-3 flex items-center gap-3">
                            <img
                              src={slot.player.imageUrl}
                              alt={slot.player.displayName}
                              loading="lazy"
                              width={52}
                              height={52}
                              className="h-12 w-12 rounded-xl border border-white/10 object-cover"
                            />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-white">{slot.player.displayName}</p>
                              <p className="mt-1 text-xs text-[var(--color-muted)]">{formatBudget(slot.player.capCost)}</p>
                            </div>
                          </div>
                        ) : (
                          <p className="mt-3 text-sm text-[var(--color-muted)]">Empty slot</p>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <p className="mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-muted)]">subs</p>
                    {groupedSquadSlots.subs.map((slot) => (
                      <div key={slot.key} className="rounded-[1.3rem] border border-white/8 bg-black/15 px-4 py-3">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-white">{slot.label}</p>
                            <p className="mono mt-1 text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">{slot.slotClass}</p>
                          </div>
                          {slot.player ? (
                            <button
                              type="button"
                              onClick={() => void handleRemove(slot.key)}
                              className="rounded-full border border-white/12 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white transition hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]"
                            >
                              Delete
                            </button>
                          ) : null}
                        </div>
                        {slot.player ? (
                          <div className="mt-3 flex items-center gap-3">
                            <img
                              src={slot.player.imageUrl}
                              alt={slot.player.displayName}
                              loading="lazy"
                              width={52}
                              height={52}
                              className="h-12 w-12 rounded-xl border border-white/10 object-cover"
                            />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-white">{slot.player.displayName}</p>
                              <p className="mt-1 text-xs text-[var(--color-muted)]">{formatBudget(slot.player.capCost)}</p>
                            </div>
                          </div>
                        ) : (
                          <p className="mt-3 text-sm text-[var(--color-muted)]">Empty slot</p>
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
