import type { PendingMatchBatch, PendingMatchConfirmation } from '../domain/types.js'

// D17: a confirmation only counts toward promotion if it was made on the batch's current
// data version. Any edit bumps data_version, so prior confirmations stop counting without
// being deleted — the history stays auditable.
export function countsTowardPromotion(
  confirmation: PendingMatchConfirmation,
  batch: PendingMatchBatch,
): boolean {
  return confirmation.dataVersion === batch.dataVersion
}

// Distinct admin emails whose confirmation matches the batch's current data version.
export function validConfirmerEmails(batch: PendingMatchBatch): string[] {
  const emails = new Set<string>()
  for (const confirmation of batch.confirmations) {
    if (countsTowardPromotion(confirmation, batch)) {
      emails.add(confirmation.adminEmail)
    }
  }
  return [...emails]
}

export interface ConfirmCheck {
  allowed: boolean
  reason?: string
}

// Any distinct admin may confirm, as long as they have not already confirmed the current
// data version. The most recent editor is not barred: submitting their edit already
// recorded their confirmation on the new version, so this same check stops them from
// double-counting — an edited batch still needs one other distinct admin to promote.
export function canConfirm(batch: PendingMatchBatch, adminEmail: string): ConfirmCheck {
  if (validConfirmerEmails(batch).includes(adminEmail)) {
    return { allowed: false, reason: 'This admin has already confirmed the current data version.' }
  }
  return { allowed: true }
}

// Promotion requires two distinct admin confirmations on the current data version (D4/D5).
export function isPromotable(batch: PendingMatchBatch): boolean {
  return validConfirmerEmails(batch).length >= 2
}
