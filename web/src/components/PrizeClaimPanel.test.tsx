import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ParticipantProfile } from '../lib/types'

vi.mock('../lib/api', () => ({
  fetchPrizeClaimStatus: vi.fn(),
  linkSoccerverseAccount: vi.fn(),
  savePrizeShippingAddress: vi.fn(),
  updatePrizeSoccerverseUsername: vi.fn(),
}))

import {
  fetchPrizeClaimStatus,
  linkSoccerverseAccount,
  updatePrizeSoccerverseUsername,
} from '../lib/api'
import { PrizeClaimPanel } from './PrizeClaimPanel'

const mockFetchPrizeClaimStatus = vi.mocked(fetchPrizeClaimStatus)
const mockLinkSoccerverseAccount = vi.mocked(linkSoccerverseAccount)
const mockUpdatePrizeSoccerverseUsername = vi.mocked(updatePrizeSoccerverseUsername)

const participant: ParticipantProfile = {
  participantId: 'fe3ec70b-89e5-483f-89ac-44763f4c49e3',
  email: 'winner@example.invalid',
  displayName: 'Lumipee',
  soccerverseUsername: 'lumipee',
  marketingOptIn: true,
  leagueType: 'rookie',
  primaryTeamCode: 'ARG',
  status: 'active',
  hasPassword: true,
}

describe('PrizeClaimPanel username correction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchPrizeClaimStatus.mockResolvedValue({
      claim: {
        physicalPrizeEligible: false,
        soccerverseUsernameCorrectionEligible: true,
      },
    })
  })

  it('shows the correction form in Spanish and saves a replacement username', async () => {
    const user = userEvent.setup()
    const onParticipantUpdate = vi.fn()
    mockUpdatePrizeSoccerverseUsername.mockResolvedValue({
      participant: { ...participant, soccerverseUsername: 'LumipeeSV' },
    })

    render(
      <PrizeClaimPanel
        locale="es"
        participant={participant}
        onParticipantUpdate={onParticipantUpdate}
      />,
    )

    expect(
      await screen.findByRole('heading', {
        name: 'Registra o corrige tu nombre de usuario de Soccerverse.',
      }),
    ).toBeInTheDocument()

    const input = screen.getByLabelText('Nombre de usuario de Soccerverse')
    expect(input).toHaveValue('lumipee')
    await user.clear(input)
    await user.type(input, 'LumipeeSV')
    await user.click(screen.getByRole('button', { name: 'Actualizar nombre' }))

    expect(mockUpdatePrizeSoccerverseUsername).toHaveBeenCalledWith('LumipeeSV')
    expect(mockLinkSoccerverseAccount).not.toHaveBeenCalled()
    expect(onParticipantUpdate).toHaveBeenCalledWith({
      ...participant,
      soccerverseUsername: 'LumipeeSV',
    })
    expect(
      await screen.findByText(
        'Tu nombre de usuario registrado de Soccerverse se ha actualizado para el pago.',
      ),
    ).toBeInTheDocument()
  })
})
