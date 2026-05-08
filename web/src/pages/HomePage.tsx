import { Link } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { useBootstrap } from '../hooks/useBootstrap'
import { t } from '../i18n/messages'
import type { LocaleCode, TeamSeed } from '../lib/types'

const superstarBaseImageUrl = 'https://elrincondeldt.com/sv/photos/players_webp/'

const superstarPlayers = [
  { playerId: 133609, name: 'Pedri' },
  { playerId: 278, name: 'Kylian Mbappe' },
  { playerId: 181812, name: 'Jamal Musiala' },
  { playerId: 9, name: 'Achraf Hakimi' },
  { playerId: 927, name: 'Kang-In Lee' },
  { playerId: 129718, name: 'Jude Bellingham' },
  { playerId: 762, name: 'Vinicius Paixao' },
  { playerId: 162511, name: 'Senne Lammens' },
] as const

const footballNations = [
  { code: 'ar', label: 'Argentina' },
  { code: 'br', label: 'Brazil' },
  { code: 'de', label: 'Germany' },
  { code: 'eng', label: 'England' },
  { code: 'es', label: 'Spain' },
  { code: 'fr', label: 'France' },
  { code: 'it', label: 'Italy' },
  { code: 'nl', label: 'Netherlands' },
  { code: 'pt', label: 'Portugal' },
  { code: 'uy', label: 'Uruguay' },
] as const

function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-current">
      <path d="M19.7 5.03a16.4 16.4 0 0 0-4.09-1.27 11.4 11.4 0 0 0-.52 1.08 15.2 15.2 0 0 0-6.17 0 11.5 11.5 0 0 0-.52-1.08A16.48 16.48 0 0 0 4.3 5.03C1.71 8.9 1.01 12.67 1.36 16.39a16.54 16.54 0 0 0 5.03 2.56c.41-.56.78-1.16 1.1-1.79-.6-.23-1.18-.5-1.72-.81.14-.1.27-.2.4-.31 3.32 1.56 6.92 1.56 10.2 0 .13.11.26.21.4.31-.55.32-1.13.59-1.73.81.32.63.69 1.23 1.11 1.79a16.44 16.44 0 0 0 5.03-2.56c.42-4.31-.72-8.04-2.49-11.36Zm-8.31 9.06c-.98 0-1.79-.91-1.79-2.02 0-1.12.79-2.02 1.79-2.02 1 0 1.8.91 1.79 2.02 0 1.12-.79 2.02-1.79 2.02Zm6.22 0c-.98 0-1.79-.91-1.79-2.02 0-1.12.79-2.02 1.79-2.02 1 0 1.8.91 1.79 2.02 0 1.12-.79 2.02-1.79 2.02Z" />
    </svg>
  )
}

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

