import { useMemo, useState } from 'react'
import type { AppMessages } from '../i18n/messages'
import type { BudgetOption, ScoringConfig, SlotClass } from '../lib/types'

interface ScoringCalculatorProps {
  budgetOptions: readonly BudgetOption[]
  copy: AppMessages['scoringCalculator']
  scoring: ScoringConfig
}

const slotClasses: SlotClass[] = ['GK', 'DEF', 'MID', 'FWD']

function formatScore(value: number) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  })
}

function derivePerformancePoints(rating: number, scoring: ScoringConfig) {
  const curve = scoring.performanceCurve
  if (!Number.isFinite(rating) || curve.length === 0 || rating < curve[0].rating) {
    return 0
  }

  const lastIndex = curve.length - 1
  if (rating >= curve[lastIndex].rating) {
    return curve[lastIndex].points
  }

  for (let index = 0; index < lastIndex; index += 1) {
    const lower = curve[index]
    const upper = curve[index + 1]
    if (rating >= lower.rating && rating <= upper.rating) {
      const span = upper.rating - lower.rating
      const ratio = span === 0 ? 0 : (rating - lower.rating) / span
      return lower.points + ratio * (upper.points - lower.points)
    }
  }

  return 0
}

function NumberControl({
  label,
  max,
  min,
  onChange,
  step = 1,
  value,
}: {
  label: string
  max: number
  min: number
  onChange: (value: number) => void
  step?: number
  value: number
}) {
  function clamp(nextValue: number) {
    if (!Number.isFinite(nextValue)) {
      return min
    }
    return Math.min(max, Math.max(min, nextValue))
  }

  return (
    <label className="grid gap-2">
      <span className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">{label}</span>
      <div className="grid gap-2 rounded-[0.9rem] border border-white/8 bg-black/14 p-3">
        <div className="flex items-center justify-between gap-3">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(event) => onChange(clamp(Number(event.target.value)))}
            className="w-full accent-[var(--color-accent)]"
          />
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(event) => onChange(clamp(Number(event.target.value)))}
            className="h-9 w-20 rounded-[0.7rem] border border-white/10 bg-[rgba(8,13,12,0.8)] px-2 text-right text-sm text-white outline-none focus:border-[var(--color-accent)]/45"
          />
        </div>
      </div>
    </label>
  )
}

