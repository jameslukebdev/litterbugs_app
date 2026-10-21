# Reporter reward activation — October 21, 2026

The owner authorized straightforward implementation and immediate activation, with existing contributions/rewards treated as test records. The selected plan adds a 20% service fee to contribution principal, plus 50 cents only below $5. The reporter earns 5% of eligible principal from that fee after a verified cleanup; the cleaner receives the full principal. Reporting remains free and self-cleanups can earn both rewards.

## Release

Production pricing version 2 is active. This version had no production reservations before the migration; released iOS 18 and Android 16 already accept server-provided version-2 quotes. No customer migration or historical reward backfill was required. Version-1 recorded amounts remain unchanged.

Database migration: `20261021172120_reporter_reward_and_twenty_percent_fee.sql`.
Deployed functions: `create-cleanup-contribution`, `run-financial-maintenance`, `stripe-webhook`, `create-cleaner-onboarding-link`, `delete-account`.
Website deployment: `dpl_38hJHU5wELAyAxjB8H17agP2fbBw`.

Reporter earnings are live in website Payments. The native earnings display and revised payout labels are prepared in source for the next normal app release; this task does not submit a new store build. Existing native checkout uses the newly activated prices and the backend credits eligible reporter rewards independently of the display.

## Payout behavior

A single reporter reward row is created when the existing approval process completes a funded cleanup. Eligible version-2 contributions are summed before rounding the 5% reward to the nearest cent. Disputed or held cleanups do not earn a reward. The cleaner transfer completes first. Reporter payment uses the same existing US Stripe account table, age confirmation, and onboarding as cleaner payments. Missing reporter setup leaves earnings pending without delaying the cleaner.

The existing scheduled maintenance worker sends reporter transfers. Interrupted attempts retain their idempotency key. Unsettled Stripe balances retry after an hour. Definite failures use the existing admin payout-failure workflow; uncertain outcomes older than Stripe's idempotency window and reversals require reconciliation before another transfer. Stripe webhooks validate recipient, amount, currency, report and attempt. A Stripe transfer is displayed separately from bank arrival. Pending earned rewards are protected during account deletion.

The pending international/Global Payouts review remains separate. This release keeps existing US eligibility and does not claim new Stripe approval or enable additional countries or financial products.

## Verification

- 407 web tests, 41 Edge Function tests, and 10 targeted native tests passed.
- Web type checks, lint, boundary checks and the production build passed; 169 native modules passed source validation.
- Transactional SQL checks passed for fee boundaries, original payment immutability, aggregate reward rounding, approval/dispute holds, self-cleanups, missing payout setup, owner-only access, duplicate prevention, interrupted recovery, admin retry, reversal ordering, waiting for available funds, and unpaid-reward account deletion. All fixtures and queue work rolled back.
- Live signed-in website shows Reporter earnings and shared payout settings. Live quotes confirm $25 + $5 = $30 and $3 + $1.10 = $4.10.
- The automatic financial worker remains scheduled; pricing version 2 is confirmed live. No real charge or transfer was created during verification.
- Database advisor flags its standard anonymous-sign-in policy reminder on the new table. Its SELECT policy explicitly requires the existing `is_permanent_user()` helper and matching owner ID; that helper rejects anonymous JWTs. Public clients cannot mutate the table or execute payout operations.

For an operational rollback of new contribution pricing, set `cleanup_pricing_config.pricing_version` to 1. Keep the reporter table and processing code so already-earned rewards remain payable. Do not reverse the migration or reprice existing payment reservations.
