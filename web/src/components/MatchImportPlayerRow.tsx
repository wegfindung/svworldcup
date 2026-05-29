import { useState } from 'react'
import { InfoTip } from './InfoTip'
import { PlayerPortrait } from './PlayerPortrait'
import type { LineupStatus, MatchImportRowEdit, PendingMatchStatRow, TeamPoolPlayer } from '../lib/types'

interface MatchImportPlayerRowProps {
  row: PendingMatchStatRow
  // The curated-pool player the server resolved this row to, if any. null = unresolved row,
  // or resolved to a player_id that is not in the team's curated pool.
  resolvedPlayer: TeamPoolPlayer | null
  // The team's curated pool — the D16 remap candidate set.
  candidates: TeamPoolPlayer[]
  disabled: boolean
  busy: boolean
  onSaveEdits: (rowId: string, edits: MatchImportRowEdit) => void
  onResolve: (rowId: string, playerId: number) => void
}

const numberFieldClass =
  'h-10 w-full rounded-[0.85rem] border border-white/10 bg-black/15 px-2.5 text-sm text-white outline-none transition focus:border-[var(--color-accent)] disabled:opacity-50'

// Fix 5: native <option> popups otherwise render with OS colours. Chrome/Firefox honour an
// explicit option background + text colour.
const optionClass = 'bg-[var(--color-ink-soft)] text-white'

