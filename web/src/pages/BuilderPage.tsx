import { startTransition, useDeferredValue, useState, type FormEvent } from 'react'
import { EmptyState } from '../components/EmptyState'
import { searchPlayers } from '../lib/api'
import type { SoccerversePlayer } from '../lib/types'

export function BuilderPage() {
  const [name, setName] = useState('')
  const [position, setPosition] = useState('')
  const [results, setResults] = useState<SoccerversePlayer[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const deferredName = useDeferredValue(name)

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await searchPlayers({
        name: deferredName,
        position,
        perPage: 10,
      })
      startTransition(() => {
        setResults(response.items)
      })
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : 'Search failed.')
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6 pb-12">
      <section className="hero-card rounded-[2.4rem] px-6 py-8 sm:px-8 sm:py-10">
        <p className="eyebrow">builder preview</p>
        <div className="mt-6 grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <h2 className="section-title max-w-[11ch]">Search Soccerverse players through the backend.</h2>
            <p className="mt-5 max-w-[60ch] text-lg leading-relaxed text-[var(--color-muted)]">
              This is the secure entry point for the squad builder. Searches are proxied through the server, so the client never needs private infrastructure secrets.
            </p>
          </div>
          <form onSubmit={handleSearch} className="glass-panel rounded-[2rem] p-5 sm:p-6">
            <div className="grid gap-4">
              <label className="grid gap-2">
                <span className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">player name</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Vinicius, Mbappe, Messi"
                  className="rounded-[1.2rem] border border-white/10 bg-black/15 px-4 py-3 text-white outline-none transition focus:border-[var(--color-accent)]"
                />
              </label>
              <label className="grid gap-2">
                <span className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">position code</span>
                <input
                  value={position}
                  onChange={(event) => setPosition(event.target.value.toUpperCase())}
                  placeholder="GK, CB, CM, ST"
                  className="rounded-[1.2rem] border border-white/10 bg-black/15 px-4 py-3 text-white outline-none transition focus:border-[var(--color-accent)]"
                />
              </label>
              <button
                type="submit"
                className="rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:-translate-y-[1px] active:scale-[0.98]"
              >
                {isLoading ? 'Searching…' : 'Search player pool'}
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="glass-panel rounded-[2.2rem] p-6 sm:p-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">results</p>
            <h3 className="mt-3 text-3xl font-semibold tracking-tight text-white">Backend search results</h3>
          </div>
          <p className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">
            hidden squads by default
          </p>
        </div>

        {error ? (
          <div className="mt-6">
            <EmptyState title="Search failed" body={error} />
          </div>
        ) : null}

        {!error && !isLoading && results.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="No search results yet"
              body="Run a backend search to inspect the player pool. This page will later become the full drafting flow with slot validation and salary-cap accounting."
            />
          </div>
        ) : null}

        {isLoading ? (
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="skeleton h-28 rounded-[1.5rem]" />
            ))}
          </div>
        ) : null}

        {results.length > 0 ? (
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {results.map((player) => (
              <article key={player.playerId} className="rounded-[1.5rem] border border-white/8 bg-black/15 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <img
                      src={player.imageUrl}
                      alt={player.name}
                      loading="lazy"
                      width={64}
                      height={64}
                      className="h-16 w-16 rounded-[1.2rem] border border-white/10 object-cover"
                    />
                    <div>
                      <p className="text-lg font-medium text-white">{player.name}</p>
                      <p className="mt-2 text-sm text-[var(--color-muted)]">{player.nationality}</p>
                    </div>
                  </div>
                  <div className="rounded-full border border-white/10 px-3 py-1">
                    <span className="mono text-sm text-[var(--color-accent)]">{player.rating}</span>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {player.positions.map((positionCode) => (
                    <span
                      key={`${player.playerId}-${positionCode}`}
                      className="mono rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-[var(--color-muted)]"
                    >
                      {positionCode}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  )
}
