# International payouts and report-flow rollout

Owner authorized implementation; goal remains **all 120 target countries**.
This is a work log, not evidence that international payouts are enabled.

Owner clarified the sequence September 23: finish and verify the iOS and Android
app debugging work first, then bring the website fully into alignment with the
apps. Website alignment remains in scope, as the next phase.

## Confirmed product decisions

- New reports require permission and a fresh GPS reading within 50 miles.
- “No contribution now” replaces ambiguous “Volunteer” at report creation.
  Other members can still contribute; no payment is created by that choice.
- Keep one to three report photos.
- Full cleanup agreement once per exact document-version pair, followed by a
  short site-specific confirmation for every cleanup.
- Ordinary safe roadside litter should pass the photo review. Human review is
  reserved for concrete exceptional hazards, invalid evidence, or unresolved
  provider failures; model output cannot itself permanently reject a report.

## Integration baseline

Fetched Luke's latest work and fast-forwarded from f8c84cb to 5cc45c4. His two
September 16 commits prepare Version 2/TestFlight and restore the app icon.
Working branch: `codex/global-payouts-and-reporting-fixes`.
Luke's release configuration and app icon are preserved.

## Implementation status

- Local: iOS general sharing now includes the report URL in its caption;
  dedicated Instagram Stories remains separate. Native share extension behavior
  still needs device verification. Production iOS associated domains remain
  disabled because Luke's provisioning capability is unavailable; do not claim
  universal links open the installed app.
- Local: contribution wording and saved-version waiver checks in mobile/web.
  Version 4 of the agreement is now published in Supabase. The website copy and
  policy dates were aligned in Vercel deployment
  `dpl_sp9WyuSPrxJRoJZWWGgnK8px1pvB`, promoted to production. Further website
  alignment follows mobile verification.
- Local: fresh GPS checks in both clients and `publish_report` RPC migration.
  New reports stay private until photos and distance are validated. GPS origin
  is transient; it is not stored on the publicly readable report.
- GPS SQL tested against a local PostgreSQL contract fixture and against the
  full production schema in rollback-only transactions, including publication
  recovery, ownership, photo validation, and exactly-once report counting.
  The additive `publish_report` migration is deployed. Strict direct-write
  enforcement is a separate rollout script, **not applied**, because old mobile
  clients publish directly. Distribute compatible native builds first.
- Gemini policy is live in Cloud Run revision `00004-rxr` and the maintenance
  Edge Function. Both existing roadside reports passed live rechecks; the yard
  photo now requests visible litter evidence instead of a private-property hold.
- Full `npm run check` passed: 446 mobile, 116 web, 13 shared tests, backend tests,
  type checks, lint, web build, boundaries, relay tests, and auth-bridge dry run.
  Subsequent publication-retry refinements passed web typecheck/build and lint.
  Desktop Chrome local safety/policy navigation passed with screenshots and no
  console warnings/errors. Native share extensions and new app build unverified.
- Native production builds dispatched using existing frozen signing credentials:
  Android `f042ea68-087d-4e6b-90cf-6c88879ed0a0` (version code 11) and iOS
  `e0c2a650-281d-4d95-a2f8-691a3df4c4c8` (build 10), both app version 2.0.0.
  iOS finished successfully; Android remained in progress at 22:08 UTC September
  23. No store submission made.
- Mobile submission integration checks now cover permission denial before any
  upload, a second GPS fix after upload, private-photo recovery after a failed
  final distance check, and recovery of a published report after a lost response.
  All 40 focused reporting, sharing, and waiver tests passed. A native simulator
  report-pin and saved-draft recovery run is in progress; this does not replace
  physical share-extension verification.

## Stripe account review

Correct Litterbugs account: `acct_1U2HZe40KMkUKMFW`. The installed Stripe
connector points at another business; do not use it for Litterbugs operations.
Supabase connector likewise lists a different project; the linked Litterbugs
project is `mvaygkflcjswtwchflrk`.

Stripe specialist James joined the authenticated Dashboard chat September 23.
He was told explicitly that Codex is Grant's authorized AI assistant. Requested
written account review, without account activation, terms acceptance, or money
movement. James escalated to the specialist team by email under case
**sco_VJarfjNbi0QKE3**. No country approval or response-time commitment yet.
The 21:55 UTC acknowledgment email and chat transcript confirm the specialist
review is pending and request no owner action at this time. Gmail message ID:
`1a0d043d201a62a4`.

All 120 target countries appear across published Global Payouts bank-destination
documentation and release notes. The current account picker exposes 101 of those
120. This does not establish individual-recipient or account-specific approval.
Outstanding: individual recipients in every country, 19 missing picker choices,
pooled-contribution business model, approved funding/reserve arrangement, account
reuse, minimums, fees, and any required preview enablement.

Sources: https://docs.stripe.com/global-payouts/recipient-requirements ;
https://docs.stripe.com/changelog/dahlia/2026-05-27/cross-border-payouts-20-new-bank-account-types ;
https://docs.stripe.com/changelog/dahlia/2026-03-25/cross-border-payouts-new-countries ;
https://docs.stripe.com/changelog/clover/2026-02-25/cross-border-payouts-new-countries ;
https://docs.stripe.com/changelog/clover/2026-01-28/cross-border-payouts-new-countries .

Target ISO codes:
AE AG AL AM AO AR AT AU AZ BA BD BE BG BH BJ BN BO BS BT BW CA CH CI CL CO CR CY CZ
DE DK DO DZ EC EE EG ES ET FI FR GA GB GH GI GM GR GT GY HK HR HU ID IE IL IN IS IT
JM JO JP KE KH KR KW KZ LA LC LI LK LT LU LV MA MC MD MG MK MN MO MT MU MX MY MZ NA
NE NG NL NO NZ OM PA PE PH PK PL PT PY QA RO RS RW SA SE SG SI SK SM SN SV TH TN TR
TT TW TZ US UY UZ VN ZA.

## Remaining completion gates

1. Complete and verify compatible native apps first, then complete website
   alignment. Distribute native apps through the authorized release process;
   store publication is not authorized. Three-photo caps remain intact.
2. Apply strict GPS enforcement only after compatible mobile release; verify the
   full user flow. Until then, old direct-write clients can still bypass GPS.
3. Receive account-specific Stripe decisions, implement approved payout route,
   country eligibility/onboarding, reserves, minimums, fee display, webhooks,
   reconciliation, failed/returned payments, and verification in each destination.
4. Run appropriate backend, mobile, and website checks and release authorized
   changes. Store publication is outside this task's authorization.

Do not mark the goal complete based on disabled scaffolding or public country
lists. All 120 must be enabled and verified, or concrete external blockers must
be reported honestly while independent work continues.
