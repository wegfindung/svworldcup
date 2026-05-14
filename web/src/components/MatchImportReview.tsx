import { useEffect, useMemo, useState } from 'react'
import { MatchImportPlayerRow } from './MatchImportPlayerRow'
import { TeamFlag } from './TeamFlag'
import {
  addMatchImportSkipName,
  confirmMatchImportBatch,
  discardMatchImportBatch,
  editMatchImportRow,
  fetchTeamSelections,
  resolveMatchImportRow,
} from '../lib/api'
import type {
  LineupStatus,
  MatchImportRowEdit,
  PendingMatchBatch,
  PendingMatchStatRow,
  TeamPoolPlayer,
  TeamSeed,
} from '../lib/types'

interface MatchImportReviewProps {
  batch: PendingMatchBatch
  homeTeam: TeamSeed
  awayTeam: TeamSeed
  adminEmail: string
  preview?: boolean
  // Supplied only in preview mode — the static curated pools for the demo batch.
  previewPools?: Record<string, TeamPoolPlayer[]>
  onBatchUpdated: (batch: PendingMatchBatch) => void
  onBatchRemoved: (reason: 'promoted' | 'discarded', promotedRowCount?: number) => void
  onClose: () => void
}

// D17: a confirmation only counts toward promotion if it matches the batch's current data
// version. Mirrors server lib/confirmationRules.ts so the review shows accurate status.
function validConfirmerEmails(batch: PendingMatchBatch): string[] {
  const emails = new Set<string>()
  for (const confirmation of batch.confirmations) {
    if (confirmation.dataVersion === batch.dataVersion) {
      emails.add(confirmation.adminEmail)
    }
  }
  return [...emails]
}

