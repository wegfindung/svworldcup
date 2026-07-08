// "still in the tournament" tally pill — reads like a Tables breakdown pill. Green while all of a
// manager's players survive, amber once any are knocked out. Shared by the Tables badge and the Stats
// Survivors tab. See SOP_scoring_and_leagues.md "Squad survival indicator + eliminated player marker".
export function SurvivalPill({ remaining, total, title }: { remaining: number; total: number; title?: string }) {
  const allIn = remaining >= total
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition duration-300 ${
        allIn
          ? 'border-[var(--color-accent)]/20 bg-[var(--color-accent)]/5 text-[var(--color-accent)]'
          : 'border-[var(--color-sand)]/30 bg-[var(--color-sand)]/8 text-[var(--color-sand)]'
      }`}
    >
      <span aria-hidden="true">⚽</span>
      <span className="mono font-bold">
        {remaining}/{total}
      </span>
    </span>
  )
}
