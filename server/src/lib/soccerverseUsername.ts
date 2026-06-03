// Shared Soccerverse-username validation so registration and account-linking validate identically
// (see SOP_registration_and_auth.md). The most frequent operator-observed mistake is entering an email
// address instead of the username, so any value containing `@` is rejected. No broader character
// allowlist is imposed — the full set of valid Soccerverse username characters is not authoritatively
// known here, so only the unambiguous email signal (`@`) is blocked, and the username's case is
// preserved (never canonicalized).

export const SOCCERVERSE_USERNAME_EMAIL_MESSAGE = 'Enter your Soccerverse username, not an email address.'

export function isEmailLikeUsername(value: string): boolean {
  return value.includes('@')
}
