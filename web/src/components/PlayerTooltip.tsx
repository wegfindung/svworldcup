import { createElement, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import type { CSSProperties, FocusEvent, MouseEvent, ReactNode } from 'react'
import { eventTeams } from '../data/eventConfig'
import { getNationName } from '../data/soccerverseNations'
import { PlayerPortrait } from './PlayerPortrait'

// One extra fact row, e.g. { label: 'Rating', value: '88' }.
export interface PlayerTooltipMeta {
  label: string
  value: string
}

export interface PlayerTooltipInfo {
  // The complete, untruncated player name (cards truncate it with "…"; the tooltip shows it whole).
  name: string
  // Flag/nation code. WC team code (e.g. MEX) or Soccerverse nationality (e.g. mx). Drives flag + name.
  nationCode?: string
  imageUrl?: string
  meta?: PlayerTooltipMeta[]
}

interface PlayerTooltipProps {
  info: PlayerTooltipInfo
  children: ReactNode
  // The trigger element this renders. Defaults to a span so it can sit inside a card without
  // changing the card's layout.
  as?: 'span' | 'div'
  className?: string
  style?: CSSProperties
}

type Anchor = { x: number; y: number; placement: 'top' | 'bottom' }

// WC team codes (MEX) resolve via eventTeams; Soccerverse nationalities (mx) via getNationName.
function resolveNationName(code: string): string {
  return eventTeams.find((team) => team.code === code)?.nameEn ?? getNationName(code)
}

export function PlayerTooltip({ info, children, as = 'span', className, style }: PlayerTooltipProps) {
  const [anchor, setAnchor] = useState<Anchor | null>(null)
  const id = useId()

  function open(event: MouseEvent | FocusEvent) {
    const rect = event.currentTarget.getBoundingClientRect()
    const placement = rect.top > 220 ? 'top' : 'bottom'
    // Clamp the centre so the (≤18rem) card never spills past either viewport edge.
    const half = 150
    const x = Math.min(Math.max(rect.left + rect.width / 2, half), window.innerWidth - half)
    setAnchor({ x, y: placement === 'top' ? rect.top : rect.bottom, placement })
  }

  function close() {
    setAnchor(null)
  }

  return createElement(
    as,
    {
      className,
      style,
      onMouseEnter: open,
      onMouseLeave: close,
      onFocus: open,
      onBlur: close,
      'aria-describedby': anchor ? id : undefined,
    },
    children,
    anchor ? createPortal(<TooltipCard id={id} info={info} anchor={anchor} />, document.body) : null,
  )
}

function TooltipCard({ id, info, anchor }: { id: string; info: PlayerTooltipInfo; anchor: Anchor }) {
  const style: CSSProperties = {
    position: 'fixed',
    left: anchor.x,
    top: anchor.y,
    transform: anchor.placement === 'top' ? 'translate(-50%, calc(-100% - 0.6rem))' : 'translate(-50%, 0.6rem)',
    zIndex: 60,
    pointerEvents: 'none',
    maxWidth: 'min(18rem, calc(100vw - 1.5rem))',
  }
  const nationName = info.nationCode ? resolveNationName(info.nationCode) : null

  return (
    <span
      role="tooltip"
      id={id}
      style={style}
      className="block rounded-[0.7rem] border border-white/12 bg-[var(--color-ink-soft)] px-3 py-2.5 text-left normal-case tracking-normal shadow-xl"
    >
      <span className="flex items-center gap-2.5">
        {info.imageUrl ? (
          <PlayerPortrait
            src={info.imageUrl}
            alt={info.name}
            width={36}
            height={36}
            className="h-9 w-9 shrink-0 rounded-[0.55rem] border border-white/10 bg-black/20 object-cover"
          />
        ) : null}
        <span className="min-w-0">
          <span className="block text-sm font-semibold leading-tight text-[var(--color-paper)]">{info.name}</span>
          {nationName ? (
            <span className="mt-1 flex items-center gap-1.5">
              {info.nationCode ? (
                <img
                  src={`/team-flags/${info.nationCode}.svg`}
                  alt=""
                  width={16}
                  height={16}
                  className="h-4 w-4 rounded-full object-cover"
                />
              ) : null}
              <span className="text-[11px] text-[var(--color-muted)]">{nationName}</span>
            </span>
          ) : null}
        </span>
      </span>
      {info.meta && info.meta.length > 0 ? (
        <span className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 border-t border-white/8 pt-2">
          {info.meta.map((row) => (
            <span key={row.label} className="flex items-baseline gap-1">
              <span className="mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-muted)]">{row.label}</span>
              <span className="text-[11px] font-medium text-[var(--color-paper)]">{row.value}</span>
            </span>
          ))}
        </span>
      ) : null}
    </span>
  )
}
