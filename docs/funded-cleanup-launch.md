# Funded cleanup MVP launch checklist

The funded-cleanup code ships dark in the real Litterbugs app and its linked
backend. Live Stripe and Gemini credentials are installed in the production
backend, but both server-side feature flags remain `false`. This is the
production app architecture, not a separate QA-only payment app. Provider
credentials being present does not authorize live charges or paid Gemini
reviews; the flags and the launch sequence below remain the release boundary.

## Current production state (2026-08-27)

- `main` contains the funded-cleanup implementation and published legal pages.
  Vercel production deployment `dpl_8o42pjS8zAzWczxbQMcR1UZBvEFt` serves the
  merged revision at `litterbugs.app`.
- Supabase migrations are applied through `20260827171622`; all funded-cleanup
  Edge Functions are active and the authenticated financial maintenance job is
  scheduled every minute with both required Vault entries present.
- `payments_enabled=false` and
  `gemini_financial_review_enabled=false`. Production contains zero successful
  contributions and zero cleaner payout accounts. One failed administrator
  preview contribution remains for inbox demonstration; it has no Stripe
  PaymentIntent or charge and moved no money.
- The permanent AAL2 administrator is enrolled and `/admin` is live.
- The launch revision publishes `cleanup-acknowledgment-v2` with
  `cleanup-safety-guidelines-v2`. It presents separate, conspicuous safety and
  assumption-of-risk/release sections before every claim and requires every
  claimant to affirm that they are at least 18. Earlier versions are retired
  when the migration is applied.
- The live Stripe account is identity-verified with no active requirements.
  Payments, payouts, and transfers are active, and the platform payout schedule
  is Manual. The snapshot destination is active for 11 events and the Accounts
  v2 thin destination is active for seven events, both with zero delivery
  errors. The intended payment methods are cards, Apple Pay, Cash App Pay,
  Google Pay, and Link. Apple Pay remains unavailable in the production iOS
  build until the Apple organization transfer and merchant configuration below
  are complete.
- The `litterbugs-gemini-relay` service is healthy in the production Google
  Cloud project with zero minimum instances, two maximum instances, concurrency
  four, 512 MiB memory, a 60-second timeout, pay-as-you-go billing, and the $5
  budget alerts. Its dedicated runtime identity has secret access only on the
  relay shared secret. The completed dark-launch fixture evidence below used
  only synthetic, non-user photos.
- Expanded Terms, Privacy, Cleanup and Reward Policy, safety guidelines, and
  the in-app acknowledgment were prepared from the production rules with a
  ChatGPT Pro legal-drafting pass. They are production drafts and must not be
  described as legally approved or guaranteed enforceable. The limited review
  questions and acceptance evidence are recorded in
  `docs/legal-acceptance-and-review.md`.

The remaining launch gates are external or deliberately deferred: Apple must
finish converting the Burrow Base developer account before the app transfer,
merchant identity, production signing, and physical-iPhone Apple Pay test;
Supabase leaked-password protection requires the deferred Pro upgrade; and the
production legal drafts have not received qualified legal sign-off. After those
items, the only planned activation work is the ordered controlled rollout in
this document. Do not create a second QA application or repeat completed broad
test work while waiting.

### Focused Supabase security-advisor triage (2026-08-27)

The production advisor results were reviewed against the deployed grants,
policies, function guards, and existing authorization tests:

- Financial audit, Stripe-event, and administrator tables intentionally have
  RLS with no client policies, which is a client deny-all boundary.
- Client workflow RPCs are executable by `authenticated`, never `anon`; each
  relevant function uses an empty `search_path` and rechecks the permanent
  user, record ownership, workflow state, or AAL2 administrator membership
  before reading or changing protected data.
- Pending cleanup evidence is visible only to its cleaner and reporter. The
  nested metadata policy prevents outsiders from satisfying the Storage rule;
  anonymous users can read only the accepted final submission after completion.
- The `pg_net` extension is used by the authenticated maintenance schedule and
  is not a client authorization path.
