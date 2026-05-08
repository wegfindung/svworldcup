import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { EmptyState } from '../components/EmptyState'
import { TeamFlag } from '../components/TeamFlag'
import {
  fetchAdminSession,
  fetchAdminTeams,
  fetchTeamSelections,
  loginAdmin,
  logoutAdmin,
  saveTeamSelections,
  searchTeamCandidates,
} from '../lib/api'
import type { AdminProfile, LocaleCode, SoccerversePlayer, TeamPoolPlayer, TeamSeed } from '../lib/types'

interface AdminPageProps {
  locale: LocaleCode
}

export function AdminPage({ locale: _locale }: AdminPageProps) {
  void _locale
  const [authState, setAuthState] = useState<'loading' | 'guest' | 'active'>('loading')
  const [admin, setAdmin] = useState<AdminProfile | null>(null)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loginBusy, setLoginBusy] = useState(false)
  const [teams, setTeams] = useState<Array<TeamSeed & { selectedCount: number }>>([])
  const [selectedTeamCode, setSelectedTeamCode] = useState<string>('GER')
  const [selections, setSelections] = useState<TeamPoolPlayer[]>([])
  const [candidates, setCandidates] = useState<SoccerversePlayer[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchBusy, setSearchBusy] = useState(false)
  const [saveBusy, setSaveBusy] = useState(false)
  const [panelError, setPanelError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const session = await fetchAdminSession()
        if (!active) {
          return
        }
        setAdmin(session.admin)
        setAuthState('active')
      } catch {
        if (!active) {
          return
        }
        setAuthState('guest')
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (authState !== 'active') {
      return
    }

    let active = true
    void fetchAdminTeams()
      .then((response) => {
        if (!active) {
          return
        }
        setTeams(response.items)
        if (!response.items.some((team) => team.code === selectedTeamCode)) {
          setSelectedTeamCode(response.items[0]?.code ?? 'GER')
        }
      })
      .catch((error) => {
        if (!active) {
          return
        }
        setPanelError(error instanceof Error ? error.message : 'Could not load the admin teams.')
      })

    return () => {
      active = false
    }
  }, [authState, selectedTeamCode])

  useEffect(() => {
    if (authState !== 'active' || !selectedTeamCode) {
      return
    }

    let active = true

    async function loadTeamSelections() {
      setPanelError(null)
      try {
        const response = await fetchTeamSelections(selectedTeamCode)
        if (!active) {
          return
        }
        setSelections(response.items)
      } catch (error) {
        if (!active) {
          return
        }
        setPanelError(error instanceof Error ? error.message : 'Could not load team selections.')
      }
    }

    void loadTeamSelections()

    return () => {
      active = false
    }
  }, [authState, selectedTeamCode])

  const selectedTeam = useMemo(
    () => teams.find((team) => team.code === selectedTeamCode) ?? null,
    [teams, selectedTeamCode],
  )

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoginBusy(true)
    setLoginError(null)

    try {
      const response = await loginAdmin(loginEmail, loginPassword)
      setAdmin(response.admin)
      setAuthState('active')
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Login failed.')
    } finally {
      setLoginBusy(false)
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

  if (authState === 'loading') {
    return (
      <div className="space-y-6 pb-12">
        <section className="hero-card rounded-[2.4rem] px-6 py-8 sm:px-8 sm:py-10">
          <div className="grid gap-3">
            <div className="skeleton h-24 rounded-[1.8rem]" />
            <div className="skeleton h-56 rounded-[1.8rem]" />
          </div>
        </section>
      </div>
    )
  }

  if (authState === 'guest') {
    return (
      <div className="mx-auto max-w-3xl pb-12">
        <section className="hero-card rounded-[2.4rem] px-6 py-8 sm:px-8 sm:py-10">
          <p className="eyebrow">admin access</p>
          <h2 className="section-title mt-6 max-w-[11ch]">Email and password backend access.</h2>
          <p className="mt-6 max-w-[58ch] text-lg leading-relaxed text-[var(--color-muted)]">
            Use the protected backend to preselect all 48 World Cup team pools before public drafting opens.
          </p>

          <form onSubmit={handleLogin} className="mt-8 grid gap-4 rounded-[1.9rem] border border-white/10 bg-black/15 p-5 sm:p-6">
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
    <div className="space-y-6 pb-12">
      <section className="hero-card rounded-[2.4rem] px-6 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="eyebrow">team preselection backend</p>
            <h2 className="section-title mt-6 max-w-[11ch]">Build the official World Cup team pools.</h2>
            <p className="mt-6 max-w-[58ch] text-lg leading-relaxed text-[var(--color-muted)]">
              Logged in as <span className="font-medium text-white">{admin?.email}</span>. Search by name or player ID, add candidates,
              then save the player pool for each nation.
            </p>
          </div>

          <button
            type="button"
            onClick={async () => {
              await logoutAdmin()
              setAdmin(null)
              setAuthState('guest')
            }}
            className="rounded-full border border-white/12 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]"
          >
            Sign out
          </button>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="glass-panel rounded-[2rem] p-5 sm:p-6">
          <p className="eyebrow">teams</p>
          <div className="mt-5 grid gap-2">
            {teams.map((team) => (
              <button
                key={team.code}
                type="button"
                onClick={() => {
                  setSelectedTeamCode(team.code)
                  setCandidates([])
                  setSearchQuery('')
                }}
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

        <div className="space-y-6">
          <div className="glass-panel rounded-[2rem] p-5 sm:p-6">
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
                disabled={saveBusy || !selectedTeamCode}
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
                        <img
                          src={player.imageUrl}
                          alt={player.displayName}
                          loading="lazy"
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
                {selections.length === 0 ? (
                  <EmptyState title="This team is still empty" body="Germany will already contain your first seed list once the backend seed is active." />
                ) : (
                  selections.map((player) => (
                    <article key={player.playerId} className="rounded-[1.4rem] border border-white/8 bg-black/15 p-4">
                      <div className="flex items-start gap-4">
                        <img
                          src={player.imageUrl}
                          alt={player.displayName}
                          loading="lazy"
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