function TeamColumn({
  team,
  rows,
  pool,
  disabled,
  busy,
  onSaveEdits,
  onResolve,
  onSkipName,
  dataVersion,
}: {
  team: TeamSeed
  rows: PendingMatchStatRow[]
  pool: TeamPoolPlayer[]
  disabled: boolean
  busy: boolean
  onSaveEdits: (rowId: string, edits: MatchImportRowEdit) => void
  onResolve: (rowId: string, playerId: number) => void
  onSkipName: (teamCode: string, sourceName: string) => void
  dataVersion: number
}) {
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
            {rows.length} players
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
                groupRows.map((row) => (
                  <MatchImportPlayerRow
                    key={`${row.rowId}:${dataVersion}`}
                    row={row}
                    resolvedPlayer={
                      row.playerId === null
                        ? null
                        : pool.find((player) => player.playerId === row.playerId) ?? null
                    }
                    candidates={pool}
                    disabled={disabled}
                    busy={busy}
                    onSaveEdits={onSaveEdits}
                    onResolve={onResolve}
                    onSkipName={onSkipName}
                  />
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function MatchImportReview({
  batch,
  homeTeam,
  awayTeam,
  adminEmail,
  preview = false,
  previewPools,
  onBatchUpdated,
  onBatchRemoved,
  onClose,
}: MatchImportReviewProps) {
  const [pools, setPools] = useState<Record<string, TeamPoolPlayer[]>>(preview ? previewPools ?? {} : {})
  const [poolsLoading, setPoolsLoading] = useState(!preview)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (preview) {
      return
    }
    let cancelled = false
    setPoolsLoading(true)
    setError(null)
    Promise.all([fetchTeamSelections(homeTeam.code), fetchTeamSelections(awayTeam.code)])
      .then(([home, away]) => {
        if (cancelled) {
          return
        }
        setPools({ [homeTeam.code]: home.items, [awayTeam.code]: away.items })
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : 'Could not load team pools.')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPoolsLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [preview, homeTeam.code, awayTeam.code])

  const validConfirmers = useMemo(() => validConfirmerEmails(batch), [batch])
  const homeRows = batch.rows.filter((row) => row.teamCode === homeTeam.code)
  const awayRows = batch.rows.filter((row) => row.teamCode === awayTeam.code)
  const unresolvedCount = batch.rows.filter((row) => row.playerId === null).length

  const alreadyConfirmed = validConfirmers.includes(adminEmail)
  const isLastEditor = batch.lastEditedBy === adminEmail
  const confirmDisabled = preview || busy || alreadyConfirmed || isLastEditor

  function confirmBlockedReason(): string | null {
    if (preview) return 'Preview mode — not connected to the backend.'
    if (isLastEditor) return 'You were the most recent editor — a different admin must confirm.'
    if (alreadyConfirmed) return 'You have already confirmed this data version.'
    return null
  }

  async function runAction<T>(action: () => Promise<T>): Promise<T | undefined> {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      return await action()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Action failed.')
      return undefined
    } finally {
      setBusy(false)
    }
  }

  async function handleSaveEdits(rowId: string, edits: MatchImportRowEdit) {
    const result = await runAction(() => editMatchImportRow(batch.batchId, rowId, edits))
    if (result) {
      setMessage('Row saved — data version bumped, prior confirmations voided.')
      onBatchUpdated(result.batch)
    }
  }

  async function handleResolve(rowId: string, playerId: number) {
    const result = await runAction(() => resolveMatchImportRow(batch.batchId, rowId, playerId))
    if (result) {
      setMessage('Player mapped — the name is remembered for future imports of this team.')
      onBatchUpdated(result.batch)
    }
  }

  async function handleSkipName(teamCode: string, sourceName: string) {
    const result = await runAction(() => addMatchImportSkipName(teamCode, sourceName))
    if (result) {
      setMessage(`"${sourceName}" added to the ${teamCode} skip list.`)
    }
  }

  async function handleConfirm() {
    const result = await runAction(() => confirmMatchImportBatch(batch.batchId))
    if (!result) {
      return
    }
    if (result.promotion.promoted) {
      onBatchRemoved('promoted', result.promotion.promotedRowCount)
    } else if (result.batch) {
      setMessage('Confirmation recorded. One more distinct admin is needed to promote.')
      onBatchUpdated(result.batch)
    }
  }

  async function handleDiscard() {
    if (!window.confirm('Discard this pending batch? All review progress is lost.')) {
      return
    }
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      await discardMatchImportBatch(batch.batchId)
      onBatchRemoved('discarded')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Discard failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="hero-card rounded-[1.25rem] px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">match import review</p>
            <h3 className="mt-4 text-2xl font-semibold tracking-tight text-white">
              {homeTeam.nameEn}{' '}
              <span className="mono text-[var(--color-accent)]">
                {batch.homeGoals}&nbsp;–&nbsp;{batch.awayGoals}
              </span>{' '}
              {awayTeam.nameEn}
            </h3>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Imported by <span className="text-white">{batch.createdBy}</span> · data version v{batch.dataVersion}
              {batch.lastEditedBy ? (
                <>
                  {' '}· last edited by <span className="text-white">{batch.lastEditedBy}</span>
                </>
              ) : null}
            </p>
            <a
              href={batch.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="mono mt-3 inline-block max-w-[60ch] truncate text-xs text-[var(--color-accent)] underline decoration-dotted underline-offset-4"
            >
              {batch.sourceUrl}
            </a>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/12 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]"
          >
            Back to fixtures
          </button>
        </div>

        {preview ? (
          <div className="mt-4 rounded-[1.1rem] border border-amber-300/25 bg-amber-300/8 px-4 py-3 text-sm text-[var(--color-paper)]">
            Preview — not connected. This static demo batch cannot be confirmed, promoted or scored. Interactive
            actions are disabled.
          </div>
        ) : null}
      </div>

      <div className="glass-panel rounded-[1.15rem] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow">confirmation status</p>
            <p className="mt-3 text-lg font-semibold text-white">
              {validConfirmers.length} of 2 confirmations on v{batch.dataVersion}
            </p>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              {validConfirmers.length > 0
                ? `Confirmed by: ${validConfirmers.join(', ')}`
                : 'No confirmations count on the current data version yet.'}
            </p>
            {unresolvedCount > 0 ? (
              <p className="mt-1 text-sm text-amber-200">
                {unresolvedCount} unresolved {unresolvedCount === 1 ? 'row' : 'rows'} — these are skipped on promotion.
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={confirmDisabled}
              onClick={() => void handleConfirm()}
              className="rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--color-ink)] transition hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
            >
              {busy ? 'Working…' : 'Confirm fixture'}
            </button>
            <button
              type="button"
              disabled={preview || busy}
              onClick={() => void handleDiscard()}
              className="rounded-full border border-white/12 px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-[1px] hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
            >
              Discard batch
            </button>
          </div>
        </div>
        {confirmBlockedReason() ? (
          <p className="mt-3 text-xs text-[var(--color-muted)]">{confirmBlockedReason()}</p>
        ) : null}
        {error ? (
          <div className="mt-3 rounded-[1.1rem] border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-sm text-[var(--color-paper)]">
            {error}
          </div>
        ) : null}
        {message ? <p className="mt-3 text-sm text-[var(--color-accent)]">{message}</p> : null}
      </div>

      {poolsLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="skeleton h-72 rounded-[1.15rem]" />
          <div className="skeleton h-72 rounded-[1.15rem]" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <TeamColumn
            team={homeTeam}
            rows={homeRows}
            pool={pools[homeTeam.code] ?? []}
            disabled={preview || busy}
            busy={busy}
            onSaveEdits={handleSaveEdits}
            onResolve={handleResolve}
            onSkipName={handleSkipName}
            dataVersion={batch.dataVersion}
          />
          <TeamColumn
            team={awayTeam}
            rows={awayRows}
            pool={pools[awayTeam.code] ?? []}
            disabled={preview || busy}
            busy={busy}
            onSaveEdits={handleSaveEdits}
            onResolve={handleResolve}
            onSkipName={handleSkipName}
            dataVersion={batch.dataVersion}
          />
        </div>
      )}
    </div>
  )
}
