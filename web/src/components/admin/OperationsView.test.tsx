import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../lib/api', () => ({
  fetchAdminOverview: vi.fn(),
  fetchAdminAuditLogs: vi.fn(),
  fetchAdminOperationEvents: vi.fn(),
  fetchEmailCampaigns: vi.fn(),
  fetchMatchImportBatches: vi.fn(),
}))

import {
  fetchAdminAuditLogs,
  fetchAdminOperationEvents,
  fetchAdminOverview,
  fetchEmailCampaigns,
  fetchMatchImportBatches,
} from '../../lib/api'
import type { AdminOverview } from '../../lib/types'
import { OperationsView } from './OperationsView'

const overview = vi.mocked(fetchAdminOverview)
const audit = vi.mocked(fetchAdminAuditLogs)
const events = vi.mocked(fetchAdminOperationEvents)
const campaigns = vi.mocked(fetchEmailCampaigns)
const batches = vi.mocked(fetchMatchImportBatches)

const overviewFixture = {
  counts: { active: 10, pending: 2 },
  scoringLocked: false,
  eventControls: { globalRevealProfiles: false, globalRevealSquads: false },
  teamSelectionCounts: { ARG: 4 },
} as unknown as AdminOverview

describe('OperationsView partial loading', () => {
  it('renders the sources that loaded and flags only the one that failed', async () => {
    overview.mockResolvedValue(overviewFixture)
    audit.mockResolvedValue({ items: [] })
    events.mockResolvedValue({ items: [] })
    batches.mockResolvedValue({ items: [] })
    campaigns.mockRejectedValue(new Error('boom'))

    render(<OperationsView />)

    // A section whose source loaded still renders.
    expect(await screen.findByText('Latest writes.')).toBeInTheDocument()
    // The banner names only the failed source.
    expect(screen.getByText(/Could not load: email campaigns/)).toBeInTheDocument()
    // The failed source's section is omitted rather than dropping the whole view.
    expect(screen.queryByText('email scheduler')).not.toBeInTheDocument()
  })

  it('shows from→to detail for a correction audit row', async () => {
    overview.mockResolvedValue(overviewFixture)
    audit.mockResolvedValue({
      items: [
        {
          auditId: 'a1',
          actorEmail: 'admin@example.com',
          actionKey: 'admin.participant_nation_correction',
          entityType: 'participant',
          entityId: 'p1',
          detail: { primaryFrom: 'fra', primaryTo: 'swe', secondaryFrom: null, secondaryTo: 'bra' },
          createdAt: '2026-06-03T10:00:00.000Z',
        },
      ],
    })
    events.mockResolvedValue({ items: [] })
    batches.mockResolvedValue({ items: [] })
    campaigns.mockResolvedValue({ items: [] })

    render(<OperationsView />)

    expect(await screen.findByText('primary: fra → swe')).toBeInTheDocument()
    expect(screen.getByText('secondary: — → bra')).toBeInTheDocument()
  })
})
