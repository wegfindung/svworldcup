import { useEffect, useMemo, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { TeamFlag } from '../components/TeamFlag'
import { eventTeams } from '../data/eventConfig'
import { fetchMatchResults } from '../lib/api'
import type { PublicFixtureResult } from '../lib/types'

type LoadState = 'loading' | 'ready' | 'error'

function teamName(teamCode: string) {
  return eventTeams.find((team) => team.code === teamCode)?.nameEn ?? teamCode
}

// Fixtures are stored as UTC; render in the viewer's browser timezone + locale so a fan in
// Stockholm, São Paulo, or Sydney each sees the kickoff in their own wall-clock.
const kickoffFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function formatKickoff(result: PublicFixtureResult) {
  const epoch = new Date(`${result.kickoffDate}T${result.kickoffTimeUtc}Z`).getTime()
  if (!Number.isFinite(epoch)) {
    return `${result.kickoffDate} · ${result.kickoffTimeUtc.slice(0, 5)} UTC`
  }
  return kickoffFormatter.format(epoch)
}

function ResultCard({ result }: { result: PublicFixtureResult }) {
  const isFinal = result.status === 'final'
  const homeWon = isFinal && (result.homeGoals ?? 0) > (result.awayGoals ?? 0)
  const awayWon = isFinal && (result.awayGoals ?? 0) > (result.homeGoals ?? 0)

  return (
    <article className="surface-row rounded-[0.95rem] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="mono rounded-full border border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">
          Group {result.groupKey}
        </span>
        <span
          className={[
            'mono rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em]',
            isFinal
              ? 'border-[var(--color-accent)]/24 bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
              : 'border-white/10 text-[var(--color-muted)]',
          ].join(' ')}
        >
          {isFinal ? 'Final' : 'Pending'}
        </span>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <TeamFlag teamCode={result.homeTeamCode} label={teamName(result.homeTeamCode)} size="sm" />
          <div className="min-w-0">
            <p className={['truncate text-sm font-semibold', homeWon ? 'text-white' : 'text-[var(--color-paper)]'].join(' ')}>
              {teamName(result.homeTeamCode)}
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
              {teamName(result.awayTeamCode)}
            </p>
            <p className="mono mt-0.5 text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">{result.awayTeamCode}</p>
          </div>
          <TeamFlag teamCode={result.awayTeamCode} label={teamName(result.awayTeamCode)} size="sm" />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--color-muted)]">
        <span>{formatKickoff(result)}</span>
        {isFinal ? <span>{result.entryCount} player entries</span> : null}
      </div>
    </article>
  )
}

export function ResultsPage() {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [results, setResults] = useState<PublicFixtureResult[]>([])
  const [error, setError] = useState<string | null>(null)

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
          setError(loadError instanceof Error ? loadError.message : 'Could not load match results.')
          setLoadState('error')
        }
      }
    })()

    return () => {
      active = false
    }
  }, [])

  const groupedResults = useMemo(() => {
    const groups = new Map<string, PublicFixtureResult[]>()
    for (const result of results) {
      const current = groups.get(result.groupKey) ?? []
      current.push(result)
      groups.set(result.groupKey, current)
    }
    return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right))
  }, [results])

  const finalCount = results.filter((result) => result.status === 'final').length

  return (
    <div className="space-y-4 pb-10">
      <section className="hero-card rounded-[1.25rem] px-5 py-6 sm:px-6">
        <p className="eyebrow">match centre</p>
        <div className="mt-5 grid items-end gap-6 lg:grid-cols-[1fr_auto]">
          <div>
            <h2 className="section-title max-w-[12ch]">Every result on the board.</h2>
            <p className="mt-4 max-w-[66ch] text-base leading-relaxed text-[var(--color-muted)]">
              Final scores are derived from the scoring entries that also drive the public tables.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="surface-row rounded-[0.85rem] px-4 py-3">
              <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">Final</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--color-accent)]">{finalCount}</p>
            </div>
            <div className="surface-row rounded-[0.85rem] px-4 py-3">
              <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">Fixtures</p>
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
          <EmptyState title="Could not load results" body={error ?? 'The backend returned an unexpected response.'} />
        </section>
      ) : null}

      {loadState === 'ready' ? (
        <section className="grid gap-4 xl:grid-cols-2">
          {groupedResults.map(([groupKey, groupResults]) => (
            <div key={groupKey} className="glass-panel rounded-[1.15rem] p-4">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <p className="eyebrow text-[10px]">group stage</p>
                  <h3 className="mt-2 text-2xl font-semibold text-white">Group {groupKey}</h3>
                </div>
                <span className="mono text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
                  {groupResults.filter((result) => result.status === 'final').length}/{groupResults.length} final
                </span>
              </div>
              <div className="grid gap-2">{groupResults.map((result) => <ResultCard key={result.fixtureId} result={result} />)}</div>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  )
}
