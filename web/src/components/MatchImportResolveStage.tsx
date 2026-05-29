import { useEffect, useMemo, useState } from 'react'
import { ConfirmModal } from './ConfirmModal'
import { InfoTip } from './InfoTip'
import { PlayerPortrait } from './PlayerPortrait'
import { TeamFlag } from './TeamFlag'
import { addMatchImportSkipName, fetchTeamSelections, removeMatchImportSkipName } from '../lib/api'
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

// 'skip' = skip for this submission only. 'skip-always' = also written to the persistent
// per-team skip list (Fix 6).
type RowChoice =
  | { kind: 'player'; playerId: number }
  | { kind: 'skip' }
  | { kind: 'skip-always' }

// Fix A: the admin's local stat edits for one row — only the fields they touched. Applied
// over the parsed values when the row's override is built on submit.
type RowStatEdit = {
  minutes?: number
  goals?: number
  assists?: number
  rating?: number
  lineupStatus?: LineupStatus
}

function rowKey(teamCode: string, sourceName: string): string {
  return `${teamCode}:${sourceName}`
}

const pillButtonClass =
  'rounded-full border border-white/12 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white transition hover:-translate-y-[1px] hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]'

// Fix 5: keep the native <option> popup on-theme in Chrome/Firefox.
const optionClass = 'bg-[var(--color-ink-soft)] text-white'