- Leaked-password protection is the remaining actionable advisor warning. It
  requires Supabase Pro and stays an explicit launch-day gate below.

## Required configuration

Set these Supabase Edge Function secrets:

- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_V2_WEBHOOK_SECRET`
- `STRIPE_V2_API_VERSION` (the Accounts v2 API version configured for the platform)
- `STRIPE_ONBOARDING_REDIRECT_BASE_URL` (the public `stripe-onboarding-redirect` Edge Function URL)
- `STRIPE_ONBOARDING_STATE_SECRET` (a separate long, random signing value)
- `GEMINI_RELAY_URL` (the exact HTTPS origin of the production Google Cloud Run
  relay; do not include a path or trailing slash)
- `GEMINI_RELAY_SHARED_SECRET` (a separate random value of at least 32
  characters, configured only in the relay and Supabase Edge Functions)
- `FINANCIAL_MAINTENANCE_SECRET` (a long, random server-to-server value)

Set `STRIPE_APPLE_MERCHANT_IDENTIFIER` for the mobile build. The fallback is `merchant.com.litterbugs.app`; the value must match the Apple merchant ID configured for the app and Stripe account.

Gemini 3.7 Flash runs through Gemini Enterprise Agent Platform, not the AI
Studio developer endpoint. The `litterbugs-gemini-relay` Cloud Run service runs
in `litterbugs-auth` as the dedicated `litterbugs-gemini-review` service account
and obtains short-lived Google credentials from its runtime identity. Supabase
sends only short-lived signed references to private Litterbugs photos; the
relay accepts only the two Litterbugs storage buckets and never logs request
bodies. Do not create a service-account key, weaken the organization policy,
add an AI Studio API key, or buy prepaid AI Studio credits for this worker.
Agent Platform usage follows the project’s standard Google Cloud
pay-as-you-go billing cycle.

### Gemini relay deployment gate

Deploy `services/gemini-relay` to Cloud Run in `litterbugs-auth` only after its
local tests pass. Attach
`litterbugs-gemini-review@litterbugs-auth.iam.gserviceaccount.com` as the Cloud
Run service identity. Configure `GEMINI_RELAY_SHARED_SECRET` from Google Secret
Manager and set `ALLOWED_PHOTO_ORIGIN` to
`https://mvaygkflcjswtwchflrk.supabase.co`. Because Supabase Edge Functions do
not have a Google runtime identity, the HTTPS endpoint must be network
reachable; the relay's constant-time bearer-secret check is the application
authentication boundary.

Grant the dedicated Cloud Run service identity
`roles/secretmanager.secretAccessor` on only the
`GEMINI_RELAY_SHARED_SECRET` Secret Manager secret. Do not grant that role at
the project level; the relay does not need access to any other secret.

Keep the relay small for the initial rollout: zero minimum instances, two
maximum instances, concurrency four, 512 MiB memory, and a 60-second request
timeout. Cloud Run and Agent Platform usage belong to the same billing project
and $5 alert, but the alert is not a hard spending cap. Do not deploy the
relay-configured Supabase worker or set its two relay secrets until the relay
health check succeeds. Keep `gemini_financial_review_enabled=false` through
deployment and the non-user fixture test. Remove the obsolete bound Google API
key from Supabase after the relay test passes; it cannot authenticate to Agent
Platform under the enforced organization policy.

The production iOS identity is built with React Native from source because Expo SDK 54's precompiled React artifacts omit development-client symbols under Xcode 26. The checked-in Expo config plugin also disables the incompatible `fmt` 11.0.2 `consteval` path, and the checked-in Stripe patch corrects the SDK 0.50.3 enum declaration. Keep these version-scoped workarounds until a future Expo/React Native upgrade includes the upstream fixes, then remove and re-run a clean native build on both simulator and physical iPhone.

Before testing cleaner onboarding, confirm the Stripe platform can create Accounts v2 recipients and Account Links v2. The readiness check requires both `stripe_balance.stripe_transfers` and standard `stripe_balance.payouts` to be active.

