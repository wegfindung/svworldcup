import { useEffect, useMemo, useState } from 'react'
import { PlayerPortrait } from './PlayerPortrait'
import { TeamFlag } from './TeamFlag'
import { fetchTeamSelections } from '../lib/api'
import type {
  LineupStatus,
  MatchResolution,
  ResolutionOverride,
  ResolvedMatchRow,
  TeamPoolPlayer,
  TeamSeed,
} from '../lib/types'

interface MatchImportResolveStageProps {
  resolution: MatchResolution
  homeTeam: TeamSeed
  awayTeam: TeamSeed
  busy: boolean
  onSubmit: (overrides: ResolutionOverride[]) => void
  onBack: () => void
}

type RowChoice = { kind: 'player'; playerId: number } | { kind: 'skip' }

function rowKey(teamCode: string, sourceName: string): string {
  return `${teamCode}:${sourceName}`
}

const pillButtonClass =
  'rounded-full border border-white/12 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white transition hover:-translate-y-[1px] hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]'

// Fix 7: the pre-persist resolve stage. Nothing is persisted — the admin resolves or skips
// every flagged row, then Submit calls /upload with the overrides.
export function MatchImportResolveStage({
  resolution,
  homeTeam,
  awayTeam,
  busy,
  onSubmit,
  onBack,
}: MatchImportResolveStageProps) {
  const [pools, setPools] = useState<Record<string, TeamPoolPlayer[]>>({})
  const [poolsLoaded, setPoolsLoaded] = useState(false)
  const [poolsError, setPoolsError] = useState<string | null>(null)
  const [choices, setChoices] = useState<Map<string, RowChoice>>(new Map())

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchTeamSelections(homeTeam.code), fetchTeamSelections(awayTeam.code)])
      .then(([home, away]) => {
        if (cancelled) return
        setPools({ [homeTeam.code]: home.items, [awayTeam.code]: away.items })
        setPoolsLoaded(true)
      })
      .catch((caught) => {
        if (!cancelled) {
          setPoolsError(caught instanceof Error ? caught.message : 'Could not load team pools.')
        }
      })
    return () => {
      cancelled = true
    }
  }, [homeTeam.code, awayTeam.code])

  function setChoice(key: string, choice: RowChoice | null) {
    setChoices((current) => {
      const next = new Map(current)
      if (choice === null) {
        next.delete(key)
      } else {
        next.set(key, choice)
      }
      return next
    })
  }

  const unresolvedRemaining = useMemo(
    () =>
      resolution.rows.filter(
        (row) => row.resolution.status === 'unresolved' && !choices.has(rowKey(row.teamCode, row.sourceName)),
      ).length,
    [resolution.rows, choices],
  )

  function playerName(teamCode: string, playerId: number): string {
    return pools[teamCode]?.find((player) => player.playerId === playerId)?.displayName ?? `Player #${playerId}`
  }

  function handleSubmit() {
    const overrides: ResolutionOverride[] = []
    for (const row of resolution.rows) {
      const choice = choices.get(rowKey(row.teamCode, row.sourceName))
      if (!choice) continue
      overrides.push(
        choice.kind === 'skip'
          ? { sourceName: row.sourceName, teamCode: row.teamCode, skip: true }
          : { sourceName: row.sourceName, teamCode: row.teamCode, playerId: choice.playerId },
      )
    }
    onSubmit(overrides)
  }

  function renderRow(row: ResolvedMatchRow) {
    const key = rowKey(row.teamCode, row.sourceName)
    const choice = choices.get(key)
    const pool = pools[row.teamCode] ?? []
    const autoResolved = row.resolution.status === 'resolved'
    const needsAction = !choice && !autoResolved

    return (
      <article
        key={key}
        className={['rounded-[1.2rem] border bg-black/15 p-4', needsAction ? 'border-amber-300/30' : 'border-white/8'].join(
          ' ',
        )}
      >
        <div className="flex items-start gap-3">
          <PlayerPortrait
            src="/placeholders/player.svg"
            alt={row.sourceName}
            width={48}
            height={48}
            className="h-12 w-12 rounded-[0.9rem] border border-white/10 object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">source name</p>
            <p className="truncate text-sm font-semibold text-white">{row.sourceName}</p>
            <p className="mono mt-0.5 text-[11px] text-[var(--color-muted)]">
              {row.minutes}&apos; · {row.goals}G · {row.assists}A · {row.rating.toFixed(1)}
            </p>
          </div>
        </div>

        <div className="mt-3">
          {choice?.kind === 'skip' ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="mono rounded-full border border-white/10 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">
                skipped — not imported
              </span>
              <button type="button" disabled={busy} onClick={() => setChoice(key, null)} className={pillButtonClass}>
                Undo
              </button>
            </div>
          ) : choice?.kind === 'player' ? (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-[var(--color-accent)]">
                → {playerName(row.teamCode, choice.playerId)}{' '}
                <span className="text-[var(--color-muted)]">(you picked)</span>
              </p>
              <button type="button" disabled={busy} onClick={() => setChoice(key, null)} className={pillButtonClass}>
                Change
              </button>
            </div>
          ) : autoResolved && row.resolution.status === 'resolved' ? (
            <p className="text-sm text-[var(--color-accent)]">→ {playerName(row.teamCode, row.resolution.playerId)}</p>
          ) : (
            <div className="rounded-[0.95rem] border border-amber-300/30 bg-amber-300/8 p-3">
              <p className="text-xs text-amber-200">
                {row.resolution.status === 'unresolved' ? row.resolution.reason : 'Unresolved.'} Pick a player or skip
                this name.
              </p>
              {pool.length === 0 ? (
                <p className="mt-2 text-xs text-[var(--color-muted)]">
                  No curated pool players for {row.teamCode} — fill the team pool first.
                </p>
              ) : (
                <select
                  defaultValue=""
                  disabled={busy}
                  onChange={(event) => {
                    if (event.target.value) {
                      setChoice(key, { kind: 'player', playerId: Number(event.target.value) })
                    }
                  }}
                  className="mt-2 h-10 w-full rounded-[0.85rem] border border-white/10 bg-black/15 px-2 text-sm text-white outline-none transition focus:border-[var(--color-accent)] disabled:opacity-50"
                >
                  <option value="">Select a player…</option>
                  {pool.map((candidate) => (
                    <option key={candidate.playerId} value={candidate.playerId}>
                      {candidate.displayName}
                    </option>
                  ))}
                </select>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => setChoice(key, { kind: 'skip' })}
                className={`mt-2 ${pillButtonClass}`}
              >
                Skip this player
              </button>
            </div>
          )}
        </div>
      </article>
    )
  }

  function renderColumn(team: TeamSeed) {
    const rows = resolution.rows.filter((row) => row.teamCode === team.code)
    const groups: Array<{ key: LineupStatus; label: string }> = [
      { key: 'starter', label: 'Starting lineup' },
      { key: 'substitute', label: 'Used substitutes' },
    ]
    return (
      <div className="glass-panel rounded-[1.15rem] p-4">
        <div className="flex items-center gap-3">
          <TeamFlag teamCode={team.code} label={team.nameEn} size="md" />
          <div>
            <h4 className="text-lg font-semibold tracking-tight text-white">{team.nameEn}</h4>
            <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">{rows.length} players</p>
          </div>
        </div>
        {groups.map((group) => {
          const groupRows = rows.filter((row) => row.lineupStatus === group.key)
          return (
            <div key={group.key} className="mt-4">
              <p className="mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-muted)]">{group.label}</p>
              <div className="mt-2 grid gap-2">
                {groupRows.length === 0 ? (
                  <p className="text-xs text-[var(--color-muted)]">None listed.</p>
                ) : (
                  groupRows.map(renderRow)
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="hero-card rounded-[1.25rem] px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">resolve before submitting</p>
            <h3 className="mt-4 text-2xl font-semibold tracking-tight text-white">
              {homeTeam.nameEn}{' '}
              <span className="mono text-[var(--color-accent)]">
                {resolution.homeGoals}&nbsp;–&nbsp;{resolution.awayGoals}
              </span>{' '}
              {awayTeam.nameEn}
            </h3>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Nothing is saved yet. Resolve or skip every flagged row, then submit to create the pending batch.
            </p>
          </div>
          <button
            type="button"
            onClick={onBack}
            disabled={busy}
            className="rounded-full border border-white/12 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-[1px] hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
          >
            Back to upload
          </button>
        </div>
      </div>

      <div className="glass-panel rounded-[1.15rem] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow">resolution status</p>
            <p className="mt-3 text-lg font-semibold text-white">
              {unresolvedRemaining === 0
                ? 'All rows resolved or skipped'
                : `${unresolvedRemaining} row${unresolvedRemaining === 1 ? '' : 's'} still need a choice`}
            </p>
            {resolution.skippedNames.length > 0 ? (
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                Auto-skipped (on the skip list): {resolution.skippedNames.join(', ')}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            disabled={busy || unresolvedRemaining > 0 || !poolsLoaded}
            onClick={handleSubmit}
            className="rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--color-ink)] transition hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
          >
            {busy ? 'Submitting…' : 'Submit match report'}
          </button>
        </div>
        {poolsError ? (
          <div className="mt-3 rounded-[1.1rem] border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-sm text-[var(--color-paper)]">
            {poolsError}
          </div>
        ) : null}
      </div>

      {!poolsLoaded && !poolsError ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="skeleton h-72 rounded-[1.15rem]" />
          <div className="skeleton h-72 rounded-[1.15rem]" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {renderColumn(homeTeam)}
          {renderColumn(awayTeam)}
        </div>
      )}
    </div>
  )
}
