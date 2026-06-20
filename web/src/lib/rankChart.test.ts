import { describe, expect, it } from 'vitest'
import { buildRankChartGeometry, buildRankTooltipLayout } from './rankChart'
import type { RankHistoryPoint } from './types'

const dims = { width: 560, height: 240 }

function points(...ranks: number[]): RankHistoryPoint[] {
  return ranks.map((rank, index) => ({ date: `2026-06-${String(11 + index).padStart(2, '0')}`, rank, score: 100 - rank }))
}

describe('buildRankChartGeometry', () => {
  it('inverts the Y axis so a better (smaller) rank sits higher on the chart', () => {
    const geo = buildRankChartGeometry(points(1, 5), dims)
    const [best, worst] = geo.dots
    expect(best.rank).toBe(1)
    expect(worst.rank).toBe(5)
    expect(best.y).toBeLessThan(worst.y)
  })

  it('lays points out left-to-right, evenly, starting with a move command', () => {
    const geo = buildRankChartGeometry(points(3, 2, 4, 1), dims)
    const xs = geo.dots.map((dot) => dot.x)
    for (let i = 1; i < xs.length; i += 1) {
      expect(xs[i]).toBeGreaterThan(xs[i - 1])
    }
    expect(geo.linePath.startsWith('M ')).toBe(true)
    expect(geo.dots[0].x).toBeCloseTo(geo.plot.left, 5)
    expect(geo.dots.at(-1)?.x).toBeCloseTo(geo.plot.right, 5)
  })

  it('centers a single point and exposes one y tick', () => {
    const geo = buildRankChartGeometry(points(7), dims)
    expect(geo.dots).toHaveLength(1)
    expect(geo.dots[0].x).toBeCloseTo((geo.plot.left + geo.plot.right) / 2, 5)
    expect(geo.yTicks).toHaveLength(1)
    expect(geo.yTicks[0].rank).toBe(7)
  })

  it('pads a flat series so the line does not hug the top or bottom edge', () => {
    const geo = buildRankChartGeometry(points(4, 4, 4), dims)
    expect(geo.bestRank).toBe(4)
    expect(geo.worstRank).toBe(4)
    for (const dot of geo.dots) {
      expect(dot.y).toBeGreaterThan(geo.plot.top)
      expect(dot.y).toBeLessThan(geo.plot.bottom)
    }
  })

  it('thins x ticks down to the requested maximum', () => {
    const geo = buildRankChartGeometry(points(1, 2, 3, 4, 5, 6, 7, 8, 9, 10), { ...dims, maxXTicks: 4 })
    expect(geo.xTicks.length).toBeLessThanOrEqual(4)
    expect(geo.dots).toHaveLength(10)
  })
})

describe('buildRankTooltipLayout', () => {
  const box = { width: 80, height: 22, viewWidth: 560 }

  it('sits above the dot and centres horizontally when there is room', () => {
    const tip = buildRankTooltipLayout({ x: 280, y: 120 }, box)
    expect(tip.placement).toBe('above')
    expect(tip.y).toBeLessThan(120)
    expect(tip.x + box.width / 2).toBeCloseTo(280, 5)
  })

  it('flips below the dot when sitting above would clip the top edge', () => {
    const tip = buildRankTooltipLayout({ x: 280, y: 6 }, box)
    expect(tip.placement).toBe('below')
    expect(tip.y).toBeGreaterThan(6)
  })

  it('clamps the box inside the viewBox on both edges', () => {
    const left = buildRankTooltipLayout({ x: 0, y: 120 }, box)
    expect(left.x).toBeGreaterThanOrEqual(2)
    const right = buildRankTooltipLayout({ x: 560, y: 120 }, box)
    expect(right.x + box.width).toBeLessThanOrEqual(560 - 2 + 0.001)
  })
})
