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
  const ratingColor = player.rating !== undefined
    ? player.rating >= 7.0 
      ? 'text-[var(--color-sand)] border-[var(--color-sand)]/20 bg-[var(--color-sand)]/5' 
      : player.rating >= 6.0 
        ? 'text-[var(--color-accent)] border-[var(--color-accent)]/20 bg-[var(--color-accent)]/5'
        : 'text-[var(--color-paper)] border-white/10'
    : ''

  return (
    <div className="flex items-center justify-between gap-3 rounded-[0.85rem] border border-white/6 hover:border-white/12 transition duration-300 bg-black/20 px-3.5 py-2.5">
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
          <p className="truncate text-xs font-semibold text-white hover:text-[var(--color-accent)] transition duration-300">{player.displayName}</p>
          <p className="mono mt-1 text-[10px] uppercase tracking-wider text-[var(--color-muted)] flex flex-wrap items-center gap-x-2">
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
      </PlayerTooltip>
      
      <div className="flex shrink-0 flex-wrap justify-end gap-1.5 text-[10px]">
        {player.goals > 0 && (
          <span className="inline-flex items-center gap-1 rounded-[0.5rem] border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-[9px] font-bold text-emerald-400">
            G {player.goals}
          </span>
        )}
        {player.assists > 0 && (
          <span className="inline-flex items-center gap-1 rounded-[0.5rem] border border-[var(--color-sand)]/25 bg-[var(--color-sand)]/10 px-2 py-1 text-[9px] font-bold text-[var(--color-sand)]">
            A {player.assists}
          </span>
        )}
        {player.cleanSheetEligible && (
          <span className="inline-flex items-center gap-1 rounded-[0.5rem] border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-2 py-1 text-[9px] font-bold text-[var(--color-accent)]">
            CS
          </span>
        )}
      </div>
    </div>
  )
}

