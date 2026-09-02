# Litterbugs launch-week operations

This runbook defines the production inbox ownership for the controlled launch.
It does not authorize App Store or Google Play publication.

## Access

- Grant is an active cleanup administrator with verified authenticator MFA.
- Luke is an active cleanup administrator. His first `/admin` visit must finish
  authenticator enrollment before the inbox opens.
- Administrator actions require a fresh AAL2 session; membership alone cannot
  resolve cases.
- Public support mail uses `support@litterbugs.app`. Cloudflare Email Routing is
  enabled and the exact-address rule forwards to the previously verified
  `grant@burrowbase.com` business inbox. The catch-all remains disabled.

## Primary ownership

| Queue | Primary | Backup |
| --- | --- | --- |
| Cleanup disputes | Luke | Grant |
| Report safety and eligibility | Luke | Grant |
| Gemini reviews | Luke | Grant |
| First paid cleanup checks | Luke | Grant |
| Payment failures | Grant | Luke |
| Refund failures | Grant | Luke |
| Payout failures | Grant | Luke |

## Check rhythm

- Check `/admin` at the start and end of each launch day.
- Treat priority 1 cases as same-session work and priority 2 cases as same-day
  work.
- The primary owner records the reason and action in the admin workflow. The
  backup covers any case that has not been acknowledged by the second check.
- For money mismatches, pause new funded-cleanup activity before retrying or
  refunding. Preserve Stripe event and Litterbugs ledger records for review.

## Launch-state audit on September 1, 2026

- The six clearly labeled `[Preview]` seed cases and their two synthetic action
  records were removed on September 1 by migration
  `20260902034200_remove_cleanup_review_preview_cases.sql`. Zero preview cases
  remain.
- One open report-safety case came from a non-litter television-screen photo
  submitted during release testing.
- Grant's administrator access is ready. Luke's membership is ready, but his
  authenticator enrollment still requires Luke to complete the six-digit-code
  step personally.
- The branded support address, website policies, store-preparation packet, and
  SMTP sender now use the same company-facing contact. Cloudflare reports the
  inbound route as enabled and ready; its three MX records, SPF, and DKIM record
  are published.

## Recheck on September 2, 2026

- Payments and Gemini financial review remain enabled.
- Both one-minute maintenance schedules are active; the latest 20 recorded runs
  all succeeded.
- Every deployed Edge Function is active.
- Grant remains an active administrator with verified TOTP. Luke remains an
  active administrator without a verified TOTP factor, so Luke still must
  complete enrollment personally.
- Zero `[Preview]` cases remain. The one priority-1 report-safety case remains
  open for a human funding-eligibility decision.
- The production Auth password minimum is now eight characters, matching the
  mobile and website forms. Leaked-password protection requires a Supabase Pro
  upgrade and remains deferred under the prior launch decision.
- The production Supabase project is healthy but currently belongs to the Free
  organization named `jameslukebdev's Org`. Permanent company ownership and any
  Pro upgrade should be decided deliberately; no billing or project transfer
  was performed during this audit.
