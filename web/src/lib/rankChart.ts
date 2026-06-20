import type { RankHistoryPoint } from './types'

// Pure geometry for the rank-history line chart. Y is INVERTED — a better (smaller) rank sits higher
// on the chart — and the rank domain is the entity's own best..worst range (a flat series is padded
// by one each side and clamped to >= 1) so movement is visible rather than a flat line against the
// full board height. Kept separate from the component so the scaling is unit-tested.

export interface RankChartDot {
  x: number
  y: number
  rank: number
  date: string
  score: number
}

export interface RankChartGeometry {
  width: number
  height: number
  plot: { left: number; right: number; top: number; bottom: number }
  linePath: string
  areaPath: string
  dots: RankChartDot[]
  yTicks: Array<{ y: number; rank: number }>
  xTicks: Array<{ x: number; date: string }>
  bestRank: number
  worstRank: number
}

export interface RankChartOptions {
  width: number
  height: number
  margin?: { top: number; right: number; bottom: number; left: number }
  maxXTicks?: number
}

const DEFAULT_MARGIN = { top: 18, right: 18, bottom: 30, left: 40 }

function round(value: number) {
  return Math.round(value * 100) / 100
}

function pickXTicks(dots: RankChartDot[], maxXTicks: number) {
  if (dots.length <= maxXTicks) {
    return dots.map((dot) => ({ x: dot.x, date: dot.date }))
  }
  const ticks: Array<{ x: number; date: string }> = []
  const step = (dots.length - 1) / (maxXTicks - 1)
  for (let tick = 0; tick < maxXTicks; tick += 1) {
    const index = Math.round(tick * step)
    ticks.push({ x: dots[index].x, date: dots[index].date })
  }
  return ticks.filter((tick, index) => index === 0 || tick.x !== ticks[index - 1].x)
}

export function buildRankChartGeometry(points: RankHistoryPoint[], options: RankChartOptions): RankChartGeometry {
  const margin = options.margin ?? DEFAULT_MARGIN
  const { width, height } = options
  const plot = { left: margin.left, right: width - margin.right, top: margin.top, bottom: height - margin.bottom }
  const innerW = Math.max(1, plot.right - plot.left)
  const innerH = Math.max(1, plot.bottom - plot.top)

  const ranks = points.map((point) => point.rank)
  const bestRank = ranks.length ? Math.min(...ranks) : 1
  const worstRank = ranks.length ? Math.max(...ranks) : 1
  const domainLo = bestRank === worstRank ? Math.max(1, bestRank - 1) : bestRank
  const domainHi = bestRank === worstRank ? bestRank + 1 : worstRank
  const span = domainHi - domainLo || 1

  const n = points.length
  const xAt = (index: number) => plot.left + (n <= 1 ? innerW / 2 : (innerW * index) / (n - 1))
  // rank === domainLo (best) → top of plot; rank === domainHi (worst) → bottom.
  const yAt = (rank: number) => plot.top + (innerH * (rank - domainLo)) / span

  const dots: RankChartDot[] = points.map((point, index) => ({
    x: xAt(index),
    y: yAt(point.rank),
    rank: point.rank,
    date: point.date,
    score: point.score,
  }))

  const linePath = dots.map((dot, index) => `${index === 0 ? 'M' : 'L'} ${round(dot.x)} ${round(dot.y)}`).join(' ')
  const areaPath = dots.length
    ? `${linePath} L ${round(dots[dots.length - 1].x)} ${round(plot.bottom)} L ${round(dots[0].x)} ${round(plot.bottom)} Z`
    : ''

  const yTicks =
    bestRank === worstRank
      ? [{ y: yAt(bestRank), rank: bestRank }]
      : [
          { y: yAt(bestRank), rank: bestRank },
          { y: yAt(worstRank), rank: worstRank },
        ]

  const xTicks = pickXTicks(dots, Math.max(2, options.maxXTicks ?? 5))

  return { width, height, plot, linePath, areaPath, dots, yTicks, xTicks, bestRank, worstRank }
}

export interface RankTooltipLayout {
  x: number
  y: number
  placement: 'above' | 'below'
}

// Places the hover tooltip box near a dot: above it by default, flipping below when sitting above
// would clip the top edge, and clamping horizontally so the box stays inside the viewBox. Pure so the
// edge cases (top dot flips down, left/right clamp) are unit-tested rather than eyeballed in SVG.
export function buildRankTooltipLayout(
  dot: { x: number; y: number },
  box: { width: number; height: number; viewWidth: number; gap?: number; pad?: number },
): RankTooltipLayout {
  const gap = box.gap ?? 10
  const pad = box.pad ?? 2
  const aboveY = dot.y - gap - box.height
  const placement: 'above' | 'below' = aboveY < pad ? 'below' : 'above'
  const y = placement === 'above' ? aboveY : dot.y + gap
  const maxX = Math.max(pad, box.viewWidth - box.width - pad)
  const x = Math.min(Math.max(dot.x - box.width / 2, pad), maxX)
  return { x: round(x), y: round(y), placement }
}
