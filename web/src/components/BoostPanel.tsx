import { useState } from 'react'
import { fetchParticipantBoost } from '../lib/api'
import { PlayerPortrait } from './PlayerPortrait'
import { TeamFlag } from './TeamFlag'
import type { AppMessages } from '../i18n/messages'
import type { LocaleCode, ParticipantBoostResult } from '../lib/types'

interface BoostPanelProps {
  copy: AppMessages['builder']['boost']
  locale: LocaleCode
}

// Self-contained: the boost view is the costliest participant read (a cold load fans out one paced
// Soccerverse call per drafted player), so it loads lazily on an explicit click rather than on every
// builder render. See SOP_scoring_and_leagues.md "Participant boost view (live, on-demand)".
export function BoostPanel({ copy, locale }: BoostPanelProps) {
  const [result, setResult] = useState<ParticipantBoostResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(false)

  async function load(refresh = false) {
    setError(false)
    if (refresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    try {
      setResult(await fetchParticipantBoost(refresh))
    } catch {
      setError(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const players = result?.players ?? []
  const updatedLabel =
    result?.computedAt && new Date(result.computedAt).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <div className="glass-panel mb-5 rounded-[1.25rem] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">{copy.heading}</p>
          <h3 className="mt-2 text-lg font-semibold text-white">{copy.title}</h3>
          <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-[var(--color-muted)]">{copy.intro}</p>
        </div>
        {result ? (
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={refreshing}
            className="shrink-0 rounded-full border border-white/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:-translate-y-[1px] hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
          >
            {refreshing ? copy.refreshing : copy.refresh}
          </button>
        ) : null}
      </div>

      {!result && !loading && !error ? (
        <button
          type="button"
          onClick={() => void load(false)}
          className="mt-4 rounded-full bg-[var(--color-accent)] px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-ink)] transition hover:-translate-y-[1px] active:scale-[0.98]"
        >
          {copy.show}
        </button>
      ) : null}

      {loading ? <p className="mt-4 text-sm text-[var(--color-muted)]">{copy.loading}</p> : null}

      {error ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <p className="text-sm text-[var(--color-danger,#f87171)]">{copy.error}</p>
          <button
            type="button"
            onClick={() => void load(false)}
            className="rounded-full border border-white/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-white/6"
          >
            {copy.retry}
          </button>
        </div>
      ) : null}

      {result && !result.linked ? (
        <div className="mt-4 rounded-[0.9rem] border border-white/8 bg-black/14 p-4">
          <p className="text-sm font-semibold text-white">{copy.unlinkedTitle}</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">{copy.unlinkedBody}</p>
        </div>
      ) : null}

      {result?.linked && players.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--color-muted)]">{copy.empty}</p>
      ) : null}

      {result?.linked && players.length > 0 ? (
        <div className="mt-4 grid gap-2">
          {players.map((player) => (
            <div
              key={player.playerId}
              className="flex items-center gap-3 rounded-[0.9rem] border border-white/8 bg-black/14 p-3"
            >
              <PlayerPortrait
                src={player.imageUrl ?? ''}
                alt={player.displayName}
                width={40}
                height={40}
                className="h-10 w-10 shrink-0 rounded-[0.7rem] border border-white/10 object-cover"
              />
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <TeamFlag teamCode={player.teamCode} label={player.teamCode} size="sm" />
                <p className="truncate text-sm font-semibold text-white">{player.displayName}</p>
              </div>
              <div className="mono flex shrink-0 items-center gap-3 text-right text-xs text-[var(--color-muted)]">
                <span title={copy.bought}>+{player.bought}</span>
                <span title={copy.sold}>-{player.sold}</span>
                <span className="text-white" title={copy.net}>
                  {player.net}
                </span>
              </div>
              <span className="shrink-0 rounded-full border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/8 px-2.5 py-1 text-xs font-semibold text-[var(--color-accent)]">
                +{player.bonusPercent}%
              </span>
            </div>
          ))}
          <p className="mt-2 text-[11px] leading-relaxed text-[var(--color-muted)]">{copy.note}</p>
          {updatedLabel ? (
            <p className="mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">
              {copy.updatedAt} {updatedLabel}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