function SuperstarCard() {
  return (
    <div className="glass-panel overflow-hidden rounded-[1.9rem] p-5">
      <p className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">Add a superstar</p>
      <p className="mt-3 max-w-[28ch] text-sm leading-relaxed text-[var(--color-muted)]">
        Build around icons from the community datapack and show your squad taste before kickoff.
      </p>
      <div className="mt-5 grid grid-cols-4 gap-2">
        {superstarPlayers.map((player, index) => (
          <div
            key={player.playerId}
            className="group overflow-hidden rounded-[1.25rem] border border-white/10 bg-black/20"
            style={{ animationDelay: `${index * 70}ms` }}
          >
            <img
              src={`${superstarBaseImageUrl}${player.playerId}.webp`}
              alt={player.name}
              loading="lazy"
              width={120}
              height={120}
              className="aspect-square w-full object-cover transition duration-500 ease-out group-hover:scale-[1.03]"
            />
            <p className="px-2 py-2 text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--color-paper)]">
              {player.name}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function NationFlagsCard() {
  return (
    <div className="glass-panel rounded-[1.9rem] p-5">
      <p className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">Top football nations</p>
      <div className="mt-5 flex flex-wrap gap-3">
        {footballNations.map((nation) => (
          <div
            key={nation.code}
            className="group flex flex-col items-center gap-2 text-center text-[10px] uppercase tracking-[0.14em] text-[var(--color-muted)]"
          >
            <span className="grid h-12 w-12 place-items-center overflow-hidden rounded-full border border-white/12 bg-white/6 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] transition duration-300 ease-out group-hover:-translate-y-[1px]">
              <img
                src={`/flags/${nation.code}.svg`}
                alt={nation.label}
                width={40}
                height={40}
                loading="lazy"
                className="h-10 w-10 rounded-full object-cover"
              />
            </span>
            <span>{nation.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function DiscordCard() {
  return (
    <div className="glass-panel rounded-[1.9rem] bg-[linear-gradient(135deg,rgba(24,180,133,0.2),rgba(255,255,255,0.04))] p-5">
      <p className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">Join Discord</p>
      <div className="mt-4 flex items-start gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/12 bg-black/20 text-[var(--color-paper)]">
          <DiscordIcon />
        </div>
        <div>
          <p className="text-base font-semibold text-white">Find builders, rivals, and reveal pressure.</p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
            The Discord server is the fastest route into the event before registrations spike.
          </p>
        </div>
      </div>
      <a
        href="https://discord.com/invite/ze5xJgg7AM"
        target="_blank"
        rel="noreferrer"
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--color-ink)] transition hover:-translate-y-[1px] active:scale-[0.98]"
      >
        <DiscordIcon />
        Open community invite
      </a>
    </div>
  )
}

function HeroBlueprintCard() {
  return (
    <div className="glass-panel relative overflow-hidden rounded-[2.1rem] p-6 sm:p-7">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,rgba(24,180,133,0.16),transparent)]" />
      <div className="relative">
        <p className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">Squad blueprint</p>
        <div className="mt-5 grid gap-3">
          <div className="rounded-[1.4rem] border border-white/8 bg-black/15 p-4">
            <p className="mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted)]">format</p>
            <p className="mt-2 text-lg font-semibold text-white">4-3-3 starters + 4 locked subs</p>
          </div>
          <div className="rounded-[1.4rem] border border-white/8 bg-black/15 p-4">
            <p className="mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted)]">cap</p>
            <p className="mt-2 text-lg font-semibold text-[var(--color-accent)]">3,000,000 SVC</p>
          </div>
          <div className="rounded-[1.4rem] border border-white/8 bg-black/15 p-4">
            <p className="mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted)]">reveal flow</p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-paper)]">
              Hidden squads, public tables, and share-ready profiles once the reveal starts.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-[1.5rem] border border-white/8 bg-black/20 p-4">
          <p className="mono text-[10px] uppercase tracking-[0.24em] text-[var(--color-muted)]">formation board</p>
          <div className="mt-4 grid gap-2 text-center text-xs font-semibold uppercase tracking-[0.16em] text-white">
            <div className="mx-auto rounded-full border border-white/8 bg-white/5 px-3 py-2">GK</div>
            <div className="grid grid-cols-4 gap-2">
              {['DEF', 'DEF', 'DEF', 'DEF'].map((slot, index) => (
                <div key={`${slot}-${index}`} className="rounded-full border border-white/8 bg-white/5 px-3 py-2">
                  {slot}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {['MID', 'MID', 'MID'].map((slot, index) => (
                <div key={`${slot}-${index}`} className="rounded-full border border-white/8 bg-white/5 px-3 py-2">
                  {slot}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {['FWD', 'FWD', 'FWD'].map((slot, index) => (
                <div key={`${slot}-${index}`} className="rounded-full border border-white/8 bg-white/5 px-3 py-2">
                  {slot}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface HomePageProps {
  locale: LocaleCode
}

export function HomePage({ locale }: HomePageProps) {
  const { data, error, isLoading } = useBootstrap()
  const scoring = data?.scoring ?? {
    goal: 2,
    assist: 2,
    cleanSheet: 3,
    appearance: 0,
    minutes: 0,
    performancePointsMin: 0,
    performancePointsMax: 1,
  }

  return (
    <div className="space-y-8 pb-12">
      <section className="table-grid gap-6">
        <div className="hero-card rounded-[2.4rem] px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="eyebrow">{t(locale, 'heroEyebrow')}</p>
          </div>
          <div className="mt-10 grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">
                Hidden squads. Shared reveals. One locked draft.
              </p>
              <h2 className="section-title max-w-[10ch]">{t(locale, 'heroTitle')}</h2>
              <p className="mt-6 max-w-[60ch] text-lg leading-relaxed text-[var(--color-muted)]">
                {t(locale, 'heroBody')}
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  to="/builder"
                  className="inline-flex items-center rounded-full bg-[var(--color-accent)] px-7 py-4 text-base font-semibold text-[var(--color-ink)] shadow-[0_20px_30px_-20px_rgba(24,180,133,0.8)] transition hover:-translate-y-[1px] active:scale-[0.98] sm:px-9 sm:py-4.5 sm:text-lg"
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

              <div className="mt-8 flex flex-wrap gap-3">
                {['15 players', '4-3-3 + 4 subs', '3,000,000 SVC cap'].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/10 bg-white/4 px-3.5 py-2 text-xs font-medium uppercase tracking-[0.16em] text-[var(--color-paper)]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <HeroBlueprintCard />
          </div>
        </div>

        <div className="grid gap-4">
          <SuperstarCard />
          <NationFlagsCard />
          <DiscordCard />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="glass-panel rounded-[2.2rem] p-6 sm:p-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">{t(locale, 'scoringTitle')}</p>
              <h3 className="mt-3 text-3xl font-semibold tracking-tight text-white">Lock the event logic before kickoff</h3>
            </div>
            <span className="mono text-[10px] uppercase tracking-[0.24em] text-[var(--color-muted)]">scroll</span>
          </div>

          <div className="mt-6 max-h-[29rem] space-y-4 overflow-y-auto pr-2">
            <div className="rounded-[1.5rem] border border-white/8 bg-black/15 p-4">
              <p className="mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-muted)]">eligibility</p>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-[var(--color-paper)]">
                <li>No multi-accounts.</li>
                <li>All teams use the 4-3-3 structure with four locked substitutes.</li>
                <li>Squads stay hidden until the participant reveals them or an admin reveals all squads at kickoff.</li>
              </ul>
            </div>

            <div className="rounded-[1.5rem] border border-white/8 bg-black/15 p-4">
              <p className="mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-muted)]">salary budget</p>
              <p className="mt-4 text-3xl font-semibold tracking-tight text-[var(--color-accent)]">3,000,000 SVC</p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">
                Every participant drafts under the same cap using Soccerverse wage logic.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-white/8 bg-black/15 p-4">
              <p className="mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-muted)]">points</p>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[var(--color-muted)]">Goal</dt>
                  <dd className="mono text-white">{scoring.goal}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[var(--color-muted)]">Assist</dt>
                  <dd className="mono text-white">{scoring.assist}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[var(--color-muted)]">Clean sheet</dt>
                  <dd className="mono text-white">{scoring.cleanSheet}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[var(--color-muted)]">Performance</dt>
                  <dd className="mono text-white">
                    {scoring.performancePointsMin}-{scoring.performancePointsMax} Points
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-sm leading-relaxed text-[var(--color-muted)]">
                Performance points are based on real performance data and are entered by admins.
              </p>
            </div>

            {error ? (
              <div className="rounded-[1.5rem] border border-amber-300/20 bg-amber-300/8 p-4">
                <p className="mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-sand)]">backend status</p>
                <p className="mt-3 text-sm leading-relaxed text-[var(--color-paper)]">{t(locale, 'backendOffline')}</p>
              </div>
            ) : null}

            {isLoading ? (
              <div className="grid gap-3">
                <div className="skeleton h-20 rounded-[1.5rem]" />
                <div className="skeleton h-20 rounded-[1.5rem]" />
              </div>
            ) : null}
          </div>
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
