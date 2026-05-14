import { useEffect, useState, type FormEvent } from 'react'
import { defaultScoring } from '../../data/eventConfig'
import { fetchAdminOverview, updateAdminScoring } from '../../lib/api'
import type { ScoringConfig } from '../../lib/types'

const scoringFields: Array<{ key: keyof ScoringConfig; label: string; step: string }> = [
  { key: 'goal', label: 'Goal', step: '1' },
  { key: 'assist', label: 'Assist', step: '1' },
  { key: 'cleanSheet', label: 'Clean sheet', step: '1' },
  { key: 'appearance', label: 'Appearance', step: '1' },
  { key: 'minutes', label: 'Minutes', step: '1' },
  { key: 'performancePointsMin', label: 'Perf min', step: '0.1' },
  { key: 'performancePointsMax', label: 'Perf max', step: '0.1' },
]

export function ScoringView() {
  const [scoringForm, setScoringForm] = useState<ScoringConfig>(defaultScoring)
  const [scoringLocked, setScoringLocked] = useState(false)
  const [scoringBusy, setScoringBusy] = useState(false)
  const [scoringMessage, setScoringMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const overview = await fetchAdminOverview()
        if (active) {
          setScoringForm(overview.scoring)
          setScoringLocked(overview.scoringLocked)
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Could not load scoring settings.')
        }
      }
    })()
    return () => {
      active = false
    }
  }, [])

  async function handleSaveScoring(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setScoringBusy(true)
    setError(null)
    setScoringMessage(null)

    try {
      const response = await updateAdminScoring(scoringForm)
      setScoringForm(response.item)
      setScoringMessage('Scoring settings saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scoring update failed.')
    } finally {
      setScoringBusy(false)
    }
  }

  return (
    <form onSubmit={handleSaveScoring} className="glass-panel rounded-[1.15rem] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">scoring settings</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">Retouch event rules.</h3>
          <p className="mt-3 max-w-[58ch] text-sm leading-relaxed text-[var(--color-muted)]">
            These values drive the public leaderboards. Once kickoff lock is active, the backend rejects scoring changes.
          </p>
        </div>
        <span
          className={[
            'mono rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.18em]',
            scoringLocked
              ? 'border-amber-300/25 bg-amber-300/10 text-amber-200'
              : 'border-[var(--color-accent)]/25 bg-[var(--color-accent)]/10 text-[var(--color-accent)]',
          ].join(' ')}
        >
          {scoringLocked ? 'locked' : 'editable'}
        </span>
      </div>

      {error ? (
        <div className="mt-5 rounded-[1.3rem] border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-sm text-[var(--color-paper)]">
          {error}
        </div>
      ) : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {scoringFields.map((field) => (
          <label key={field.key} className="grid gap-2">
            <span className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">{field.label}</span>
            <input
              type="number"
              min={0}
              max={field.key.startsWith('performance') ? 5 : 20}
              step={field.step}
              value={scoringForm[field.key]}
              onChange={(event) =>
                setScoringForm((current) => ({
                  ...current,
                  [field.key]: Number(event.target.value),
                }))
              }
              className="h-11 rounded-[1rem] border border-white/10 bg-black/15 px-3 text-sm text-white outline-none transition focus:border-[var(--color-accent)]"
            />
          </label>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={scoringBusy || scoringLocked}
          className="rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--color-ink)] transition hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
        >
          {scoringBusy ? 'Saving...' : 'Save scoring'}
        </button>
        {scoringMessage ? <p className="text-sm text-[var(--color-accent)]">{scoringMessage}</p> : null}
      </div>
    </form>
  )
}
