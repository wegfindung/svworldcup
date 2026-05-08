interface StatTileProps {
  label: string
  value: string
  tone?: 'accent' | 'sand' | 'default'
}

export function StatTile({ label, value, tone = 'default' }: StatTileProps) {
  const toneClass =
    tone === 'accent'
      ? 'text-[var(--color-accent)]'
      : tone === 'sand'
        ? 'text-[var(--color-sand)]'
        : 'text-white'

  return (
    <div className="glass-panel rounded-[1.75rem] p-5">
      <p className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">{label}</p>
      <p className={`mt-4 text-3xl font-semibold tracking-tight ${toneClass}`}>{value}</p>
    </div>
  )
}
