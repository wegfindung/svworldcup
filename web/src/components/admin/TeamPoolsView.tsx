import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { EmptyState } from '../EmptyState'
import { PlayerPortrait } from '../PlayerPortrait'
import { PlayerTooltip } from '../PlayerTooltip'
import { TeamFlag } from '../TeamFlag'
import { eventTeams } from '../../data/eventConfig'
import { fetchAdminTeams, fetchTeamSelections, saveTeamSelections, searchTeamCandidates } from '../../lib/api'
import type { SoccerversePlayer, TeamPoolPlayer, TeamSeed } from '../../lib/types'

export function TeamPoolsView() {
  const [teams, setTeams] = useState<Array<TeamSeed & { selectedCount: number }>>(() =>
    eventTeams.map((team) => ({
      ...team,
      selectedCount: 0,
    })),
  )
  const [teamsBusy, setTeamsBusy] = useState(true)
  const [selectedTeamCode, setSelectedTeamCode] = useState<string>('GER')
  const [loadedTeamCode, setLoadedTeamCode] = useState<string | null>(null)
  const [selections, setSelections] = useState<TeamPoolPlayer[]>([])
  const [candidates, setCandidates] = useState<SoccerversePlayer[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchAllCountries, setSearchAllCountries] = useState(false)
  const [searchBusy, setSearchBusy] = useState(false)
  const [saveBusy, setSaveBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedTeam = useMemo(
    () => teams.find((team) => team.code === selectedTeamCode) ?? null,
    [teams, selectedTeamCode],
  )

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const response = await fetchAdminTeams()
        if (!active) {
          return
        }
        setTeams(response.items)
        setSelectedTeamCode((current) =>
          response.items.some((team) => team.code === current) ? current : response.items[0]?.code ?? 'GER',
        )
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Could not load teams.')
        }
      } finally {
        if (active) {
          setTeamsBusy(false)
        }
      }
    })()
    return () => {
      active = false
    }
  }, [])

  async function handleLoadTeamSelections(teamCode: string) {
    setSelectedTeamCode(teamCode)
    setLoadedTeamCode(null)
    setSelections([])
    setCandidates([])
    setSearchQuery('')
    setError(null)

    try {
      const response = await fetchTeamSelections(teamCode)
      setSelections(response.items)
      setLoadedTeamCode(teamCode)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load team selections.')
      setLoadedTeamCode(null)
    }
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedTeamCode) {
      return
    }

    setSearchBusy(true)
    setError(null)
    try {
      const response = await searchTeamCandidates(selectedTeamCode, searchQuery, searchAllCountries)
      setCandidates(response.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Candidate search failed.')
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
    setError(null)
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Saving team selections failed.')
    } finally {
      setSaveBusy(false)
    }
  }

  return (
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

          {error ? (
            <div className="mt-5 rounded-[1.3rem] border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-sm text-[var(--color-paper)]">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSearch} className="mt-6 flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row">
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
            </div>
            <label className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
              <input
                type="checkbox"
                checked={searchAllCountries}
                onChange={(event) => setSearchAllCountries(event.target.checked)}
                className="h-4 w-4 accent-[var(--color-accent)]"
              />
              Search full player database (ignore nation — Soccerverse stores only one country per player)
            </label>
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
                          <PlayerTooltip
                            as="div"
                            info={{
                              name: player.displayName,
                              nationCode: player.nationalityCode,
                              imageUrl: player.imageUrl,
                              meta: [
                                { label: 'Rating', value: String(player.rating) },
                                { label: 'Pos', value: player.positionMain ?? player.positions.join('/') },
                              ],
                            }}
                          >
                            <p className="truncate text-base font-semibold text-white">{player.displayName}</p>
                            <p className="mt-1 text-sm text-[var(--color-muted)]">ID {player.playerId}</p>
                          </PlayerTooltip>
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
                          <PlayerTooltip
                            as="div"
                            info={{
                              name: player.displayName,
                              nationCode: player.teamCode || player.nationalityCode,
                              imageUrl: player.imageUrl,
                              meta: [
                                { label: 'Rating', value: String(player.rating) },
                                { label: 'Pos', value: player.positionMain ?? player.positions.join('/') },
                              ],
                            }}
                          >
                            <p className="truncate text-base font-semibold text-white">{player.displayName}</p>
                            <p className="mt-1 text-sm text-[var(--color-muted)]">ID {player.playerId}</p>
                          </PlayerTooltip>
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
  )
}
