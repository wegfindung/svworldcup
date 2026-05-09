# SOP Registration And Auth

## Goal

Allow participants to register securely with verified email, enter the squad builder only after confirmation, and support a protected admin backend with email/password access.

## Participant Registration Flow

1. User clicks the primary CTA and enters the registration workflow.
2. UI must show `No multi-accounting allowed.` before the form.
3. User must choose one of exactly two paths:
- `I have no Soccerverse account`
- `I have at least 1 Soccerverse account`
4. If the user has no Soccerverse account:
- assign `rookie`
- keep `soccerverseUsername` empty
5. If the user has at least one Soccerverse account:
- assign `veteran`
- require a main `soccerverseUsername`
6. User submits:
- `displayName`
- `email`
- `primaryTeamCode`
- optional `secondaryTeamCode`
- optional `soccerverseUsername` based on league path
7. Backend stores a pending registration with a one-time verification token and expiry.
8. Verification email is sent through SMTP.
9. User confirms via emailed link.
10. Verification activates the participant account and creates a participant session.
11. The verified participant enters the squad builder with the starting wage budget.
12. Frontend verification must be confirmed by an explicit user action on the verification screen, not by an automatic request on page load.

## Participant Session Rules

- Verified email is mandatory for participant sessions.
- One active registration per normalized email address.
- Participant sessions must be cookie-based, httpOnly, server-issued, and revocable.
- Verification link consumption must also establish the participant session.
- Session recovery from the frontend must start from an explicit user action such as `Open my squad`.
- Squad mutations are blocked after tournament lock.
- Hidden squads remain private until self-reveal or global kickoff reveal.
- A participant may request a fresh email link if they are pending verification or need to re-enter on another device.

## Squad Builder Flow

1. Builder access is blocked until the participant session exists.
2. Builder starts with a team dropdown showing:
- round local-hosted team flag
- English team name
3. Player selection uses the admin-curated World Cup team pool, not arbitrary public search.
4. Player cards must show:
- portrait
- display name
- rating
- cap cost
- position eligibility
5. A player can be assigned only into an open eligible slot.
6. Builder must support:
- remove one drafted player
- reset the full squad after an explicit warning
- live remaining budget display
- slot-by-slot formation state
 - explicit `load team pool` action before player data is requested
7. The builder must never rely on client-only validation for cap or slot legality.

## Admin Auth Rules

- Admins authenticate with email and password.
- Admin accounts come from a server-side allowlist and/or admin database table.
- All admin routes require authenticated admin sessions.
- Admin sessions must be cookie-based, httpOnly, server-issued, and revocable.
- Admins can resend verification mail.
- Admins can change scoring parameters only before World Cup kickoff.
- Admins must be able to maintain the preselected player pool for all 48 World Cup teams before public drafting opens.
- Admin team-pool reads must start from explicit operator actions, not automatic page-load fetches.

## Protected Routes

- `POST /api/auth/register`
- `POST /api/auth/resend-verification`
- `GET /api/auth/verify`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/participant/squad`
- `POST /api/participant/squad/assign`
- `DELETE /api/participant/squad/slots/:slotKey`
- `POST /api/participant/squad/reset`
- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET /api/admin/session`
- `POST /api/admin/*`

## Validation Rules

- `email` must be normalized and syntactically valid.
- `displayName` must be length-limited and trimmed.
- `soccerverseUsername` is required for veteran registrations and empty for rookies.
- `primaryCountryCode` is required.
- `secondaryCountryCode` is optional.
- `primaryCountryCode` and `secondaryCountryCode` must refer to seeded team/country records.
- `slotKey` must map to one canonical builder slot.
- player assignment must fail when:
- the slot is filled
- the player is already drafted
- the player is not in the preselected pool for that team
- the player is not eligible for the slot class
- the player would push `budgetUsed` above `budgetLimit`
- admin login must reject users not in the allowlist or not marked active.

## Edge Cases

- Re-registering an already verified email should not create duplicates.
- Resend should be rate limited.
- Expired verification tokens must be replaced, not reused.
- A user can be public in multiple tables while still hiding squad details.
- An admin password must never be returned from any endpoint.
- Preselected team pools may be incomplete during setup and must produce explicit empty states in the builder.
