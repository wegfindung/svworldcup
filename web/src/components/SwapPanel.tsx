import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApiError, fetchSwapState, swapSquadPlayers } from '../lib/api'
import type { AppMessages } from '../i18n/messages'
import type { LocaleCode, ParticipantSquad, SwapState, TeamPoolPlayer } from '../lib/types'

interface SwapPanelProps {
  squad: ParticipantSquad
  copy: AppMessages['builder']['swap']
  locale: LocaleCode
  // Called after a successful swap so the parent can refetch the squad.
  onSwapped?: () => void
}

export function SwapPanel({ squad, copy, locale, onSwapped }: SwapPanelProps) {
  const [state, setState] = useState<SwapState | null>(null)
  const [playerInId, setPlayerInId] = useState<number | ''>('')
  const [playerOutId, setPlayerOutId] = useState<number | ''>('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setState(await fetchSwapState())
    } catch {
      setState(null)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

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

  const lineup = state?.currentLineup ?? []
  const reserves = lineup.filter((slot) => slot.slotGroup === 'sub')
  const selectedReserve = reserves.find((slot) => slot.playerId === playerInId)
  // Only starters of the selected reserve's class are valid swap partners.
  const eligibleStarters = lineup.filter(
    (slot) => slot.slotGroup === 'starter' && (!selectedReserve || slot.slotClass === selectedReserve.slotClass),
  )

  const openWindow = state?.openWindow ?? null
  const swapsUsed = openWindow ? state?.swapsUsedByWindow[openWindow.key] ?? 0 : 0
  const limitReached = openWindow ? swapsUsed >= openWindow.swapLimit : false
  const canSwap = Boolean(openWindow) && !limitReached && playerInId !== '' && playerOutId !== '' && !pending

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
      await refresh()
      onSwapped?.()
    } catch (swapError) {
      setError(swapError instanceof ApiError ? swapError.message : copy.failed)
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">{copy.heading}</p>
      <h3 className="mt-1 text-lg font-semibold text-white">{copy.title}</h3>
      <p className="mt-2 text-sm text-white/70">{copy.intro}</p>

      <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4 text-sm">
        {state?.hasHardStopPassed ? (
          <p className="text-white/70">{copy.hardStopPassed}</p>
        ) : openWindow ? (
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
        ) : (
          <p className="text-white/70">{copy.noWindow}</p>
        )}
      </div>

      {openWindow && !limitReached ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="block text-sm">
            <span className="mb-1 block text-white/60">{copy.bringOn}</span>
            <select
              className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white"
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
            <span className="mb-1 block text-white/60">{copy.takeOff}</span>
            <select
              className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white disabled:opacity-50"
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
            className="rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-black transition disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canSwap}
            onClick={() => void submit()}
          >
            {pending ? copy.swapping : copy.confirm}
          </button>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}

      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">{copy.historyHeading}</p>
        {state && state.history.length > 0 ? (
          <ul className="mt-2 space-y-1 text-sm text-white/80">
            {state.history.map((record) => (
              <li key={record.swapId} className="flex flex-wrap gap-x-2">
                <span className="text-white/50">{record.windowKey}</span>
                <span>
                  {name(record.playerInId)} {copy.historyRow} {name(record.playerOutId)} ({record.slotClass})
                </span>
                <span className="text-white/40">{formatTime(new Date(record.appliedAt).getTime())}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-white/50">{copy.noHistory}</p>
        )}
      </div>
    </section>
  )
}
