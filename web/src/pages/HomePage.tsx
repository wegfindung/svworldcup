import { Link } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { LocaleRail } from '../components/LocaleRail'
import { StatTile } from '../components/StatTile'
import { useBootstrap } from '../hooks/useBootstrap'
import { t } from '../i18n/messages'
import type { TeamSeed } from '../lib/types'

function TeamStack({ teams }: { teams: TeamSeed[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {teams.map((team, index) => (
        <div
          key={team.code}
          className="glass-panel rounded-[1.6rem] px-4 py-3"
          style={{ animationDelay: `${index * 80}ms` }}
        >
          <p className="mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-muted)]">
            group {team.groupKey}
          </p>
          <p className="mt-2 text-lg font-medium text-white">{team.nameEn}</p>
        </div>
      ))}
    </div>
  )
}

export function HomePage() {
  const locale = 'en'
  const { data, error, isLoading } = useBootstrap()

  return (
    <div className="space-y-8 pb-12">
      <section className="table-grid gap-6">
        <div className="hero-card rounded-[2.4rem] px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="eyebrow">{t(locale, 'heroEyebrow')}</p>
            <LocaleRail activeLocale={locale} locales={data?.supportedLocales ?? ['en', 'es', 'de', 'fr', 'pt', 'ru', 'zh']} />
          </div>
          <div className="mt-10 grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <h2 className="section-title max-w-[10ch]">{t(locale, 'heroTitle')}</h2>
              <p className="mt-6 max-w-[60ch] text-lg leading-relaxed text-[var(--color-muted)]">
                {t(locale, 'heroBody')}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/builder"
                  className="rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:-translate-y-[1px] active:scale-[0.98]"
                >
                  {t(locale, 'heroPrimary')}
                </Link>
                <Link
                  to="/tables"
                  className="rounded-full border border-white/10 px-5 py-3 text-sm font-medium text-white transition hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]"
                >
                  {t(locale, 'heroSecondary')}
                </Link>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="glass-panel floaty rounded-[2rem] p-5">
                <p className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">league logic</p>
                <div className="mt-5 space-y-4">
                  <div className="rounded-[1.4rem] border border-white/8 bg-black/15 p-4">
                    <p className="text-sm font-semibold text-white">Rookie</p>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
                      No ownership bonus. Register without a Soccerverse main account.
                    </p>
                  </div>
                  <div className="rounded-[1.4rem] border border-white/8 bg-black/15 p-4">
                    <p className="text-sm font-semibold text-white">Veteran</p>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
                      Provide a Soccerverse username. The backend applies the veteran influence bonus per drafted player.
                    </p>
                  </div>
                </div>
              </div>

              <div className="glass-panel rounded-[2rem] p-5">
                <p className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">visibility</p>
                <p className="mt-4 text-base leading-relaxed text-[var(--color-paper)]">
                  Squads stay hidden until the participant reveals them or an admin reveals all squads at kickoff.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <StatTile label="teams seeded" value={data ? String(data.teams.length) : '48'} tone="accent" />
          <StatTile label="opening fixtures" value={data ? String(data.fixtures.length) : '24'} tone="sand" />
          <StatTile label="formation lock" value="4-3-3" />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="glass-panel rounded-[2.2rem] p-6 sm:p-8">
          <p className="eyebrow">{t(locale, 'scoringTitle')}</p>
          {isLoading ? (
            <div className="mt-6 grid gap-3">
              <div className="skeleton h-20 rounded-[1.5rem]" />
              <div className="skeleton h-20 rounded-[1.5rem]" />
            </div>
          ) : error ? (
            <EmptyState title="Backend offline" body={t(locale, 'backendOffline')} />
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-white/8 bg-black/15 p-4">
                <p className="mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-muted)]">base scoring</p>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-[var(--color-muted)]">Goal</dt>
                    <dd className="mono text-white">{data?.scoring.goal}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-[var(--color-muted)]">Assist</dt>
                    <dd className="mono text-white">{data?.scoring.assist}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-[var(--color-muted)]">Clean sheet</dt>
                    <dd className="mono text-white">{data?.scoring.cleanSheet}</dd>
                  </div>
                </dl>
              </div>
              <div className="rounded-[1.5rem] border border-white/8 bg-black/15 p-4">
                <p className="mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-muted)]">admin input</p>
                <p className="mt-4 text-sm leading-relaxed text-[var(--color-muted)]">
                  Performance points are optional and restricted to the `0.5` to `1.0` range. All result evaluation is admin-only.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="glass-panel rounded-[2.2rem] p-6 sm:p-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">seeded teams</p>
              <h3 className="mt-3 text-3xl font-semibold tracking-tight text-white">Backend-ready opening field</h3>
            </div>
            <Link to="/builder" className="mono text-xs uppercase tracking-[0.24em] text-[var(--color-accent)]">
              search players
            </Link>
          </div>
          <div className="mt-6">
            {isLoading ? (
              <div className="grid gap-3 md:grid-cols-2">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="skeleton h-20 rounded-[1.4rem]" />
                ))}
              </div>
            ) : error ? (
              <EmptyState title="Seed preview unavailable" body={t(locale, 'backendOffline')} />
            ) : (
              <TeamStack teams={data?.teams.slice(0, 8) ?? []} />
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