Set the Litterbugs platform payout schedule to **Manual payouts** before accepting
the first contribution. Automatic platform payouts can sweep report funds out
of the Stripe payments balance before a cleaner is selected or a refund is
due. Do not manually pay out platform funds while they back active report
pools. The 23-month automatic-refund rule stays inside Stripe's two-year U.S.
manual-payout holding limit. Configure this separately in sandbox and live
mode; changing one does not configure the other.

Create a Stripe snapshot webhook endpoint for `stripe-webhook` using the same API version as the server SDK. Subscribe at minimum to:

- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payment_intent.canceled`
- `charge.dispute.created`
- `refund.created`
- `refund.updated`
- `refund.failed`
- `transfer.created`
- `transfer.updated`
- `transfer.reversed`

Create a separate Accounts v2 thin-event destination pointing to the same function and store its signing secret as `STRIPE_V2_WEBHOOK_SECRET`. Subscribe to:

- `v2.core.account.closed`
- `v2.core.account.created`
- `v2.core.account.updated`
- `v2.core.account[configuration.recipient].capability_status_updated`
- `v2.core.account[configuration.recipient].updated`
- `v2.core.account[identity].updated`
- `v2.core.account[requirements].updated`

The `schedule_financial_maintenance` migration schedules an authenticated POST to `run-financial-maintenance` every minute. Store the function URL and the same value used for `FINANCIAL_MAINTENANCE_SECRET` in Supabase Vault as `litterbugs_financial_maintenance_url` and `litterbugs_financial_maintenance_secret`. Each call intentionally handles at most one queued Gemini check, refund, and transfer to keep retries bounded. The scheduler's 70-second HTTP timeout covers the relay's bounded 58-second review request; row claims and stale-work recovery prevent overlapping runs from processing the same item. Refunds and transfers are additionally gated by `payments_enabled`, so the worker cannot contact Stripe while payments are dark. Report/claim deadlines continue to use the existing database maintenance schedule.

## Administrator bootstrap

Create one permanent Supabase account, enroll a TOTP factor, and insert only its Auth user ID:

```sql
insert into public.cleanup_admin_memberships (user_id)
values ('ADMIN_AUTH_USER_ID');
```

Sign in at `/admin` with the same provider as that permanent account (Google or email/password), then complete the on-screen TOTP enrollment. Do not create a second administrator identity just to use a different sign-in method.

The `/admin` backend rechecks permanent-account status, private membership, and Supabase AAL2 for every read and decision. Do not distribute the service-role key to the website or mobile app.

## Apple organization transfer handoff

Do not create a temporary production Apple Pay identity under an individual
developer account. Complete these steps once Apple finishes converting the
Burrow Base account to an organization:

1. Confirm the Burrow Base and Luke Apple Developer accounts are no longer in
   a pending or changing state and both Account Holders have accepted the
   current agreements.
2. Luke's Account Holder initiates the transfer of the existing Litterbugs app
   and `com.litterbugs.app` to the Burrow Base Account Holder.
3. The Burrow Base Account Holder accepts the transfer and confirms that the
   app record, bundle ID, reviews, and current availability are intact and that
   existing users can continue receiving updates.
4. Register the production Apple merchant identity under Burrow Base, connect
   it to the live Stripe account, and set the matching
   `STRIPE_APPLE_MERCHANT_IDENTIFIER` in the production mobile build.
5. Replace the production iOS signing credentials with Burrow Base credentials,
   create a clean production build, and test Apple Pay, PaymentSheet, hosted
   cleaner onboarding, return links, and payout status on a physical iPhone.

### App Review note template

Use this note for the funded-cleanup submission, replacing the bracketed demo
details immediately before submission:

> Litterbugs lets signed-in community members add money to a reward pool for a
> real-world litter cleanup performed outside the app. A contribution does not
> unlock digital content or app functionality. Contributors pay through Stripe
> PaymentSheet using supported cards and wallets. After cleanup evidence is
> reviewed and the dispute window closes, the cleaner receives the displayed
> reward through Stripe Connect. Litterbugs retains the separately disclosed
> 10% platform fee. Reviewers can use `[DEMO ACCOUNT]` and open
> `[FRESH FUNDED REPORT]` to inspect the contribution disclosure, evidence
> review, dispute, and payout-status flows. The production backend and review
> report will remain available for the duration of App Review.

Do not submit placeholder credentials. Create or select the review account and
fresh report only when the submitted build is ready, so the reviewer does not
receive stale workflow data.

## Counsel review brief

Send the attorney these live pages together with the active in-app
acknowledgment text:

- `https://www.litterbugs.app/terms`
- `https://www.litterbugs.app/privacy`
- `https://www.litterbugs.app/cleanup-policy`
- `cleanup-acknowledgment-v2` and `cleanup-safety-guidelines-v2`

