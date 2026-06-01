import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../lib/api', () => ({
  addMatchImportSkipName: vi.fn(),
  fetchTeamSelections: vi.fn(),
  removeMatchImportSkipName: vi.fn(),
}))

import { fetchTeamSelections } from '../lib/api'
import type { MatchResolution, TeamSeed } from '../lib/types'
import { MatchImportResolveStage } from './MatchImportResolveStage'

const teamSelections = vi.mocked(fetchTeamSelections)

const homeTeam: TeamSeed = { code: 'ARG', slug: 'argentina', nameEn: 'Argentina', groupKey: 'A' }
const awayTeam: TeamSeed = { code: 'BRA', slug: 'brazil', nameEn: 'Brazil', groupKey: 'A' }

const resolution = {
  fixtureId: 'f1',
  sourceUrl: 'https://example.com/match',
  homeGoals: 1,
  awayGoals: 0,
  skippedNames: [],
  rows: [
    { sourceName: 'H. Star', teamCode: 'ARG', lineupStatus: 'starter', minutes: 90, goals: 1, assists: 0, rating: 7, resolution: { status: 'resolved', playerId: 101 } },
    { sourceName: 'A. Visitor', teamCode: 'BRA', lineupStatus: 'starter', minutes: 90, goals: 0, assists: 0, rating: 7, resolution: { status: 'resolved', playerId: 201 } },
  ],
} as unknown as MatchResolution

describe('MatchImportResolveStage partial pool loading', () => {
  it('renders the rows and names only the team whose pool failed', async () => {
    teamSelections.mockImplementation((code: string) =>
      code === 'ARG' ? Promise.resolve({ items: [] }) : Promise.reject(new Error('boom')),
    )

    render(
      <MatchImportResolveStage
        resolution={resolution}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        busy={false}
        onSubmit={vi.fn()}
        onBack={vi.fn()}
      />,
    )

    // Rows render (the stage left the skeleton) despite one pool fetch failing.
    expect(await screen.findByText('H. Star')).toBeInTheDocument()
    // The pool error names only the failed team.
    expect(screen.getByText(/Could not load the player pool for Brazil/)).toBeInTheDocument()
  })
})
