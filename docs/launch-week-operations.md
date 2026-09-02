# Litterbugs launch-week operations

This runbook defines the production inbox ownership for the controlled launch.
It does not authorize App Store or Google Play publication.

## Access

- Grant is an active cleanup administrator with verified authenticator MFA.
- Luke is an active cleanup administrator. His first `/admin` visit must finish
  authenticator enrollment before the inbox opens.
- Administrator actions require a fresh AAL2 session; membership alone cannot
  resolve cases.

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
