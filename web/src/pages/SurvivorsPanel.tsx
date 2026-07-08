import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { StatTile } from '../components/StatTile'
import { SurvivalPill } from '../components/SurvivalPill'
import { TeamFlag } from '../components/TeamFlag'
import { eventTeams } from '../data/eventConfig'
import { getMessages } from '../i18n/messages'
import { fetchSquadUsage } from '../lib/api'
import { loadTournamentSurvival, rankManagerSurvival, type ManagerSurvival, type TournamentSurvival } from '../lib/tournamentSurvival'
import type { LocaleCode, PublicSquadUsagePayload } from '../lib/types'

type LoadState = 'loading' | 'ready' | 'error'
type Mode = 'survivors' | 'eliminated'

const PAGE_SIZE = 50
const MAX_FLAGS = 8

function teamName(teamCode: string) {
  return eventTeams.find((team) => team.code === teamCode)?.nameEn ?? teamCode
}

function formatInt(value: number) {
  return value.toLocaleString()
}

function SurvivorRow({ row, rank, outLabel, tallyTitle }: { row: ManagerSurvival; rank: number; outLabel: string; tallyTitle: string }) {
  return (
    <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
      <span className="mono text-xs text-[var(--color-muted)]">#{rank}</span>
      <div className="min-w-0">
        <Link
          to={row.profilePath}
          className="block truncate text-sm font-semibold text-white underline-offset-2 transition hover:text-[var(--color-accent)] hover:underline"
        >
          {row.displayName}
        </Link>
        {row.eliminatedTeamCodes.length ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            {row.eliminatedTeamCodes.slice(0, MAX_FLAGS).map((code) => (
              <span key={code} className="opacity-45 grayscale" title={teamName(code)}>
                <TeamFlag teamCode={code} label={teamName(code)} size="sm" />
              </span>
            ))}
            {row.eliminatedTeamCodes.length > MAX_FLAGS ? (
              <span className="mono text-[10px] text-[var(--color-muted)]">+{row.eliminatedTeamCodes.length - MAX_FLAGS}</span>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <SurvivalPill remaining={row.remaining} total={row.total} title={tallyTitle} />
        {row.eliminated > 0 ? <span className="mono text-xs text-[var(--color-sand)]">{row.eliminated} {outLabel}</span> : null}
      </div>
    </div>
  )
}

// Stats › Survivors — ranks revealed managers by how many of their 15 players' teams are still alive in
// the knockout bracket (or, toggled, by most knocked out). Pure client-side off /squad-usage +
// /match-results (see SOP "Squad survival indicator + eliminated player marker").
export function SurvivorsPanel({ locale }: { locale: LocaleCode }) {
  const messages = getMessages(locale)
  const copy = messages.survivors
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [usage, setUsage] = useState<PublicSquadUsagePayload | null>(null)
  const [survival, setSurvival] = useState<TournamentSurvival | null>(null)
  const [mode, setMode] = useState<Mode>('survivors')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)

  useEffect(() => {
    let active = true
    void fetchSquadUsage()
      .then(async (usageResponse) => {
        // Survival is best-effort: if it fails, everyone shows as still in (remaining = total).
        const survivalValue = await loadTournamentSurvival().catch(() => null)
        if (active) {
          setUsage(usageResponse)
          setSurvival(survivalValue)
          setLoadState('ready')
        }
      })
      .catch(() => {
        if (active) {
          setLoadState('error')
        }
      })
    return () => {
      active = false
    }
  }, [])

  const ranked = useMemo(() => (usage ? rankManagerSurvival(usage, survival) : []), [usage, survival])
  const fullyIntact = useMemo(() => ranked.filter((row) => row.remaining >= row.total).length, [ranked])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const base = normalized ? ranked.filter((row) => row.displayName.toLowerCase().includes(normalized)) : ranked
    return [...base].sort((left, right) =>
      mode === 'survivors'
        ? right.remaining - left.remaining || left.displayName.localeCompare(right.displayName)
        : right.eliminated - left.eliminated || left.displayName.localeCompare(right.displayName),
    )
  }, [ranked, query, mode])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const pageRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)

  function selectMode(next: Mode) {
    setMode(next)
    setPage(0)
  }

  function onSearch(value: string) {
    setQuery(value)
    setPage(0)
  }

  if (loadState === 'loading') {
    return <div className="skeleton h-96 rounded-[1.15rem]" />
  }
  if (loadState === 'error') {
    return (
      <section className="glass-panel rounded-[1.15rem] p-5">
        <EmptyState title={copy.errorTitle} body={copy.errorBody} />
      </section>
    )
  }
  if (ranked.length === 0) {
    return (
      <section className="glass-panel rounded-[1.15rem] p-5">
        <EmptyState title={copy.emptyTitle} body={copy.emptyBody} />
      </section>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.6fr)] lg:items-end">
        <p className="max-w-[66ch] text-sm leading-relaxed text-[var(--color-muted)]">{copy.intro}</p>
        <div className="grid grid-cols-2 gap-3">
          <StatTile label={copy.statManagers} value={formatInt(ranked.length)} tone="accent" />
          <StatTile label={copy.statFullyIntact} value={formatInt(fullyIntact)} tone="sand" />
        </div>
      </div>

      {!survival?.hasKnockoutStarted ? (
        <p className="rounded-[0.9rem] border border-white/8 bg-black/20 px-4 py-3 text-xs text-[var(--color-muted)]">{copy.dormantNote}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex gap-1 rounded-full border border-white/8 bg-black/18 p-1">
          {(['survivors', 'eliminated'] as Mode[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => selectMode(value)}
              className={[
                'rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-[0.14em] transition',
                mode === value ? 'bg-[var(--color-accent)] text-[var(--color-ink)]' : 'text-[var(--color-muted)] hover:bg-white/7 hover:text-white',
              ].join(' ')}
            >
              {value === 'survivors' ? copy.toggleSurvivors : copy.toggleEliminated}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={query}
          onChange={(event) => onSearch(event.target.value)}
          placeholder={copy.searchPlaceholder}
          className="min-w-0 flex-1 rounded-[0.8rem] border border-white/10 bg-black/24 px-3.5 py-2 text-sm text-white outline-none transition placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)]"
        />
      </div>

      <section className="glass-panel overflow-hidden rounded-[1.15rem]">
        <div className="divide-y divide-white/6">
          {pageRows.map((row, index) => (
            <SurvivorRow
              key={row.participantId}
              row={row}
              rank={safePage * PAGE_SIZE + index + 1}
              outLabel={copy.outLabel}
              tallyTitle={messages.survival.tallyTitle.replace('{remaining}', String(row.remaining)).replace('{total}', String(row.total))}
            />
          ))}
        </div>
      </section>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={safePage === 0}
            onClick={() => setPage(safePage - 1)}
            className="rounded-full border border-white/12 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white transition hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {copy.prev}
          </button>
          <span className="mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-muted)]">
            {copy.pageInfo
              .replace('{from}', String(safePage * PAGE_SIZE + 1))
              .replace('{to}', String(safePage * PAGE_SIZE + pageRows.length))
              .replace('{total}', String(filtered.length))}
          </span>
          <button
            type="button"
            disabled={safePage >= totalPages - 1}
            onClick={() => setPage(safePage + 1)}
            className="rounded-full border border-white/12 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white transition hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {copy.next}
          </button>
        </div>
      ) : null}
    </div>
  )
}