export function MatchImportPlayerRow({
  row,
  resolvedPlayer,
  candidates,
  disabled,
  busy,
  onSaveEdits,
  onResolve,
}: MatchImportPlayerRowProps) {
  const [minutes, setMinutes] = useState(row.minutes)
  const [goals, setGoals] = useState(row.goals)
  const [assists, setAssists] = useState(row.assists)
  const [rating, setRating] = useState<string>(row.rating === undefined ? '' : String(row.rating))
  const [lineupStatus, setLineupStatus] = useState<LineupStatus>(row.lineupStatus)
  const [cleanSheetEligible, setCleanSheetEligible] = useState(row.cleanSheetEligible)
  const [remapOpen, setRemapOpen] = useState(false)

  const draftRating = rating.trim() === '' ? undefined : Number(rating)

  const edits: MatchImportRowEdit = {}
  if (minutes !== row.minutes) edits.minutes = minutes
  if (goals !== row.goals) edits.goals = goals
  if (assists !== row.assists) edits.assists = assists
  if (draftRating !== undefined && draftRating !== row.rating) edits.rating = draftRating
  if (lineupStatus !== row.lineupStatus) edits.lineupStatus = lineupStatus
  if (cleanSheetEligible !== row.cleanSheetEligible) edits.cleanSheetEligible = cleanSheetEligible
  const dirty = Object.keys(edits).length > 0

  const unresolved = row.playerId === null

  return (
    <article
      className={[
        'rounded-[1.2rem] border bg-black/15 p-4',
        unresolved ? 'border-amber-300/30' : 'border-white/8',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <PlayerPortrait
          src={resolvedPlayer?.imageUrl ?? '/placeholders/player.svg'}
          alt={resolvedPlayer?.displayName ?? row.sourceName}
          width={52}
          height={52}
          className="h-13 w-13 rounded-[0.9rem] border border-white/10 object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">
            screenshot name
          </p>
          <p className="truncate text-sm font-semibold text-white">{row.sourceName}</p>
          {unresolved ? (
            <span className="mono mt-1 inline-block rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.16em] text-amber-200">
              unresolved — pick a player
            </span>
          ) : (
            <>
              <p className="mt-0.5 truncate text-sm text-[var(--color-accent)]">
                → {resolvedPlayer?.displayName ?? `Player #${row.playerId}`}
              </p>
              <p className="mono mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] uppercase tracking-[0.14em] text-[var(--color-muted)]">
                <span>player #{row.playerId}</span>
                <a
                  href={`https://play.soccerverse.com/player/${row.playerId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--color-accent)] underline-offset-2 transition hover:underline"
                >
                  Soccerverse profile ↗
                </a>
              </p>
            </>
          )}
        </div>
        <label className="grid gap-1">
          <span className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">lineup</span>
          <select
            value={lineupStatus}
            disabled={disabled || busy}
            onChange={(event) => setLineupStatus(event.target.value as LineupStatus)}
            className="form-select h-10 px-2 text-sm transition"
          >
            <option className={optionClass} value="starter">Starter</option>
            <option className={optionClass} value="substitute">Substitute</option>
          </select>
        </label>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="grid gap-1">
          <span className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">minutes</span>
          <input
            type="number"
            min={0}
            max={130}
            value={minutes}
            disabled={disabled || busy}
            onChange={(event) => setMinutes(Number(event.target.value))}
            className={numberFieldClass}
          />
        </label>
        <label className="grid gap-1">
          <span className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">goals</span>
          <input
            type="number"
            min={0}
            max={20}
            value={goals}
            disabled={disabled || busy}
            onChange={(event) => setGoals(Number(event.target.value))}
            className={numberFieldClass}
          />
        </label>
        <label className="grid gap-1">
          <span className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">assists</span>
          <input
            type="number"
            min={0}
            max={20}
            value={assists}
            disabled={disabled || busy}
            onChange={(event) => setAssists(Number(event.target.value))}
            className={numberFieldClass}
          />
        </label>
        <label className="grid gap-1">
          <span className="mono flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">
            rating
            <InfoTip
              label="About the rating field"
              content="The source match rating (e.g. SofaScore), 0–10. Stored as a raw fact; performance points are derived from it later by the scoring engine — you do not type points here."
            />
          </span>
          <input
            type="number"
            min={0}
            max={10}
            step={0.1}
            value={rating}
            disabled={disabled || busy}
            onChange={(event) => setRating(event.target.value)}
            className={numberFieldClass}
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 rounded-[0.85rem] border border-white/8 bg-black/12 px-3 py-2 text-xs text-white">
          <input
            type="checkbox"
            checked={cleanSheetEligible}
            disabled={disabled || busy}
            onChange={(event) => setCleanSheetEligible(event.target.checked)}
            className="h-4 w-4 accent-[var(--color-accent)]"
          />
          Clean sheet eligible
          <InfoTip
            label="About clean sheet eligible"
            content="A review-UI judgement, never in the submission. Tick it when this player's team conceded no goals and the player qualifies under the clean-sheet rule. Use the final score shown above to decide."
          />
        </label>

        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => setRemapOpen((open) => !open)}
          className="rounded-full border border-white/12 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white transition hover:-translate-y-[1px] hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
        >
          {unresolved ? 'Resolve player' : 'Remap'}
        </button>

        {dirty ? (
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => onSaveEdits(row.rowId, edits)}
            className="rounded-full bg-[var(--color-accent)] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink)] transition hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
          >
            {busy ? 'Saving…' : 'Save row'}
          </button>
        ) : null}
      </div>

      {remapOpen ? (
        <div className="mt-3 rounded-[0.95rem] border border-white/10 bg-black/20 p-3">
          <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">
            map to {row.teamCode} squad
          </p>
          {candidates.length === 0 ? (
            <p className="mt-2 text-xs text-[var(--color-muted)]">
              No curated pool players for {row.teamCode} — fill the team pool first.
            </p>
          ) : (
            <select
              defaultValue=""
              disabled={disabled || busy}
              onChange={(event) => {
                const value = event.target.value
                if (value) {
                  onResolve(row.rowId, Number(value))
                  setRemapOpen(false)
                }
              }}
              className="form-select mt-2 h-10 w-full px-2 text-sm transition"
            >
              <option className={optionClass} value="">Select a player…</option>
              {candidates.map((candidate) => (
                <option className={optionClass} key={candidate.playerId} value={candidate.playerId}>
                  {candidate.displayName}
                </option>
              ))}
            </select>
          )}
        </div>
      ) : null}
    </article>
  )
}
