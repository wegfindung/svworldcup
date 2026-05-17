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
- optional `referrerSoccerverseUsername` from the landing page `ref` campaign parameter
7. Backend stores a pending registration with a one-time verification token and expiry.
8. Verification email is sent through SMTP.
9. User confirms via emailed link.
10. Verification activates the participant account and creates a participant session.
11. The verified participant lands in a local dashboard shell with the starting wage budget.
12. The dashboard must expose an explicit primary CTA such as `Start building my squad`.
13. The protected squad/session payload is only requested after that CTA is pressed.
14. Frontend verification must be confirmed by an explicit user action on the verification screen, not by an automatic request on page load.
15. After verification, participants must be able to set a password for future sign-in.
16. Returning participants must be able to log in with `email + password` from an explicit submit action.
17. Password recovery must send a reset link only after an explicit button press.

## Participant Session Rules

- Verified email is mandatory for participant sessions.
- One active registration per normalized email address.
- A landing page `ref` parameter must survive navigation before registration via URL propagation and session storage.
- The referral value must be stored separately as `referrerSoccerverseUsername` / `referrer_soccerverse_username`; it must not change rookie/veteran classification and must not overwrite the participant's own `soccerverseUsername`.
- Participant sessions must be cookie-based, httpOnly, server-issued, and revocable.
- Verification link consumption must also establish the participant session.
- Post-verification builder recovery from the frontend must start from an explicit user action such as `Start building my squad`.
- Password login is optional at first verification and can be added from the verified dashboard.
- Password reset tokens must be one-time, expiring, and not reusable after consumption.
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

## Account Linking and League Membership

A participant's Soccerverse account link and their public league membership are independent
properties. Linking a Soccerverse account does not change a participant's league. Moving a
participant between Rookie and Veteran public-table membership is an admin-mediated action.

### Linking a Soccerverse account (participant-initiated)

- A `rookie` participant may, after registration, link a Soccerverse main account via an
  explicit, authenticated request: `POST /api/participant/link-soccerverse` with
  `{ soccerverseUsername }`.
- Linking sets `soccerverse_username` and stamps `soccerverse_linked_at` to the moment of
  linking. It does **not** modify `league_type`. A Rookie who links stays in the Rookie
  league and continues competing for the Rookie prize pool.
- A participant who already has a `soccerverse_username` (whether they registered as Veteran
  or linked earlier) cannot re-link; the endpoint rejects with `reason: 'already_linked'`.
- The submitted `soccerverseUsername` is validated identically to initial registration
  (trim, allowed characters, length, server-side uniqueness across all participants).
- Uniqueness applies to all participants regardless of league — the same Soccerverse account
  cannot back two participant rows.
- The write is audited as `participant.link_soccerverse`.

### Moving a participant between leagues (admin-initiated)

- An admin may move any participant between `rookie` and `veteran` league membership via
  `POST /api/admin/participants/:id/league` with `{ leagueType }`.
- The participant must have a `soccerverse_username` set before being moved to `veteran`
  (you can't be a Veteran without a linked Soccerverse account). The endpoint rejects with
  `reason: 'requires_soccerverse_username'` if the precondition is not met.
- Moving has no retroactive effect on existing scoring rows; what changes is the
  participant's league table membership going forward, and their eligibility for the
  Soccerverse ownership boost.
- The write is audited as `admin.participant_league_change` with `detail: {from, to}`.

### Boost eligibility

- The Soccerverse ownership boost applies to **any participant with `soccerverse_username
  IS NOT NULL`**, regardless of `league_type`. A linked Rookie earns the boost on the same
  terms as a Veteran; only their leaderboard placement differs (Rookie table vs Veteran
  table). League membership and boost eligibility are now independent concerns.
- An unlinked Rookie earns no boost (no `soccerverse_username` → no snapshot row → 
  `bonusPercent = 0`).
- The boost engine reads `MAX(created_at, soccerverse_linked_at)` to scope the trade-history
  window for participants who linked late. See `SOP_scoring_and_leagues.md` "Ownership
  boost" for the full computation.

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
- `POST /api/auth/login`
- `POST /api/auth/set-password`
- `POST /api/auth/request-password-reset`
- `POST /api/auth/reset-password`
- `POST /api/auth/logout`
- `GET /api/participant/squad`
- `POST /api/participant/squad/assign`
- `DELETE /api/participant/squad/slots/:slotKey`
- `POST /api/participant/squad/reset`
- `POST /api/participant/link-soccerverse`
- `POST /api/admin/participants/:id/league`
- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET /api/admin/session`
- `POST /api/admin/*`

## Validation Rules

- `email` must be normalized and syntactically valid.
- `displayName` must be length-limited and trimmed.
- `soccerverseUsername` is required for veteran registrations and empty for rookies.
- `referrerSoccerverseUsername` is optional, trimmed, safe-character filtered, and length-limited to 60 characters.
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
