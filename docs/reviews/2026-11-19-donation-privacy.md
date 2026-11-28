# Website donation names and anonymity

Work is local only. No website deployment, production migration, Edge Function
deployment, payment, or production visibility update was performed.

## Behavior

- Website checkout shows the donor's name by default and includes “Donate
  anonymously” before payment. The server saves the choice with the
  original reservation. Retries keep the original choice and original payment.
- Opening a completed or paid-out item under Your contributions shows Donation
  privacy and Hide my name / Show my name. A single status updates after saving.
- Donor details and donation timeline entries use the saved choice. Anonymous
  entries retain the principal amount and confirmation date but expose no name,
  email, profile ID or payment identifier. Amounts exclude the service fee.
- Report details and timelines refresh together after a change, including across
  open tabs. Listing cards retain consistent sizes and have no donor panel.
- Only the authenticated, permanent-account owner can change a completed,
  non-refunded contribution. Pending/refunded donations cannot be changed.
- Older null choices mean public, as requested. Missing/deleted profile names
  display as Anonymous. Explicitly anonymous donations do not count in public
  funder rankings. A donor with other public donations can still appear there.

## Local review

The local website continues reading real payment records. While the backend
release is held, `/api/local/contributions/name` verifies the signed-in account
and payment ownership against those records and saves only a local choice file.
The donor export now includes a private per-payment file so the local change
affects exactly that donation. New page loads and live report components read
that choice. Production Supabase data is never mutated through this bridge.

The bridge requires development mode, a loopback host, an exact same-origin
request, and no Vercel deployment. When the real column is available, the
production persisted choice takes precedence and the bridge refuses changes.
The real $5.50 paid-out receipt was verified in Chrome: hide, reload, anonymous
donor/timeline in a second tab, show, and immediate name restoration in that tab.
The original public choice was restored after verification.

Checkout refuses to start a payment if its server cannot save the privacy choice.
That protects local review and partial releases from charging an anonymous donor
while losing their choice. Local review does not create a live payment.

## Validation

- Website checkout, owner payment settings, local route authorization/persistence,
  cross-tab donor/timeline updates, and payment recovery tests.
- Actual checkout Edge Function tests for public/anonymous choices, rejected
  values, retry identity, and unchanged charges.
- `npm run supabase:privacy:test` executes the real checkout handler against
  isolated PostgreSQL/PGlite using the actual reservation and privacy SQL. Only
  Stripe is substituted. It proves quote → anonymous reservation → one charge
  on retry → public sanitized data → owner show/hide → funder board behavior.
- The SQL authorization matrix also covers guests, other donors, pending,
  paid-out and refunded records, default-public legacy choices, restoration,
  individual donation amounts/dates, and private/unavailable reports.
- Scoped ESLint and website typecheck passed. No native app files changed.

## Release order, when deployment is authorized

1. Reconcile the committed feature with the latest GitHub and Claude changes.
   GitHub main was checked during this pass at `e00973a`; local unrelated work
   was preserved.
2. Apply `supabase/migrations/20261120010000_cleanup_contributor_visibility.sql`.
   This adds the column and owner/public RPCs without changing payment totals,
   pricing, eligibility, payout rules, or the legacy reservation API.
3. Deploy `create-cleanup-contribution` with its updated shared handler so quotes
   advertise privacy support and reservations persist the selected choice.
4. Deploy the website from the reconciled committed code. Keep mobile unchanged.
5. Smoke-check the released owner setting and public donor/timeline response.
   Do not make an unrequested live payment as a verification step.

These activation steps are part of deployment, which remains on hold at the
owner's instruction. All pre-deployment implementation and local verification
are complete; live activation and live smoke checks have not been performed.
