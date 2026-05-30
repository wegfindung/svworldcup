import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../lib/api', () => ({
  fetchAdminOverview: vi.fn(),
  fetchMatchImportBatches: vi.fn(),
}))

import { fetchAdminOverview, fetchMatchImportBatches } from '../../lib/api'
import type { AdminOverview } from '../../lib/types'
import { DashboardLanding } from './DashboardLanding'

const overview = vi.mocked(fetchAdminOverview)
const batches = vi.mocked(fetchMatchImportBatches)

// Only the fields DashboardLanding actually reads — cast to keep the mock small.
const overviewFixture = {
  counts: { active: 12, pending: 3 },
  scoringLocked: false,
  teamSelectionCounts: { ARG: 4, BRA: 0 },
} as unknown as AdminOverview

function renderDashboard() {
  return render(
    <MemoryRouter>
      <DashboardLanding />
    </MemoryRouter>,
  )
}

describe('DashboardLanding partial loading', () => {
  it('renders overview cards and flags only the source that failed', async () => {
    overview.mockResolvedValue(overviewFixture)
    batches.mockRejectedValue(new Error('network'))

    renderDashboard()

    // The overview-driven card still renders despite the batches fetch failing.
    expect(await screen.findByText('12 active · 3 pending')).toBeInTheDocument()
    // The banner names only the failed source, not a whole-page error.
    expect(screen.getByText(/Could not load: pending imports/)).toBeInTheDocument()
  })

  it('shows no error banner when both sources load', async () => {
    overview.mockResolvedValue(overviewFixture)
    batches.mockResolvedValue({ items: [] })

    renderDashboard()

    expect(await screen.findByText('12 active · 3 pending')).toBeInTheDocument()
    expect(screen.queryByText(/Could not load/)).not.toBeInTheDocument()
  })
})
