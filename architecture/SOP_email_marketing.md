# SOP Email Marketing

## Goal

Admin email marketing must support autoresponders, scheduled newsletters, drafts, and SMTP delivery without exceeding provider limits.

## All-Inkl.com SMTP Limits

- Send volume: All-Inkl.com's official SMTP limit is 1,000 emails per 10 minutes.
- Staggered sending: for larger mailings, All-Inkl support recommends sending 1,000 emails, pausing for 10 minutes, then sending the next 1,000.
- Hourly planning: this allows about 3,000 emails per hour only if the pauses are strictly observed.
- Connection limit: at most 3 simultaneous SMTP connections may be open. Sending more in parallel can cause the server to block delivery immediately.
- Delivery mode: newsletter jobs should send messages sequentially, preferably through one maintained SMTP connection.
- Limit scope: the restrictions apply per webhosting package / KAS user account.
- The limit is not per single email address or single domain. Multiple domains and mailboxes inside the same hosting package share the same limit.
- Splitting one newsletter across sender addresses in the same hosting package does not bypass the shared limit.

## Implementation Guardrails

- Newsletter audiences must only include participants with active marketing consent.
- Autoresponders must not queue for participants without active marketing consent.
- Every marketing email must include an unsubscribe URL; unsubscribed recipients are skipped before dispatch.
- Dispatch runs sequentially and records accepted deliveries in `email_delivery_log`.
- Runtime throttling must keep accepted deliveries below 95 per minute and 1,000 per 10 minutes. The lower per-minute guard gives the scheduler room to respect the official 10-minute limit without opening parallel SMTP connections.