export function ScoringCalculator({ budgetOptions, copy, scoring }: ScoringCalculatorProps) {
  const [slotClass, setSlotClass] = useState<SlotClass>('MID')
  const [goals, setGoals] = useState(1)
  const [assists, setAssists] = useState(0)
  const [minutes, setMinutes] = useState(72)
  const [rating, setRating] = useState(7.4)
  const [cleanSheetEligible, setCleanSheetEligible] = useState(false)
  const [scoreMultiplier, setScoreMultiplier] = useState(1)
  const [boostPercent, setBoostPercent] = useState(0)

  const score = useMemo(() => {
    const goalPoints = goals * scoring.goal
    const assistPoints = assists * scoring.assist
    const appearancePoints = minutes > 0 ? scoring.appearance : 0
    const minutePoints = minutes >= 60 ? scoring.minutes : 0
    const cleanSheetPoints = cleanSheetEligible ? scoring.cleanSheet[slotClass] : 0
    const performancePoints = derivePerformancePoints(rating, scoring)
    const baseScore = goalPoints + assistPoints + appearancePoints + minutePoints + cleanSheetPoints + performancePoints
    const bonusScore = baseScore * (boostPercent / 100)
    const finalScore = (baseScore + bonusScore) * scoreMultiplier

    return {
      baseScore,
      bonusScore,
      finalScore,
      rows: [
        [copy.components.goals, goalPoints],
        [copy.components.assists, assistPoints],
        [copy.components.appearance, appearancePoints],
        [copy.components.minutes, minutePoints],
        [copy.components.cleanSheet, cleanSheetPoints],
        [copy.components.performance, performancePoints],
      ] as Array<[string, number]>,
    }
  }, [assists, boostPercent, cleanSheetEligible, copy.components, goals, minutes, rating, scoreMultiplier, scoring, slotClass])

  function resetExample() {
    setSlotClass('MID')
    setGoals(1)
    setAssists(0)
    setMinutes(72)
    setRating(7.4)
    setCleanSheetEligible(false)
    setScoreMultiplier(1)
    setBoostPercent(0)
  }

  return (
    <div className="glass-panel rounded-[1.25rem] p-4 sm:p-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">{copy.eyebrow}</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-[1.7rem]">{copy.title}</h3>
              <p className="mt-3 max-w-[66ch] text-sm leading-relaxed text-[var(--color-muted)]">{copy.body}</p>
            </div>
            <button
              type="button"
              onClick={resetExample}
              className="rounded-full border border-white/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]"
            >
              {copy.reset}
            </button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">{copy.slotClass}</p>
              <div className="grid grid-cols-4 gap-2">
                {slotClasses.map((nextSlotClass) => (
                  <button
                    key={nextSlotClass}
                    type="button"
                    onClick={() => setSlotClass(nextSlotClass)}
                    className={[
                      'rounded-[0.8rem] border px-3 py-2 text-sm font-semibold transition active:scale-[0.98]',
                      slotClass === nextSlotClass
                        ? 'border-[var(--color-accent)]/45 bg-[var(--color-accent)]/12 text-[var(--color-accent)]'
                        : 'border-white/8 bg-black/14 text-white hover:bg-white/6',
                    ].join(' ')}
                  >
                    {nextSlotClass}
                  </button>
                ))}
              </div>
            </div>

            <label className="grid gap-2">
              <span className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">{copy.budget}</span>
              <select
                value={scoreMultiplier}
                onChange={(event) => setScoreMultiplier(Number(event.target.value))}
                className="h-[3.35rem] rounded-[0.9rem] border border-white/10 bg-[rgba(8,13,12,0.82)] px-3 text-sm text-white outline-none focus:border-[var(--color-accent)]/45"
              >
                {budgetOptions.map((option) => (
                  <option key={option.budgetLimit} value={option.scoreMultiplier}>
                    {option.budgetLimit.toLocaleString(undefined)} SVC - x{option.scoreMultiplier}
                  </option>
                ))}
              </select>
            </label>

            <NumberControl label={copy.goals} min={0} max={5} value={goals} onChange={setGoals} />
            <NumberControl label={copy.assists} min={0} max={5} value={assists} onChange={setAssists} />
            <NumberControl label={copy.minutes} min={0} max={120} value={minutes} onChange={setMinutes} />
            <NumberControl label={copy.rating} min={0} max={10} step={0.1} value={rating} onChange={setRating} />
            <NumberControl label={copy.boost} min={0} max={10} step={1} value={boostPercent} onChange={setBoostPercent} />

            <label className="flex min-h-[4.95rem] items-center justify-between gap-4 rounded-[0.9rem] border border-white/8 bg-black/14 p-3">
              <span className="text-sm font-semibold text-white">{copy.cleanSheet}</span>
              <input
                type="checkbox"
                checked={cleanSheetEligible}
                onChange={(event) => setCleanSheetEligible(event.target.checked)}
                className="h-5 w-5 accent-[var(--color-accent)]"
              />
            </label>
          </div>
        </div>

        <aside className="rounded-[1rem] border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/8 p-4">
          <p className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-accent)]">{copy.finalScore}</p>
          <p className="mono mt-3 text-4xl text-white">{formatScore(score.finalScore)}</p>
          <div className="mt-5 grid gap-2">
            <div className="flex items-center justify-between gap-3 border-b border-white/8 pb-2 text-sm">
              <span className="text-[var(--color-muted)]">{copy.baseScore}</span>
              <span className="mono text-white">{formatScore(score.baseScore)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-white/8 pb-2 text-sm">
              <span className="text-[var(--color-muted)]">{copy.bonusScore}</span>
              <span className="mono text-white">{formatScore(score.bonusScore)}</span>
            </div>
          </div>

          <p className="mono mt-5 text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">{copy.breakdown}</p>
          <div className="mt-3 grid gap-2">
            {score.rows.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-3 text-xs">
                <span className="text-[var(--color-muted)]">{label}</span>
                <span className="mono text-white">{formatScore(value)}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}
