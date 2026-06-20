import { useId } from 'react'
import { buildRankChartGeometry } from '../lib/rankChart'
import type { RankHistoryPoint } from '../lib/types'

const VIEW_W = 560
const VIEW_H = 240

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

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="h-auto w-full" style={{ color }} role="img" aria-label="rank history">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity={0.26} />
          <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
        </linearGradient>
      </defs>

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

      {geo.areaPath ? <path d={geo.areaPath} fill={`url(#${gradientId})`} /> : null}
      <path d={geo.linePath} fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinejoin="round" strokeLinecap="round" />

      {geo.dots.map((dot, index) => (
        <circle
          key={`${dot.date}-${index}`}
          cx={dot.x}
          cy={dot.y}
          r={index === lastIndex ? 4.5 : 3}
          fill={index === lastIndex ? 'currentColor' : '#0b1110'}
          stroke="currentColor"
          strokeWidth={1.75}
        >
          <title>{`#${dot.rank} · ${dot.date}`}</title>
        </circle>
      ))}
    </svg>
  )
}
