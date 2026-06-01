import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../lib/api')>('../lib/api')
  return {
    ...actual, // keep the real ApiError so the 404 -> 'unavailable' instanceof check works
    fetchRookieLeaderboard: vi.fn(),
    fetchVeteranLeaderboard: vi.fn(),
    fetchNationLeaderboard: vi.fn(),
    fetchNationParticipation: vi.fn(),
    fetchFixtures: vi.fn(),
  }
})

import { ApiError, fetchFixtures, fetchNationLeaderboard, fetchNationParticipation, fetchRookieLeaderboard, fetchVeteranLeaderboard } from '../lib/api'
import { TablesPage } from './TablesPage'

const rookie = vi.mocked(fetchRookieLeaderboard)
const veteran = vi.mocked(fetchVeteranLeaderboard)
const nation = vi.mocked(fetchNationLeaderboard)
const participation = vi.mocked(fetchNationParticipation)
const fixtures = vi.mocked(fetchFixtures)

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

    expect(await screen.findByRole('tab', { name: /Rookie/i })).toBeInTheDocument()
    expect(screen.getByText('No standings yet')).toBeInTheDocument()
  })
})
