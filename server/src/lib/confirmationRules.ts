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

// D5/D7: any distinct admin may confirm, except the most recent editor of the current
// state, and no admin may confirm the same data version twice.
export function canConfirm(batch: PendingMatchBatch, adminEmail: string): ConfirmCheck {
  if (batch.lastEditedBy && batch.lastEditedBy === adminEmail) {
    return { allowed: false, reason: 'The most recent editor of a batch cannot confirm it.' }
  }
  if (validConfirmerEmails(batch).includes(adminEmail)) {
    return { allowed: false, reason: 'This admin has already confirmed the current data version.' }
  }
  return { allowed: true }
}

// Promotion requires two distinct admin confirmations on the current data version (D4/D5).
export function isPromotable(batch: PendingMatchBatch): boolean {
  return validConfirmerEmails(batch).length >= 2
}
