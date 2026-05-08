# SOP Registration And Auth

## Goal

Allow participants to register securely with verified email and support a protected multi-admin backend.

## Participant Registration Flow

1. User submits email, display name, registration country, optional secondary country, and optional Soccerverse username.
2. Backend determines league type:
- if `soccerverseUsername` is present, assign `veteran`
- otherwise assign `rookie`
3. Backend stores a pending registration with a one-time verification token and expiry.
4. Verification email is sent through SMTP.
5. User confirms via emailed link.
6. Registration becomes active and the user can maintain one draft squad until lock.

## Participant Session Rules

- Verified email is mandatory for participant sessions.
- One active registration per normalized email address.
- Squad mutations are blocked after tournament lock.
- Hidden squads remain private until self-reveal or global kickoff reveal.

## Admin Auth Rules

- Admin accounts come from a server-side allowlist and/or admin database table.
- All admin routes require authenticated admin sessions.
- Admins can resend verification mail.
- Admins can change scoring parameters only before World Cup kickoff.

## Protected Routes

- `POST /api/auth/register`
- `POST /api/auth/resend-verification`
- `GET /api/auth/verify`
- `POST /api/squads`
- `PUT /api/squads/:id`
- `POST /api/admin/*`

## Validation Rules

- `email` must be normalized and syntactically valid.
- `displayName` must be length-limited and trimmed.
- `soccerverseUsername` is required for veteran registrations and empty for rookies.
- `primaryCountryCode` is required.
- `secondaryCountryCode` is optional.
- `primaryCountryCode` and `secondaryCountryCode` must refer to seeded team/country records.

## Edge Cases

- Re-registering an already verified email should not create duplicates.
- Resend should be rate limited.
- Expired verification tokens must be replaced, not reused.
- A user can be public in multiple tables while still hiding squad details.
