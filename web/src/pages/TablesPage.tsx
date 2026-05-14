import { useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { TeamFlag } from '../components/TeamFlag'
import { defaultScoring } from '../data/eventConfig'
import { fetchNationLeaderboard, fetchRookieLeaderboard, fetchVeteranLeaderboard } from '../lib/api'
import type { NationScoreRow, ParticipantScoreRow } from '../lib/types'

type LoadState = 'idle' | 'loading' | 'ready' | 'error'

function formatScore(value: number) {
  return value.toLocaleString('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  })
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
              <div key={row.participantId} className="grid grid-cols-[3.25rem_1fr_auto] items-center gap-3 bg-black/12 px-3.5 py-2.5 transition hover:bg-white/5">
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
                </div>
                <div className="text-right">
                  <p className="mono text-lg text-white">{formatScore(row.totalScore)}</p>
                  {row.bonusPercent > 0 ? <p className="text-xs text-[var(--color-accent)]">+{row.bonusPercent}%</p> : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-black/12 p-5">
            <EmptyState title="No locked squads scored yet" body="Standings will populate after participants submit squads and admins enter match stats." />
          </div>
        )}
      </div>
    </section>
  )
}

function NationTable({ rows }: { rows: NationScoreRow[] }) {
  return (
    <section className="glass-panel rounded-[1.15rem] p-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-[10px]">national league</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">Qualified nations</h3>
        </div>
        <span className="mono text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">{rows.length} nations</span>
      </div>

      <div className="mt-4 overflow-hidden rounded-[0.9rem] border border-white/8">
        {rows.length ? (
          <div className="divide-y divide-white/8">
            {rows.map((row) => (
              <div key={row.teamCode} className="grid grid-cols-[3.25rem_1fr_auto] items-center gap-3 bg-black/12 px-3.5 py-2.5 transition hover:bg-white/5">
                <span className="mono text-sm text-[var(--color-accent)]">#{row.rank}</span>
                <div className="flex min-w-0 items-center gap-3">
                  <TeamFlag teamCode={row.teamCode} label={row.teamCode} size="sm" />
                  <div>
                    <p className="mono text-sm text-white">{row.teamCode}</p>
                    <p className="text-xs text-[var(--color-muted)]">{row.participantCount} qualified entries</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="mono text-lg text-white">{formatScore(row.averageScore)}</p>
                  <p className="text-xs text-[var(--color-muted)]">top {formatScore(row.topScore)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-black/12 p-5">
            <EmptyState title="No nations qualified yet" body="A nation appears here once at least two primary or secondary entries have scores." />
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
  const [nations, setNations] = useState<NationScoreRow[]>([])
  const [error, setError] = useState<string | null>(null)

  async function handleLoadTables() {
    setLoadState('loading')
    setError(null)

    try {
      const [rookieResponse, veteranResponse, nationResponse] = await Promise.all([
        fetchRookieLeaderboard(),
        fetchVeteranLeaderboard(),
        fetchNationLeaderboard(),
      ])
      setRookies(rookieResponse.items)
      setVeterans(veteranResponse.items)
      setNations(nationResponse.items)
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
            <h2 className="section-title max-w-[12ch]">Live tables from locked squads.</h2>
            <p className="mt-4 max-w-[66ch] text-base leading-relaxed text-[var(--color-muted)]">
              Rookie, veteran, and nation tables now read from the scoring engine. Squads stay private until reveal, but public scores can move as admins enter match stats.
            </p>
          </div>
          <button
            type="button"
            onClick={handleLoadTables}
            disabled={loadState === 'loading'}
            className="premium-button h-11 px-6 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadState === 'loading' ? 'Loading tables...' : 'Load public tables'}
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
              <p className="mono mt-2 text-xl text-white">{defaultScoring.cleanSheet}</p>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-[1.15rem] p-4">
          <p className="eyebrow text-[10px]">privacy rule</p>
          <p className="mt-4 text-sm leading-relaxed text-[var(--color-paper)]">
            These endpoints expose standings only. Squad details remain hidden until participant or global reveal is wired into the public profile layer.
          </p>
        </div>
      </section>

      {loadState === 'idle' ? (
        <section className="glass-panel rounded-[1.15rem] p-5">
          <EmptyState title="Tables are ready to load" body="Use the explicit load action to request current public standings from the backend." />
        </section>
      ) : null}

      {loadState === 'error' ? (
        <section className="glass-panel rounded-[1.15rem] p-5">
          <EmptyState title="Could not load standings" body={error ?? 'The backend returned an unexpected response.'} />
        </section>
      ) : null}

      {loadState === 'ready' ? (
        <section className="grid gap-4 xl:grid-cols-3">
          <ParticipantTable title="Rookie" rows={rookies} />
          <ParticipantTable title="Veteran" rows={veterans} />
          <NationTable rows={nations} />
        </section>
      ) : null}
    </div>
  )
}
