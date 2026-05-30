import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { PublicParticipantProfile, TeamPoolPlayer } from '../lib/types'

vi.mock('../lib/api', () => ({ fetchPublicProfile: vi.fn() }))
import { fetchPublicProfile } from '../lib/api'
import { ProfilePage } from './ProfilePage'

const mockFetch = vi.mocked(fetchPublicProfile)

// A player whose `positions` is missing at runtime — violates the compile-time TeamPoolPlayer type,
// which is exactly the malformed-payload case the ProfilePage guard defends against. Cast through
// unknown so the test can model the bad shape without weakening the production types.
const playerWithoutPositions = {
  teamCode: 'BRA',
  playerId: 1,
  displayName: 'No Positions',
  nationalityCode: 'BRA',
  rating: 80,
  capCost: 1000,
  positionClasses: ['GK'],
  imageUrl: '',
} as unknown as TeamPoolPlayer

const profile: PublicParticipantProfile = {
  slug: 'demo',
  participantId: 'p-1',
  displayName: 'Demo Manager',
  leagueType: 'rookie',
  primaryTeamCode: 'BRA',
  revealProfile: true,
  revealSquad: true,
  squad: {
    squadId: 's-1',
    participantId: 'p-1',
    budgetLimit: 1000,
    scoreMultiplier: 1,
    budgetUsed: 1000,
    budgetRemaining: 0,
    isLocked: true,
    lockedAt: '2026-01-01T00:00:00.000Z',
    slots: [
      { key: 'gk1', slotGroup: 'starter', slotClass: 'GK', order: 0, label: 'GK', player: playerWithoutPositions },
    ],
  },
}

function renderProfile(slug = 'demo') {
  return render(
    <MemoryRouter initialEntries={[`/profiles/${slug}`]}>
      <Routes>
        <Route path="/profiles/:slug" element={<ProfilePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProfilePage partial payload', () => {
  it('renders a revealed squad whose player has no positions without throwing', async () => {
    mockFetch.mockResolvedValue({ item: profile })

    renderProfile()
    expect(await screen.findByText('No Positions')).toBeInTheDocument()
  })
})
