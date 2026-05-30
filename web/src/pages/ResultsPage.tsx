import { useEffect, useMemo, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { PlayerTooltip } from '../components/PlayerTooltip'
import { TeamFlag } from '../components/TeamFlag'
import { eventTeams } from '../data/eventConfig'
import { getMessages, type AppMessages } from '../i18n/messages'
import { ApiError, fetchMatchResults } from '../lib/api'
import type { LocaleCode, PublicFixturePlayerResult, PublicFixtureResult } from '../lib/types'

type LoadState = 'loading' | 'ready' | 'error'
type ResultsCopy = AppMessages['results']
type ErrorCopy = {
  title: string
  body: string
}

function teamName(teamCode: string) {
  return eventTeams.find((team) => team.code === teamCode)?.nameEn ?? teamCode
}

const stageOrder = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'R32', 'R16', 'QF', 'SF', '3P', 'FINAL']

function stageTitle(groupKey: string, copy: ResultsCopy) {
  if (/^[A-L]$/.test(groupKey)) return `${copy.group} ${groupKey}`
  if (groupKey === 'R32') return copy.stages.round32
  if (groupKey === 'R16') return copy.stages.round16
  if (groupKey === 'QF') return copy.stages.quarterFinals
  if (groupKey === 'SF') return copy.stages.semiFinals
  if (groupKey === '3P') return copy.stages.thirdPlace
  if (groupKey === 'FINAL') return copy.stages.final
  return groupKey
}

function stageEyebrow(groupKey: string, copy: ResultsCopy) {
  return /^[A-L]$/.test(groupKey) ? copy.groupStage : copy.knockoutStage
}

// Fixtures are stored as UTC; render in the viewer's browser timezone + locale so a fan in
// Stockholm, São Paulo, or Sydney each sees the kickoff in their own wall-clock.
function formatKickoff(result: PublicFixtureResult, locale: LocaleCode) {
  const epoch = new Date(`${result.kickoffDate}T${result.kickoffTimeUtc}Z`).getTime()
  if (!Number.isFinite(epoch)) {
    return `${result.kickoffDate} · ${result.kickoffTimeUtc.slice(0, 5)} UTC`
  }
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(epoch)
}

function formatPlayerList(players: PublicFixturePlayerResult[], stat: 'goals' | 'assists', copy: ResultsCopy) {
  const contributors = players.filter((player) => player[stat] > 0)
  if (!contributors.length) {
    return copy.none
  }
  return contributors
    .map((player) => `${player.displayName}${player[stat] > 1 ? ` (${player[stat]})` : ''}`)
    .join(', ')
}

function PlayerDetailRow({ copy, player }: { copy: ResultsCopy; player: PublicFixturePlayerResult }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-[0.75rem] border border-white/8 bg-black/16 px-3 py-2">
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
        <p className="truncate text-xs font-semibold text-white">{player.displayName}</p>
        <p className="mono mt-1 text-[10px] uppercase tracking-[0.14em] text-[var(--color-muted)]">
          {player.minutes}' - ID {player.playerId}
          {player.rating !== undefined ? ` - ${copy.rating} ${player.rating}` : ''}
        </p>
      </PlayerTooltip>
      <div className="flex flex-wrap justify-end gap-1 text-[10px]">
        <span className="rounded-full border border-white/8 px-2 py-1 text-white">G {player.goals}</span>
        <span className="rounded-full border border-white/8 px-2 py-1 text-white">A {player.assists}</span>
        {player.cleanSheetEligible ? (
          <span className="rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-2 py-1 text-[var(--color-accent)]">
            CS
          </span>
        ) : null}
      </div>
    </div>
  )
}

function TeamPlayerDetails({ copy, title, teamCode, players }: { copy: ResultsCopy; title: string; teamCode: string; players: PublicFixturePlayerResult[] }) {
  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-center gap-2">
        <TeamFlag teamCode={teamCode} label={title} size="sm" />
        <p className="truncate text-sm font-semibold text-white">{title}</p>
      </div>
      <div className="grid gap-1.5">
        {players.length ? (
          players.map((player) => <PlayerDetailRow key={player.playerId} copy={copy} player={player} />)
        ) : (
          <p className="rounded-[0.75rem] border border-white/8 bg-black/16 px-3 py-2 text-xs text-[var(--color-muted)]">
            {copy.noStats}
          </p>
        )}
      </div>
    </div>
  )
}

