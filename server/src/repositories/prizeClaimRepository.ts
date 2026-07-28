import type { Pool } from 'pg'
import { isPhysicalPrizeWinner } from '../data/physicalPrizeWinners.js'
import { canCorrectPrizeSoccerverseUsername } from '../data/prizeUsernameCorrections.js'
import type { PrizeClaimStatus, ShippingAddressInput } from '../domain/types.js'

export class PrizeClaimEligibilityError extends Error {}

export interface PrizeClaimRepository {
  storageKind: 'memory' | 'postgres'
  getStatus(participantId: string): Promise<PrizeClaimStatus>
  saveShippingAddress(participantId: string, input: ShippingAddressInput): Promise<PrizeClaimStatus>
}

function assertEligible(participantId: string) {
  if (!isPhysicalPrizeWinner(participantId)) {
    throw new PrizeClaimEligibilityError('This participant is not eligible for a physical prize.')
  }
}

export class MemoryPrizeClaimRepository implements PrizeClaimRepository {
  storageKind: 'memory' = 'memory'
  private readonly addresses = new Map<string, PrizeClaimStatus>()

  constructor(private readonly correctionEligibleIds?: ReadonlySet<string>) {}

  private canCorrectUsername(participantId: string) {
    return this.correctionEligibleIds?.has(participantId) ?? canCorrectPrizeSoccerverseUsername(participantId)
  }

  async getStatus(participantId: string): Promise<PrizeClaimStatus> {
    const usernameCorrectionEligible = this.canCorrectUsername(participantId)
    if (!isPhysicalPrizeWinner(participantId)) {
      return {
        physicalPrizeEligible: false,
        soccerverseUsernameCorrectionEligible: usernameCorrectionEligible,
      }
    }
    return this.addresses.get(participantId) ?? {
      physicalPrizeEligible: true,
      soccerverseUsernameCorrectionEligible: usernameCorrectionEligible,
    }
  }

  async saveShippingAddress(participantId: string, input: ShippingAddressInput): Promise<PrizeClaimStatus> {
    assertEligible(participantId)
    const status = {
      physicalPrizeEligible: true,
      soccerverseUsernameCorrectionEligible: this.canCorrectUsername(participantId),
      shippingAddress: input,
      shippingUpdatedAt: new Date().toISOString(),
    }
    this.addresses.set(participantId, status)
    return status
  }
}

export class PostgresPrizeClaimRepository implements PrizeClaimRepository {
  storageKind: 'postgres' = 'postgres'
  constructor(private readonly pool: Pool) {}

  async getStatus(participantId: string): Promise<PrizeClaimStatus> {
    const soccerverseUsernameCorrectionEligible = canCorrectPrizeSoccerverseUsername(participantId)
    if (!isPhysicalPrizeWinner(participantId)) {
      return { physicalPrizeEligible: false, soccerverseUsernameCorrectionEligible }
    }
    const result = await this.pool.query<{
      recipient_name: string
      address_line1: string
      address_line2: string | null
      postal_code: string
      city: string
      region: string | null
      country_code: string
      updated_at: Date
    }>(
      `SELECT recipient_name, address_line1, address_line2, postal_code, city, region, country_code, updated_at
       FROM participant_shipping_addresses WHERE participant_id = $1`,
      [participantId],
    )
    const row = result.rows[0]
    if (!row) return { physicalPrizeEligible: true, soccerverseUsernameCorrectionEligible }
    return {
      physicalPrizeEligible: true,
      soccerverseUsernameCorrectionEligible,
      shippingAddress: {
        recipientName: row.recipient_name,
        addressLine1: row.address_line1,
        addressLine2: row.address_line2 ?? undefined,
        postalCode: row.postal_code,
        city: row.city,
        region: row.region ?? undefined,
        countryCode: row.country_code,
      },
      shippingUpdatedAt: row.updated_at.toISOString(),
    }
  }

  async saveShippingAddress(participantId: string, input: ShippingAddressInput): Promise<PrizeClaimStatus> {
    assertEligible(participantId)
    await this.pool.query(
      `INSERT INTO participant_shipping_addresses
         (participant_id, recipient_name, address_line1, address_line2, postal_code, city, region, country_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (participant_id) DO UPDATE SET
         recipient_name = EXCLUDED.recipient_name,
         address_line1 = EXCLUDED.address_line1,
         address_line2 = EXCLUDED.address_line2,
         postal_code = EXCLUDED.postal_code,
         city = EXCLUDED.city,
         region = EXCLUDED.region,
         country_code = EXCLUDED.country_code,
         updated_at = NOW()`,
      [participantId, input.recipientName, input.addressLine1, input.addressLine2 || null, input.postalCode, input.city, input.region || null, input.countryCode],
    )
    return this.getStatus(participantId)
  }
}
