import { useEffect, useMemo, useState } from 'react'
import { BackToTopButton } from '../components/BackToTopButton'
import { EmptyState } from '../components/EmptyState'
import { PlayerStatsModal } from '../components/PlayerStatsModal'
import { PlayerTooltip } from '../components/PlayerTooltip'
import { RankHistoryModal, type RankHistoryTarget } from '../components/RankHistoryModal'
import { SquadPitchModal } from '../components/SquadPitchModal'
import { SurvivalPill } from '../components/SurvivalPill'
import { TeamFlag } from '../components/TeamFlag'
import { eventTeams } from '../data/eventConfig'
import { getNationName } from '../data/soccerverseNations'
import { getMessages, type AppMessages } from '../i18n/messages'
import { ApiError, fetchFixtures, fetchNationLeaderboard, fetchNationParticipation, fetchRookieLeaderboard, fetchSquadUsage, fetchVeteranLeaderboard } from '../lib/api'
import { computeNationPayouts, type NationPayout } from '../lib/nationPayouts'
import { loadTournamentSurvival, survivingCount, teamCodesByParticipant, type TournamentSurvival } from '../lib/tournamentSurvival'
import type { PlayerStatsSeed } from '../lib/playerStatsSeed'
import { publicProfileSlug } from '../lib/profileSlug'
import type {
  FixtureSeed,
  LocaleCode,
  NationParticipationRow,
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
  nationParticipation: BoardState<NationParticipationRow[]>
  fixtureLookup: Map<string, FixtureSeed>
  // Squad-survival inputs (best-effort; null/empty degrade the badge to hidden, never break the page).
  survival: TournamentSurvival | null
  teamCodesByParticipant: Map<string, string[]>
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
  const [rookieResult, veteranResult, nationResult, nationParticipationResult, fixtureResult, survivalResult, usageResult] =
    await Promise.allSettled([
      fetchRookieLeaderboard(signal),
      fetchVeteranLeaderboard(signal),
      fetchNationLeaderboard(signal),
      fetchNationParticipation(signal),
      fetchFixtures(signal),
      loadTournamentSurvival(),
      fetchSquadUsage(),
    ])
  const fixtures = fixtureResult.status === 'fulfilled' ? fixtureResult.value.items : []
  return {
    rookies: settleBoard(rookieResult),
    veterans: settleBoard(veteranResult),
    nations: settleBoard(nationResult),
    nationParticipation: settleBoard(nationParticipationResult),
    fixtureLookup: new Map(fixtures.map((fixture) => [fixture.fixtureId, fixture])),
    survival: survivalResult.status === 'fulfilled' ? survivalResult.value : null,
    teamCodesByParticipant:
      usageResult.status === 'fulfilled' ? teamCodesByParticipant(usageResult.value) : new Map<string, string[]>(),
  }
}

type TablesCopy = AppMessages['tables']
type TablesTab = 'nations' | 'rookie' | 'veteran' | 'finder'

interface TablesTabItem {
  key: TablesTab
  label: string
  count: number
  countLabel: string
}

const PAID_PARTICIPANT_RANK_LIMIT = 10

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
  const isPositive = points > 0
  return (
    <span className={`rounded-full border px-2.5 py-1 text-[11px] transition duration-300 ${
      isPositive 
        ? 'border-[var(--color-accent)]/20 bg-[var(--color-accent)]/5 text-[var(--color-paper)]' 
        : 'border-white/4 bg-white/[0.01] text-[var(--color-muted)] opacity-50'
    }`}>
      <span className={isPositive ? 'font-medium text-white' : 'text-white/40'}>{label}</span>{' '}
      {count !== undefined ? <span className={isPositive ? 'text-white/60' : 'text-white/30'}>{count} · </span> : null}
      <span className={`mono ${isPositive ? 'text-[var(--color-accent)] font-bold' : 'text-white/30'}`}>
        {formatScore(points)}
      </span>
    </span>
  )
}

function MoneyBadge({ label, title, variant = 'full' }: { label: string; title?: string; variant?: 'full' | 'partial' }) {
  const variantStyles =
    variant === 'partial'
      ? 'border-dashed border-[var(--color-sand)]/30 bg-[var(--color-sand)]/8 text-[var(--color-sand)]/85'
      : 'border-[var(--color-sand)]/40 bg-[var(--color-sand)]/15 text-[var(--color-sand)] shadow-[0_0_8px_rgba(217,173,93,0.08)] hover:shadow-[0_0_12px_rgba(217,173,93,0.25)] hover:border-[var(--color-sand)]/60'
  return (
    <span
      title={title}
      className={`mono inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] transition duration-300 ${variantStyles}`}
    >
      {label}
    </span>
  )
}

// Builds the badge tooltip from a nation's computed payout (exact SVV + per-manager amount).
function nationPayoutTooltip(copy: TablesCopy, payout: NationPayout) {
  const template = payout.status === 'partial' ? copy.payoutTooltipPartial : copy.payoutTooltip
  return template
    .replace('{amount}', String(payout.amount))
    .replace('{perManager}', String(payout.perManager))
    .replace('{paid}', String(payout.paidManagers))
    .replace('{managers}', String(payout.managerCount))
}

function teamName(teamCode: string) {
  return eventTeams.find((team) => team.code === teamCode)?.nameEn ?? teamCode
}

function nationName(code: string) {
  return getNationName(code)
}

function normalizeSearchTerm(value: string) {
  return value.trim().toLowerCase()
}

