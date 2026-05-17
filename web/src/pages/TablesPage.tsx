import { useEffect, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { TeamFlag } from '../components/TeamFlag'
import { defaultScoring, eventTeams } from '../data/eventConfig'
import { fetchMatchResults, fetchNationLeaderboard, fetchRookieLeaderboard, fetchVeteranLeaderboard } from '../lib/api'
import type {
  NationScoreRow,
  ParticipantScoreFixtureDetail,
  ParticipantScorePlayerDetail,
  ParticipantScoreRow,
  PublicFixtureResult,
} from '../lib/types'

interface TablesPayload {
  rookies: ParticipantScoreRow[]
  veterans: ParticipantScoreRow[]
  nations: NationScoreRow[]
  fixtureLookup: Map<string, PublicFixtureResult>
}

async function loadTablesPayload(): Promise<TablesPayload> {
  const [rookieResponse, veteranResponse, nationResponse, matchResponse] = await Promise.all([
    fetchRookieLeaderboard(),
    fetchVeteranLeaderboard(),
    fetchNationLeaderboard(),
    fetchMatchResults(),
  ])
  return {
    rookies: rookieResponse.items,
    veterans: veteranResponse.items,
    nations: nationResponse.items,
    fixtureLookup: new Map(matchResponse.items.map((result) => [result.fixtureId, result])),
  }
}

function formatScore(value: number) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  })
}

function formatMultiplier(value: number) {
  return `x${value.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: value % 1 === 0 ? 0 : 2 })}`
}

function BreakdownPill({ label, count, points }: { label: string; count?: number; points: number }) {
  return (
    <span className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 text-[11px] text-[var(--color-muted)]">
      <span className="font-medium text-white">{label}</span>{' '}
      {count !== undefined ? <span>{count} · </span> : null}
      <span className="mono text-[var(--color-accent)]">{formatScore(points)}</span>
    </span>
  )
}

function teamName(teamCode: string) {
  return eventTeams.find((team) => team.code === teamCode)?.nameEn ?? teamCode
}

function matchLabel(fixtureId: string, fixtureLookup: Map<string, PublicFixtureResult>) {
  const fixture = fixtureLookup.get(fixtureId)
  if (!fixture) {
    return fixtureId
  }

  const score = fixture.status === 'final' ? `${fixture.homeGoals}-${fixture.awayGoals}` : 'vs'
  return `${fixture.homeTeamCode} ${score} ${fixture.awayTeamCode}`
}

function DetailStat({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-full border border-white/8 bg-black/14 px-2 py-1 text-[10px] text-[var(--color-muted)]">
      <span className="font-semibold text-white">{label}</span> <span className="mono text-[var(--color-accent)]">{formatScore(value)}</span>
    </span>
  )
}

function PlayerScoreDetail({ player }: { player: ParticipantScorePlayerDetail }) {
  return (
    <div className="grid gap-3 rounded-[0.75rem] border border-white/8 bg-black/14 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <TeamFlag teamCode={player.teamCode} label={player.teamCode} size="sm" />
          <p className="truncate text-xs font-semibold text-white">{player.displayName}</p>
          <span className="mono rounded-full border border-white/8 px-2 py-0.5 text-[9px] text-[var(--color-muted)]">{player.slotClass}</span>
        </div>
        <p className="mono mt-1 text-[10px] uppercase tracking-[0.12em] text-[var(--color-muted)]">
          {player.slotGroup} - {player.minutes}' - ID {player.playerId}
          {player.rating !== undefined ? ` - Rating ${player.rating}` : ''}
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5 sm:justify-end">
        <DetailStat label="G" value={player.goalPoints} />
        <DetailStat label="A" value={player.assistPoints} />
        <DetailStat label="Apps" value={player.appearancePoints} />
        <DetailStat label="60+" value={player.minutesPoints} />
        <DetailStat label="CS" value={player.cleanSheetPoints} />
        <DetailStat label="Perf" value={player.performancePoints} />
        <span className="rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-2 py-1 text-[10px] text-[var(--color-accent)]">
          Total {formatScore(player.totalPoints)}
        </span>
      </div>
    </div>
  )
}