function TeamPlayerDetails({ copy, title, teamCode, players }: { copy: ResultsCopy; title: string; teamCode: string; players: PublicFixturePlayerResult[] }) {
  return (
    <div className="min-w-0">
      <div className="mb-3 flex items-center gap-2">
        <TeamFlag teamCode={teamCode} label={title} size="sm" />
        <p className="truncate text-sm font-bold text-white">{title}</p>
      </div>
      <div className="grid gap-1.5">
        {players.length ? (
          players.map((player) => <PlayerDetailRow key={player.playerId} copy={copy} player={player} />)
        ) : (
          <p className="rounded-[0.85rem] border border-white/6 bg-black/20 px-3.5 py-3 text-xs text-[var(--color-muted)]">
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
    <article className="border border-white/8 hover:border-[var(--color-accent)]/28 bg-gradient-to-br from-black/20 via-black/30 to-black/10 transition duration-300 rounded-[1rem] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] group hover:shadow-[0_12px_40px_-20px_rgba(34,189,147,0.15)]">
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <span className="mono rounded-full border border-white/6 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">
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

      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className={`relative transition duration-300 ${homeWon ? 'scale-105' : 'opacity-85'}`}>
            <TeamFlag teamCode={result.homeTeamCode} label={homeName} size="sm" />
            {homeWon && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 rounded-full bg-[var(--color-accent)] shadow-[0_0_8px_var(--color-accent)]" />
            )}
          </div>
          <div className="min-w-0">
            <p className={['truncate text-sm font-semibold transition', homeWon ? 'text-white font-bold' : 'text-[var(--color-paper)]/85'].join(' ')}>
              {homeName}
            </p>
            <p className="mono mt-0.5 text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">{result.homeTeamCode}</p>
          </div>
        </div>

        <div className="min-w-[5.5rem] rounded-xl border border-white/8 bg-black/40 px-3 py-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] group-hover:border-[var(--color-accent)]/25 transition duration-300">
          <p className="mono text-2xl font-black text-white tracking-tight leading-none">
            {isFinal ? `${result.homeGoals}-${result.awayGoals}` : 'vs'}
          </p>
          {isFinal && (
            <span className="mono text-[8px] uppercase tracking-wider text-[var(--color-accent)] mt-1.5 block">
              {copy.final}
            </span>
          )}
        </div>

        <div className="flex min-w-0 items-center justify-end gap-3 text-right">
          <div className="min-w-0">
            <p className={['truncate text-sm font-semibold transition', awayWon ? 'text-white font-bold' : 'text-[var(--color-paper)]/85'].join(' ')}>
              {awayName}
            </p>
            <p className="mono mt-0.5 text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">{result.awayTeamCode}</p>
          </div>
          <div className={`relative transition duration-300 ${awayWon ? 'scale-105' : 'opacity-85'}`}>
            <TeamFlag teamCode={result.awayTeamCode} label={awayName} size="sm" />
            {awayWon && (
              <span className="absolute -top-1 -left-1 flex h-2.5 w-2.5 rounded-full bg-[var(--color-accent)] shadow-[0_0_8px_var(--color-accent)]" />
            )}
          </div>
        </div>
      </div>

      {isFinal ? (
        <div className="mt-3.5 grid gap-2 rounded-[0.8rem] border border-white/6 bg-black/30 p-3 text-[11px] text-[var(--color-muted)] leading-relaxed">
          <div className="flex items-start gap-2">
            <span className="font-bold text-white shrink-0 mt-0.5">G {copy.scorers}</span>
            <div className="flex-1">
              <span className="text-[var(--color-accent)] font-semibold">{result.homeTeamCode}</span> {formatPlayerList(result.homePlayers, 'goals', copy)}
              <span className="mx-2 text-white/10">|</span>
              <span className="text-[var(--color-accent)] font-semibold">{result.awayTeamCode}</span> {formatPlayerList(result.awayPlayers, 'goals', copy)}
            </div>
          </div>
          <div className="flex items-start gap-2 border-t border-white/5 pt-2 mt-1">
            <span className="font-bold text-white shrink-0 mt-0.5">A {copy.assists}</span>
            <div className="flex-1">
              <span className="text-[var(--color-sand)] font-semibold">{result.homeTeamCode}</span> {formatPlayerList(result.homePlayers, 'assists', copy)}
              <span className="mx-2 text-white/10">|</span>
              <span className="text-[var(--color-sand)] font-semibold">{result.awayTeamCode}</span> {formatPlayerList(result.awayPlayers, 'assists', copy)}
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 text-[11px] text-[var(--color-muted)]">
        <span className="font-medium">{formatKickoff(result, locale)}</span>
        <div className="flex items-center gap-3">
          {isFinal ? <span className="mono">{result.entryCount} {copy.playerEntries}</span> : null}
          <button
            type="button"
            onClick={onToggle}
            className="rounded-full border border-white/10 bg-black/20 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white transition hover:border-[var(--color-accent)]/50 hover:text-[var(--color-accent)] hover:bg-black/40 hover:-translate-y-[1px] active:scale-[0.98]"
          >
            {isOpen ? copy.hideDetails : copy.matchDetails}
          </button>
        </div>
      </div>

      {isOpen ? (
        <div className="mt-4 grid gap-4 border-t border-white/8 pt-4 md:grid-cols-2">
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
  }, [copy.loadErrorBody, copy.loadErrorTitle, copy.unavailableBody, copy.unavailableTitle])

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
            <h2 className="section-title max-w-[12ch] bg-gradient-to-r from-white via-[var(--color-paper)] to-[var(--color-muted)] bg-clip-text text-transparent">{copy.heroTitle}</h2>
            <p className="mt-4 max-w-[66ch] text-base leading-relaxed text-[var(--color-muted)]">
              {copy.heroBody}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="countdown-glow-tile rounded-[1rem] px-5 py-3.5 text-center border border-white/6 hover:border-[var(--color-accent)]/20 transition duration-300 bg-black/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">{copy.final}</p>
              <p className="mt-1.5 text-3xl font-black text-[var(--color-accent)] leading-none">{finalCount}</p>
            </div>
            <div className="countdown-glow-tile rounded-[1rem] px-5 py-3.5 text-center border border-white/6 hover:border-[var(--color-accent)]/20 transition duration-300 bg-black/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">{copy.fixtures}</p>
              <p className="mt-1.5 text-3xl font-black text-white leading-none">{results.length}</p>
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
            <div key={groupKey} className="glass-panel rounded-[1.15rem] p-4 transition duration-300 hover:border-white/12 hover:shadow-[0_12px_40px_-24px_rgba(0,0,0,0.85)]">
              <div className="mb-4 flex items-end justify-between gap-4 border-b border-white/5 pb-3">
                <div>
                  <p className="eyebrow text-[10px]">{stageEyebrow(groupKey, copy)}</p>
                  <h3 className="mt-2 text-2xl font-bold text-white tracking-tight">{stageTitle(groupKey, copy)}</h3>
                </div>
                <span className="mono rounded-full border border-white/10 bg-white/4 px-3 py-1 text-xs uppercase tracking-wider text-[var(--color-muted)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
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
