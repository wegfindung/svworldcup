import { useEffect, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { PlayerTooltip } from '../components/PlayerTooltip'
import { SquadPitchModal } from '../components/SquadPitchModal'
import { TeamFlag } from '../components/TeamFlag'
import { defaultScoring, eventTeams } from '../data/eventConfig'
import { getNationName } from '../data/soccerverseNations'
import { getMessages, type AppMessages } from '../i18n/messages'
import { ApiError, fetchFixtures, fetchNationLeaderboard, fetchRookieLeaderboard, fetchVeteranLeaderboard } from '../lib/api'
import { publicProfileSlug } from '../lib/profileSlug'
import type {
  FixtureSeed,
  LocaleCode,
  NationScoreRow,
  ParticipantScoreFixtureDetail,
  ParticipantScorePlayerDetail,
  ParticipantScoreRow,
} from '../lib/types'

interface TablesError {
  title: string
  body: string
}

// B3: each board loads independently — one slow/failed call must not drop the whole standings page.
type BoardErrorKind = 'unavailable' | 'failed'
interface BoardState<T> {
  rows: T | null
  error: BoardErrorKind | null
}

interface TablesPayload {
  rookies: BoardState<ParticipantScoreRow[]>
  veterans: BoardState<ParticipantScoreRow[]>
  nations: BoardState<NationScoreRow[]>
  fixtureLookup: Map<string, FixtureSeed>
}

// A 404 means "being prepared" (PR #37 semantics); anything else is a generic load failure.
function settleBoard<T>(result: PromiseSettledResult<{ items: T }>): BoardState<T> {
  if (result.status === 'fulfilled') {
    return { rows: result.value.items, error: null }
  }
  const reason = result.reason
  const kind: BoardErrorKind = reason instanceof ApiError && reason.status === 404 ? 'unavailable' : 'failed'
  return { rows: null, error: kind }
}

// Never rejects: allSettled means a failed board degrades to its own error state while the others
// still render. Fixtures failing only drops match labels (matchLabel already falls back to the id).
async function loadTablesPayload(signal?: AbortSignal): Promise<TablesPayload> {
  const [rookieResult, veteranResult, nationResult, fixtureResult] = await Promise.allSettled([
    fetchRookieLeaderboard(signal),
    fetchVeteranLeaderboard(signal),
    fetchNationLeaderboard(signal),
    fetchFixtures(signal),
  ])
  const fixtures = fixtureResult.status === 'fulfilled' ? fixtureResult.value.items : []
  return {
    rookies: settleBoard(rookieResult),
    veterans: settleBoard(veteranResult),
    nations: settleBoard(nationResult),
    fixtureLookup: new Map(fixtures.map((fixture) => [fixture.fixtureId, fixture])),
  }
}

type TablesCopy = AppMessages['tables']

function boardErrorCopy(copy: TablesCopy, kind: BoardErrorKind): TablesError {
  return kind === 'unavailable'
    ? { title: copy.unavailableTitle, body: copy.unavailableBody }
    : { title: copy.loadErrorTitle, body: copy.loadError }
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

function nationName(code: string) {
  return getNationName(code)
}

function matchLabel(fixtureId: string, fixtureLookup: Map<string, FixtureSeed>) {
  const fixture = fixtureLookup.get(fixtureId)
  if (!fixture) {
    return fixtureId
  }

  return `${fixture.homeTeamCode} vs ${fixture.awayTeamCode}`
}

function DetailStat({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-full border border-white/8 bg-black/14 px-2 py-1 text-[10px] text-[var(--color-muted)]">
      <span className="font-semibold text-white">{label}</span> <span className="mono text-[var(--color-accent)]">{formatScore(value)}</span>
    </span>
  )
}

function PlayerScoreDetail({ copy, player }: { copy: TablesCopy; player: ParticipantScorePlayerDetail }) {
  return (
    <div className="grid gap-3 rounded-[0.75rem] border border-white/8 bg-black/14 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <PlayerTooltip
        as="div"
        className="min-w-0"
        info={{
          name: player.displayName,
          nationCode: player.teamCode,
          imageUrl: player.imageUrl,
          meta: [
            { label: 'Min', value: `${player.minutes}'` },
            { label: 'G', value: String(player.goals) },
            { label: 'A', value: String(player.assists) },
            ...(player.rating !== undefined ? [{ label: 'Rating', value: String(player.rating) }] : []),
          ],
        }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <TeamFlag teamCode={player.teamCode} label={player.teamCode} size="sm" />
          <p className="truncate text-xs font-semibold text-white">{player.displayName}</p>
          <span className="mono rounded-full border border-white/8 px-2 py-0.5 text-[9px] text-[var(--color-muted)]">{player.slotClass}</span>
        </div>
        <p className="mono mt-1 text-[10px] uppercase tracking-[0.12em] text-[var(--color-muted)]">
          {player.slotGroup} - {player.minutes}' - ID {player.playerId}
          {player.rating !== undefined ? ` - ${copy.rating} ${player.rating}` : ''}
        </p>
      </PlayerTooltip>
      <div className="flex flex-wrap gap-1.5 sm:justify-end">
        <DetailStat label={copy.breakdown.goals} value={player.goalPoints} />
        <DetailStat label={copy.breakdown.assists} value={player.assistPoints} />
        <DetailStat label={copy.breakdown.appearances} value={player.appearancePoints} />
        <DetailStat label={copy.breakdown.minutes} value={player.minutesPoints} />
        <DetailStat label={copy.breakdown.cleanSheets} value={player.cleanSheetPoints} />
        <DetailStat label={copy.breakdown.performance} value={player.performancePoints} />
        <span className="rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-2 py-1 text-[10px] text-[var(--color-accent)]">
          {copy.total} {formatScore(player.totalPoints)}
        </span>
      </div>
    </div>
  )
}

function FixtureScoreDetail({ copy, fixture, fixtureLookup }: { copy: TablesCopy; fixture: ParticipantScoreFixtureDetail; fixtureLookup: Map<string, FixtureSeed> }) {
  const result = fixtureLookup.get(fixture.fixtureId)
  return (
    <div className="rounded-[0.85rem] border border-white/8 bg-white/[0.025] p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {result ? <TeamFlag teamCode={result.homeTeamCode} label={teamName(result.homeTeamCode)} size="sm" /> : null}
          <p className="truncate text-sm font-semibold text-white">{matchLabel(fixture.fixtureId, fixtureLookup)}</p>
          {result ? <TeamFlag teamCode={result.awayTeamCode} label={teamName(result.awayTeamCode)} size="sm" /> : null}
        </div>
        <span className="mono text-xs text-[var(--color-accent)]">{formatScore(fixture.totalPoints)} {copy.pts}</span>
      </div>
      <div className="grid gap-1.5">{(fixture.players ?? []).map((player) => <PlayerScoreDetail key={`${fixture.fixtureId}-${player.slotKey}-${player.playerId}`} copy={copy} player={player} />)}</div>
    </div>
  )
}

function ParticipantTable({ copy, title, rows, fixtureLookup, onOpenSquad }: { copy: TablesCopy; title: string; rows: ParticipantScoreRow[]; fixtureLookup: Map<string, FixtureSeed>; onOpenSquad: (target: { displayName: string; slug: string }) => void }) {
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
          <p className="eyebrow text-[10px]">{copy.tableEyebrow}</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">{title}</h3>
        </div>
        <span className="mono text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">{rows.length} {copy.entriesSuffix}</span>
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
                      <button
                        type="button"
                        onClick={() => onOpenSquad({ displayName: row.displayName, slug: publicProfileSlug(row.displayName, row.participantId) })}
                        className="block max-w-full truncate text-left text-sm font-semibold text-white underline-offset-2 transition hover:text-[var(--color-accent)] hover:underline"
                      >
                        {row.displayName}
                      </button>
                      <div className="mt-1 flex items-center gap-2 text-xs text-[var(--color-muted)]">
                        <TeamFlag teamCode={row.primaryTeamCode} label={nationName(row.primaryTeamCode)} size="sm" />
                        <span>{nationName(row.primaryTeamCode)}</span>
                        {row.secondaryTeamCode ? (
                          <>
                            <span className="text-white/25">+</span>
                            <TeamFlag teamCode={row.secondaryTeamCode} label={nationName(row.secondaryTeamCode)} size="sm" />
                            <span>{nationName(row.secondaryTeamCode)}</span>
                          </>
                        ) : null}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <BreakdownPill label={copy.breakdown.goals} count={row.breakdown.goals.count} points={row.breakdown.goals.points} />
                        <BreakdownPill label={copy.breakdown.assists} count={row.breakdown.assists.count} points={row.breakdown.assists.points} />
                        <BreakdownPill label={copy.breakdown.appearances} count={row.breakdown.appearances.count} points={row.breakdown.appearances.points} />
                        <BreakdownPill label={copy.breakdown.minutes} count={row.breakdown.minutes.count} points={row.breakdown.minutes.points} />
                        <BreakdownPill label={copy.breakdown.cleanSheets} count={row.breakdown.cleanSheets.count} points={row.breakdown.cleanSheets.points} />
                        <BreakdownPill label={copy.breakdown.performance} points={row.breakdown.performance.points} />
                      </div>
                    </div>
                    <div className="col-span-2 text-right sm:col-span-1">
                      <p className="mono text-lg text-white">{formatScore(row.totalScore)}</p>
                      <p className="mt-1 text-[11px] text-[var(--color-muted)]">{copy.base} {formatScore(row.baseScore)}</p>
                      <p className="mt-1 text-[11px] text-[var(--color-muted)]">{copy.budget} {formatMultiplier(row.scoreMultiplier)}</p>
                      {row.bonusPercent > 0 ? <p className="text-xs text-[var(--color-accent)]">+{row.bonusPercent}%</p> : null}
                      <button
                        type="button"
                        onClick={() => toggleParticipant(row.participantId)}
                        disabled={!row.fixtures.length}
                        className="mt-2 rounded-full border border-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white transition hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {isOpen ? copy.hideDetails : copy.scoreDetails}
                      </button>
                    </div>
                  </div>
                  {isOpen ? (
                    <div className="mt-3 grid gap-2 border-t border-white/8 pt-3">
                      {row.fixtures.map((fixture) => (
                        <FixtureScoreDetail key={fixture.fixtureId} copy={copy} fixture={fixture} fixtureLookup={fixtureLookup} />
                      ))}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-black/12 p-5">
            <EmptyState title={copy.noEntriesTitle} body={copy.noEntriesBody} />
          </div>
        )}
      </div>
    </section>
  )
}

function NationTable({ copy, rows, onOpenSquad }: { copy: TablesCopy; rows: NationScoreRow[]; onOpenSquad: (target: { displayName: string; slug: string }) => void }) {
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
          <p className="eyebrow text-[10px]">{copy.nationEyebrow}</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">{copy.nationTitle}</h3>
        </div>
        <span className="mono text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">{rows.length} {copy.nationsSuffix}</span>
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
                        <TeamFlag teamCode={row.teamCode} label={nationName(row.teamCode)} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{nationName(row.teamCode)}</p>
                          <p className="mono mt-0.5 text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">
                            {row.teamCode} - {row.participantCount} {copy.managersSuffix}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <BreakdownPill label={copy.avg} points={row.averageScore} />
                        <BreakdownPill label={copy.top} points={row.topScore} />
                      </div>
                    </div>
                    <div className="col-span-2 text-right sm:col-span-1">
                      <p className="mono text-lg text-white">{formatScore(row.averageScore)}</p>
                      <p className="mt-1 text-[11px] text-[var(--color-muted)]">{copy.averageScore}</p>
                      <button
                        type="button"
                        onClick={() => toggleTeam(row.teamCode)}
                        className="mt-2 rounded-full border border-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white transition hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)]"
                      >
                        {isOpen ? copy.hideManagers : copy.managers}
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
                              <span className="text-[var(--color-accent)]">#{contributor.rank}</span>{' '}
                              <button
                                type="button"
                                onClick={() => onOpenSquad({ displayName: contributor.displayName, slug: publicProfileSlug(contributor.displayName, contributor.participantId) })}
                                className="underline-offset-2 transition hover:text-[var(--color-accent)] hover:underline"
                              >
                                {contributor.displayName}
                              </button>
                            </p>
                            <div className="mt-1 flex items-center gap-2 text-[10px] text-[var(--color-muted)]">
                              <TeamFlag teamCode={contributor.primaryTeamCode} label={nationName(contributor.primaryTeamCode)} size="sm" />
                              <span>{nationName(contributor.primaryTeamCode)}</span>
                              {contributor.secondaryTeamCode ? (
                                <>
                                  <span className="text-white/25">+</span>
                                  <TeamFlag teamCode={contributor.secondaryTeamCode} label={nationName(contributor.secondaryTeamCode)} size="sm" />
                                  <span>{nationName(contributor.secondaryTeamCode)}</span>
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
            <EmptyState title={copy.noNationTitle} body={copy.noNationBody} />
          </div>
        )}
      </div>
    </section>
  )
}

// Renders a participant board, its own load error, or nothing — so a single failed board degrades
// in place instead of dropping the whole standings page (B3).
function ParticipantBoardSection({
  copy,
  title,
  board,
  fixtureLookup,
  onOpenSquad,
}: {
  copy: TablesCopy
  title: string
  board: BoardState<ParticipantScoreRow[]>
  fixtureLookup: Map<string, FixtureSeed>
  onOpenSquad: (target: { displayName: string; slug: string }) => void
}) {
  if (board.rows) {
    return <ParticipantTable copy={copy} title={title} rows={board.rows} fixtureLookup={fixtureLookup} onOpenSquad={onOpenSquad} />
  }
  if (board.error) {
    const error = boardErrorCopy(copy, board.error)
    return (
      <section className="glass-panel rounded-[1.15rem] p-4">
        <EmptyState title={error.title} body={error.body} />
      </section>
    )
  }
  return null
}

interface TablesPageProps {
  locale: LocaleCode
}

export function TablesPage({ locale }: TablesPageProps) {
  const copy = getMessages(locale).tables
  const [tables, setTables] = useState<TablesPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)
  const [squadTarget, setSquadTarget] = useState<{ displayName: string; slug: string } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    loadTablesPayload(controller.signal)
      .then((payload) => {
        if (active) {
          setTables(payload)
          setLoading(false)
        }
      })
      .catch(() => {
        // loadTablesPayload settles per board and never rejects; this is a defensive fallback only.
        if (active) {
          setLoading(false)
        }
      })

    // B5: abort in-flight fetches when the effect is superseded (refresh) or the page unmounts.
    return () => {
      active = false
      controller.abort()
    }
  }, [reloadKey])

  function refreshTables() {
    // loading starts true on mount; set it here (a user event, not the effect body) so a refresh
    // re-shows the skeleton without a synchronous setState inside the effect.
    setLoading(true)
    setTables(null)
    setReloadKey((key) => key + 1)
  }

  return (
    <div className="space-y-4 pb-10">
      <section className="hero-card rounded-[1.25rem] px-5 py-6 sm:px-6">
        <p className="eyebrow">{copy.heroEyebrow}</p>
        <div className="mt-5 grid items-end gap-6 lg:grid-cols-[1fr_auto]">
          <div>
            <h2 className="section-title max-w-[12ch]">{copy.heroTitle}</h2>
            <p className="mt-4 max-w-[66ch] text-base leading-relaxed text-[var(--color-muted)]">{copy.heroBody}</p>
          </div>
          <button
            type="button"
            onClick={refreshTables}
            className="premium-button h-11 px-6 text-sm font-semibold"
          >
            {copy.refresh}
          </button>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="glass-panel rounded-[1.15rem] p-4">
          <p className="eyebrow text-[10px]">{copy.scoringProfile}</p>
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div className="surface-row rounded-[0.85rem] p-3">
              <p className="text-[var(--color-muted)]">{copy.goal}</p>
              <p className="mono mt-2 text-xl text-white">{defaultScoring.goal}</p>
            </div>
            <div className="surface-row rounded-[0.85rem] p-3">
              <p className="text-[var(--color-muted)]">{copy.assist}</p>
              <p className="mono mt-2 text-xl text-white">{defaultScoring.assist}</p>
            </div>
            <div className="surface-row rounded-[0.85rem] p-3">
              <p className="text-[var(--color-muted)]">{copy.cleanSheet}</p>
              <p className="mono mt-2 text-sm text-white">
                GK {defaultScoring.cleanSheet.GK} · DEF {defaultScoring.cleanSheet.DEF} · MID {defaultScoring.cleanSheet.MID}* · FWD {defaultScoring.cleanSheet.FWD}
              </p>
              <p className="mt-1 text-[10px] leading-tight text-[var(--color-muted)]">{copy.cleanSheetMidNote}</p>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-[1.15rem] p-4">
          <p className="eyebrow text-[10px]">{copy.rankingFormat}</p>
          <div className="mt-5 grid gap-3 text-sm text-[var(--color-paper)]">
            <div className="surface-row rounded-[0.85rem] p-3">
              <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">{copy.visibleEntriesTitle}</p>
              <p className="mt-2 leading-relaxed">{copy.visibleEntriesBody}</p>
            </div>
            <div className="surface-row rounded-[0.85rem] p-3">
              <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">{copy.tieBreakTitle}</p>
              <p className="mt-2 leading-relaxed">{copy.tieBreakBody}</p>
            </div>
          </div>
        </div>
      </section>

      {loading && !tables ? <div className="skeleton h-40 rounded-[1.15rem]" /> : null}

      {tables ? (
        <>
          {tables.nations.rows ? (
            <NationTable copy={copy} rows={tables.nations.rows} onOpenSquad={setSquadTarget} />
          ) : tables.nations.error ? (
            <section className="glass-panel rounded-[1.15rem] p-5">
              <EmptyState {...boardErrorCopy(copy, tables.nations.error)} />
            </section>
          ) : null}
          <section className="grid gap-4 xl:grid-cols-2">
            <ParticipantBoardSection copy={copy} title="Rookie" board={tables.rookies} fixtureLookup={tables.fixtureLookup} onOpenSquad={setSquadTarget} />
            <ParticipantBoardSection copy={copy} title="Veteran" board={tables.veterans} fixtureLookup={tables.fixtureLookup} onOpenSquad={setSquadTarget} />
          </section>
        </>
      ) : null}

      <SquadPitchModal target={squadTarget} onClose={() => setSquadTarget(null)} />
    </div>
  )
}
