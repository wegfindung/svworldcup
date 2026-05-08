import { EmptyState } from '../components/EmptyState'
import { useBootstrap } from '../hooks/useBootstrap'

export function TablesPage() {
  const { data, error, isLoading } = useBootstrap()

  return (
    <div className="space-y-6 pb-12">
      <section className="hero-card rounded-[2.4rem] px-6 py-8 sm:px-8 sm:py-10">
        <p className="eyebrow">public standings</p>
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <h2 className="section-title max-w-[10ch]">Every table is public, but squads stay hidden.</h2>
            <p className="mt-5 max-w-[62ch] text-lg leading-relaxed text-[var(--color-muted)]">
              Participants appear in a rookie or veteran table and in up to two country tables. Profile statistics are public even before global squad reveal.
            </p>
          </div>
          <div className="glass-panel rounded-[2rem] p-5">
            <p className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">table structure</p>
            <ul className="mt-5 space-y-3 text-sm text-[var(--color-paper)]">
              <li>Rookie table: no ownership bonus</li>
              <li>Veteran table: influence bonus applied per drafted player</li>
              <li>Primary nation table: always included</li>
              <li>Secondary nation table: included when selected</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="glass-panel rounded-[2.2rem] p-6 sm:p-8">
          <p className="eyebrow">status</p>
          {isLoading ? (
            <div className="mt-6 grid gap-3">
              <div className="skeleton h-24 rounded-[1.5rem]" />
              <div className="skeleton h-24 rounded-[1.5rem]" />
            </div>
          ) : error ? (
            <EmptyState title="Standings unavailable" body="The backend needs to be running before public standings can load." />
          ) : (
            <div className="mt-6 space-y-4">
              <div className="rounded-[1.5rem] border border-white/8 bg-black/15 p-4">
                <p className="mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-muted)]">scoring profile</p>
                <p className="mt-4 text-sm leading-relaxed text-[var(--color-paper)]">
                  Goal {data?.scoring.goal}, assist {data?.scoring.assist}, clean sheet {data?.scoring.cleanSheet}, performance {data?.scoring.performancePointsMin}–{data?.scoring.performancePointsMax}.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-white/8 bg-black/15 p-4">
                <p className="mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-muted)]">first matchday</p>
                <p className="mt-4 text-sm leading-relaxed text-[var(--color-paper)]">
                  {data?.fixtures.length ?? 0} fixtures are already seeded in the backend with English team names.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="glass-panel rounded-[2.2rem] p-6 sm:p-8">
          <EmptyState
            title="Public tables open after registrations arrive"
            body="This route is already part of the application shell. Once participant and result data are persisted, it will render rookie, veteran, and nation tables directly from the backend."
          />
        </div>
      </section>
    </div>
  )
}