function matchesText(query: string, ...values: Array<string | number | undefined>) {
  if (!query) {
    return true
  }

  return values.some((value) => String(value ?? '').toLowerCase().includes(query))
}

function participantRowMatchesSearch(row: ParticipantScoreRow, query: string) {
  return matchesText(
    query,
    row.displayName,
    row.leagueType,
    row.primaryTeamCode,
    nationName(row.primaryTeamCode),
    row.secondaryTeamCode,
    row.secondaryTeamCode ? nationName(row.secondaryTeamCode) : undefined,
  )
}

function nationRowMatchesSearch(row: NationScoreRow, query: string) {
  return (
    matchesText(query, row.teamCode, nationName(row.teamCode)) ||
    row.contributors.some((contributor) =>
      matchesText(
        query,
        contributor.displayName,
        contributor.leagueType,
        contributor.primaryTeamCode,
        nationName(contributor.primaryTeamCode),
        contributor.secondaryTeamCode,
        contributor.secondaryTeamCode ? nationName(contributor.secondaryTeamCode) : undefined,
      ),
    )
  )
}

function nationParticipationRowMatchesSearch(row: NationParticipationRow, query: string) {
  return matchesText(query, row.teamCode, nationName(row.teamCode))
}

// Render in local timezone
function matchLabel(fixtureId: string, fixtureLookup: Map<string, FixtureSeed>) {
  const fixture = fixtureLookup.get(fixtureId)
  if (!fixture) {
    return fixtureId
  }

  return `${fixture.homeTeamCode} vs ${fixture.awayTeamCode}`
}

function DetailStat({ label, value }: { label: string; value: number }) {
  const isPositive = value > 0
  return (
    <span className={`rounded-full border px-2 py-1 text-[10px] transition duration-300 ${
      isPositive 
        ? 'border-[var(--color-accent)]/25 bg-[var(--color-accent)]/6 text-white shadow-[0_0_8px_rgba(34,189,147,0.06)]' 
        : 'border-white/5 bg-black/10 text-[var(--color-muted)] opacity-60'
    }`}>
      <span className={`font-semibold ${isPositive ? 'text-white' : 'text-white/40'}`}>{label}</span>{' '}
      <span className={`mono ${isPositive ? 'text-[var(--color-accent)] font-bold' : 'text-white/30'}`}>
        {formatScore(value)}
      </span>
    </span>
  )
}

