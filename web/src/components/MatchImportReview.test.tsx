import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../lib/api', () => ({
  confirmMatchImportBatch: vi.fn(),
  discardMatchImportBatch: vi.fn(),
  editMatchImportRow: vi.fn(),
  fetchTeamSelections: vi.fn(),
  resolveMatchImportRow: vi.fn(),
}))

import { fetchTeamSelections } from '../lib/api'
import type { PendingMatchBatch, TeamPoolPlayer, TeamSeed } from '../lib/types'
import { MatchImportReview } from './MatchImportReview'

const teamSelections = vi.mocked(fetchTeamSelections)

const homeTeam: TeamSeed = { code: 'ARG', slug: 'argentina', nameEn: 'Argentina', groupKey: 'A' }
const awayTeam: TeamSeed = { code: 'BRA', slug: 'brazil', nameEn: 'Brazil', groupKey: 'A' }

const homeStar = { playerId: 101, displayName: 'Home Star', imageUrl: '' } as unknown as TeamPoolPlayer

const batch = {
  batchId: 'b1',
  fixtureId: 'f1',
  sourceUrl: 'https://example.com/match',
  homeGoals: 1,
  awayGoals: 0,
  dataVersion: 1,
  createdBy: 'uploader@example.com',
  createdAt: '2026-05-30T00:00:00.000Z',
  updatedAt: '2026-05-30T00:00:00.000Z',
  rows: [
    { rowId: 'r1', batchId: 'b1', sourceName: 'H. Star', teamCode: 'ARG', playerId: 101, lineupStatus: 'starter', minutes: 90, goals: 1, assists: 0, cleanSheetEligible: false },
    { rowId: 'r2', batchId: 'b1', sourceName: 'A. Visitor', teamCode: 'BRA', playerId: 201, lineupStatus: 'starter', minutes: 90, goals: 0, assists: 0, cleanSheetEligible: false },
  ],
  confirmations: [],
} as unknown as PendingMatchBatch

function renderReview() {
  return render(
    <MatchImportReview
      batch={batch}
      homeTeam={homeTeam}
      awayTeam={awayTeam}
      adminEmail="admin@example.com"
      onBatchUpdated={vi.fn()}
      onBatchRemoved={vi.fn()}
      onClose={vi.fn()}
    />,
  )
}

describe('MatchImportReview partial pool loading', () => {
  it('keeps the loaded team pool applied even when the other team pool fails', async () => {
    teamSelections.mockImplementation((code: string) =>
      code === 'ARG' ? Promise.resolve({ items: [homeStar] }) : Promise.reject(new Error('boom')),
    )

    renderReview()

    // The home row resolves through the pool that loaded (→ display name, not "→ Player #101").
    expect(await screen.findByText('→ Home Star')).toBeInTheDocument()
    // The error names only the team whose pool failed, not a generic both-pools error.
    expect(screen.getByText(/Could not load the player pool for Brazil/)).toBeInTheDocument()
    expect(screen.queryByText(/Argentina —/)).not.toBeInTheDocument()
  })
})
