import { useParams } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { StatTile } from '../components/StatTile'

export function ProfilePage() {
  const { slug } = useParams()
  const isDemo = slug === 'demo-veteran'

  return (
    <div className="space-y-6 pb-12">
      <section className="hero-card rounded-[2.4rem] px-6 py-8 sm:px-8 sm:py-10">
        <p className="eyebrow">public profile</p>
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <h2 className="section-title max-w-[10ch]">
              {isDemo ? 'Veteran profile pages can surface Soccerverse identity.' : 'Profile slug not found yet.'}
            </h2>
            <p className="mt-5 max-w-[60ch] text-lg leading-relaxed text-[var(--color-muted)]">
              {isDemo
                ? 'Public profile pages are where stats, reveal status, and share links come together. Veteran pages will expose the Soccerverse username when the participant has one.'
                : 'Create a registration and reveal-ready profile from the backend to populate this route.'}
            </p>
          </div>
          <div className="grid gap-4">
            <StatTile label="profile slug" value={slug ?? 'missing'} tone="accent" />
            <StatTile label="league" value={isDemo ? 'veteran' : 'unknown'} tone="sand" />
          </div>
        </div>
      </section>

      {isDemo ? (
        <section className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
          <div className="glass-panel rounded-[2.2rem] p-6 sm:p-8">
            <p className="eyebrow">public stats</p>
            <div className="mt-6 space-y-4">
              <div className="rounded-[1.5rem] border border-white/8 bg-black/15 p-4">
                <p className="mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-muted)]">soccerverse username</p>
                <p className="mt-3 text-xl font-medium text-white">demo_veteran_manager</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/8 bg-black/15 p-4">
                <p className="mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-muted)]">reveal status</p>
                <p className="mt-3 text-sm text-[var(--color-paper)]">Profile visible, squad still hidden.</p>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-[2.2rem] p-6 sm:p-8">
            <EmptyState
              title="Share-ready profile shell"
              body="This page is intentionally wired as a real route now. Backend participant data can later hydrate share cards, registration countries, veteran status, and public stats without changing the routing contract."
            />
          </div>
        </section>
      ) : (
        <EmptyState
          title="No public profile found"
          body="Use the backend registration flow and reveal controls to create a real participant profile. The route contract is already in place."
        />
      )}
    </div>
  )
}