function FixtureScoreDetail({ fixture, fixtureLookup }: { fixture: ParticipantScoreFixtureDetail; fixtureLookup: Map<string, PublicFixtureResult> }) {
  const result = fixtureLookup.get(fixture.fixtureId)
  return (
    <div className="rounded-[0.85rem] border border-white/8 bg-white/[0.025] p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {result ? <TeamFlag teamCode={result.homeTeamCode} label={teamName(result.homeTeamCode)} size="sm" /> : null}
          <p className="truncate text-sm font-semibold text-white">{matchLabel(fixture.fixtureId, fixtureLookup)}</p>
          {result ? <TeamFlag teamCode={result.awayTeamCode} label={teamName(result.awayTeamCode)} size="sm" /> : null}
        </div>
        <span className="mono text-xs text-[var(--color-accent)]">{formatScore(fixture.totalPoints)} pts</span>
      </div>
      <div className="grid gap-1.5">{fixture.players.map((player) => <PlayerScoreDetail key={`${fixture.fixtureId}-${player.slotKey}-${player.playerId}`} player={player} />)}</div>
    </div>
  )
}

function ParticipantTable({ title, rows, fixtureLookup }: { title: string; rows: ParticipantScoreRow[]; fixtureLookup: Map<string, PublicFixtureResult> }) {
  const [openParticipantIds, setOpenParticipantIds] = useState<Set<string>>(new Set())

  function toggleParticipant(participantId: string) {
    setOpenParticipantIds((current) => {
      const next = new Set(current)
      if (next.has(participantId)) {
        next.delete(participantId)
      } else {
        next.add(participantId)
      }
      return next
    })
  }

  return (
    <section className="glass-panel rounded-[1.15rem] p-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-[10px]">league table</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">{title}</h3>
        </div>
        <span className="mono text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">{rows.length} entries</span>
      </div>

      <div className="mt-4 overflow-hidden rounded-[0.9rem] border border-white/8">
        {rows.length ? (
          <div className="divide-y divide-white/8">
            {rows.map((row) => {
              const isOpen = openParticipantIds.has(row.participantId)
              return (
                <div key={row.participantId} className="bg-black/12 px-3.5 py-3 transition hover:bg-white/5">
                  <div className="grid grid-cols-[3.25rem_1fr] gap-3 sm:grid-cols-[3.25rem_1fr_auto] sm:items-start">
                    <span className="mono text-sm text-[var(--color-accent)]">#{row.rank}</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{row.displayName}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-[var(--color-muted)]">
                        <TeamFlag teamCode={row.primaryTeamCode} label={row.primaryTeamCode} size="sm" />
                        <span>{row.primaryTeamCode}</span>
                        {row.secondaryTeamCode ? (
                          <>
                            <span className="text-white/25">+</span>
                            <TeamFlag teamCode={row.secondaryTeamCode} label={row.secondaryTeamCode} size="sm" />
                            <span>{row.secondaryTeamCode}</span>
                          </>
                        ) : null}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <BreakdownPill label="G" count={row.breakdown.goals.count} points={row.breakdown.goals.points} />
                        <BreakdownPill label="A" count={row.breakdown.assists.count} points={row.breakdown.assists.points} />
                        <BreakdownPill label="Apps" count={row.breakdown.appearances.count} points={row.breakdown.appearances.points} />
                        <BreakdownPill label="60+" count={row.breakdown.minutes.count} points={row.breakdown.minutes.points} />
                        <BreakdownPill label="CS" count={row.breakdown.cleanSheets.count} points={row.breakdown.cleanSheets.points} />
                        <BreakdownPill label="Perf" points={row.breakdown.performance.points} />
                      </div>
                    </div>
                    <div className="col-span-2 text-right sm:col-span-1">
                      <p className="mono text-lg text-white">{formatScore(row.totalScore)}</p>
                      <p className="mt-1 text-[11px] text-[var(--color-muted)]">base {formatScore(row.baseScore)}</p>
                      <p className="mt-1 text-[11px] text-[var(--color-muted)]">budget {formatMultiplier(row.scoreMultiplier)}</p>
                      {row.bonusPercent > 0 ? <p className="text-xs text-[var(--color-accent)]">+{row.bonusPercent}%</p> : null}
                      <button
                        type="button"
                        onClick={() => toggleParticipant(row.participantId)}
                        disabled={!row.fixtures.length}
                        className="mt-2 rounded-full border border-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white transition hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {isOpen ? 'Hide details' : 'Score details'}
                      </button>
                    </div>
                  </div>
                  {isOpen ? (
                    <div className="mt-3 grid gap-2 border-t border-white/8 pt-3">
                      {row.fixtures.map((fixture) => (
                        <FixtureScoreDetail key={fixture.fixtureId} fixture={fixture} fixtureLookup={fixtureLookup} />
                      ))}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-black/12 p-5">
            <EmptyState title="No active entries yet" body="Standings will populate as soon as verified participants enter the tournament." />
          </div>
        )}
      </div>
    </section>
  )
}

function NationTable({ rows }: { rows: NationScoreRow[] }) {
  const [openTeamCodes, setOpenTeamCodes] = useState<Set<string>>(new Set())

  function toggleTeam(teamCode: string) {
    setOpenTeamCodes((current) => {
      const next = new Set(current)
      if (next.has(teamCode)) {
        next.delete(teamCode)
      } else {
        next.add(teamCode)
      }
      return next
    })
  }

  return (
    <section className="glass-panel rounded-[1.15rem] p-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-[10px]">country ranking</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">Nation ranking</h3>
        </div>
        <span className="mono text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">{rows.length} nations</span>
      </div>

      <div className="mt-4 overflow-hidden rounded-[0.9rem] border border-white/8">
        {rows.length ? (
          <div className="divide-y divide-white/8">
            {rows.map((row) => {
              const isOpen = openTeamCodes.has(row.teamCode)
              return (
                <div key={row.teamCode} className="bg-black/12 px-3.5 py-3 transition hover:bg-white/5">
                  <div className="grid grid-cols-[3.25rem_1fr] gap-3 sm:grid-cols-[3.25rem_1fr_auto] sm:items-start">
                    <span className="mono text-sm text-[var(--color-accent)]">#{row.rank}</span>
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <TeamFlag teamCode={row.teamCode} label={teamName(row.teamCode)} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{teamName(row.teamCode)}</p>
                          <p className="mono mt-0.5 text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">
                            {row.teamCode} - {row.participantCount} managers
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <BreakdownPill label="Avg" points={row.averageScore} />
                        <BreakdownPill label="Top" points={row.topScore} />
                      </div>
                    </div>
                    <div className="col-span-2 text-right sm:col-span-1">
                      <p className="mono text-lg text-white">{formatScore(row.averageScore)}</p>
                      <p className="mt-1 text-[11px] text-[var(--color-muted)]">average score</p>
                      <button
                        type="button"
                        onClick={() => toggleTeam(row.teamCode)}
                        className="mt-2 rounded-full border border-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white transition hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)]"
                      >
                        {isOpen ? 'Hide managers' : 'Managers'}
                      </button>
                    </div>
                  </div>

                  {isOpen ? (
                    <div className="mt-3 grid gap-1.5 border-t border-white/8 pt-3">
                      {row.contributors.map((contributor) => (
                        <div
                          key={`${row.teamCode}-${contributor.participantId}`}
                          className="grid gap-2 rounded-[0.75rem] border border-white/8 bg-black/14 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-white">
                              #{contributor.rank} {contributor.displayName}
                            </p>
                            <div className="mt-1 flex items-center gap-2 text-[10px] text-[var(--color-muted)]">
                              <TeamFlag teamCode={contributor.primaryTeamCode} label={contributor.primaryTeamCode} size="sm" />
                              <span>{contributor.primaryTeamCode}</span>
                              {contributor.secondaryTeamCode ? (
                                <>
                                  <span className="text-white/25">+</span>
                                  <TeamFlag teamCode={contributor.secondaryTeamCode} label={contributor.secondaryTeamCode} size="sm" />
                                  <span>{contributor.secondaryTeamCode}</span>
                                </>
                              ) : null}
                              <span className="rounded-full border border-white/8 px-2 py-0.5 uppercase">{contributor.leagueType}</span>
                            </div>
                          </div>
                          <span className="mono text-sm text-white">{formatScore(contributor.totalScore)}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-black/12 p-5">
            <EmptyState title="No nation ranking yet" body="A country enters the table as soon as one active manager is attached to it." />
          </div>
        )}
      </div>
    </section>
  )
}

export function TablesPage() {
  const [tablesPromise, setTablesPromise] = useState<Promise<TablesPayload> | null>(() => loadTablesPayload())
  const [tables, setTables] = useState<TablesPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const promise = tablesPromise
    if (!promise) {
      return
    }

    let active = true
    promise
      .then((payload) => {
        if (active) {
          setTables(payload)
          setError(null)
        }
      })
      .catch((loadError) => {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Could not load public tables.')
        }
      })

    return () => {
      active = false
    }
  }, [tablesPromise])

  function refreshTables() {
    setTables(null)
    setError(null)
    setTablesPromise(loadTablesPayload())
  }

  return (
    <div className="space-y-4 pb-10">
      <section className="hero-card rounded-[1.25rem] px-5 py-6 sm:px-6">
        <p className="eyebrow">public standings</p>
        <div className="mt-5 grid items-end gap-6 lg:grid-cols-[1fr_auto]">
          <div>
            <h2 className="section-title max-w-[12ch]">Rookie and veteran tables in one place.</h2>
            <p className="mt-4 max-w-[66ch] text-base leading-relaxed text-[var(--color-muted)]">
              Every active participant can appear here, even before the first points land. Scores update as match data is entered, and ties are resolved by earlier registration.
            </p>
          </div>
          <button
            type="button"
            onClick={refreshTables}
            className="premium-button h-11 px-6 text-sm font-semibold"
          >
            Refresh tables
          </button>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="glass-panel rounded-[1.15rem] p-4">
          <p className="eyebrow text-[10px]">scoring profile</p>
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div className="surface-row rounded-[0.85rem] p-3">
              <p className="text-[var(--color-muted)]">Goal</p>
              <p className="mono mt-2 text-xl text-white">{defaultScoring.goal}</p>
            </div>
            <div className="surface-row rounded-[0.85rem] p-3">
              <p className="text-[var(--color-muted)]">Assist</p>
              <p className="mono mt-2 text-xl text-white">{defaultScoring.assist}</p>
            </div>
            <div className="surface-row rounded-[0.85rem] p-3">
              <p className="text-[var(--color-muted)]">Clean sheet</p>
              <p className="mono mt-2 text-sm text-white">
                GK {defaultScoring.cleanSheet.GK} · DEF {defaultScoring.cleanSheet.DEF} · MID {defaultScoring.cleanSheet.MID} · FWD {defaultScoring.cleanSheet.FWD}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-[1.15rem] p-4">
          <p className="eyebrow text-[10px]">ranking format</p>
          <div className="mt-5 grid gap-3 text-sm text-[var(--color-paper)]">
            <div className="surface-row rounded-[0.85rem] p-3">
              <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">Visible entries</p>
              <p className="mt-2 leading-relaxed">All active rookie and veteran participants are listed, including entries currently on zero points.</p>
            </div>
            <div className="surface-row rounded-[0.85rem] p-3">
              <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">Tie-break</p>
              <p className="mt-2 leading-relaxed">If points are level, the earlier registration date earns the higher rank.</p>
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <section className="glass-panel rounded-[1.15rem] p-5">
          <EmptyState title="Could not load standings" body={error} />
        </section>
      ) : null}

      {!tables && !error ? <div className="skeleton h-40 rounded-[1.15rem]" /> : null}

      {tables ? (
        <>
          <NationTable rows={tables.nations} />
          <section className="grid gap-4 xl:grid-cols-2">
            <ParticipantTable title="Rookie" rows={tables.rookies} fixtureLookup={tables.fixtureLookup} />
            <ParticipantTable title="Veteran" rows={tables.veterans} fixtureLookup={tables.fixtureLookup} />
          </section>
        </>
      ) : null}
    </div>
  )
}
