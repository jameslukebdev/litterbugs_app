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
Fresh remote verification after creating the PR still found `origin/main` at
`5cc45c4`, an ancestor of this branch. App configuration, EAS profiles, and app
assets have no diff against Luke's tip. Draft PR:
https://github.com/jameslukebdev/litterbugs_app/pull/76 .

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
  console warnings/errors. Native build and simulator results are recorded
  below; destination-app share-link behavior remains unverified.
- Native production builds dispatched using existing frozen signing credentials:
  Android `f042ea68-087d-4e6b-90cf-6c88879ed0a0` (version code 11) and iOS
  `e0c2a650-281d-4d95-a2f8-691a3df4c4c8` (build 10), both app version 2.0.0.
  Both finished successfully. Downloaded iOS artifact confirms bundle
  `com.litterbugs.app`, version 2.0.0/build 10, and passes strict code-signature
  verification. Android bundle passes bundletool validation and JAR signature
  verification; its manifest confirms `com.litterbugs.app`, version 2.0.0/code
  11, minimum SDK 24 and target SDK 36. Android SHA-256:
  `9d16059b6d6e5d53ab3aa48fc18c35d61d5b977b8d1dbd724ba0440cc2078ba4`.
  No store submission made.
  The Android manifest also matches the actual EAS production Maps key (checked
  without printing it; temporary environment file removed). The iOS entitlements
  retain Luke's team `DB39U76V6Q`, Apple sign-in, and production push. Associated
  domains remain absent, as in Luke's configuration.
- Mobile submission integration checks now cover permission denial before any
  upload, a second GPS fix after upload, private-photo recovery after a failed
  final distance check, and recovery of a published report after a lost response.
  All 40 focused reporting, sharing, and waiver tests passed. Native simulator
  compilation succeeded, but both requested UI tests failed before reaching
  their report flows: the first exceeded its initial map-ready wait; the second
  reached the sign-in screen because this simulator lacks a signed-in QA account.
  The result is `/tmp/litterbugs-sep23-native-reporting.xcresult` (0 passed,
  2 failed, 0 skipped). This is not passing native evidence. The subsequent
  signed-in simulator runs below resolved these setup failures. Physical
  share-extension verification remains outstanding.
- Follow-up native checks on the existing signed-in iPhone 17 Pro QA simulator
  passed: report pin/photo-step entry without GPS; saved draft recovery after
  relaunch; the five-stage report review including changing its location; and
  readable agreement v4 with reachable date/checkbox and disabled acceptance
  until checked. Result bundles are `/tmp/litterbugs-sep23-native-qa-session.xcresult`
  (2 passed), `/tmp/litterbugs-sep23-native-review.xcresult` (1 passed), and
  `/tmp/litterbugs-sep23-native-waiver-current-ui.xcresult` (1 passed), all with
  zero failures/skips. The waiver test was updated for Luke's current Reports
  cards and Claim Cleanup label rather than changing his interface. An existing
  QA notification was dismissed with Later. The simulator-only location grant
  used for the waiver test was restored to its original denied setting, and
  synthetic location was cleared. No report was published or cleanup claimed;
  the full agreement was not accepted during this verification.
- The native iOS share sheet opens with the report card image. Simulator share
  destinations cannot establish Messages/Instagram link behavior; preserve
  that outstanding physical-device check. The pinned native sharing library
  adds the supplied message as a separate activity item, and mobile tests verify
  that this message includes the report URL.
- Installable Android production-internal build dispatched with frozen existing
  signing credentials: `ed6a6d17-8a32-4f7d-9f84-d9d32899939c`. This provides an
  APK for device verification without a Play submission. Build completed and
  signature verification passed. Package `com.litterbugs.app`, version 2.0.0/code
  11, matches the existing production signing certificate. APK SHA-256:
  `7b3c1eaf9d5be2f7f84c4703600307064314dceb17122c36b7b84cbc0b2e63c9`.
  Download: https://expo.dev/artifacts/eas/igNDOcxPlb-Fd6EDqIdwN1d9gRnUI35W2N_qUzTNN4c.apk .
  Installed successfully with `adb install -r` on `Litterbugs_API_36`. Before and
  after package-manager records retain app ID 10213, CE/DE data-directory inodes
  557421/401752, and first-install time September 1. Version changed from 1.0.0
  to 2.0.0 without uninstalling or clearing storage. This is update-integrity
  evidence, not proof that the saved login or interactive flows work.
- The existing Android emulator installation uses the production certificate
  `2C:0A:31:66:6C:8C:7A:35:04:E9:0D:8E:B8:15:01:67:30:75:40:11:2F:96:90:51:B0:36:AB:13:C1:B0:AA:0E`.
  The live `/.well-known/assetlinks.json` lists that same certificate and package;
  Android's package manager reports `litterbugs.app: verified` before and after
  the update. This proves domain association, not successful report navigation
  in the new build. The desktop UI tool does not expose the Android emulator, so
  interactive Android checks remain separate from package/update verification.
  The owner has been given the concrete EAS installation link and asked about
  physical Android test availability; no response is recorded yet.

## Remaining mobile device checks

Use the installable build above for Android. These checks are not a request to
submit to either app store. Preserve existing app data and any user drafts.

- On both platforms, verify the review screen shows **No contribution now** and
  explains that others can still fund the report. Choosing it must not open a
  contribution screen or create a payment. Exercise publication only with an
  authorized test report or an isolated backend; do not create fake public litter.
- Verify denied GPS prevents publication, a pin beyond 50 miles is rejected,
  and a valid nearby report can publish with one to three photos. The unit and
  SQL checks cover these rules; physical-device publication is not yet verified.
- Share a report to an installed destination app and inspect its composer for
  the clickable report URL before sending. Cancel the composer. General image
  sharing and Instagram Stories are different paths and need separate results.
- Open the shared HTTPS report URL. Android domain verification is confirmed;
  actual navigation to the intended report remains a device check. On iOS the
  production build currently opens the website because associated domains are
  disabled. Do not change Luke's unavailable Apple account as a workaround.
- On an appropriately authorized test account, check first acceptance versus
  repeat acceptance for the current agreement versions, and the short safety
  confirmation on every cleanup. Automated checks must not accept legal terms
  or create a live claim. Existing iOS coverage verifies readable v4 presentation
  and disabled acceptance while unchecked.

## Website alignment findings for the next phase

Read-only comparison confirms the website still has six report stages (a separate
Title stage), while Luke's mobile flow has five with an optional title on Photos.
The web draft and wizard also lack the mobile starting-contribution choice and
post-publication funding handoff. These remain implementation work; the shared
parity tests currently cover persisted option sets and evidence limits, not full
workflow parity. Both clients have the new GPS publication and versioned agreement
changes. `docs/web-replacement.md` still describes older step/boundary/auth
behavior and needs reconciliation with verified current behavior in that phase.

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