function ResultCard({
  copy,
  locale,
  result,
  isOpen,
  onToggle,
}: {
  copy: ResultsCopy
  locale: LocaleCode
  result: PublicFixtureResult
  isOpen: boolean
  onToggle: () => void
}) {
  const isFinal = result.status === 'final'
  const homeWon = isFinal && (result.homeGoals ?? 0) > (result.awayGoals ?? 0)
  const awayWon = isFinal && (result.awayGoals ?? 0) > (result.homeGoals ?? 0)
  const homeName = teamName(result.homeTeamCode)
  const awayName = teamName(result.awayTeamCode)

  return (
    <article className="surface-row rounded-[0.95rem] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="mono rounded-full border border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">
          {copy.group} {result.groupKey}
        </span>
        <span
          className={[
            'mono rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em]',
            isFinal
              ? 'border-[var(--color-accent)]/24 bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
              : 'border-white/10 text-[var(--color-muted)]',
          ].join(' ')}
        >
          {isFinal ? copy.final : copy.pending}
        </span>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <TeamFlag teamCode={result.homeTeamCode} label={homeName} size="sm" />
          <div className="min-w-0">
            <p className={['truncate text-sm font-semibold', homeWon ? 'text-white' : 'text-[var(--color-paper)]'].join(' ')}>
              {homeName}
            </p>
            <p className="mono mt-0.5 text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">{result.homeTeamCode}</p>
          </div>
        </div>

        <div className="min-w-[5.5rem] rounded-[0.85rem] border border-white/10 bg-black/18 px-3 py-2 text-center">
          <p className="mono text-2xl font-semibold text-white">
            {isFinal ? `${result.homeGoals}-${result.awayGoals}` : 'vs'}
          </p>
        </div>

        <div className="flex min-w-0 items-center justify-end gap-2.5 text-right">
          <div className="min-w-0">
            <p className={['truncate text-sm font-semibold', awayWon ? 'text-white' : 'text-[var(--color-paper)]'].join(' ')}>
              {awayName}
            </p>
            <p className="mono mt-0.5 text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">{result.awayTeamCode}</p>
          </div>
          <TeamFlag teamCode={result.awayTeamCode} label={awayName} size="sm" />
        </div>
      </div>

      {isFinal ? (
        <div className="mt-3 grid gap-2 rounded-[0.8rem] border border-white/8 bg-black/12 p-3 text-xs text-[var(--color-muted)]">
          <p>
            <span className="font-semibold text-white">{copy.scorers}</span> {result.homeTeamCode} {formatPlayerList(result.homePlayers, 'goals', copy)} -{' '}
            {result.awayTeamCode} {formatPlayerList(result.awayPlayers, 'goals', copy)}
          </p>
          <p>
            <span className="font-semibold text-white">{copy.assists}</span> {result.homeTeamCode} {formatPlayerList(result.homePlayers, 'assists', copy)} -{' '}
            {result.awayTeamCode} {formatPlayerList(result.awayPlayers, 'assists', copy)}
          </p>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--color-muted)]">
        <span>{formatKickoff(result, locale)}</span>
        <div className="flex items-center gap-2">
          {isFinal ? <span>{result.entryCount} {copy.playerEntries}</span> : null}
          <button
            type="button"
            onClick={onToggle}
            className="rounded-full border border-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white transition hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)]"
          >
            {isOpen ? copy.hideDetails : copy.matchDetails}
          </button>
        </div>
      </div>

      {isOpen ? (
        <div className="mt-3 grid gap-3 border-t border-white/8 pt-3 md:grid-cols-2">
          <TeamPlayerDetails copy={copy} title={homeName} teamCode={result.homeTeamCode} players={result.homePlayers} />
          <TeamPlayerDetails copy={copy} title={awayName} teamCode={result.awayTeamCode} players={result.awayPlayers} />
        </div>
      ) : null}
    </article>
  )
}

