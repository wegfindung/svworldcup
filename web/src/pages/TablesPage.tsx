import { EmptyState } from '../components/EmptyState'
import { defaultScoring } from '../data/eventConfig'

export function TablesPage() {
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
          <div className="mt-6 space-y-4">
            <div className="rounded-[1.5rem] border border-white/8 bg-black/15 p-4">
              <p className="mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-muted)]">scoring profile</p>
              <p className="mt-4 text-sm leading-relaxed text-[var(--color-paper)]">
                Goal {defaultScoring.goal}, assist {defaultScoring.assist}, clean sheet {defaultScoring.cleanSheet}, performance{' '}
                {defaultScoring.performancePointsMin}–{defaultScoring.performancePointsMax}.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-white/8 bg-black/15 p-4">
              <p className="mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-muted)]">request policy</p>
              <p className="mt-4 text-sm leading-relaxed text-[var(--color-paper)]">
                Public tables will only request live standings after the user explicitly asks to load them.
              </p>
            </div>
          </div>
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
