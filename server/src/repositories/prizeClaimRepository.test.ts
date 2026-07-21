import { describe, expect, it } from 'vitest'
import { MemoryPrizeClaimRepository, PrizeClaimEligibilityError } from './prizeClaimRepository.js'

const veteranWinnerId = 'a2d003e0-7651-4783-adc2-2c2ad59716b7'
const ineligibleId = '00000000-0000-4000-8000-000000000000'

describe('MemoryPrizeClaimRepository', () => {
  it('allows an eligible top-three winner to save and update a private shipping address', async () => {
    const repository = new MemoryPrizeClaimRepository()
    expect(await repository.getStatus(veteranWinnerId)).toEqual({ physicalPrizeEligible: true })

    const saved = await repository.saveShippingAddress(veteranWinnerId, {
      recipientName: 'Prize Winner',
      addressLine1: 'Example Street 12',
      postalCode: '10115',
      city: 'Berlin',
      countryCode: 'DE',
    })

    expect(saved).toMatchObject({
      physicalPrizeEligible: true,
      shippingAddress: { recipientName: 'Prize Winner', countryCode: 'DE' },
    })
    expect(saved.shippingUpdatedAt).toBeTruthy()
  })

  it('does not disclose or accept shipping data for an ineligible participant', async () => {
    const repository = new MemoryPrizeClaimRepository()
    expect(await repository.getStatus(ineligibleId)).toEqual({ physicalPrizeEligible: false })

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
})
