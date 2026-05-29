import { useMemo, useState } from 'react'
import { ApiError, swapSquadPlayers } from '../lib/api'
import type { AppMessages } from '../i18n/messages'
import type { LocaleCode, ParticipantSquad, SwapState, TeamPoolPlayer } from '../lib/types'

interface SwapPanelProps {
  squad: ParticipantSquad
  copy: AppMessages['builder']['swap']
  locale: LocaleCode
  // Swap state owned by the parent (windows + effective lineup + history). The pitch reads the same
  // state, so they stay in sync.
  state: SwapState | null
  // Called after a successful swap so the parent refetches state (updating this panel and the pitch).
  onSwapped: () => void | Promise<void>
}

export function SwapPanel({ squad, copy, locale, state, onSwapped }: SwapPanelProps) {
  const [playerInId, setPlayerInId] = useState<number | ''>('')
  const [playerOutId, setPlayerOutId] = useState<number | ''>('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // The 15 drafted players, keyed by id, for display (name/team/image).
  const playerById = useMemo(() => {
    const map = new Map<number, TeamPoolPlayer>()
    for (const slot of squad.slots) {
      if (slot.player) {
        map.set(slot.player.playerId, slot.player)
      }
    }
    return map
  }, [squad])

  // Swaps are only possible inside an open window — outside one the panel is not shown at all.
  const openWindow = state?.openWindow ?? null
  if (!state || !openWindow) {
    return null
  }

  const lineup = state.currentLineup
  const reserves = lineup.filter((slot) => slot.slotGroup === 'sub')
  const selectedReserve = reserves.find((slot) => slot.playerId === playerInId)
  const eligibleStarters = lineup.filter(
    (slot) => slot.slotGroup === 'starter' && (!selectedReserve || slot.slotClass === selectedReserve.slotClass),
  )

  const swapsUsed = state.swapsUsedByWindow[openWindow.key] ?? 0
  const limitReached = swapsUsed >= openWindow.swapLimit
  const canSwap = !limitReached && playerInId !== '' && playerOutId !== '' && !pending

  const name = (id: number) => playerById.get(id)?.displayName ?? `#${id}`
  const formatTime = (epoch: number) => new Date(epoch).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })

  function onReserveChange(value: string) {
    const next = value === '' ? '' : Number(value)
    setPlayerInId(next)
    // Reset the starter if it is no longer the same class as the new reserve.
    if (next !== '' && playerOutId !== '') {
      const reserve = reserves.find((slot) => slot.playerId === next)
      const starter = lineup.find((slot) => slot.playerId === playerOutId)
      if (reserve && starter && reserve.slotClass !== starter.slotClass) {
        setPlayerOutId('')
      }
    }
  }

  async function submit() {
    if (playerInId === '' || playerOutId === '') {
      return
    }
    setPending(true)
    setError(null)
    try {
      await swapSquadPlayers(Number(playerInId), Number(playerOutId))
      setPlayerInId('')
      setPlayerOutId('')
      await onSwapped()
    } catch (swapError) {
      setError(swapError instanceof ApiError ? swapError.message : copy.failed)
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-[var(--color-line)] bg-white/5 p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)]">{copy.heading}</p>
      <h3 className="mt-1 text-lg font-semibold text-white">{copy.title}</h3>
      <p className="mt-2 text-sm text-[var(--color-muted)]">{copy.intro}</p>

      <div className="mt-4 rounded-xl border border-[var(--color-line)] bg-black/20 p-4 text-sm">
        <div className="space-y-1 text-white/80">
          <p className="font-semibold text-white">
            {copy.windowOpenPrefix} {openWindow.key} {copy.windowOpenSuffix}
          </p>
          <p>
            {copy.closesLabel}: {formatTime(openWindow.closesAt)} · {copy.setsRoundPrefix} {openWindow.targetRound}
          </p>
          <p>
            {copy.swapsUsedLabel}: {swapsUsed} / {openWindow.swapLimit}
          </p>
        </div>
      </div>

      {!limitReached ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--color-muted)]">{copy.bringOn}</span>
            <select
              className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-ink-soft)] px-3 py-2 text-[var(--color-paper)] [color-scheme:dark]"
              value={playerInId}
              onChange={(event) => onReserveChange(event.target.value)}
            >
              <option value="">{copy.selectReserve}</option>
              {reserves.map((slot) => (
                <option key={slot.slotKey} value={slot.playerId}>
                  {name(slot.playerId)} ({slot.slotClass})
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-[var(--color-muted)]">{copy.takeOff}</span>
            <select
              className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-ink-soft)] px-3 py-2 text-[var(--color-paper)] [color-scheme:dark] disabled:opacity-50"
              value={playerOutId}
              disabled={playerInId === ''}
              onChange={(event) => setPlayerOutId(event.target.value === '' ? '' : Number(event.target.value))}
            >
              <option value="">{copy.selectStarter}</option>
              {eligibleStarters.map((slot) => (
                <option key={slot.slotKey} value={slot.playerId}>
                  {name(slot.playerId)} ({slot.slotClass})
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="rounded-lg bg-[var(--color-accent)] px-4 py-2 font-semibold text-[var(--color-ink)] transition hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
            disabled={!canSwap}
            onClick={() => void submit()}
          >
            {pending ? copy.swapping : copy.confirm}
          </button>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}

      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)]">{copy.historyHeading}</p>
        {state.history.length > 0 ? (
          <ul className="mt-2 space-y-1 text-sm text-white/80">
            {state.history.map((record) => (
              <li key={record.swapId} className="flex flex-wrap gap-x-2">
                <span className="text-[var(--color-muted)]">{record.windowKey}</span>
                <span>
                  {name(record.playerInId)} {copy.historyRow} {name(record.playerOutId)} ({record.slotClass})
                </span>
                <span className="text-[var(--color-muted)]">{formatTime(new Date(record.appliedAt).getTime())}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-[var(--color-muted)]">{copy.noHistory}</p>
        )}
      </div>
    </section>
  )
}
