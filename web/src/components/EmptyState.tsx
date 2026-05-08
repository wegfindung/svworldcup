interface EmptyStateProps {
  title: string
  body: string
}

export function EmptyState({ title, body }: EmptyStateProps) {
  return (
    <div className="glass-panel rounded-[2rem] p-8">
      <p className="eyebrow">empty state</p>
      <h3 className="mt-5 text-2xl font-semibold tracking-tight">{title}</h3>
      <p className="mt-3 max-w-[60ch] text-base leading-relaxed text-[var(--color-muted)]">{body}</p>
    </div>
  )
}
