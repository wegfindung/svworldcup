import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

vi.mock('../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../lib/api')>('../lib/api')
  return {
    ...actual, // keep the real ApiError so the 404 -> 'unavailable' instanceof check works
    fetchRookieLeaderboard: vi.fn(),
    fetchVeteranLeaderboard: vi.fn(),
    fetchNationLeaderboard: vi.fn(),
    fetchNationParticipation: vi.fn(),
    fetchFixtures: vi.fn(),
    fetchMatchResults: vi.fn(),
    fetchSquadUsage: vi.fn(),
  }
})

import { ApiError, fetchFixtures, fetchMatchResults, fetchNationLeaderboard, fetchNationParticipation, fetchRookieLeaderboard, fetchSquadUsage, fetchVeteranLeaderboard } from '../lib/api'
import type { ParticipantScoreRow } from '../lib/types'
import { TablesPage } from './TablesPage'

const rookie = vi.mocked(fetchRookieLeaderboard)
const veteran = vi.mocked(fetchVeteranLeaderboard)
const nation = vi.mocked(fetchNationLeaderboard)
const participation = vi.mocked(fetchNationParticipation)
const fixtures = vi.mocked(fetchFixtures)
const matchResults = vi.mocked(fetchMatchResults)
const squadUsage = vi.mocked(fetchSquadUsage)

// The squad-survival badge fetches match results + squad usage; default them to empty so the badge is
// simply absent and the existing board/search assertions are unaffected.
beforeEach(() => {
  matchResults.mockResolvedValue({ items: [], summary: { totalFixtures: 0, finalFixtures: 0, pendingFixtures: 0 } })
  squadUsage.mockResolvedValue({
    summary: { visibleSquadCount: 0, visibleManagerCount: 0, totalSelections: 0, uniquePlayerCount: 0, averageSelectionsPerPlayer: 0 },
    items: [],
  })
})

function participantRow(input: { participantId: string; displayName: string; primaryTeamCode: string }): ParticipantScoreRow {
  return {
    participantId: input.participantId,
    displayName: input.displayName,
    leagueType: 'rookie',
    primaryTeamCode: input.primaryTeamCode,
    totalScore: 0,
    baseScore: 0,
    bonusPercent: 0,
    scoreMultiplier: 1,
    breakdown: {
      goals: { count: 0, points: 0 },
      assists: { count: 0, points: 0 },
      appearances: { count: 0, points: 0 },
      minutes: { count: 0, points: 0 },
      cleanSheets: { count: 0, points: 0 },
      performance: { points: 0 },
    },
    fixtures: [],
    rank: 1,
  }
}

describe('TablesPage partial loading', () => {
  it('renders the boards that succeeded and an error only for the one that failed', async () => {
    rookie.mockResolvedValue({ items: [] })
    nation.mockResolvedValue({ items: [] })
    participation.mockResolvedValue({ items: [] })
    fixtures.mockResolvedValue({ items: [] })
    veteran.mockRejectedValue(new Error('network'))

    render(<TablesPage locale="en" />)

    // Rookie + Nation boards render despite the veteran fetch failing (no all-or-nothing drop).
    expect(await screen.findByText('Rookie')).toBeInTheDocument()
    expect(screen.getByText('Nation ranking')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: /Veteran/i }))
    // The failed veteran board shows its own load error.
    expect(screen.getByText('Could not load standings')).toBeInTheDocument()
  })

  it('maps a 404 to the "no standings yet" message for that board only', async () => {
    rookie.mockResolvedValue({ items: [] })
    veteran.mockResolvedValue({ items: [] })
    participation.mockResolvedValue({ items: [] })
    fixtures.mockResolvedValue({ items: [] })
    nation.mockRejectedValue(new ApiError('not found', null, 404))

    render(<TablesPage locale="en" />)

    expect(await screen.findByText('No standings yet')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Rookie/i })).toBeInTheDocument()
  })

  it('renders standings without waiting for an optional survival request', async () => {
    rookie.mockResolvedValue({ items: [] })
    veteran.mockResolvedValue({ items: [] })
    nation.mockResolvedValue({ items: [] })
    participation.mockResolvedValue({ items: [] })
    fixtures.mockResolvedValue({ items: [] })
    squadUsage.mockReturnValue(new Promise(() => {}))

    render(<TablesPage locale="en" />)

    expect(await screen.findByText('Nation ranking')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Rookie/i })).toBeInTheDocument()
  })

  it('filters participant rows by manager search', async () => {
    rookie.mockResolvedValue({
      items: [
        participantRow({ participantId: '11111111-1111-4111-8111-111111111111', displayName: 'Alice Manager', primaryTeamCode: 'FRA' }),
        participantRow({ participantId: '22222222-2222-4222-8222-222222222222', displayName: 'Bob Builder', primaryTeamCode: 'BRA' }),
      ],
    })
    veteran.mockResolvedValue({ items: [] })
    nation.mockResolvedValue({ items: [] })
    participation.mockResolvedValue({ items: [] })
    fixtures.mockResolvedValue({ items: [] })

    render(<TablesPage locale="en" />)

    fireEvent.click(await screen.findByRole('tab', { name: /Rookie/i }))
    expect(screen.getByText('Alice Manager')).toBeInTheDocument()
    expect(screen.getByText('Bob Builder')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Search standings'), { target: { value: 'alice' } })

    expect(screen.getByText('Alice Manager')).toBeInTheDocument()
    expect(screen.queryByText('Bob Builder')).not.toBeInTheDocument()
  })
})
