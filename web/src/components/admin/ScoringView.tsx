import { useEffect, useState, type FormEvent } from 'react'
import { defaultScoring } from '../../data/eventConfig'
import { fetchAdminOverview, updateAdminScoring } from '../../lib/api'
import type { ScoringConfig, SlotClass } from '../../lib/types'

type FlatKey = 'goal' | 'assist' | 'appearance' | 'minutes'

const flatFields: Array<{ key: FlatKey; label: string }> = [
  { key: 'goal', label: 'Goal' },
  { key: 'assist', label: 'Assist' },
  { key: 'appearance', label: 'Appearance' },
  { key: 'minutes', label: 'Minutes (≥60)' },
]

const slotClasses: SlotClass[] = ['GK', 'DEF', 'MID', 'FWD']

const inputClass =
  'h-11 rounded-[1rem] border border-white/10 bg-black/15 px-3 text-sm text-white outline-none transition focus:border-[var(--color-accent)]'
const labelClass = 'mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]'

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

  function setFlat(key: FlatKey, value: number) {
    setScoringForm((current) => ({ ...current, [key]: value }))
  }

  function setCleanSheet(slot: SlotClass, value: number) {
    setScoringForm((current) => ({
      ...current,
      cleanSheet: { ...current.cleanSheet, [slot]: value },
    }))
  }

  function setCurveAnchor(index: number, field: 'rating' | 'points', value: number) {
    setScoringForm((current) => ({
      ...current,
      performanceCurve: current.performanceCurve.map((anchor, i) =>
        i === index ? { ...anchor, [field]: value } : anchor,
      ),
    }))
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

      <section className="mt-6">
        <p className="eyebrow">flat values</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {flatFields.map((field) => (
            <label key={field.key} className="grid gap-2">
              <span className={labelClass}>{field.label}</span>
              <input
                type="number"
                min={0}
                max={20}
                step="1"
                value={scoringForm[field.key]}
                onChange={(event) => setFlat(field.key, Number(event.target.value))}
                className={inputClass}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <p className="eyebrow">clean sheet — per slot class</p>
        <p className="mt-2 max-w-[58ch] text-xs text-[var(--color-muted)]">
          MID is conditional: the configured value is paid only to a MID slot whose snapshot positions include
          a defensive midfielder code (<span className="mono">DML</span>, <span className="mono">DMR</span>,
          <span className="mono"> DMC</span>, or plain <span className="mono">DM</span>). Other MID slots earn
          <span className="mono"> 0</span> regardless of the number entered here. Eligibility also requires
          the player to have played 60+ minutes with the team conceding none.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {slotClasses.map((slot) => (
            <label key={slot} className="grid gap-2">
              <span className={labelClass}>{slot === 'MID' ? 'MID *' : slot}</span>
              <input
                type="number"
                min={0}
                max={20}
                step="1"
                value={scoringForm.cleanSheet[slot]}
                onChange={(event) => setCleanSheet(slot, Number(event.target.value))}
                className={inputClass}
              />
              {slot === 'MID' ? (
                <span className="text-[10px] leading-tight text-[var(--color-muted)]">
                  * Paid only to a MID with a defensive-midfielder alt position (DML/DMR/DMC/DM). Every other MID
                  earns 0 here.
                </span>
              ) : null}
            </label>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <p className="eyebrow">performance curve — rating → points</p>
        <p className="mt-2 max-w-[58ch] text-xs text-[var(--color-muted)]">
          Four anchors, strictly ascending by rating. Performance points are derived from each player's match rating via this piecewise-linear curve; ratings below the first anchor score 0.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {scoringForm.performanceCurve.map((anchor, index) => (
            <div key={index} className="grid gap-2 rounded-[1rem] border border-white/5 p-3">
              <span className={labelClass}>anchor {index + 1}</span>
              <label className="grid gap-1">
                <span className="mono text-[10px] text-[var(--color-muted)]">rating</span>
                <input
                  type="number"
                  min={0}
                  max={10}
                  step="0.1"
                  value={anchor.rating}
                  onChange={(event) => setCurveAnchor(index, 'rating', Number(event.target.value))}
                  className={inputClass}
                />
              </label>
              <label className="grid gap-1">
                <span className="mono text-[10px] text-[var(--color-muted)]">points</span>
                <input
                  type="number"
                  min={0}
                  max={5}
                  step="0.1"
                  value={anchor.points}
                  onChange={(event) => setCurveAnchor(index, 'points', Number(event.target.value))}
                  className={inputClass}
                />
              </label>
            </div>
          ))}
        </div>
      </section>

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
