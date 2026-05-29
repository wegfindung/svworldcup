import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { eventTeams } from '../data/eventConfig'
import { getNationName } from '../data/soccerverseNations'
import { ApiError, fetchPublicProfile } from '../lib/api'
import type { PublicParticipantProfile, SlotClass, SquadSlotState } from '../lib/types'
import { PlayerPortrait } from './PlayerPortrait'
import { PlayerTooltip } from './PlayerTooltip'

interface SquadPitchModalProps {
  // The participant whose squad to show. null = closed.
  target: { displayName: string; slug: string } | null
  onClose: () => void
}

const slotClassOrder: SlotClass[] = ['GK', 'DEF', 'MID', 'FWD']
const lineLabels: Record<SlotClass, string> = {
  GK: 'Goalkeeper',
  DEF: 'Defence',
  MID: 'Midfield',
  FWD: 'Attack',
}

function nationName(code?: string): string {
  if (!code) return ''
  return eventTeams.find((team) => team.code === code)?.nameEn ?? getNationName(code)
}

function formatPoints(value: number): string {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  })
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; profile: PublicParticipantProfile }
  | { kind: 'hidden' }
  | { kind: 'error' }

export function SquadPitchModal({ target, onClose }: SquadPitchModalProps) {
  const [state, setState] = useState<LoadState>({ kind: 'loading' })

  useEffect(() => {
    if (!target) {
      return
    }
    setState({ kind: 'loading' })
    let active = true
    void (async () => {
      try {
        const { item } = await fetchPublicProfile(target.slug)
        if (active) {
          setState({ kind: 'ready', profile: item })
        }
      } catch (error) {
        if (!active) return
        // A non-public profile 404s; treat that (and a revealed profile with a hidden squad,
        // handled below) as "nothing to show" rather than an error.
        setState({ kind: error instanceof ApiError && error.status === 404 ? 'hidden' : 'error' })
      }
    })()
    return () => {
      active = false
    }
  }, [target])

  useEffect(() => {
    if (!target) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [target, onClose])

  const profile = state.kind === 'ready' ? state.profile : null

  // Per-player season total: sum each player's totalPoints across every scored fixture.
  const pointsByPlayer = useMemo(() => {
    const map = new Map<number, number>()
    for (const fixture of profile?.score?.fixtures ?? []) {
      for (const player of fixture.players) {
        map.set(player.playerId, (map.get(player.playerId) ?? 0) + player.totalPoints)
      }
    }
    return map
  }, [profile])

  if (!target) {
    return null
  }

  const slots = profile?.squad?.slots ?? []
  const starterLines = slotClassOrder
    .map((slotClass) => ({
      slotClass,
      slots: slots
        .filter((slot) => slot.slotGroup === 'starter' && slot.slotClass === slotClass)
        .sort((left, right) => left.order - right.order),
    }))
    .filter((line) => line.slots.length > 0)
  const subs = slots.filter((slot) => slot.slotGroup === 'sub').sort((left, right) => left.order - right.order)
  const squadShown = state.kind === 'ready' && Boolean(profile?.squad)

  function renderPlayer(slot: SquadSlotState) {
    const player = slot.player
    const points = player ? (pointsByPlayer.get(player.playerId) ?? 0) : 0
    return (
      <PlayerTooltip
        key={slot.key}
        as="div"
        className="pitch-slot-card is-filled"
        info={
          player
            ? {
                name: player.displayName,
                nationCode: player.teamCode || player.nationalityCode,
                imageUrl: player.imageUrl,
                meta: [
                  { label: 'Pts', value: formatPoints(points) },
                  { label: 'Rating', value: String(player.rating) },
                  { label: 'Pos', value: player.positionMain ?? player.positions.join('/') },
                ],
              }
            : { name: slot.label }
        }
      >
        <span className="pitch-slot-meta">
          <span>{slot.label}</span>
          <span>{slot.slotClass}</span>
        </span>
        {player ? (
          <span className="mt-2 flex min-w-0 items-center gap-2.5">
            <span className="pitch-player-portrait">
              <PlayerPortrait
                src={player.imageUrl}
                alt={player.displayName}
                width={42}
                height={42}
                className="h-11 w-11 rounded-[0.8rem] border border-white/10 bg-black/20 object-cover"
              />
              <img
                src={`/team-flags/${player.teamCode || player.nationalityCode}.svg`}
                alt=""
                loading="lazy"
                width={22}
                height={22}
                className="pitch-player-flag"
              />
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-xs font-semibold text-white">{player.displayName}</span>
              <span className="mono mt-1 inline-block rounded-full border border-[var(--color-accent)]/24 bg-[var(--color-accent)]/10 px-2 py-0.5 text-[10px] text-[var(--color-accent)]">
                {formatPoints(points)} pts
              </span>
            </span>
          </span>
        ) : (
          <span className="pitch-empty-copy">Empty</span>
        )}
      </PlayerTooltip>
    )
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/72 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        className="glass-panel my-auto w-full max-w-3xl rounded-[1.25rem] p-5 sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow text-[10px]">submitted squad</p>
            <h3 className="mt-2 truncate text-2xl font-semibold text-white">{target.displayName}</h3>
            {profile ? (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted)]">
                <img
                  src={`/team-flags/${profile.primaryTeamCode}.svg`}
                  alt=""
                  width={18}
                  height={18}
                  className="h-[18px] w-[18px] rounded-full object-cover"
                />
                <span>{nationName(profile.primaryTeamCode)}</span>
                {profile.score ? (
                  <>
                    <span className="text-white/25">·</span>
                    <span className="mono text-[var(--color-accent)]">{formatPoints(profile.score.totalScore)} pts</span>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/12 text-white transition hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]"
          >
            ✕
          </button>
        </div>

        <div className="mt-5">
          {state.kind === 'loading' ? (
            <div className="skeleton h-72 rounded-[1.1rem]" />
          ) : null}

          {state.kind === 'error' ? (
            <p className="rounded-[1rem] border border-white/8 bg-black/16 px-4 py-6 text-center text-sm text-[var(--color-muted)]">
              Could not load this squad. Please try again.
            </p>
          ) : null}

          {(state.kind === 'hidden' || (state.kind === 'ready' && !squadShown)) ? (
            <p className="rounded-[1rem] border border-white/8 bg-black/16 px-4 py-6 text-center text-sm text-[var(--color-muted)]">
              This manager has not revealed their squad yet.
            </p>
          ) : null}

          {squadShown ? (
            <>
              <div className="squad-pitch">
                {starterLines.map((line) => (
                  <div key={line.slotClass} className={['pitch-line', `pitch-line-${line.slotClass.toLowerCase()}`].join(' ')}>
                    <div className="pitch-line-heading">
                      <span>{lineLabels[line.slotClass]}</span>
                      <span>{line.slotClass}</span>
                    </div>
                    <div className="pitch-line-slots">{line.slots.map(renderPlayer)}</div>
                  </div>
                ))}
              </div>

              {subs.length > 0 ? (
                <div className="mt-4">
                  <p className="mono mb-2 text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">Bench</p>
                  <div className="pitch-line-slots">{subs.map(renderPlayer)}</div>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  )
}