// Fix A: compact input for the pre-persist stat edits.
const statInputClass =
  'h-9 w-full rounded-[0.7rem] border border-white/10 bg-black/15 px-2 text-sm text-white outline-none transition focus:border-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50'

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
  const [statEdits, setStatEdits] = useState<Map<string, RowStatEdit>>(new Map())
  const [confirmOpen, setConfirmOpen] = useState(false)
  // Which row key has a skip-list write in flight, and the last skip-list error.
  const [skipBusyKey, setSkipBusyKey] = useState<string | null>(null)
  const [skipError, setSkipError] = useState<string | null>(null)

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

  // Fix A: record one stat-field edit for a row. Stores only touched fields; unedited fields
  // fall back to the parsed value when the override is built on submit.
  function setStatEdit(key: string, field: keyof RowStatEdit, value: number | LineupStatus) {
    setStatEdits((current) => {
      const next = new Map(current)
      next.set(key, { ...(next.get(key) ?? {}), [field]: value })
      return next
    })
  }

  // Fix 6: "Always skip this name" writes the persistent per-team skip-list entry, then
  // marks the row skipped for this submission. Undo removes the skip-list entry again.
  async function handleAlwaysSkip(row: ResolvedMatchRow) {
    const key = rowKey(row.teamCode, row.sourceName)
    setSkipBusyKey(key)
    setSkipError(null)
    try {
      await addMatchImportSkipName(row.teamCode, row.sourceName)
      setChoice(key, { kind: 'skip-always' })
    } catch (caught) {
      setSkipError(caught instanceof Error ? caught.message : 'Could not update the skip list.')
    } finally {
      setSkipBusyKey(null)
    }
  }

  async function handleUndoSkipAlways(row: ResolvedMatchRow) {
    const key = rowKey(row.teamCode, row.sourceName)
    setSkipBusyKey(key)
    setSkipError(null)
    try {
      await removeMatchImportSkipName(row.teamCode, row.sourceName)
      setChoice(key, null)
    } catch (caught) {
      setSkipError(caught instanceof Error ? caught.message : 'Could not update the skip list.')
    } finally {
      setSkipBusyKey(null)
    }
  }

  const unresolvedRemaining = useMemo(
    () =>
      resolution.rows.filter(
        (row) => row.resolution.status === 'unresolved' && !choices.has(rowKey(row.teamCode, row.sourceName)),
      ).length,
    [resolution.rows, choices],
  )

  // Fix A: effective starter count per team — parsed lineup status with resolve-stage edits
  // applied, skipped rows excluded. Drives the live count display and the 11-starter guard.
  const starterCountByTeam = useMemo(() => {
    const counts = new Map<string, number>()
    for (const row of resolution.rows) {
      const key = rowKey(row.teamCode, row.sourceName)
      const choice = choices.get(key)
      if (choice?.kind === 'skip' || choice?.kind === 'skip-always') {
        continue
      }
      const status = statEdits.get(key)?.lineupStatus ?? row.lineupStatus
      if (status === 'starter') {
        counts.set(row.teamCode, (counts.get(row.teamCode) ?? 0) + 1)
      }
    }
    return counts
  }, [resolution.rows, choices, statEdits])

  const starterCapViolations = useMemo(
    () => [...starterCountByTeam.entries()].filter(([, count]) => count > 11).map(([code]) => code),
    [starterCountByTeam],
  )

  function playerName(teamCode: string, playerId: number): string {
    return pools[teamCode]?.find((player) => player.playerId === playerId)?.displayName ?? `Player #${playerId}`
  }

  function teamName(teamCode: string): string {
    if (teamCode === homeTeam.code) return homeTeam.nameEn
    if (teamCode === awayTeam.code) return awayTeam.nameEn
    return teamCode
  }

  function handleSubmit() {
    const overrides: ResolutionOverride[] = []
    for (const row of resolution.rows) {
      const key = rowKey(row.teamCode, row.sourceName)
      const choice = choices.get(key)
      const edit = statEdits.get(key)
      if (!choice && !edit) continue

      const override: ResolutionOverride = { sourceName: row.sourceName, teamCode: row.teamCode }
      if (choice?.kind === 'player') {
        override.playerId = choice.playerId
      } else if (choice?.kind === 'skip' || choice?.kind === 'skip-always') {
        override.skip = true
      }
      // Stat edits are meaningless on a skipped row — it is dropped from the batch.
      if (edit && !override.skip) {
        if (edit.minutes !== undefined) override.minutes = edit.minutes
        if (edit.goals !== undefined) override.goals = edit.goals
        if (edit.assists !== undefined) override.assists = edit.assists
        if (edit.rating !== undefined) override.rating = edit.rating
        if (edit.lineupStatus !== undefined) override.lineupStatus = edit.lineupStatus
      }
      overrides.push(override)
    }
    onSubmit(overrides)
  }

  function renderRow(row: ResolvedMatchRow) {
    const key = rowKey(row.teamCode, row.sourceName)
    const choice = choices.get(key)
    const pool = pools[row.teamCode] ?? []
    const autoResolved = row.resolution.status === 'resolved'
    const needsAction = !choice && !autoResolved
    const isSkipped = choice?.kind === 'skip' || choice?.kind === 'skip-always'
    const edit = statEdits.get(key)
    const effMinutes = edit?.minutes ?? row.minutes
    const effGoals = edit?.goals ?? row.goals
    const effAssists = edit?.assists ?? row.assists
    const effRating = edit?.rating ?? row.rating
    const effLineup = edit?.lineupStatus ?? row.lineupStatus

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
          </div>
        </div>

        {/* Fix A: parsed stats are editable here, pre-persist. Edits stay local until Submit,
            then ride out in this row's override. A skipped row is dropped, so it has no editor. */}
        {isSkipped ? null : (
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
            <label className="grid gap-1">
              <span className="mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-muted)]">min</span>
              <input
                type="number"
                min={0}
                max={130}
                value={effMinutes}
                disabled={busy}
                onChange={(event) => {
                  const next = Number(event.target.value)
                  if (Number.isFinite(next)) setStatEdit(key, 'minutes', next)
                }}
                className={statInputClass}
              />
            </label>
            <label className="grid gap-1">
              <span className="mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-muted)]">goals</span>
              <input
                type="number"
                min={0}
                max={20}
                value={effGoals}
                disabled={busy}
                onChange={(event) => {
                  const next = Number(event.target.value)
                  if (Number.isFinite(next)) setStatEdit(key, 'goals', next)
                }}
                className={statInputClass}
              />
            </label>
            <label className="grid gap-1">
              <span className="mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-muted)]">assists</span>
              <input
                type="number"
                min={0}
                max={20}
                value={effAssists}
                disabled={busy}
                onChange={(event) => {
                  const next = Number(event.target.value)
                  if (Number.isFinite(next)) setStatEdit(key, 'assists', next)
                }}
                className={statInputClass}
              />
            </label>
            <label className="grid gap-1">
              <span className="mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-muted)]">rating</span>
              <input
                type="number"
                min={0}
                max={10}
                step={0.1}
                value={effRating}
                disabled={busy}
                onChange={(event) => {
                  const next = Number(event.target.value)
                  if (Number.isFinite(next)) setStatEdit(key, 'rating', next)
                }}
                className={statInputClass}
              />
            </label>
            <label className="grid gap-1">
              <span className="mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-muted)]">lineup</span>
              <select
                value={effLineup}
                disabled={busy}
                onChange={(event) => setStatEdit(key, 'lineupStatus', event.target.value as LineupStatus)}
                className="form-select h-9 w-full px-2 text-sm transition"
              >
                <option className={optionClass} value="starter">
                  Starter
                </option>
                <option className={optionClass} value="substitute">
                  Substitute
                </option>
              </select>
            </label>
          </div>
        )}

        <div className="mt-3">
          {choice?.kind === 'skip' || choice?.kind === 'skip-always' ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="mono rounded-full border border-white/10 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">
                {choice.kind === 'skip-always' ? 'skipped — added to skip list' : 'skipped — not imported'}
              </span>
              <button
                type="button"
                disabled={busy || skipBusyKey === key}
                onClick={() =>
                  choice.kind === 'skip-always' ? void handleUndoSkipAlways(row) : setChoice(key, null)
                }
                className={pillButtonClass}
              >
                {skipBusyKey === key ? 'Working…' : 'Undo'}
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
                  className="form-select mt-2 h-10 w-full px-2 text-sm transition"
                >
                  <option className={optionClass} value="">Select a player…</option>
                  {pool.map((candidate) => (
                    <option className={optionClass} key={candidate.playerId} value={candidate.playerId}>
                      {candidate.displayName}
                    </option>
                  ))}
                </select>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy || skipBusyKey === key}
                  onClick={() => setChoice(key, { kind: 'skip' })}
                  className={pillButtonClass}
                >
                  Skip once
                </button>
                <button
                  type="button"
                  disabled={busy || skipBusyKey === key}
                  onClick={() => void handleAlwaysSkip(row)}
                  className={pillButtonClass}
                >
                  {skipBusyKey === key ? 'Working…' : 'Always skip this name'}
                </button>
              </div>
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
            <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">
              {rows.length} players · {starterCountByTeam.get(team.code) ?? 0}/11 starting
            </p>
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
            <p className="eyebrow flex items-center gap-1.5">
              resolution status
              <InfoTip
                label="About resolving rows"
                content="Every flagged row must be resolved to a pool player or skipped before you can submit. 'Skip once' drops the player from this submission only; 'Always skip this name' also adds it to the team skip list so it is auto-skipped on every future import."
              />
            </p>
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
            disabled={busy || unresolvedRemaining > 0 || !poolsLoaded || starterCapViolations.length > 0}
            onClick={() => setConfirmOpen(true)}
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
        {skipError ? (
          <div className="mt-3 rounded-[1.1rem] border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-sm text-[var(--color-paper)]">
            {skipError}
          </div>
        ) : null}
        {/* Fix A: client-side guard mirroring the server's post-override starter-cap re-check —
            lineupStatus edits above can push a team over 11. */}
        {starterCapViolations.length > 0 ? (
          <div className="mt-3 rounded-[1.1rem] border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-sm text-[var(--color-paper)]">
            {starterCapViolations.map(teamName).join(' and ')}{' '}
            {starterCapViolations.length === 1 ? 'has' : 'have'} more than 11 starters. A starting
            lineup is fixed at 11 — set the extra rows to “Substitute” before submitting.
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

      <ConfirmModal
        open={confirmOpen}
        title="Submit the match report?"
        body="This creates the pending batch and counts as your confirmation #1. One other distinct admin must then confirm before the fixture is promoted."
        confirmLabel="Submit match report"
        onConfirm={() => {
          setConfirmOpen(false)
          handleSubmit()
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}
