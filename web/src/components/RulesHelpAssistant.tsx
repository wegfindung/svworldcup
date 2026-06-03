import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { groupRuleKnowledgeByCategory, searchRuleKnowledge } from '../lib/rulesKnowledge'

const starterQuestions = [
  'How does the Nations Leaderboard work?',
  'Why is my nation not showing?',
  'How do substitutes score?',
  'When can I swap players?',
  'How does the ownership boost work?',
]

export function RulesHelpAssistant() {
  const [query, setQuery] = useState('')
  const results = useMemo(() => searchRuleKnowledge(query).slice(0, 5), [query])
  const groupedEntries = useMemo(() => groupRuleKnowledgeByCategory(), [])

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <article className="glass-panel rounded-[1.25rem] p-5 sm:p-6">
        <p className="eyebrow">rules bot</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">Ask the community rules desk</h2>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">
          Answers come from the official event rules only. If no rule matches, it will point you back to Discord support.
        </p>

        <label className="mt-5 block">
          <span className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-accent)]">Question</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try: Nations leaderboard, swaps, boost, locked squad..."
            className="mt-2 w-full rounded-[0.95rem] border border-white/10 bg-black/24 px-4 py-3 text-sm text-white outline-none transition placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)]/60 focus:bg-black/34"
          />
        </label>

        <div className="mt-3 flex flex-wrap gap-2">
          {starterQuestions.map((question) => (
            <button
              key={question}
              type="button"
              onClick={() => setQuery(question)}
              className="rounded-full border border-white/10 bg-white/4 px-3 py-1.5 text-[11px] font-semibold text-[var(--color-paper)] transition hover:-translate-y-[1px] hover:border-[var(--color-accent)]/40 hover:text-white active:scale-[0.98]"
            >
              {question}
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-3" aria-live="polite">
          {results.length ? (
            results.map((entry) => (
              <div key={entry.id} className="surface-row rounded-[0.95rem] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[var(--color-accent)]/24 bg-[var(--color-accent)]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-accent)]">
                    {entry.category}
                  </span>
                  <span className="mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">{entry.source}</span>
                </div>
                <h3 className="mt-3 text-base font-semibold text-white">{entry.question}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">{entry.answer}</p>
                {entry.links?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {entry.links.map((link) => (
                      <Link
                        key={`${entry.id}-${link.to}`}
                        to={link.to}
                        className="rounded-full border border-white/12 px-3 py-2 text-xs font-semibold text-white transition hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <div className="surface-row rounded-[0.95rem] p-4">
              <h3 className="text-base font-semibold text-white">No official rule match yet.</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
                Try a simpler keyword like nations, swaps, boost, scoring, prizes, or ask support in Discord for edge cases.
              </p>
            </div>
          )}
        </div>
      </article>

      <article className="glass-panel rounded-[1.25rem] p-5 sm:p-6">
        <p className="eyebrow">official faq</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">Community rules FAQ</h2>
        <div className="mt-5 grid gap-3">
          {groupedEntries.map((group) => (
            <details key={group.category} className="surface-row rounded-[0.95rem] p-4 open:border-[var(--color-accent)]/22">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                <span className="text-sm font-bold uppercase tracking-[0.12em] text-white">{group.category}</span>
                <span className="mono rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] text-[var(--color-muted)]">
                  {group.items.length}
                </span>
              </summary>
              <div className="mt-4 space-y-3 border-t border-white/8 pt-4">
                {group.items.map((entry) => (
                  <div key={entry.id}>
                    <h3 className="text-sm font-semibold text-white">{entry.question}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-muted)]">{entry.answer}</p>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      </article>
    </section>
  )
}
