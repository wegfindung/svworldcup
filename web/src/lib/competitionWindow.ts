// Mirror of the server's competitionWindow.ts so the closed-state UI shows at exactly the same
// instant the API begins refusing register / verify / squad-edit calls. Backend stays the
// source of truth — every gate that matters is enforced server-side; this is purely so the
// UI doesn't surface a raw 403. Defaults to the same hardcoded epoch (2026-07-04T00:00:00Z);
// when bootstrap is available, prefer its value so REGISTRATION_CLOSE_AT env overrides flow
// through to the client too.
export const DEFAULT_REGISTRATION_CLOSE_EPOCH = 1_783_123_200_000

export function resolveRegistrationCloseEpoch(bootstrapEpoch: number | undefined | null): number {
  if (typeof bootstrapEpoch === 'number' && Number.isFinite(bootstrapEpoch)) {
    return bootstrapEpoch
  }
  return DEFAULT_REGISTRATION_CLOSE_EPOCH
}

export function hasRegistrationClosed(closeEpoch: number, now: number = Date.now()): boolean {
  return now >= closeEpoch
}