interface ResultsPageProps {
  locale: LocaleCode
}

export function ResultsPage({ locale }: ResultsPageProps) {
  const copy = getMessages(locale).results
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [results, setResults] = useState<PublicFixtureResult[]>([])
  const [error, setError] = useState<ErrorCopy | null>(null)
  const [openFixtureIds, setOpenFixtureIds] = useState<Set<string>>(new Set())

  function toggleFixtureDetails(fixtureId: string) {
    setOpenFixtureIds((current) => {
      const next = new Set(current)
      if (next.has(fixtureId)) {
        next.delete(fixtureId)
      } else {
        next.add(fixtureId)
      }
      return next
    })
  }

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const response = await fetchMatchResults()
        if (active) {
          setResults(response.items)
          setLoadState('ready')
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof ApiError && loadError.status === 404
              ? { title: copy.unavailableTitle, body: copy.unavailableBody }
              : {
                title: copy.loadErrorTitle,
                body: copy.loadErrorBody,
              },
          )
          setLoadState('error')
        }
      }
    })()

    return () => {
      active = false
    }
  }, [copy.loadErrorTitle])

  const groupedResults = useMemo(() => {
    const groups = new Map<string, PublicFixtureResult[]>()
    for (const result of results) {
      const current = groups.get(result.groupKey) ?? []
      current.push(result)
      groups.set(result.groupKey, current)
    }
    return [...groups.entries()].sort(([left], [right]) => {
      const leftIndex = stageOrder.indexOf(left)
      const rightIndex = stageOrder.indexOf(right)
      return (leftIndex === -1 ? 999 : leftIndex) - (rightIndex === -1 ? 999 : rightIndex) || left.localeCompare(right)
    })
  }, [results])

  const finalCount = results.filter((result) => result.status === 'final').length

  return (
    <div className="space-y-4 pb-10">
      <section className="hero-card rounded-[1.25rem] px-5 py-6 sm:px-6">
        <p className="eyebrow">{copy.heroEyebrow}</p>
        <div className="mt-5 grid items-end gap-6 lg:grid-cols-[1fr_auto]">
          <div>
            <h2 className="section-title max-w-[12ch]">{copy.heroTitle}</h2>
            <p className="mt-4 max-w-[66ch] text-base leading-relaxed text-[var(--color-muted)]">
              {copy.heroBody}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="surface-row rounded-[0.85rem] px-4 py-3">
              <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">{copy.final}</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--color-accent)]">{finalCount}</p>
            </div>
            <div className="surface-row rounded-[0.85rem] px-4 py-3">
              <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">{copy.fixtures}</p>
              <p className="mt-1 text-2xl font-semibold text-white">{results.length}</p>
            </div>
          </div>
        </div>
      </section>

      {loadState === 'loading' ? (
        <section className="grid gap-3 lg:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="skeleton h-32 rounded-[1rem]" />
          ))}
        </section>
      ) : null}

      {loadState === 'error' ? (
        <section className="glass-panel rounded-[1.15rem] p-5">
          <EmptyState title={error?.title ?? copy.loadErrorTitle} body={error?.body ?? copy.loadErrorBody} />
        </section>
      ) : null}

      {loadState === 'ready' ? (
        <section className="grid gap-4 xl:grid-cols-2">
          {groupedResults.map(([groupKey, groupResults]) => (
            <div key={groupKey} className="glass-panel rounded-[1.15rem] p-4">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <p className="eyebrow text-[10px]">{stageEyebrow(groupKey, copy)}</p>
                  <h3 className="mt-2 text-2xl font-semibold text-white">{stageTitle(groupKey, copy)}</h3>
                </div>
                <span className="mono text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
                  {groupResults.filter((result) => result.status === 'final').length}/{groupResults.length} {copy.finalSuffix}
                </span>
              </div>
              <div className="grid gap-2">
                {groupResults.map((result) => (
                  <ResultCard
                    key={result.fixtureId}
                    copy={copy}
                    locale={locale}
                    result={result}
                    isOpen={openFixtureIds.has(result.fixtureId)}
                    onToggle={() => toggleFixtureDetails(result.fixtureId)}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  )
}
