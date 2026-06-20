import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { fetchRankHistory } from '../lib/api'
import { getMessages } from '../i18n/messages'
import type { LocaleCode, RankHistoryBoard, RankHistoryPayload } from '../lib/types'
import { RankHistoryChart } from './RankHistoryChart'

export interface RankHistoryTarget {
  board: RankHistoryBoard
  // participantId for rookie/veteran, teamCode for nations.
  id: string
  // Display label resolved by the caller (participant name or localized nation name).
  label: string
}

// Keyed by the target so a stale fetch never paints the wrong entity, and so "loading" is derived
// during render (state still on a previous key) rather than set synchronously in the effect — the
// same pattern as SquadPitchModal, which keeps react-hooks/set-state-in-effect happy.
type LoadState =
  | { kind: 'idle' }
  | { kind: 'ready'; key: string; payload: RankHistoryPayload }
  | { kind: 'empty'; key: string }
  | { kind: 'error'; key: string }

function targetKeyOf(target: RankHistoryTarget) {
  return `${target.board}:${target.id}`
}

// Blue matches the Nations board accent; participants use the global green accent.
const NATION_COLOR = 'rgb(96 165 250)'
const PARTICIPANT_COLOR = 'var(--color-accent)'

export function RankHistoryModal({
  target,
  locale,
  onClose,
}: {
  target: RankHistoryTarget | null
  locale: LocaleCode
  onClose: () => void
}) {
  const copy = getMessages(locale).tables.rankHistory
  const [state, setState] = useState<LoadState>({ kind: 'idle' })

  useEffect(() => {
    if (!target) {
      return
    }
    let active = true
    const key = targetKeyOf(target)
    fetchRankHistory(target.board, target.id)
      .then((payload) => {
        if (!active) return
        setState(payload.points.length ? { kind: 'ready', key, payload } : { kind: 'empty', key })
      })
      .catch(() => {
        if (active) setState({ kind: 'error', key })
      })
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

  if (!target) {
    return null
  }

  // Derive the view from whether the settled state matches the current target — otherwise "loading".
  const settled = state.kind !== 'idle' && state.key === targetKeyOf(target) ? state : null
  const view: 'loading' | 'ready' | 'empty' | 'error' = settled ? settled.kind : 'loading'
  const payload = settled?.kind === 'ready' ? settled.payload : null
  const current = payload?.points.at(-1)?.rank
  const best = payload?.points.length ? Math.min(...payload.points.map((point) => point.rank)) : undefined
  const color = target.board === 'nations' ? NATION_COLOR : PARTICIPANT_COLOR

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/72 backdrop-blur-sm sm:items-center sm:overflow-y-auto sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        className="glass-panel flex h-full w-full flex-col rounded-none sm:my-auto sm:h-auto sm:max-h-[calc(100vh-2rem)] sm:max-w-2xl sm:rounded-[1.25rem]"
      >
        {/* Sticky header on the full-screen mobile sheet so close stays reachable. */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/8 p-4 sm:p-6">
          <div className="min-w-0">
            <p className="eyebrow text-[10px]">{copy.eyebrow}</p>
            <h3 className="mt-2 truncate text-2xl font-semibold text-white">{target.label}</h3>
            <p className="mt-1 text-xs text-[var(--color-muted)]">{copy.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.close}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/12 text-white transition hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {view === 'loading' ? <div className="skeleton h-60 rounded-[1.1rem]" /> : null}

          {view === 'error' ? (
            <p className="rounded-[1rem] border border-white/8 bg-black/16 px-4 py-6 text-center text-sm text-[var(--color-muted)]">
              {copy.error}
            </p>
          ) : null}

          {view === 'empty' ? (
            <p className="rounded-[1rem] border border-white/8 bg-black/16 px-4 py-6 text-center text-sm text-[var(--color-muted)]">
              {copy.empty}
            </p>
          ) : null}

          {payload ? (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
                {current !== undefined ? (
                  <span className="mono rounded-full border border-white/12 bg-white/4 px-3 py-1 text-white">
                    {copy.current}{' '}
                    <span className="font-bold" style={{ color }}>
                      #{current}
                    </span>{' '}
                    {copy.ofTotal.replace('{total}', String(payload.boardSize))}
                  </span>
                ) : null}
                {best !== undefined ? (
                  <span className="mono rounded-full border border-white/12 bg-white/4 px-3 py-1 text-[var(--color-muted)]">
                    {copy.best} <span className="font-bold text-white">#{best}</span>
                  </span>
                ) : null}
              </div>
              <div className="rounded-[1.1rem] border border-white/8 bg-black/20 p-3">
                <RankHistoryChart points={payload.points} color={color} />
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  )
}
