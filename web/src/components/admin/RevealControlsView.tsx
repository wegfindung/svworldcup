import { useEffect, useState } from 'react'
import { fetchAdminOverview, triggerGlobalReveal } from '../../lib/api'
import type { EventControls } from '../../lib/types'

export function RevealControlsView() {
  const [eventControls, setEventControls] = useState<EventControls | null>(null)
  const [revealBusy, setRevealBusy] = useState(false)
  const [revealMessage, setRevealMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const overview = await fetchAdminOverview()
        if (active) {
          setEventControls(overview.eventControls)
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Could not load reveal controls.')
        }
      }
    })()
    return () => {
      active = false
    }
  }, [])

  async function handleGlobalReveal(revealSquads: boolean) {
    const approved = window.confirm(
      revealSquads
        ? 'Reveal all public profiles and all submitted squads globally?'
        : 'Reveal all public profiles globally while keeping squads hidden?',
    )
    if (!approved) {
      return
    }

    setRevealBusy(true)
    setError(null)
    setRevealMessage(null)
    try {
      const response = await triggerGlobalReveal({ revealProfiles: true, revealSquads })
      setEventControls(response.eventControls)
      setRevealMessage(revealSquads ? 'Global squad reveal is active.' : 'Global profile reveal is active.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Global reveal failed.')
    } finally {
      setRevealBusy(false)
    }
  }

  return (
    <section className="glass-panel rounded-[1.15rem] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="eyebrow">reveal controls</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">Control public visibility.</h3>
          <p className="mt-3 max-w-[68ch] text-sm leading-relaxed text-[var(--color-muted)]">
            Participant reveals still work individually. These controls turn on event-level visibility for every active profile, and optionally every submitted squad.
          </p>
        </div>
        <div className="grid gap-2 text-right">
          <span className="mono rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">
            profiles {eventControls?.globalRevealProfiles ? 'public' : 'manual'}
          </span>
          <span className="mono rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">
            squads {eventControls?.globalRevealSquads ? 'public' : 'hidden'}
          </span>
        </div>
      </div>

      {error ? (
        <div className="mt-5 rounded-[1.3rem] border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-sm text-[var(--color-paper)]">
          {error}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void handleGlobalReveal(false)}
          disabled={revealBusy || eventControls?.globalRevealProfiles}
          className="rounded-full border border-white/12 px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-[1px] hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
        >
          Reveal all profiles
        </button>
        <button
          type="button"
          onClick={() => void handleGlobalReveal(true)}
          disabled={revealBusy || eventControls?.globalRevealSquads}
          className="rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--color-ink)] transition hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
        >
          Reveal all squads
        </button>
        {revealMessage ? <p className="text-sm text-[var(--color-accent)]">{revealMessage}</p> : null}
      </div>
    </section>
  )
}
