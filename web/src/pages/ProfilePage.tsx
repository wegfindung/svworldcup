import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { PlayerPortrait } from '../components/PlayerPortrait'
import { PlayerTooltip } from '../components/PlayerTooltip'
import { StatTile } from '../components/StatTile'
import { TeamFlag } from '../components/TeamFlag'
import { getNationName } from '../data/soccerverseNations'
import { fetchPublicProfile } from '../lib/api'
import type { PublicParticipantProfile } from '../lib/types'

type LoadState = 'loading' | 'ready' | 'error'

function formatScore(value: number | undefined) {
  if (value === undefined) {
    return '0'
  }

  return value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  })
}

export function ProfilePage() {
  const { slug } = useParams()
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [profile, setProfile] = useState<PublicParticipantProfile | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadProfile() {
      if (!slug) {
        setLoadState('error')
        setError('Missing profile slug.')
        return
      }

      setLoadState('loading')
      setError(null)
      try {
        const response = await fetchPublicProfile(slug)
        if (!cancelled) {
          setProfile(response.item)
          setLoadState('ready')
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Profile could not be loaded.')
          setLoadState('error')
        }
      }
    }

    void loadProfile()

    return () => {
      cancelled = true
    }
  }, [slug])

  if (loadState === 'loading') {
    return (
      <div className="space-y-4 pb-10">
        <section className="hero-card rounded-[1.25rem] px-5 py-6 sm:px-6">
          <div className="skeleton h-8 w-40 rounded-full" />
          <div className="skeleton mt-8 h-28 max-w-2xl rounded-[1.4rem]" />
        </section>
      </div>
    )
  }

  if (loadState === 'error' || !profile) {
    return (
      <div className="space-y-4 pb-10">
        <section className="glass-panel rounded-[1.15rem] p-5">
          <EmptyState title="No public profile found" body={error ?? 'This participant has not revealed a public profile yet.'} />
        </section>
      </div>
    )
  }

  const squadPlayers = profile.squad?.slots.filter((slot) => slot.player) ?? []
  const playerNameById = new Map((profile.squad?.slots ?? []).filter((slot) => slot.player).map((slot) => [slot.player!.playerId, slot.player!.displayName]))
  const playerName = (id: number) => playerNameById.get(id) ?? `#${id}`

  return (
    <div className="space-y-4 pb-10">
      <section className="hero-card rounded-[1.25rem] px-5 py-6 sm:px-6">
        <p className="eyebrow">public profile</p>
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_0.8fr]">
          <div>
            <h2 className="section-title max-w-[11ch]">{profile.displayName}</h2>
            <p className="mt-5 max-w-[62ch] text-base leading-relaxed text-[var(--color-muted)]">
              {profile.revealSquad
                ? 'This manager has revealed the locked World Cup squad.'
                : 'This profile is public, but the squad is still hidden.'}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <span className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold capitalize text-white">{profile.leagueType}</span>
              {profile.soccerverseUsername ? (
                <span className="rounded-full border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/10 px-4 py-2 text-sm font-semibold text-[var(--color-accent)]">
                  {profile.soccerverseUsername}
                </span>
              ) : null}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <StatTile label="rank" value={profile.score ? `#${profile.score.rank}` : 'pending'} tone="accent" />
            <StatTile label="score" value={formatScore(profile.score?.totalScore)} tone="sand" />
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.7fr_1.3fr]">
        <div className="glass-panel rounded-[1.15rem] p-4">
          <p className="eyebrow text-[10px]">nations</p>
          <div className="mt-5 grid gap-3">
            <div className="flex items-center gap-3 rounded-[1.1rem] border border-white/8 bg-black/12 p-3">
              <TeamFlag teamCode={profile.primaryTeamCode} label={getNationName(profile.primaryTeamCode)} size="sm" />
              <div>
                <p className="text-sm font-semibold text-white">{getNationName(profile.primaryTeamCode)}</p>
                <p className="text-xs text-[var(--color-muted)]">Primary nation</p>
              </div>
            </div>
            {profile.secondaryTeamCode ? (
              <div className="flex items-center gap-3 rounded-[1.1rem] border border-white/8 bg-black/12 p-3">
                <TeamFlag teamCode={profile.secondaryTeamCode} label={getNationName(profile.secondaryTeamCode)} size="sm" />
                <div>
                  <p className="text-sm font-semibold text-white">{getNationName(profile.secondaryTeamCode)}</p>
                  <p className="text-xs text-[var(--color-muted)]">Secondary nation</p>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="glass-panel rounded-[1.15rem] p-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow text-[10px]">submitted squad</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">{profile.revealSquad ? 'Revealed XI + subs' : 'Hidden until reveal'}</h3>
            </div>
            <span className="mono text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">{squadPlayers.length}/15</span>
          </div>

          {profile.revealSquad && squadPlayers.length ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {squadPlayers.map((slot) => (
                <article key={slot.key} className="surface-row rounded-[0.9rem] p-3 transition hover:bg-white/5">
                  <PlayerTooltip
                    as="div"
                    className="flex items-center gap-3"
                    info={{
                      name: slot.player?.displayName ?? slot.label,
                      nationCode: slot.player?.teamCode || slot.player?.nationalityCode,
                      imageUrl: slot.player?.imageUrl,
                      meta: slot.player
                        ? [
                            { label: 'Rating', value: String(slot.player.rating) },
                            { label: 'Pos', value: slot.player.positionMain ?? slot.player.positions.join('/') },
                          ]
                        : undefined,
                    }}
                  >
                    <PlayerPortrait
                      src={slot.player?.imageUrl ?? '/placeholders/player.svg'}
                      alt={slot.player?.displayName ?? slot.label}
                      width={48}
                      height={48}
                      className="h-12 w-12 rounded-xl border border-white/10 object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{slot.player?.displayName}</p>
                      <p className="mono mt-1 text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">
                        {slot.label} · {slot.slotClass}
                      </p>
                    </div>
                  </PlayerTooltip>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-5">
              <EmptyState title="Squad hidden" body="The manager has not revealed the submitted squad yet." />
            </div>
          )}

          {profile.revealSquad && profile.swaps && profile.swaps.length > 0 ? (
            <div className="mt-6 border-t border-[var(--color-line)] pt-5">
              <p className="eyebrow text-[10px]">swap history</p>
              <ul className="mt-3 space-y-1 text-sm text-white/80">
                {profile.swaps.map((swap) => (
                  <li key={swap.swapId} className="flex flex-wrap gap-x-2">
                    <span className="text-[var(--color-muted)]">{swap.windowKey}</span>
                    <span>
                      {playerName(swap.playerInId)} in for {playerName(swap.playerOutId)} ({swap.slotClass})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}
