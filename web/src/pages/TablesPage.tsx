import { useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { TeamFlag } from '../components/TeamFlag'
import { defaultScoring } from '../data/eventConfig'
import { fetchRookieLeaderboard, fetchVeteranLeaderboard } from '../lib/api'
import type { ParticipantScoreRow } from '../lib/types'

type LoadState = 'idle' | 'loading' | 'ready' | 'error'

function formatScore(value: number) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  })
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

function ParticipantTable({ title, rows }: { title: string; rows: ParticipantScoreRow[] }) {
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
            {rows.map((row) => (
              <div key={row.participantId} className="grid grid-cols-[3.25rem_1fr] gap-3 bg-black/12 px-3.5 py-3 transition hover:bg-white/5 sm:grid-cols-[3.25rem_1fr_auto] sm:items-start">
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
                  {row.bonusPercent > 0 ? <p className="text-xs text-[var(--color-accent)]">+{row.bonusPercent}%</p> : null}
                </div>
              </div>
            ))}
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

export function TablesPage() {
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [rookies, setRookies] = useState<ParticipantScoreRow[]>([])
  const [veterans, setVeterans] = useState<ParticipantScoreRow[]>([])
  const [error, setError] = useState<string | null>(null)

  async function handleLoadTables() {
    setLoadState('loading')
    setError(null)

    try {
      const [rookieResponse, veteranResponse] = await Promise.all([fetchRookieLeaderboard(), fetchVeteranLeaderboard()])
      setRookies(rookieResponse.items)
      setVeterans(veteranResponse.items)
      setLoadState('ready')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load public tables.')
      setLoadState('error')
    }
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
            onClick={handleLoadTables}
            disabled={loadState === 'loading'}
            className="premium-button h-11 px-6 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadState === 'loading' ? 'Loading tables...' : loadState === 'ready' ? 'Refresh tables' : 'Load public tables'}
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

      {loadState === 'idle' ? (
        <section className="glass-panel rounded-[1.15rem] p-5">
          <EmptyState title="Tables are ready" body="Load the current rookie and veteran standings from the scoring engine." />
        </section>
      ) : null}

      {loadState === 'error' ? (
        <section className="glass-panel rounded-[1.15rem] p-5">
          <EmptyState title="Could not load standings" body={error ?? 'The backend returned an unexpected response.'} />
        </section>
      ) : null}

      {loadState === 'ready' ? (
        <section className="grid gap-4 xl:grid-cols-2">
          <ParticipantTable title="Rookie" rows={rookies} />
          <ParticipantTable title="Veteran" rows={veterans} />
        </section>
      ) : null}
    </div>
  )
}
