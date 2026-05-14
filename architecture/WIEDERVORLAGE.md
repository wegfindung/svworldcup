# Wiedervorlage

## Implemented on 2026-05-14

These items were identified during the share, referral, and email-marketing review and have been implemented.

1. Public share snapshots are signed server-side. The participant API now validates the active account, locked squad, and featured-player ownership before returning signed public preview and card URLs. Public snapshot/card routes reject missing or manipulated signatures.
2. Authenticated write routes now use cookie-bound CSRF tokens in addition to SameSite cookies. Admin and participant sessions receive scoped CSRF tokens, and unsafe API requests send them through `x-csrf-token`.
3. Database migrations now use an explicit `schema_migrations` ledger with SHA-256 checksums. Already-applied migrations are skipped, and checksum drift is rejected instead of silently reapplying changed files.
4. Playwright coverage now protects referral persistence, signed public share preview copy behavior, invalid share signatures, generated card images, and the admin email-marketing entry point.
5. The admin email-marketing UI now has richer segmentation, searchable recipient history, campaign performance summaries, and a TipTap body editor with a dedicated HTML mode.
