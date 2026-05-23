const disposableDomains = new Set([
  '10minutemail.com',
  '10minutemail.net',
  '20minutemail.com',
  'anonbox.net',
  'dispostable.com',
  'emailondeck.com',
  'fakeinbox.com',
  'getnada.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'maildrop.cc',
  'mailinator.com',
  'mintemail.com',
  'moakt.com',
  'mytemp.email',
  'sharklasers.com',
  'tempmail.com',
  'temp-mail.org',
  'throwawaymail.com',
  'trashmail.com',
  'yopmail.com',
])

export function isDisposableEmailDomain(domain: string) {
  return disposableDomains.has(domain.trim().toLowerCase())
}
