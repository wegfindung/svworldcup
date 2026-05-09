import { Link } from 'react-router-dom'
import { PlayerPortrait } from '../components/PlayerPortrait'
import { groupStageMatchPlan } from '../data/worldCupMatchPlan'
import { t } from '../i18n/messages'
import { defaultScoring } from '../data/eventConfig'
import type { LocaleCode } from '../lib/types'

const superstarPlayers = [
  { playerId: 133609, name: 'Pedri', imageUrl: 'https://elrincondeldt.com/sv/photos/players/133609.png' },
  { playerId: 278, name: 'Kylian Mbappe', imageUrl: 'https://elrincondeldt.com/sv/photos/players/278.png' },
  { playerId: 181812, name: 'Jamal Musiala', imageUrl: 'https://elrincondeldt.com/sv/photos/players/181812.png' },
  { playerId: 9, name: 'Achraf Hakimi', imageUrl: 'https://elrincondeldt.com/sv/photos/players/9.png' },
  { playerId: 927, name: 'Kang-In Lee', imageUrl: 'https://elrincondeldt.com/sv/photos/players/927.png' },
  { playerId: 129718, name: 'Jude Bellingham', imageUrl: 'https://elrincondeldt.com/sv/photos/players/129718.png' },
  { playerId: 762, name: 'Vinicius Paixao', imageUrl: 'https://elrincondeldt.com/sv/photos/players/762.png' },
  { playerId: 162511, name: 'Senne Lammens', imageUrl: 'https://elrincondeldt.com/sv/photos/players/162511.png' },
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

function MatchPlanCard() {
  return (
    <div className="glass-panel rounded-[2.2rem] p-6 sm:p-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">group stage match plan</p>
          <h3 className="mt-3 text-3xl font-semibold tracking-tight text-white">All 72 World Cup group games</h3>
        </div>
        <span className="mono text-[10px] uppercase tracking-[0.24em] text-[var(--color-muted)]">BST schedule</span>
      </div>

      <div className="mt-6 max-h-[34rem] space-y-5 overflow-y-auto pr-2">
        {groupStageMatchPlan.map((day) => (
          <section key={day.day} className="space-y-3">
            <div className="sticky top-0 z-10 -mx-1 rounded-full border border-white/8 bg-[rgba(11,17,16,0.92)] px-4 py-2 backdrop-blur">
              <p className="mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-accent)]">{day.day}</p>
            </div>

            <div className="space-y-2">
              {day.matches.map((match, index) => (
                <div
                  key={`${day.day}-${match.group}-${match.home}-${match.away}-${index}`}
                  className="rounded-[1.5rem] border border-white/8 bg-black/15 px-4 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex rounded-full border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
                        Group {match.group}
                      </span>
                      <p className="text-sm font-medium text-white sm:text-base">
                        {match.home} <span className="text-[var(--color-muted)]">vs</span> {match.away}
                      </p>
                    </div>
                    <span className="mono text-xs uppercase tracking-[0.16em] text-[var(--color-muted)]">{match.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-5 text-sm leading-relaxed text-[var(--color-muted)]">
        Times shown in BST from the published day-by-day 2026 World Cup schedule.
      </p>
    </div>
  )
}

function SuperstarCard() {
  return (
    <div className="glass-panel overflow-hidden rounded-[1.9rem] p-5">
      <p className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">Add a superstar</p>
      <div className="mt-5 grid grid-cols-4 gap-2">
        {superstarPlayers.map((player, index) => (
          <div
            key={player.playerId}
            className="group overflow-hidden rounded-[1.25rem] border border-white/10 bg-black/20"
            style={{ animationDelay: `${index * 70}ms` }}
          >
            <PlayerPortrait
              src={player.imageUrl}
              alt={player.name}
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
      <div className="mt-5 grid grid-cols-5 justify-items-center gap-x-2 gap-y-4 sm:gap-x-3">
        {footballNations.map((nation) => (
          <div key={nation.code} className="group flex items-center justify-center">
            <span
              title={nation.label}
              aria-label={nation.label}
              className="grid h-12 w-12 place-items-center overflow-hidden rounded-full border border-white/12 bg-white/6 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] transition duration-300 ease-out group-hover:-translate-y-[1px] sm:h-13 sm:w-13"
            >
              <img
                src={`/flags/${nation.code}.svg`}
                alt={nation.label}
                width={40}
                height={40}
                loading="lazy"
                className="h-10 w-10 rounded-full object-cover"
              />
            </span>
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

interface HomePageProps {
  locale: LocaleCode
}

export function HomePage({ locale }: HomePageProps) {
  const scoring = defaultScoring

  return (
    <div className="space-y-8 pb-12">
      <section className="table-grid gap-6">
        <div className="hero-card rounded-[2.4rem] px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="eyebrow">{t(locale, 'heroEyebrow')}</p>
          </div>
          <div className="mt-10">
            <div className="max-w-[56rem]">
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
              </div>
            </div>
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

            <div className="rounded-[1.5rem] border border-white/8 bg-black/15 p-4">
              <p className="mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-muted)]">request policy</p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-paper)]">
                No API data is requested from the landing page. Registration, verification, builder loading, and backend tools only talk
                to the server after an explicit button action.
              </p>
            </div>
          </div>
        </div>

        <MatchPlanCard />
      </section>
    </div>
  )
}