Ask for written approval or required edits covering: the non-charitable nature
of contributions; the 10% fee; the 30-day report and seven-day renewal rules;
full-fee refunds and the 23-month maximum age; reporter disputes and admin
decisions; cleaner eligibility, safety, independent status, and taxes; platform
responsibility for processing costs and chargebacks; and Gemini photo
processing, retention, privacy, and human escalation. Record the reviewed
version and date before enabling payments.

## Gates before either feature flag changes

Keep both flags `false` until every applicable item below is complete:

- Apply all pending funded-cleanup migrations and deploy the matching Edge
  Functions from the same reviewed revision.
- Deploy the Cloud Run relay with its dedicated service identity, configure the
  two relay secrets in Supabase, and remove the obsolete bound Google API key.
- Run the non-user Gemini fixture set for clear, blurry, unrelated, duplicate,
  hazardous, manipulated, and ambiguous evidence. Confirm ambiguous and safety
  cases reach the admin inbox instead of releasing money.
- Verify the two Stripe webhook destinations in sandbox. Besides signature and
  event deduplication, the handler must reject contribution successes, refunds,
  or transfers that do not match the exact Litterbugs ledger amount, currency,
  PaymentIntent, report, and cleaner account.
- Confirm the Stripe sandbox platform uses **Manual payouts**, and keep its
  payments balance in Stripe while any contribution principal remains assigned
  to an active report pool.
- Bootstrap the permanent AAL2 administrator and complete the desktop admin
  test for denial, MFA, filtering, evidence, decisions, and audit history.
- Enable Supabase Auth leaked-password protection before production accounts
  can administer or receive funded-cleanup payments.
- Obtain qualified legal review of the published terms, privacy/AI disclosure,
  fee and refund disclosure, dispute rules, cleaner tax responsibility, active
  cleanup acknowledgment, and App Store physical-services explanation. Publish
  a new version of any document or acknowledgment that counsel requires before
  enabling payments.
- Complete physical-iPhone sandbox testing for Apple Pay, PaymentSheet, hosted
  onboarding/return links, standard payouts, and App Store presentation.

Enable `gemini_financial_review_enabled` first for the controlled fixture and
report-photo review rollout. Enable `payments_enabled` only after the Gemini,
admin, Stripe sandbox, legal, and physical-device gates are all signed off.

## Test-mode acceptance

Test-mode acceptance is complete. The funded-cleanup migrations and functions
were deployed together while both flags remained off; the volunteer workflow,
Stripe sandbox ledger behavior, webhook reconciliation, maintenance schedule,
Gemini fixture outcomes, and administrator boundary were exercised before live
provider credentials were installed. The live credentials remain dark behind
the same two flags.

The merged production revision was rechecked on 2026-08-27 after deployment:
all nine Supabase Edge Function entry points passed Deno type-checking, all
seven shared financial-security tests passed, and all six Gemini relay boundary
tests passed. The focused tests cover signed onboarding state, internal-secret
authentication, exact Stripe charge/refund/transfer reconciliation, relay
origin and credential requirements, exact-photo reuse, fixed-model enforcement,
private signed-photo access, request-size limits, and rejection of unauthorized
relay calls.

