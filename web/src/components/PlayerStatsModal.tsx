import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { PlayerPortrait } from './PlayerPortrait'
import { TeamFlag } from './TeamFlag'
import { eventTeams } from '../data/eventConfig'
import { getMessages } from '../i18n/messages'
import { fetchPlayerPoints } from '../lib/api'
import { earnsCleanSheetPosition, goalkeeperFoldedBase } from '../lib/playerStats'
import { isTeamEliminated, useTournamentSurvival } from '../lib/tournamentSurvival'
import type { LocaleCode, PlayerPointsPlayer } from '../lib/types'
import type { PlayerStatsSeed } from '../lib/playerStatsSeed'

function teamName(teamCode: string) {
  return eventTeams.find((team) => team.code === teamCode)?.nameEn ?? teamCode
}

function formatInt(value: number) {
  return value.toLocaleString()
}

function formatDecimal(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: value % 1 === 0 ? 0 : 2 })
}

// Reusable player card shown across the Stats pages and the landing spotlight. Soccerverse attributes
// (rating, value) plus the player's tournament totals and a profile link.
export function PlayerStatsModal({ seed, locale, onClose }: { seed: PlayerStatsSeed; locale: LocaleCode; onClose: () => void }) {
  const messages = getMessages(locale)
  const copy = messages.playerModal
  const resultsCopy = messages.results
  const leadersCopy = messages.leaders
  const [totals, setTotals] = useState<PlayerPointsPlayer | null>(null)
  const [loaded, setLoaded] = useState(false)
  const survival = useTournamentSurvival()
  const eliminated = isTeamEliminated(survival, seed.teamCode)

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    let active = true
    void fetchPlayerPoints()
      .then((response) => {
        if (active) {
          setTotals(response.items.find((item) => item.playerId === seed.playerId) ?? null)
          setLoaded(true)
        }
      })
      .catch(() => {
        if (active) {
          setLoaded(true)
        }
      })
    return () => {
      active = false
    }
  }, [seed.playerId])

  const rating = seed.rating ?? totals?.rating
  const capCost = seed.capCost ?? totals?.capCost
  const positions = (seed.positions && seed.positions.length ? seed.positions : totals?.positions) ?? []
  const positionsText = positions.length ? positions.join(' · ') : seed.positionMain ?? totals?.positionMain ?? ''
  const nationName = teamName(seed.teamCode)
  const profileUrl = `https://play.soccerverse.com/player/${seed.playerId}`

  const inGame: Array<[string, string]> = totals
    ? [
        ['Apps', String(totals.appearances)],
        ['Min', String(totals.minutes)],
        [leadersCopy.goals, String(totals.goals)],
        [leadersCopy.assists, String(totals.assists)],
        // Clean sheets only count for clean-sheet-earning positions (GK/DEF/DM-MID).
        ...(earnsCleanSheetPosition(totals.positionClasses, totals.positions)
          ? ([[leadersCopy.cleanSheets, String(totals.cleanSheets)]] as Array<[string, string]>)
          : []),
        [leadersCopy.average, totals.averageRating > 0 ? formatDecimal(totals.averageRating) : '–'],
        // A goalkeeper's clean sheet folds into their base figure (single fixed position).
        [resultsCopy.basePointsLabel, formatDecimal(goalkeeperFoldedBase(totals.basePoints, totals.cleanSheetByPosition))],
      ]
    : []

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={seed.displayName}
        onClick={(event) => event.stopPropagation()}
        className="glass-panel max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[1.25rem] p-6"
      >
        <div className="flex items-center gap-3.5">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[0.85rem] border border-white/10 bg-white/5">
            <PlayerPortrait
              src={seed.imageUrl ?? '/placeholders/player.svg'}
              alt={seed.displayName}
              width={64}
              height={64}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-white">{seed.displayName}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <TeamFlag teamCode={seed.teamCode} label={nationName} size="sm" />
              <span className="truncate text-xs text-[var(--color-muted)]">{nationName}</span>
              {eliminated ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-red-300">
                  <span aria-hidden="true">●</span>
                  {messages.survival.eliminated}
                </span>
              ) : null}
            </div>
            {positionsText ? (
              <p className="mono mt-1.5 text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
                {resultsCopy.positionsLabel}: {positionsText}
              </p>
            ) : null}
          </div>
        </div>

        <p className="mono mt-5 text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">Soccerverse</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="rounded-[0.7rem] border border-white/8 bg-black/25 px-3 py-2">
            <p className="mono text-[9px] uppercase tracking-wider text-[var(--color-muted)]">{resultsCopy.rating}</p>
            <p className="mono mt-1 text-sm font-bold text-white">{rating !== undefined ? rating : '–'}</p>
          </div>
          <div className="rounded-[0.7rem] border border-white/8 bg-black/25 px-3 py-2">
            <p className="mono text-[9px] uppercase tracking-wider text-[var(--color-muted)]">{copy.value}</p>
            <p className="mono mt-1 text-sm font-bold text-white">{capCost !== undefined ? formatInt(capCost) : '–'}</p>
          </div>
        </div>

        <p className="mono mt-5 text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">{copy.tournamentTotals}</p>
        {totals ? (
          <div className="mt-2 grid grid-cols-3 gap-2">
            {inGame.map(([label, value]) => (
              <div key={label} className="rounded-[0.7rem] border border-white/8 bg-black/25 px-2 py-2 text-center">
                <p className="mono text-[9px] uppercase tracking-wider text-[var(--color-muted)]">{label}</p>
                <p className="mono mt-1 text-sm font-bold text-white">{value}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs leading-relaxed text-[var(--color-muted)]">{loaded ? copy.noMatchData : '…'}</p>
        )}

        <div className="mt-5 flex items-center justify-between gap-3">
          <a
            href={profileUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-[var(--color-accent)] underline-offset-4 hover:underline"
          >
            {resultsCopy.viewOnSoccerverse} ↗
          </a>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[var(--color-accent)] px-5 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:-translate-y-[1px] active:scale-[0.98]"
          >
            {resultsCopy.close}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