function PlayerScoreDetail({
  copy,
  player,
  onSelectPlayer,
}: {
  copy: TablesCopy
  player: ParticipantScorePlayerDetail
  onSelectPlayer: (seed: PlayerStatsSeed) => void
}) {
  const ratingColor = player.rating !== undefined
    ? player.rating >= 7.0 
      ? 'text-[var(--color-sand)] border-[var(--color-sand)]/20 bg-[var(--color-sand)]/5' 
      : player.rating >= 6.0 
        ? 'text-[var(--color-accent)] border-[var(--color-accent)]/20 bg-[var(--color-accent)]/5'
        : 'text-[var(--color-paper)] border-white/10'
    : ''

  return (
    <div className="flex flex-col gap-3 rounded-[0.85rem] border border-white/6 hover:border-white/12 transition duration-300 bg-black/20 px-3.5 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <PlayerTooltip
        as="div"
        className="flex items-center gap-3 min-w-0"
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
        <button
          type="button"
          onClick={() =>
            onSelectPlayer({
              playerId: player.playerId,
              displayName: player.displayName,
              teamCode: player.teamCode,
              imageUrl: player.imageUrl,
            })
          }
          className="flex items-center gap-3 min-w-0 text-left"
        >
        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/5 relative">
          {player.imageUrl ? (
            <img
              src={player.imageUrl}
              alt={player.displayName}
              width={36}
              height={36}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-[10px] font-bold text-[var(--color-muted)]">
              {player.displayName.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <TeamFlag teamCode={player.teamCode} label={player.teamCode} size="sm" />
            <p className="truncate text-xs font-semibold text-white hover:text-[var(--color-accent)] transition duration-300">{player.displayName}</p>
            <span className="mono rounded border border-white/8 px-1.5 py-0.5 text-[8px] uppercase font-bold text-white/60">{player.slotClass}</span>
          </div>
          <p className="mono mt-1 text-[10px] uppercase tracking-wider text-[var(--color-muted)] flex flex-wrap items-center gap-x-2">
            <span>{player.slotGroup}</span>
            <span className="text-white/20">•</span>
            <span>{player.minutes}'</span>
            <span className="text-white/20">•</span>
            <span>ID {player.playerId}</span>
            {player.rating !== undefined && (
              <>
                <span className="text-white/20">•</span>
                <span className={`px-1.5 py-0.5 rounded border ${ratingColor} font-bold text-[9px] tracking-normal`}>
                  {copy.rating} {player.rating}
                </span>
              </>
            )}
          </p>
        </div>
        </button>
      </PlayerTooltip>

      <div className="flex shrink-0 flex-wrap gap-1.5 sm:justify-end">
        <DetailStat label={copy.breakdown.goals} value={player.goalPoints} />
        <DetailStat label={copy.breakdown.assists} value={player.assistPoints} />
        <DetailStat label={copy.breakdown.appearances} value={player.appearancePoints} />
        <DetailStat label={copy.breakdown.minutes} value={player.minutesPoints} />
        <DetailStat label={copy.breakdown.cleanSheets} value={player.cleanSheetPoints} />
        <DetailStat label={copy.breakdown.performance} value={player.performancePoints} />
        <span className="inline-flex items-center gap-1 rounded-[0.5rem] border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-2 py-1 text-[10px] font-bold text-[var(--color-accent)]">
          {copy.total} {formatScore(player.totalPoints)}
        </span>
      </div>
    </div>
  )
}

function FixtureScoreDetail({
  copy,
  fixture,
  fixtureLookup,
  onSelectPlayer,
}: {
  copy: TablesCopy
  fixture: ParticipantScoreFixtureDetail
  fixtureLookup: Map<string, FixtureSeed>
  onSelectPlayer: (seed: PlayerStatsSeed) => void
}) {
  const result = fixtureLookup.get(fixture.fixtureId)
  return (
    <div className="rounded-[0.85rem] border border-white/6 bg-black/20 p-3.5 hover:border-white/12 transition duration-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {result ? <TeamFlag teamCode={result.homeTeamCode} label={teamName(result.homeTeamCode)} size="sm" /> : null}
          <p className="truncate text-sm font-semibold text-white">{matchLabel(fixture.fixtureId, fixtureLookup)}</p>
          {result ? <TeamFlag teamCode={result.awayTeamCode} label={teamName(result.awayTeamCode)} size="sm" /> : null}
        </div>
        <span className="mono text-xs font-bold text-[var(--color-accent)] bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 px-2 py-0.5 rounded-full">{formatScore(fixture.totalPoints)} {copy.pts}</span>
      </div>
      <div className="grid gap-2">
        {(fixture.players ?? []).map((player) => (
          <PlayerScoreDetail
            key={`${fixture.fixtureId}-${player.slotKey}-${player.playerId}`}
            copy={copy}
            player={player}
            onSelectPlayer={onSelectPlayer}
          />
        ))}
      </div>
    </div>
  )
}

function ParticipantTable({
  copy,
  survivalCopy,
  title,
  rows,
  searchTerm,
  fixtureLookup,
  survival,
  participantTeamCodes,
  onOpenSquad,
  onSelectPlayer,
  onOpenRankHistory,
}: {
  copy: TablesCopy
  survivalCopy: AppMessages['survival']
  title: string
  rows: ParticipantScoreRow[]
  searchTerm: string
  fixtureLookup: Map<string, FixtureSeed>
  survival: TournamentSurvival | null
  participantTeamCodes: Map<string, string[]>
  onOpenSquad: (target: { displayName: string; slug: string }) => void
  onSelectPlayer: (seed: PlayerStatsSeed) => void
  onOpenRankHistory: (target: RankHistoryTarget) => void
}) {
  const [openParticipantIds, setOpenParticipantIds] = useState<Set<string>>(new Set())
  const normalizedSearch = normalizeSearchTerm(searchTerm)
  const filteredRows = normalizedSearch ? rows.filter((row) => participantRowMatchesSearch(row, normalizedSearch)) : rows

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
    <section className="glass-panel rounded-[1.15rem] p-4 transition duration-300 hover:border-white/12">
      <div className="flex items-end justify-between gap-4 border-b border-white/5 pb-3">
        <div>
          <p className="eyebrow text-[10px]">{copy.tableEyebrow}</p>
          <h3 className="mt-2 text-2xl font-bold text-white tracking-tight">{title}</h3>
        </div>
        <span className="mono rounded-full border border-white/10 bg-white/4 px-3 py-1 text-xs uppercase tracking-wider text-[var(--color-muted)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">{filteredRows.length} {copy.entriesSuffix}</span>
      </div>

      <div className="mt-4">
        {filteredRows.length ? (
          <div className="space-y-3.5">
            {filteredRows.map((row) => {
              const isOpen = openParticipantIds.has(row.participantId)
              const isPaidRank = row.rank <= PAID_PARTICIPANT_RANK_LIMIT
              const survivalCount = survivingCount(participantTeamCodes, survival, row.participantId)

              return (
                <div key={row.participantId} className="border border-white/6 hover:border-[var(--color-accent)]/28 bg-gradient-to-br from-black/20 via-black/30 to-black/10 transition duration-300 rounded-[1rem] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] group hover:shadow-[0_12px_40px_-20px_rgba(34,189,147,0.15)]">
                  <div className="grid grid-cols-[3rem_1fr] gap-3 sm:grid-cols-[3rem_1fr_auto] sm:items-start">
                    <RankHistoryButton
                      rank={row.rank}
                      tone="accent"
                      title={copy.rankHistory.eyebrow}
                      ariaLabel={`${row.displayName} - ${copy.rankHistory.eyebrow}`}
                      onClick={() => onOpenRankHistory({ board: row.leagueType, id: row.participantId, label: row.displayName })}
                    />
                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => onOpenSquad({ displayName: row.displayName, slug: publicProfileSlug(row.displayName, row.participantId) })}
                          className="min-w-0 max-w-full truncate text-left text-sm font-bold text-white underline-offset-2 transition hover:text-[var(--color-accent)] hover:underline"
                        >
                          {row.displayName}
                        </button>
                        {isPaidRank ? <MoneyBadge label={copy.inTheMoney} /> : null}
                      </div>
                      
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--color-muted)] bg-black/10 px-2.5 py-1.5 rounded-lg border border-white/4 w-fit">
                        <span className="flex items-center gap-1.5">
                          <TeamFlag teamCode={row.primaryTeamCode} label={nationName(row.primaryTeamCode)} size="sm" />
                          <span className="font-semibold text-white/80">{nationName(row.primaryTeamCode)}</span>
                        </span>
                        {row.secondaryTeamCode ? (
                          <>
                            <span className="text-white/25">•</span>
                            <span className="flex items-center gap-1.5">
                              <TeamFlag teamCode={row.secondaryTeamCode} label={nationName(row.secondaryTeamCode)} size="sm" />
                              <span className="font-semibold text-white/80">{nationName(row.secondaryTeamCode)}</span>
                            </span>
                          </>
                        ) : null}
                      </div>

                      <div className="mt-3.5 flex flex-wrap gap-1.5">
                        <BreakdownPill label={copy.breakdown.goals} count={row.breakdown.goals.count} points={row.breakdown.goals.points} />
                        <BreakdownPill label={copy.breakdown.assists} count={row.breakdown.assists.count} points={row.breakdown.assists.points} />
                        <BreakdownPill label={copy.breakdown.appearances} count={row.breakdown.appearances.count} points={row.breakdown.appearances.points} />
                        <BreakdownPill label={copy.breakdown.minutes} count={row.breakdown.minutes.count} points={row.breakdown.minutes.points} />
                        <BreakdownPill label={copy.breakdown.cleanSheets} count={row.breakdown.cleanSheets.count} points={row.breakdown.cleanSheets.points} />
                        <BreakdownPill label={copy.breakdown.performance} points={row.breakdown.performance.points} />
                        {survivalCount ? (
                          <SurvivalPill
                            remaining={survivalCount.remaining}
                            total={survivalCount.total}
                            title={survivalCopy.tallyTitle
                              .replace('{remaining}', String(survivalCount.remaining))
                              .replace('{total}', String(survivalCount.total))}
                          />
                        ) : null}
                      </div>
                    </div>

                    <div className="col-span-2 text-right sm:col-span-1 mt-3 sm:mt-0">
                      <p className="mono text-2xl font-black text-white leading-none tracking-tight">{formatScore(row.totalScore)}</p>
                      <p className="mt-1.5 text-[11px] text-[var(--color-muted)]">{copy.base} <span className="text-white/85 font-medium">{formatScore(row.baseScore)}</span></p>
                      <p className="mt-0.5 text-[11px] text-[var(--color-muted)]">{copy.budget} <span className="text-[var(--color-accent)] font-semibold">{formatMultiplier(row.scoreMultiplier)}</span></p>
                      {row.bonusPercent > 0 ? (
                        <p className="text-xs text-[var(--color-accent)] font-semibold mt-0.5">+{row.bonusPercent.toLocaleString(undefined, { maximumFractionDigits: 1 })}% boost</p>
                      ) : null}
                      
                      <button
                        type="button"
                        onClick={() => toggleParticipant(row.participantId)}
                        disabled={!row.fixtures.length}
                        className="mt-3 rounded-full border border-white/10 bg-black/20 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white transition hover:border-[var(--color-accent)]/50 hover:text-[var(--color-accent)] hover:bg-black/40 disabled:cursor-not-allowed disabled:opacity-40 hover:-translate-y-[1px] active:scale-[0.98]"
                      >
                        {isOpen ? copy.hideDetails : copy.scoreDetails}
                      </button>
                    </div>
                  </div>

                  {isOpen ? (
                    <div className="mt-4 grid gap-3 border-t border-white/8 pt-4">
                      {row.fixtures.map((fixture) => (
                        <FixtureScoreDetail key={fixture.fixtureId} copy={copy} fixture={fixture} fixtureLookup={fixtureLookup} onSelectPlayer={onSelectPlayer} />
                      ))}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-black/12 p-5 rounded-[0.9rem] border border-white/6">
            <EmptyState title={normalizedSearch ? copy.noSearchTitle : copy.noEntriesTitle} body={normalizedSearch ? copy.noSearchBody : copy.noEntriesBody} />
          </div>
        )}
      </div>
    </section>
  )
}

function rankToneClass(rank: number) {
  if (rank === 1) {
    return 'border-[var(--color-sand)]/35 text-[var(--color-sand)] shadow-[0_0_12px_rgba(217,173,93,0.16)]'
  }
  if (rank === 2) {
    return 'border-slate-300/30 text-slate-200'
  }
  if (rank === 3) {
    return 'border-amber-600/30 text-amber-500'
  }
  return 'border-white/8 text-[var(--color-muted)]'
}

function RankHistoryButton({
  rank,
  tone,
  title,
  ariaLabel,
  onClick,
}: {
  rank: number
  tone: 'accent' | 'blue'
  title: string
  ariaLabel: string
  onClick: () => void
}) {
  const toneClass =
    tone === 'blue'
      ? 'hover:border-blue-400/60 hover:bg-blue-400/10 hover:text-blue-300 focus-visible:outline-blue-300/80'
      : 'hover:border-[var(--color-accent)]/60 hover:bg-[var(--color-accent)]/10 hover:text-[var(--color-accent)]'

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
      className={[
        'mono group/rank relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[0.85rem] border bg-black/45 text-center transition hover:-translate-y-[1px] active:scale-[0.96]',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]',
        rankToneClass(rank),
        toneClass,
      ].join(' ')}
    >
      <span className="translate-y-[-2px] text-[11px] font-black leading-none">#{rank}</span>
      <span aria-hidden="true" className="absolute bottom-1.5 left-1/2 flex -translate-x-1/2 items-end gap-[2px] opacity-55 transition group-hover/rank:opacity-100">
        <span className="h-1.5 w-[2px] rounded-full bg-current" />
        <span className="h-2.5 w-[2px] rounded-full bg-current" />
        <span className="h-1 w-[2px] rounded-full bg-current" />
      </span>
    </button>
  )
}

function NationTable({
  copy,
  rows,
  searchTerm,
  onOpenSquad,
  onOpenRankHistory,
}: {
  copy: TablesCopy
  rows: NationScoreRow[]
  searchTerm: string
  onOpenSquad: (target: { displayName: string; slug: string }) => void
  onOpenRankHistory: (target: RankHistoryTarget) => void
}) {
  const [openTeamCodes, setOpenTeamCodes] = useState<Set<string>>(new Set())
  const normalizedSearch = normalizeSearchTerm(searchTerm)
  const filteredRows = normalizedSearch ? rows.filter((row) => nationRowMatchesSearch(row, normalizedSearch)) : rows
  // Recomputed from the live ranked rows (never the filtered subset) so a score-driven rank shift
  // moves a nation in/out of the money on the next render — see SOP "Nations table in-money indicator".
  const payouts = useMemo(() => computeNationPayouts(rows), [rows])

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
    <section className="glass-panel rounded-[1.15rem] p-4 transition duration-300 hover:border-white/12">
      <div className="flex items-end justify-between gap-4 border-b border-white/5 pb-3">
        <div>
          <p className="eyebrow text-[10px]">{copy.nationEyebrow}</p>
          <h3 className="mt-2 text-2xl font-bold text-white tracking-tight">{copy.nationTitle}</h3>
        </div>
        <span className="mono rounded-full border border-white/10 bg-white/4 px-3 py-1 text-xs uppercase tracking-wider text-[var(--color-muted)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">{filteredRows.length} {copy.nationsSuffix}</span>
      </div>

      <div className="mt-4">
        {filteredRows.length ? (
          <div className="space-y-3.5">
            {filteredRows.map((row) => {
              const isOpen = openTeamCodes.has(row.teamCode)
              const payout = payouts.get(row.teamCode)

              return (
                <div key={row.teamCode} className="border border-white/6 hover:border-blue-500/28 bg-gradient-to-br from-black/20 via-black/30 to-black/10 transition duration-300 rounded-[1rem] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:shadow-[0_12px_40px_-20px_rgba(59,130,246,0.15)]">
                  <div className="grid grid-cols-[3rem_1fr] gap-3 sm:grid-cols-[3rem_1fr_auto] sm:items-start">
                    <RankHistoryButton
                      rank={row.rank}
                      tone="blue"
                      title={copy.rankHistory.eyebrow}
                      ariaLabel={`${nationName(row.teamCode)} - ${copy.rankHistory.eyebrow}`}
                      onClick={() => onOpenRankHistory({ board: 'nations', id: row.teamCode, label: nationName(row.teamCode) })}
                    />
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <TeamFlag teamCode={row.teamCode} label={nationName(row.teamCode)} size="sm" />
                        <div className="min-w-0">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-bold text-white">{nationName(row.teamCode)}</p>
                            {payout && payout.status !== 'none' ? (
                              <MoneyBadge
                                label={payout.status === 'partial' ? copy.partiallyInTheMoney : copy.inTheMoney}
                                variant={payout.status === 'partial' ? 'partial' : 'full'}
                                title={nationPayoutTooltip(copy, payout)}
                              />
                            ) : null}
                          </div>
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
                    <div className="col-span-2 text-right sm:col-span-1 mt-3 sm:mt-0">
                      <p className="mono text-2xl font-black text-white leading-none tracking-tight">{formatScore(row.averageScore)}</p>
                      <p className="mt-1.5 text-[11px] text-[var(--color-muted)]">{copy.averageScore}</p>
                      <button
                        type="button"
                        onClick={() => toggleTeam(row.teamCode)}
                        className="mt-3 rounded-full border border-white/10 bg-black/20 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white transition hover:border-blue-500/50 hover:text-blue-400 hover:bg-black/40 hover:-translate-y-[1px] active:scale-[0.98]"
                      >
                        {isOpen ? copy.hideManagers : copy.managers}
                      </button>
                    </div>
                  </div>

                  {isOpen ? (
                    <div className="mt-4 grid gap-2 border-t border-white/8 pt-4">
                      {row.contributors.map((contributor, contributorIndex) => (
                        <div
                          key={`${row.teamCode}-${contributor.participantId}`}
                          className="flex items-center justify-between gap-3 rounded-[0.85rem] border border-white/6 hover:border-white/12 transition duration-300 bg-black/20 px-3.5 py-2.5"
                        >
                          <div className="min-w-0">
                            <p className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs font-semibold text-white">
                              <span className="text-[var(--color-accent)] font-bold">#{contributorIndex + 1}</span>{' '}
                              <button
                                type="button"
                                onClick={() => onOpenSquad({ displayName: contributor.displayName, slug: publicProfileSlug(contributor.displayName, contributor.participantId) })}
                                className="min-w-0 max-w-full truncate underline-offset-2 transition hover:text-[var(--color-accent)] hover:underline"
                              >
                                {contributor.displayName}
                              </button>
                              {payout && contributorIndex < payout.paidManagers ? (
                                <MoneyBadge label={copy.inTheMoney} title={`${payout.perManager} SVV`} />
                              ) : null}
                            </p>
                            
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-[var(--color-muted)] bg-black/10 px-2 py-1 rounded border border-white/4 w-fit">
                              <span className="flex items-center gap-1">
                                <TeamFlag teamCode={contributor.primaryTeamCode} label={nationName(contributor.primaryTeamCode)} size="sm" />
                                <span>{nationName(contributor.primaryTeamCode)}</span>
                              </span>
                              {contributor.secondaryTeamCode ? (
                                <>
                                  <span className="text-white/25">•</span>
                                  <span className="flex items-center gap-1">
                                    <TeamFlag teamCode={contributor.secondaryTeamCode} label={nationName(contributor.secondaryTeamCode)} size="sm" />
                                    <span>{nationName(contributor.secondaryTeamCode)}</span>
                                  </span>
                                </>
                              ) : null}
                              <span className="text-white/25">•</span>
                              <span className="rounded-full border border-white/8 px-1.5 py-0.5 text-[8px] uppercase font-bold text-white/70">{contributor.leagueType}</span>
                            </div>
                          </div>
                          <span className="mono text-sm font-bold text-white shrink-0">{formatScore(contributor.totalScore)}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-black/12 p-5 rounded-[0.9rem] border border-white/6">
            <EmptyState title={normalizedSearch ? copy.noSearchTitle : copy.noNationTitle} body={normalizedSearch ? copy.noSearchBody : copy.noNationBody} />
          </div>
        )}
      </div>
    </section>
  )
}

function NationParticipationTable({ copy, rows, searchTerm }: { copy: TablesCopy; rows: NationParticipationRow[]; searchTerm: string }) {
  const normalizedSearch = normalizeSearchTerm(searchTerm)
  const filteredRows = normalizedSearch ? rows.filter((row) => nationParticipationRowMatchesSearch(row, normalizedSearch)) : rows

  return (
    <section className="glass-panel rounded-[1.15rem] p-4 transition duration-300 hover:border-white/12">
      <div className="flex items-end justify-between gap-4 border-b border-white/5 pb-3">
        <div>
          <p className="eyebrow text-[10px]">{copy.nationParticipationEyebrow}</p>
          <h3 className="mt-2 text-2xl font-bold text-white tracking-tight">{copy.nationParticipationTitle}</h3>
          <p className="mt-2 max-w-[68ch] text-xs leading-relaxed text-[var(--color-muted)]">
            {copy.nationParticipationBody}
          </p>
        </div>
        <span className="mono rounded-full border border-white/10 bg-white/4 px-3 py-1 text-xs uppercase tracking-wider text-[var(--color-muted)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">{filteredRows.length} {copy.nationsSuffix}</span>
      </div>

      <div className="mt-4 overflow-hidden rounded-[0.9rem] border border-white/8">
        {filteredRows.length ? (
          <div className="max-h-[34rem] overflow-y-auto">
            <table className="min-w-[720px] w-full border-collapse text-left text-sm">
              <thead className="sticky top-0 border-b border-white/8 bg-[rgba(8,13,12,0.96)]">
                <tr>
                  {[copy.nation, copy.managers, 'Rookie', 'Veteran'].map((heading) => (
                    <th key={heading} className="mono px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.teamCode} className="border-b border-white/8 bg-black/10 last:border-b-0 hover:bg-white/[0.02] transition">
                    <td className="px-4 py-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <TeamFlag teamCode={row.teamCode} label={nationName(row.teamCode)} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-white">{nationName(row.teamCode)}</p>
                          <p className="mono mt-0.5 text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">{row.teamCode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="mono text-base text-[var(--color-accent)] font-bold">{row.participantCount}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--color-paper)]">{row.rookieCount}</td>
                    <td className="px-4 py-3 text-xs text-[var(--color-paper)]">{row.veteranCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-black/12 p-5 rounded-[0.9rem] border border-white/6">
            <EmptyState title={normalizedSearch ? copy.noSearchTitle : copy.noNationParticipationTitle} body={normalizedSearch ? copy.noSearchBody : copy.noNationParticipationBody} />
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
  survivalCopy,
  title,
  board,
  searchTerm,
  fixtureLookup,
  survival,
  participantTeamCodes,
  onOpenSquad,
  onSelectPlayer,
  onOpenRankHistory,
}: {
  copy: TablesCopy
  survivalCopy: AppMessages['survival']
  title: string
  board: BoardState<ParticipantScoreRow[]>
  searchTerm: string
  fixtureLookup: Map<string, FixtureSeed>
  survival: TournamentSurvival | null
  participantTeamCodes: Map<string, string[]>
  onOpenSquad: (target: { displayName: string; slug: string }) => void
  onSelectPlayer: (seed: PlayerStatsSeed) => void
  onOpenRankHistory: (target: RankHistoryTarget) => void
}) {
  if (board.rows) {
    return (
      <ParticipantTable
        copy={copy}
        survivalCopy={survivalCopy}
        title={title}
        rows={board.rows}
        searchTerm={searchTerm}
        fixtureLookup={fixtureLookup}
        survival={survival}
        participantTeamCodes={participantTeamCodes}
        onOpenSquad={onOpenSquad}
        onSelectPlayer={onSelectPlayer}
        onOpenRankHistory={onOpenRankHistory}
      />
    )
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

function SummaryMetric({ label, value, colorClass }: { label: string; value: number; colorClass?: string }) {
  return (
    <div className="min-w-0 px-4 py-3.5 transition duration-300 hover:bg-white/[0.02] group">
      <p className="mono truncate text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)] group-hover:text-white transition duration-300">{label}</p>
      <p className={`mono mt-1.5 text-2xl font-black leading-none tracking-tight transition duration-300 ${colorClass || 'text-white'}`}>{value}</p>
    </div>
  )
}

function TablesTabButton({ tab, active, onSelect }: { tab: TablesTabItem; active: boolean; onSelect: (tab: TablesTab) => void }) {
  const activeStyles = {
    nations: 'border-blue-500/40 bg-blue-500/10 text-white shadow-[0_0_12px_rgba(59,130,246,0.12)]',
    rookie: 'border-emerald-500/40 bg-emerald-500/10 text-white shadow-[0_0_12px_rgba(16,185,129,0.12)]',
    veteran: 'border-[var(--color-sand)]/40 bg-[var(--color-sand)]/10 text-white shadow-[0_0_12px_rgba(217,173,93,0.12)]',
    finder: 'border-white/18 bg-white/[0.04] text-white shadow-[0_0_12px_rgba(234,225,205,0.08)]',
  }

  const activeBadgeColor = {
    nations: 'text-blue-400',
    rookie: 'text-emerald-400',
    veteran: 'text-[var(--color-sand)]',
    finder: 'text-[var(--color-paper)]',
  }

  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls={`tables-panel-${tab.key}`}
      id={`tables-tab-${tab.key}`}
      onClick={() => onSelect(tab.key)}
      className={[
        'min-h-[3.8rem] rounded-[0.8rem] border px-4 py-2.5 text-left transition duration-300 active:scale-[0.99] flex flex-col justify-center',
        active
          ? activeStyles[tab.key] || 'border-[var(--color-accent)]/50 bg-[var(--color-accent)]/10 text-white'
          : 'border-transparent bg-transparent text-[var(--color-muted)] hover:border-white/10 hover:bg-white/[0.03] hover:text-white',
      ].join(' ')}
    >
      <span className="block truncate text-sm font-bold leading-tight tracking-tight">{tab.label}</span>
      <span className={`mono mt-1 block text-[9px] uppercase tracking-[0.16em] font-semibold ${active ? activeBadgeColor[tab.key] || 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]'}`}>
        {tab.count} {tab.countLabel}
      </span>
    </button>
  )
}

interface TablesPageProps {
  locale: LocaleCode
}

export function TablesPage({ locale }: TablesPageProps) {
  const copy = getMessages(locale).tables
  const survivalCopy = getMessages(locale).survival
  const [tables, setTables] = useState<TablesPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [squadTarget, setSquadTarget] = useState<{ displayName: string; slug: string } | null>(null)
  const [playerSeed, setPlayerSeed] = useState<PlayerStatsSeed | null>(null)
  const [rankHistoryTarget, setRankHistoryTarget] = useState<RankHistoryTarget | null>(null)
  const [activeTab, setActiveTab] = useState<TablesTab>('nations')
  const [tableSearch, setTableSearch] = useState('')

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
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [])

  const tabItems: TablesTabItem[] = tables
    ? [
        { key: 'nations', label: copy.tabNations, count: tables.nations.rows?.length ?? 0, countLabel: copy.nationsSuffix },
        { key: 'rookie', label: copy.tabRookie, count: tables.rookies.rows?.length ?? 0, countLabel: copy.entriesSuffix },
        { key: 'veteran', label: copy.tabVeteran, count: tables.veterans.rows?.length ?? 0, countLabel: copy.entriesSuffix },
        { key: 'finder', label: copy.tabFinder, count: tables.nationParticipation.rows?.length ?? 0, countLabel: copy.nationsSuffix },
      ]
    : []
  const normalizedTableSearch = normalizeSearchTerm(tableSearch)
  const searchResultCount = useMemo(() => {
    if (!tables || !normalizedTableSearch) {
      return null
    }

    if (activeTab === 'nations') {
      return tables.nations.rows?.filter((row) => nationRowMatchesSearch(row, normalizedTableSearch)).length ?? 0
    }
    if (activeTab === 'rookie') {
      return tables.rookies.rows?.filter((row) => participantRowMatchesSearch(row, normalizedTableSearch)).length ?? 0
    }
    if (activeTab === 'veteran') {
      return tables.veterans.rows?.filter((row) => participantRowMatchesSearch(row, normalizedTableSearch)).length ?? 0
    }
    return tables.nationParticipation.rows?.filter((row) => nationParticipationRowMatchesSearch(row, normalizedTableSearch)).length ?? 0
  }, [activeTab, normalizedTableSearch, tables])

  return (
    <div className="space-y-4 pb-10">
      <section className="glass-panel rounded-[1.15rem] p-3 sm:p-4 border border-white/8 hover:border-white/12 transition duration-300">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(21rem,0.72fr)] lg:items-end">
          <div className="px-1 py-1 sm:px-2">
            <p className="eyebrow">{copy.heroEyebrow}</p>
            <h2 className="mt-4 text-3xl font-extrabold leading-tight sm:text-4xl bg-gradient-to-r from-white via-[var(--color-paper)] to-[var(--color-muted)] bg-clip-text text-transparent tracking-tight">{copy.compactTitle}</h2>
            <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-[var(--color-muted)]">{copy.compactBody}</p>
          </div>

          {tables ? (
            <div className="overflow-hidden rounded-[0.95rem] border border-white/8 bg-black/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition duration-300 hover:border-white/12">
              <div className="grid grid-cols-2 divide-x divide-y divide-white/8 sm:grid-cols-4 sm:divide-y-0">
                <SummaryMetric label={copy.summaryNations} value={tables.nations.rows?.length ?? 0} colorClass="text-blue-400 group-hover:drop-shadow-[0_0_6px_rgba(59,130,246,0.4)]" />
                <SummaryMetric label={copy.summaryRookies} value={tables.rookies.rows?.length ?? 0} colorClass="text-emerald-400 group-hover:drop-shadow-[0_0_6px_rgba(16,185,129,0.4)]" />
                <SummaryMetric label={copy.summaryVeterans} value={tables.veterans.rows?.length ?? 0} colorClass="text-[var(--color-sand)] group-hover:drop-shadow-[0_0_6px_rgba(217,173,93,0.4)]" />
                <SummaryMetric label={copy.summaryFinder} value={tables.nationParticipation.rows?.length ?? 0} colorClass="text-[var(--color-paper)] group-hover:drop-shadow-[0_0_6px_rgba(234,225,205,0.24)]" />
              </div>
            </div>
          ) : null}
        </div>

        {tables ? (
          <div className="mt-4 grid gap-3">
            <div className="rounded-[0.9rem] border border-white/8 bg-black/20 p-1" role="tablist" aria-label={copy.tabsLabel}>
              <div className="grid gap-1 sm:grid-cols-2 xl:grid-cols-4">
                {tabItems.map((tab) => (
                  <TablesTabButton key={tab.key} tab={tab} active={tab.key === activeTab} onSelect={setActiveTab} />
                ))}
              </div>
            </div>

            <label className="grid gap-2 rounded-[0.9rem] border border-white/8 bg-black/20 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <span className="grid gap-1">
                <span className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">{copy.searchLabel}</span>
                <input
                  type="search"
                  value={tableSearch}
                  onChange={(event) => setTableSearch(event.target.value)}
                  placeholder={copy.searchPlaceholder}
                  className="min-w-0 rounded-[0.8rem] border border-white/10 bg-black/24 px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)]"
                />
              </span>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                {searchResultCount !== null ? (
                  <span className="mono rounded-full border border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-[var(--color-muted)]">
                    {searchResultCount} {activeTab === 'rookie' || activeTab === 'veteran' ? copy.entriesSuffix : copy.nationsSuffix}
                  </span>
                ) : null}
                {tableSearch ? (
                  <button
                    type="button"
                    onClick={() => setTableSearch('')}
                    className="rounded-full border border-white/12 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white transition hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]"
                  >
                    {copy.clearSearch}
                  </button>
                ) : null}
              </div>
            </label>
          </div>
        ) : null}
      </section>

      {loading && !tables ? <div className="skeleton h-40 rounded-[1.15rem]" /> : null}

      {tables ? (
        <>
          <div
            key={activeTab}
            id={`tables-panel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`tables-tab-${activeTab}`}
            className="reveal-in"
          >
            {activeTab === 'nations' ? (
              tables.nations.rows ? (
                <NationTable copy={copy} rows={tables.nations.rows} searchTerm={tableSearch} onOpenSquad={setSquadTarget} onOpenRankHistory={setRankHistoryTarget} />
              ) : tables.nations.error ? (
                <section className="glass-panel rounded-[1.15rem] p-5">
                  <EmptyState {...boardErrorCopy(copy, tables.nations.error)} />
                </section>
              ) : null
            ) : null}

            {activeTab === 'rookie' ? (
              <ParticipantBoardSection copy={copy} survivalCopy={survivalCopy} title="Rookie" board={tables.rookies} searchTerm={tableSearch} fixtureLookup={tables.fixtureLookup} survival={tables.survival} participantTeamCodes={tables.teamCodesByParticipant} onOpenSquad={setSquadTarget} onSelectPlayer={setPlayerSeed} onOpenRankHistory={setRankHistoryTarget} />
            ) : null}

            {activeTab === 'veteran' ? (
              <ParticipantBoardSection copy={copy} survivalCopy={survivalCopy} title="Veteran" board={tables.veterans} searchTerm={tableSearch} fixtureLookup={tables.fixtureLookup} survival={tables.survival} participantTeamCodes={tables.teamCodesByParticipant} onOpenSquad={setSquadTarget} onSelectPlayer={setPlayerSeed} onOpenRankHistory={setRankHistoryTarget} />
            ) : null}

            {activeTab === 'finder' ? (
              tables.nationParticipation.rows ? (
                <NationParticipationTable copy={copy} rows={tables.nationParticipation.rows} searchTerm={tableSearch} />
              ) : tables.nationParticipation.error ? (
                <section className="glass-panel rounded-[1.15rem] p-5">
                  <EmptyState {...boardErrorCopy(copy, tables.nationParticipation.error)} />
                </section>
              ) : null
            ) : null}
          </div>
        </>
      ) : null}

      <SquadPitchModal target={squadTarget} onClose={() => setSquadTarget(null)} />

      <RankHistoryModal target={rankHistoryTarget} locale={locale} onClose={() => setRankHistoryTarget(null)} />

      {playerSeed ? <PlayerStatsModal seed={playerSeed} locale={locale} onClose={() => setPlayerSeed(null)} /> : null}

      {tables && activeTab !== 'finder' ? <BackToTopButton label={copy.backToTop} /> : null}
    </div>
  )
}