Reports created while Gemini review is disabled do not build a dormant AI queue. Enabling the flag is intentionally non-retroactive: only a report created afterward, or an existing report whose owner deliberately replaces its photo set afterward, enters financial photo review. This keeps pre-launch test reports out of paid Gemini processing and out of the funded-cleanup ledger.

### Dark-launch Gemini evidence (2026-08-26)

The deployed relay was exercised directly with private, synthetic, non-user
photos while both application flags remained `false`. Clear report evidence
passed; blurry, unrelated, and ambiguous evidence requested better photos;
hazardous and visibly manipulated evidence opened the admin-review path. A
synthetic before/after pair of the same location passed as materially cleaned.
All temporary Storage objects were deleted after the run and a database check
confirmed zero remaining fixture objects.

Exact reuse of an original report photo is checked deterministically by its
SHA-256 digest in `run-financial-maintenance` before Gemini is called. The
shared helper has direct coverage for both a matching and a distinct photo.
Repeat the controlled fixture set before live activation because model results
can change even when the application code does not.

```sql
update public.cleanup_feature_flags
set enabled = true, updated_at = now()
where name = 'gemini_financial_review_enabled';

update public.cleanup_feature_flags
set enabled = true, updated_at = now()
where name = 'payments_enabled';
```

Before live mode, verify:

- two contributions reconcile principal, half-up 10% fees, and the displayed cleaner reward;
- retries and duplicate/out-of-order webhooks do not duplicate funds;
- a funded claim requires a live payout-ready U.S. recipient account and age-18 confirmation;
- claim freeze, two replacement-photo rounds followed by third-attempt escalation, dispute, both admin outcomes, first-paid-cleanup check, and 48-hour auto approval;
- renewal keeps the fund; close, no response, and 23-month aging refund the complete charge;
- interrupted provider calls reuse their original idempotency key, while an administrator-approved retry advances to one new key without duplicating money;
- Apple Pay, cards, hosted onboarding, return links, and the Express payout dashboard on a physical iPhone;
- `/admin` denial, TOTP enrollment/challenge, filters, evidence, required reasons, confirmations, and audit history.

## Live-mode prerequisites

The published terms, privacy policy, cleanup policy, and active acknowledgment
contain the planned 10% fee, full-refund rules, AI-photo disclosure, dispute,
safety, independent-participant, and cleaner tax-responsibility language. These
production drafts still require qualified legal review before payments are
enabled. Confirm the Apple merchant configuration and physical-iPhone behavior
after the organization transfer; the other live Stripe, Gemini, administrator,
and backend configuration is recorded in the current production state above.

Do not enable the flags merely because the code was deployed. Enable them only after test-mode money reconciliation, administrator coverage, monitoring, and the legal copy are signed off.

## Minimal live activation and rollback

Do not repeat the full QA suite at launch. Use this ordered production check:

1. Keep both flags off while the Apple transfer, merchant configuration,
   physical-iPhone payment test, and legal sign-off are completed.
2. Upgrade Supabase to Pro, enable leaked-password protection, and confirm the
   administrator can still complete AAL2 authentication.
3. Repeat the small synthetic Gemini fixture set, then enable only
   `gemini_financial_review_enabled`.
4. Create a fresh report after the flag change and confirm its original photo
   becomes funding-eligible. Do not reuse pre-launch reports.
5. Enable `payments_enabled`, make one minimum $5 contribution, and confirm the
   principal, 10% fee, total charge, receipt, Stripe event, and Litterbugs
   ledger all agree.
6. Complete cleaner onboarding and one real cleanup path, including Gemini
   evidence review, the complete 48-hour dispute window, the first-paid-cleanup
   admin check, and the exact $5 transfer. Do not shorten the real timing rules
   for launch testing.
7. If every step reconciles, leave the features on for the controlled rollout.
   If any money, review, or payout state disagrees, immediately set both flags
   to `false`, leave the webhook destinations and audit records intact, and use
   the admin workflow to refund or resolve the affected transaction.
