import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../lib/api', () => ({ fetchParticipantBoost: vi.fn() }))
import { fetchParticipantBoost } from '../lib/api'
import { BoostPanel } from './BoostPanel'
import { getMessages } from '../i18n/messages'

const copy = getMessages('en').builder.boost
const mockFetch = vi.mocked(fetchParticipantBoost)

function renderPanel() {
  return render(<BoostPanel copy={copy} locale="en" />)
}

describe('BoostPanel', () => {
  it('loads on demand and shows per-player net + boost', async () => {
    mockFetch.mockResolvedValue({
      linked: true,
      computedAt: '2026-06-03T12:00:00.000Z',
      players: [
        { playerId: 1, displayName: 'Alpha', teamCode: 'SWE', imageUrl: '', bought: 120, sold: 20, net: 100, bonusPercent: 10 },
        { playerId: 2, displayName: 'Beta', teamCode: 'BRA', imageUrl: '', bought: 30, sold: 0, net: 30, bonusPercent: 3 },
      ],
    })

    renderPanel()
    // Does not fetch until the user asks for it.
    expect(mockFetch).not.toHaveBeenCalled()

    fireEvent.click(screen.getByText(copy.show))

    expect(await screen.findByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
    expect(screen.getByText('+10%')).toBeInTheDocument()
    expect(screen.getByText('+3%')).toBeInTheDocument()
    expect(mockFetch).toHaveBeenCalledWith(false)
  })

  it('shows the link prompt for an unlinked participant', async () => {
    mockFetch.mockResolvedValue({ linked: false })

    renderPanel()
    fireEvent.click(screen.getByText(copy.show))

    expect(await screen.findByText(copy.unlinkedTitle)).toBeInTheDocument()
  })

  it('surfaces an error with a retry that refetches', async () => {
    mockFetch.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({ linked: true, players: [] })

    renderPanel()
    fireEvent.click(screen.getByText(copy.show))

    expect(await screen.findByText(copy.error)).toBeInTheDocument()
    fireEvent.click(screen.getByText(copy.retry))
    expect(await screen.findByText(copy.empty)).toBeInTheDocument()
  })
})
