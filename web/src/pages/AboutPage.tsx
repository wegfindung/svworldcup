import { Link } from 'react-router-dom'
import type { LocaleCode } from '../lib/types'

interface AboutPageProps {
  locale: LocaleCode
}

interface LinkItem {
  label: string
  href: string
  blurb: string
  by?: string
}

// Body copy is English-only for now (the link set does not translate); the nav label is localised in
// i18n/messages.ts. Lift this into the locale dictionaries if/when the About page gets translated.
const officialLinks: LinkItem[] = [
  { label: 'Play Soccerverse', href: 'https://play.soccerverse.com/', blurb: 'Open the game and manage your own club.' },
  { label: 'Soccerverse', href: 'https://soccerverse.com/', blurb: 'The official site — what Soccerverse is and how to start.' },
  { label: 'Guide', href: 'https://guide.soccerverse.com/', blurb: 'The official onboarding guide and how-tos.' },
  { label: 'Hub', href: 'https://hub.soccerverse.com/', blurb: 'The Soccerverse hub for players and clubs.' },
  { label: 'Datacenter', href: 'https://data.soccerverse.com/', blurb: 'Live data on players, clubs and the economy.' },
  { label: 'Player ratings', href: 'https://soccerratings.org/', blurb: 'Browse and compare Soccerverse player ratings.' },
  { label: 'Wiki', href: 'https://wiki.soccerverse.com/index.php/Main_Page', blurb: 'The community knowledge base and game mechanics.' },
  { label: 'Discord', href: 'https://discord.com/invite/ze5xJgg7AM', blurb: 'Join the community chat — the fastest way into the event.' },
]

const communityLinks: LinkItem[] = [
  { label: 'SVBase', href: 'https://svbase.eu/', by: 'Klo', blurb: 'Community tools and stats for Soccerverse.' },
  { label: 'El Rincón del DT', href: 'https://elrincondeldt.com/que-es-soccerverse.html', by: 'cipone', blurb: 'Community guide and resources (Spanish).' },
  { label: 'SV World Club', href: 'https://svworld.club/', by: 'Blvck', blurb: 'Community site for Soccerverse managers.' },
  { label: 'SV Football', href: 'https://svfootball.com/', by: 'jackxxx', blurb: 'Community-built Soccerverse companion site.' },
  { label: 'Soccerverse Office', href: 'https://soccerversetool.vercel.app/', by: 'acky', blurb: 'Community-built Soccerverse tool.' },
  { label: 'Nickx on Twitch', href: 'https://www.twitch.tv/nickxcrypto', by: 'Nickx', blurb: 'Soccerverse streams and content on Twitch.' },
]

function LinkCard({ item }: { item: LinkItem }) {
  return (
    <a
      href={item.href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col rounded-[1.1rem] border border-white/8 bg-black/15 p-4 transition duration-300 ease-out hover:border-white/18 hover:bg-white/6 active:scale-[0.99]"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-white">{item.label}</p>
        <span className="mono text-[var(--color-accent)] transition group-hover:translate-x-0.5">↗</span>
      </div>
      {item.by ? (
        <p className="mono mt-1 text-[10px] uppercase tracking-[0.16em] text-[var(--color-sand)]">by {item.by}</p>
      ) : null}
      <p className="mt-2 text-xs leading-relaxed text-[var(--color-muted)]">{item.blurb}</p>
      <p className="mono mt-3 truncate text-[10px] text-[var(--color-muted)]/70">{item.href.replace(/^https?:\/\//, '')}</p>
    </a>
  )
}

export function AboutPage({ locale }: AboutPageProps) {
  void locale

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-12">
      <section className="hero-card rounded-[1.25rem] px-5 py-7 sm:px-7">
        <p className="eyebrow">about &amp; links</p>
        <h1 className="section-title mt-4 max-w-[16ch]">A community event, built on Soccerverse.</h1>
        <p className="mt-5 max-w-[68ch] text-base leading-relaxed text-[var(--color-muted)]">
          The Grand Tournament Community Event is a free, fan-made fantasy game for the 2026 World Cup, built by
          members of the Soccerverse community and powered by Soccerverse player data. It is not an official
          Soccerverse product — it is made by players, for players, to bring the community together around the
          tournament.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/register"
            className="rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--color-ink)] transition hover:-translate-y-[1px] active:scale-[0.98]"
          >
            Register your squad
          </Link>
          <Link
            to="/rules"
            className="rounded-full border border-white/12 px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]"
          >
            Read the rules
          </Link>
        </div>
      </section>

      <section className="glass-panel rounded-[1.25rem] p-5 sm:p-6">
        <p className="eyebrow">what is soccerverse</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">The football world this event runs on</h2>
        <p className="mt-4 max-w-[72ch] text-sm leading-relaxed text-[var(--color-muted)]">
          Soccerverse is an online football management game where you run real clubs, build squads, and can hold
          influence in players and clubs across a living football economy. This event maps real World Cup
          performances onto Soccerverse players, so the same names you follow in the game move the leaderboards
          here. If you are new, the links below are the best places to start; if you already play, they are your
          shortcuts back into the game and the wider community.
        </p>
      </section>

      <section className="glass-panel rounded-[1.25rem] p-5 sm:p-6">
        <p className="eyebrow">official soccerverse</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">Official sites &amp; channels</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {officialLinks.map((item) => (
            <LinkCard key={item.href} item={item} />
          ))}
        </div>
      </section>

      <section className="glass-panel rounded-[1.25rem] p-5 sm:p-6">
        <p className="eyebrow">community projects</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">Made by the community</h2>
        <p className="mt-3 max-w-[72ch] text-sm leading-relaxed text-[var(--color-muted)]">
          Independent sites, tools and creators from the Soccerverse community. They are not affiliated with this
          event — we link them because they are genuinely useful.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {communityLinks.map((item) => (
            <LinkCard key={item.href} item={item} />
          ))}
        </div>
      </section>

      <section className="glass-panel rounded-[1.25rem] p-5 sm:p-6">
        <p className="eyebrow">the creators</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">Who built this</h2>
        <p className="mt-4 max-w-[72ch] text-sm leading-relaxed text-[var(--color-muted)]">
          This event was built by members of the Soccerverse community in their own time. Come say hello on the
          Soccerverse Discord — that is the best place to reach the people behind the event, share feedback, or
          help out.
        </p>
      </section>
    </div>
  )
}
