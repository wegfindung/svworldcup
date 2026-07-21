import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ParticipantProfile } from '../lib/types'

vi.mock('../lib/api', () => ({ fetchParticipantSession: vi.fn() }))
vi.mock('../components/PrizeClaimPanel', () => ({
  PrizeClaimPanel: ({ participant }: { participant: ParticipantProfile }) => (
    <div data-testid="prize-claim-panel">{participant.displayName}</div>
  ),
}))

import { fetchParticipantSession } from '../lib/api'
import { WinnersPage } from './WinnersPage'

const mockFetchParticipantSession = vi.mocked(fetchParticipantSession)

const gira: ParticipantProfile = {
  participantId: '97f0c09d-05ee-4c81-a43f-5e40619e6863',
  email: 'gira@example.invalid',
  displayName: 'Gira',
  marketingOptIn: true,
  leagueType: 'rookie',
  primaryTeamCode: 'AR',
  status: 'active',
  hasPassword: true,
}

const winnerCsv = [
  'display_name,total_svv,veteran_svv,rookie_svv,nations_svv',
  '"Gira","60","0","50","10"',
  '"Tpotsza","60","0","50","10"',
].join('\n')

describe('WinnersPage prize claim', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(winnerCsv),
    }))
  })

  it('shows the private claim controls for the logged-in winner', async () => {
    mockFetchParticipantSession.mockResolvedValue({
      participant: gira,
      budgetLimit: 1000,
      squadSummary: { budgetLimit: 1000, scoreMultiplier: 1, budgetUsed: 940, budgetRemaining: 60, draftedCount: 15, isLocked: true },
    })

    render(<WinnersPage locale="de" />)

    expect(await screen.findByTestId('prize-claim-panel')).toHaveTextContent('Gira')
  })

  it('does not show claim controls to a participant outside the winners list', async () => {
    mockFetchParticipantSession.mockResolvedValue({
      participant: { ...gira, participantId: 'not-a-winner', displayName: 'Reserve Manager' },
      budgetLimit: 1000,
      squadSummary: { budgetLimit: 1000, scoreMultiplier: 1, budgetUsed: 940, budgetRemaining: 60, draftedCount: 15, isLocked: true },
    })

    render(<WinnersPage locale="de" />)

    expect(await screen.findByText('Gira')).toBeInTheDocument()
    expect(screen.queryByTestId('prize-claim-panel')).not.toBeInTheDocument()
  })
})
