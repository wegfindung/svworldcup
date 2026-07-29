import { describe, expect, it } from 'vitest'
import { MemoryPrizeClaimRepository, PrizeClaimEligibilityError } from './prizeClaimRepository.js'

const veteranWinnerId = 'a2d003e0-7651-4783-adc2-2c2ad59716b7'
const correctionWinnerId = 'fe3ec70b-89e5-483f-89ac-44763f4c49e3'
const ineligibleId = '00000000-0000-4000-8000-000000000000'

describe('MemoryPrizeClaimRepository', () => {
  it('allows an eligible top-three winner to save and update a private shipping address', async () => {
    const repository = new MemoryPrizeClaimRepository()
    expect(await repository.getStatus(veteranWinnerId)).toEqual({
      physicalPrizeEligible: true,
      soccerverseUsernameCorrectionEligible: false,
    })

    const saved = await repository.saveShippingAddress(veteranWinnerId, {
      recipientName: 'Prize Winner',
      addressLine1: 'Example Street 12',
      postalCode: '10115',
      city: 'Berlin',
      countryCode: 'DE',
    })

    expect(saved).toMatchObject({
      physicalPrizeEligible: true,
      soccerverseUsernameCorrectionEligible: false,
      shippingAddress: { recipientName: 'Prize Winner', countryCode: 'DE' },
    })
    expect(saved.shippingUpdatedAt).toBeTruthy()
  })

  it('does not disclose or accept shipping data for an ineligible participant', async () => {
    const repository = new MemoryPrizeClaimRepository()
    expect(await repository.getStatus(ineligibleId)).toEqual({
      physicalPrizeEligible: false,
      soccerverseUsernameCorrectionEligible: false,
    })

    await expect(
      repository.saveShippingAddress(ineligibleId, {
        recipientName: 'Not Eligible',
        addressLine1: 'Example Street 1',
        postalCode: '10115',
        city: 'Berlin',
        countryCode: 'DE',
      }),
    ).rejects.toBeInstanceOf(PrizeClaimEligibilityError)
  })

  it('marks only the configured payout winners as eligible to correct a stored username', async () => {
    const repository = new MemoryPrizeClaimRepository()

    expect(await repository.getStatus(correctionWinnerId)).toEqual({
      physicalPrizeEligible: false,
      soccerverseUsernameCorrectionEligible: true,
    })
    expect(await repository.getStatus(ineligibleId)).toEqual({
      physicalPrizeEligible: false,
      soccerverseUsernameCorrectionEligible: false,
    })
  })
})
