import { useId, useState } from 'react'
import { buildRankChartGeometry, buildRankTooltipLayout } from '../lib/rankChart'
import type { RankHistoryPoint } from '../lib/types'

const VIEW_W = 560
const VIEW_H = 260
// Tooltip box sizing (SVG units). Width is estimated from the label length since SVG text can't be
// measured cheaply; the mono font at this size is ~7 units/char.
const TIP_CHAR_W = 7
const TIP_PAD_X = 9
const TIP_H = 22

// date is `YYYY-MM-DD`; show MM-DD (culture-neutral, unambiguous, no locale mapping needed).
function dayLabel(date: string) {
  return date.slice(5)
}

// A small hand-rolled SVG line chart (no chart dependency). The line colour follows the SVG's CSS
// `color`, so callers tint per board (accent green for participants, blue for the Nations board).
export function RankHistoryChart({ points, color = 'var(--color-accent)' }: { points: RankHistoryPoint[]; color?: string }) {
  const gradientId = useId()
  const geo = buildRankChartGeometry(points, { width: VIEW_W, height: VIEW_H })
  const lastIndex = geo.dots.length - 1
  const lastDot = geo.dots[lastIndex]
  // Index of the dot whose placement tooltip is showing (mouse hover or keyboard focus); null = none.
  const [hovered, setHovered] = useState<number | null>(null)
  const activeDot = hovered !== null ? geo.dots[hovered] : undefined

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="h-auto min-h-60 w-full" style={{ color }} role="img" aria-label="rank history">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity={0.26} />
          <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
        </linearGradient>
      </defs>

      <rect
        x={geo.plot.left}
        y={geo.plot.top}
        width={geo.plot.right - geo.plot.left}
        height={geo.plot.bottom - geo.plot.top}
        rx={14}
        fill="rgba(255,255,255,0.025)"
      />

      {geo.yTicks.map((tick) => (
        <g key={`y-${tick.rank}`}>
          <line x1={geo.plot.left} y1={tick.y} x2={geo.plot.right} y2={tick.y} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 4" />
          <text x={geo.plot.left - 8} y={tick.y} textAnchor="end" dominantBaseline="middle" className="mono" fill="rgba(234,225,205,0.5)" fontSize={11}>
            #{tick.rank}
          </text>
        </g>
      ))}

      {geo.xTicks.map((tick) => (
        <text key={`x-${tick.x}`} x={tick.x} y={geo.plot.bottom + 18} textAnchor="middle" className="mono" fill="rgba(234,225,205,0.4)" fontSize={10}>
          {dayLabel(tick.date)}
        </text>
      ))}

      <line x1={geo.plot.left} y1={geo.plot.bottom} x2={geo.plot.right} y2={geo.plot.bottom} stroke="rgba(255,255,255,0.11)" />
      <line x1={geo.plot.left} y1={geo.plot.top} x2={geo.plot.left} y2={geo.plot.bottom} stroke="rgba(255,255,255,0.09)" />
      {geo.areaPath ? <path d={geo.areaPath} fill={`url(#${gradientId})`} /> : null}
      <path d={geo.linePath} fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinejoin="round" strokeLinecap="round" />

      {activeDot ? (
        <line x1={activeDot.x} y1={geo.plot.top} x2={activeDot.x} y2={geo.plot.bottom} stroke="currentColor" strokeOpacity={0.18} strokeDasharray="4 5" />
      ) : null}

      {geo.dots.map((dot, index) => (
        <circle
          key={`${dot.date}-${index}`}
          cx={dot.x}
          cy={dot.y}
          r={index === lastIndex ? 4.5 : 3}
          fill={index === lastIndex ? 'currentColor' : '#0b1110'}
          stroke="currentColor"
          strokeWidth={1.75}
        />
      ))}

      {/* Generous transparent hit targets — comfortable hover, and focusable so the placement is
          reachable by keyboard and announced to screen readers (replaces the old native <title>). */}
      {geo.dots.map((dot, index) => (
        <circle
          key={`hit-${dot.date}-${index}`}
          cx={dot.x}
          cy={dot.y}
          r={14}
          fill="transparent"
          tabIndex={0}
          role="img"
          aria-label={`#${dot.rank}, ${dot.date}`}
          style={{ cursor: 'pointer', outline: 'none' }}
          onMouseEnter={() => setHovered(index)}
          onMouseLeave={() => setHovered((current) => (current === index ? null : current))}
          onFocus={() => setHovered(index)}
          onBlur={() => setHovered((current) => (current === index ? null : current))}
        />
      ))}

      {lastDot ? <EndpointLabel dot={lastDot} /> : null}
      {activeDot ? <RankTooltip dot={activeDot} /> : null}
    </svg>
  )
}

function EndpointLabel({ dot }: { dot: { x: number; y: number; rank: number } }) {
  const boxW = 42
  const boxH = 22
  const tip = buildRankTooltipLayout(dot, { width: boxW, height: boxH, viewWidth: VIEW_W, gap: 12 })
  return (
    <g pointerEvents="none">
      <rect x={tip.x} y={tip.y} width={boxW} height={boxH} rx={7} fill="rgba(11,17,16,0.94)" stroke="currentColor" strokeOpacity={0.35} />
      <text x={tip.x + boxW / 2} y={tip.y + boxH / 2} textAnchor="middle" dominantBaseline="central" className="mono" fill="currentColor" fontSize={12} fontWeight={800}>
        #{dot.rank}
      </text>
    </g>
  )
}

// Instant placement tooltip drawn in the chart's own coordinate space (so it scales with the
// responsive SVG). pointer-events: none so it never steals hover from the hit target beneath it.
function RankTooltip({ dot }: { dot: { x: number; y: number; rank: number; date: string } }) {
  const rankLabel = `#${dot.rank}`
  const dateLabel = ` · ${dayLabel(dot.date)}`
  const boxW = (rankLabel.length + dateLabel.length) * TIP_CHAR_W + TIP_PAD_X * 2
  const tip = buildRankTooltipLayout(dot, { width: boxW, height: TIP_H, viewWidth: VIEW_W })
  return (
    <g pointerEvents="none">
      <circle cx={dot.x} cy={dot.y} r={6} fill="none" stroke="currentColor" strokeOpacity={0.4} strokeWidth={1.5} />
      <rect x={tip.x} y={tip.y} width={boxW} height={TIP_H} rx={6} fill="#0b1110" stroke="rgba(255,255,255,0.16)" />
      <text x={tip.x + boxW / 2} y={tip.y + TIP_H / 2} textAnchor="middle" dominantBaseline="central" className="mono" fontSize={12}>
        <tspan fill="currentColor" fontWeight={700}>
          {rankLabel}
        </tspan>
        <tspan fill="rgba(234,225,205,0.55)">{dateLabel}</tspan>
      </text>
    </g>
  )
}
