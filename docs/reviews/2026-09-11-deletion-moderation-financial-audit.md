# Deletion, moderation and payment recovery — September 11

## Final owner scope decision — supersedes historical outstanding items below

Grant explicitly removed Apple authorization-revocation credential setup and
integration verification, and separate-user Facebook login testing, from this
debugging pass's requirements. He cannot access Luke's Apple developer account
and has no other Facebook login, with no way to provide either resource.
These are accepted exclusions, not pending owner actions or completion gates.
Do not repeatedly request access, retry these tasks or mark this pass blocked
on them unless Grant explicitly changes the scope.

Automatic Apple grant revocation remains unconfigured and separate-user Facebook
login remains unverified; neither is reported as passed. The completed moderation,
administrator alerts, own-report funding notification fix, Android decline/retry,
and physical-phone interrupted checkout satisfy the remaining debugging scope.
Earlier references to these two items as required, deferred or outstanding are
historical and superseded by this decision. Store release tasks remain separate.

## Account deletion

A fresh hosted test used two disposable confirmed-email accounts, with harmless
private PNG fixtures in report_photos, media_quarantine and profile_avatars.
No public report, cleanup claim or financial record was created.

- An unconfirmed request returned 400 and retained the account.
- Confirmed deletion removed one report photo, one quarantined photo and the
  avatar, deleted the Auth user, and rejected the old access-token user lookup
  and refresh token.
- A supplied different user_id did not redirect deletion away from the caller.
  The other fixture account and its files remained intact.
- Cleanup removed the second fixture. Exact post-checks found zero target Auth
  users, identities, sessions and Storage objects for both UUIDs.

Fixture UUIDs: 36b028a5-7e2a-426e-bf80-22f45f0e48be and
fa1e1927-540d-4e73-a0ae-467853d105dd. Temporary runner:
`/tmp/lb-delete-audit-sept11.cjs`; credentials were read into process memory,
not written to the report or committed.

Confirmed local bug: server deletion previously signed out without clearing
saved report/cleanup drafts. The mobile fix clears the deleted account's draft
files, report journal, favorites, review drafts and payment-check cache after
server success. It waits for pending draft/favorite writes, keeps another
account's data and device preferences, and journals interrupted cleanup for
retry on app launch. Failed server deletion preserves drafts. Device cleanup
failure is described separately from successful server deletion.

The updated QA iPhone Release build succeeded, installed on the connected
iPhone 6s without clearing its data, and launched successfully to the map.
The device walkthrough then used disposable account
`9823b362-2183-47f3-8072-fe0a116a3774`: signed in with email, entered a harmless
report title, chose Save for later, and confirmed the Resume your report prompt.
The account's Documents/report-drafts folder existed before deletion. Deletion
through Settings and its confirmation returned the app to signed-out browsing.
The folder was absent afterward, and an exact hosted query returned zero Auth
users, identities and sessions for this UUID. No report was published. This
device draft had no photo; photo removal is covered by the hosted fixtures
above, while cleanup-draft files and interrupted cleanup are covered by the
focused storage tests. External-provider grant revocation remains unverified.

Limits: this hosted test used email identities; it does not prove revocation
of external Apple/Google/Facebook grants. Current native cleanup signs Google
out, but is not external authorization revocation. SecureStore payment-attempt
entries and image/share caches need a separate retention assessment; the draft
fix does not claim to erase every device cache. Real funded-record retention
was not re-exercised by these empty financial fixture accounts.

Provider follow-up: source inspection confirms that appleSignIn.js exchanges
only the identity token with Supabase. It does not retain/exchange Apple's
authorization code for a revocable token; delete-account has no provider
revocation request. This is a confirmed implementation gap, not merely missing
test evidence. Apple's [account-deletion guidance](https://developer.apple.com/support/offering-account-deletion-in-your-app/)
calls for Sign in with Apple token revocation, with the flow described in
[TN3194](https://developer.apple.com/documentation/technotes/tn3194-handling-account-deletions-and-revoking-tokens-for-sign-in-with-apple).
An external-provider walkthrough requires a disposable provider account; the
owner was asked for one. Grant's existing Facebook sign-in was restored
after the disposable email-account test; no personal account was deleted.

The owner subsequently supplied and explicitly identified a Google test
account. Before deletion, its user ID
`050260c5-3712-48fe-a855-6518c640ccce` had both email and google identities,
zero public reports, and the iPhone Sign-in methods screen showed both
connected. Deletion through Settings and its confirmation returned the iPhone
to browsing. Exact post-checks found zero matching Auth users, identities,
sessions and profiles; the separate owner's iCloud-linked account remained.
This verifies deletion of linked Litterbugs sign-in records. It does not claim
deletion of the Google account or revocation of the external Google grant.
The separate Apple revocation implementation gap remains open.

## Moderation

Fresh disposable member requests verified: legitimate intake reaches the
private queue with pending status, members cannot read the queue or resolve its
status, spoofed reporter IDs fail, and Other without details fails. The queue is
accessible with server administrator credentials. All fixture reports/accounts
were removed; the exact post-check found zero remaining target users/intake rows.

Fixture UUIDs: 96531b03-3e9e-4fe2-b53a-b8dd9b02aec7 and
be0c753a-4afb-4600-bc94-7b99f28d1dff. No actual inappropriate content was uploaded.

Confirmed gaps: the current source has only the mobile insertion path for
user_moderation_reports, and the deployed table has no trigger. No app-based
administrator queue or automatic alert was established. Database intake alone
does not demonstrate someone will review it. Cloudmersive malware scanning and
Gemini cleanup/funding triage do not establish a pre-publication filter for
offensive photos/text. An assigned reviewer and a review/removal workflow remain
necessary before broad unsupervised testing; none were invented or certified.

## Financial recovery

Credited existing August 28 sandbox card success on iPhone, Android and web,
plus documented refund/payout/idempotency evidence in funded-cleanup-launch.md.
No successful payment was repeated merely to reproduce historical coverage.

Added the two missing local interruption cases: Stripe retrieval rejects during
recovery, and persisting the retryable attempt fails. Both preserve the original
attempt and do not clear its identity. The focused deletion/payment run passed
41 tests across seven files. Draft/storage suites separately passed 15 tests
across three files. Mobile source validation passed 155 modules before the last
test-only additions.

Fresh provider decline testing passed in the existing Litterbugs sandbox
`acct_1U2HaBKUBoEpySr6`. A $5.50 simulated Dashboard payment using Stripe's
insufficient-funds test card returned “Your card has insufficient funds.”
Test PaymentIntent: `pi_3UEXViKUBoEpySr61nv5OJka`. No real card, customer, email,
or saved payment method was used. This verifies the provider decline only;
the subsequent full native checkout exercise is recorded below.

The August 28 native acceptance section records that sandbox credentials were
installed before live credentials. Current create-cleanup-contribution returns
the server's STRIPE_PUBLISHABLE_KEY, so selecting the dashboard sandbox cannot
switch native checkout. Fresh native decline/retry needs an isolated backend
with matching test keys and webhook handling; changing the shared live secrets
is not an acceptable substitute.

Additional sandbox integration check: imported the production mobile
reconcileContribution module and retrieved the existing declined PaymentIntent
above from Stripe. Its real status was requires_payment_method with
insufficient_funds. Reconciliation returned the original attempt as ready,
without clearing it. Confirming that same intent with Stripe's documented
pm_card_visa test method succeeded (livemode=false); no second PaymentIntent
was created. Reconciliation then kept the attempt submitted/pending while the
supplied ledger status remained payment_pending, rather than showing a receipt
or opening another retry. One focused integration test passed. The ledger
dependency was simulated; this does not certify native PaymentSheet or hosted
webhook delivery. No email/customer or live payment was used. Evidence:
`/tmp/lb-sandbox-recovery-evidence.json`; temporary runner archived at
`/tmp/lb-sandboxRecovery.audit.test.js` to avoid rerunning provider mutations in
the default unit suite. Test credentials remain outside the repository.

The connected Stripe MCP is live
and is not the Litterbugs sandbox, so it was used read-only. The account holder
authorized using their Stripe access; the browser exposes the existing
Litterbugs sandbox. No live transaction or production credential change occurred.

## User-testing handoff

### Native payment exercise: isolated environment

A separate Colima profile, litterbugs-audit, is capped at 2 CPUs and 4 GiB.
The scratch Supabase project is at
`/Users/grantgibson/Library/Caches/litterbugs-payment-audit`, with API port
62321 and database port 62322. It contains schema only; outbound production
notification/photo-cleanup URLs were replaced with a disabled local-test host.
No live credentials or customer data were copied into this database.

During preparation, an existing default-Colima SSH forward occupied the first
chosen database port (55322). A schema import reached the unrelated local
retirement-launch-local database and stopped at its existing profiles table.
Recovery removed the 22 empty imported tables and 81 imported functions in one
transaction with RESTRICT dependency checks, preserving the existing profiles
table and its two rows. Its table comment was restored to the source value
(NULL). No production database was written by this schema-import operation.
The Litterbugs schema was subsequently loaded successfully with a single
transaction directly into the explicitly named test container. Further test
operations must verify the API target and use the explicit container for SQL.
The native payment exercise subsequently passed on the physical iPhone 6s
(iOS 15.8.2), using a QA Release build targeting the isolated backend. The
current create-cleanup-contribution, check-contribution-status and
stripe-webhook functions ran against the copied schema. A disposable local
account and report were seeded; photo eligibility was set explicitly for this
payment-only fixture. This is not an additional AI/photo-review test.

The phone's PaymentSheet displayed TEST. A $5 contribution plus 50-cent fee
using Stripe's insufficient-funds card showed “Your card has insufficient
funds.” The real webhook marked the local contribution failed. Replacing the
card in the same sheet with Stripe's successful test card completed the same
PaymentIntent, `pi_3UEYuWKUBoEpySr61x3Iab7F`. The app displayed “Contribution
received,” $5 added and $5.50 total. Stripe confirmed livemode=false, one failed
charge attempt and one successful charge. The local ledger contained one
succeeded contribution (500 principal / 550 total), the report's fund was 500,
and exactly one contribution_succeeded audit entry existed. Both failure and
success events were recorded as test events. The returned report showed $5.
No real payment or public report was created.

Evidence retained locally: `/tmp/lb-native-payment-evidence.json`,
`/tmp/lb-native-payment-decline.png`, and `/tmp/lb-native-payment-receipt.png`.
This covers native decline/retry with real Stripe webhook delivery to an
isolated backend; it does not certify current production webhook settings,
Android decline/retry, or a phone-level network interruption. Earlier documented
successful native transactions and focused interruption tests remain credited.

Minor UX finding: adding funds to one's own report also showed the foreground
“Cleanup fund increased” notification above the receipt. Dismissing it worked,
and the receipt and report balances remained correct; suppressing this redundant
self-action notification is a follow-up polish item.

After the exercise, the regular QA build was reinstalled and launched to the
map. The local test session was revoked, the Stripe listener and local function
server stopped, and the audit VM shut down to release its 4 GiB allocation.
Temporary sandbox key/environment files and the disposable login credentials
were removed. Production credentials and store listings were not changed.

Use [the short tester checklist](../user-testing-checklist.md) and
[known issues](../user-testing-known-issues.md). These describe supervised
usability testing, not a store-release or all-transactions certification.

## Moderation implementation follow-up — local verification

The existing `/admin` now includes community reports, reported profile details,
removal/dismissal decisions, opt-in administrator alerts, and an explicit inbox
refresh. It retains the existing Litterbugs layout and MFA access gate. Reference
lock: existing app styling is primary; Refero Intercom inbox
`495176c6-5e39-47e1-ad06-004cf611bada` informed the queue/detail separation.
Evidence images use contain rather than crop so reviewers see the complete photo.

Local SQL verification in `supabase/tests/moderation_admin_workflow.sql` passed:
member intake creates a case; ordinary users and administrators without MFA cannot
remove it; report removal hides it from anonymous readers and owner edits and queues
eligible refunds; completed profiles can be cleared without deleting the account;
profile-only concerns support dismissal and alerts; opting out suppresses alerts;
deleting the source intake scrubs copied profile context from the review case.

Browser walkthrough used a disposable local reviewer with real local Supabase
password sign-in and authenticator verification. Alert preferences persisted,
the concern and photo displayed, the reason was required, and confirmed removal
resolved the case with visible decision history. This did not remove production
content. Local-only signed photo URLs were translated from the container hostname
to localhost for this walkthrough; production function source is unchanged by
that translation. No real money or push delivery was used in this check.

The walkthrough also found and fixed duplicate authenticator enrollment during
React development remounts and an inbox loading state that could remain stuck
when pressing the already-selected Open tab. User-facing authenticator language
now avoids internal authentication terminology.

Deployment, real administrator-device alert delivery, Apple authorization
revocation, Android payment decline/retry, physical-phone interrupted checkout,
and separate-user Facebook coverage remain outstanding. These local results
are not a claim that those remaining requirements passed.

### Apple implementation follow-up — not yet configured or deployed

Added native authorization-code capture, Apple token verification/exchange,
AES-GCM encrypted private storage, deletion-triggered revocation queuing,
immediate revocation attempt, and bounded retries through the existing internal
maintenance worker. Apple client configuration is exact per audience/team: a QA
key cannot silently substitute for production. Legacy accounts without saved
credentials receive an Apple Account link after deletion, following TN3194.

Four server tests passed using generated signing keys and intercepted Apple HTTP
requests: audience/subject binding, client-secret signing, encrypted owner/client
binding and tamper detection, and correct revoke request with failure preservation.
The local SQL test passed for service-only access, no revocation of active users,
credential survival after deletion, single-worker leasing, retry retention, and
credential removal after success. Mobile Apple/deletion/notification tests passed
(18 tests across three suites). The three changed server entrypoints passed
Deno checking. These checks did not contact Apple's revoke endpoint or delete the
owner's Apple account.

Still required: configure the correct Apple Sign in key(s), integration-test the
new endpoint and retry worker, final migration/advisor review, deploy in dependency
order, install the updated client, and complete outstanding device/payment/login
coverage. Native Apple revocation notification handling also needs review.

Native Apple revocation handling is now implemented: check on signed-in startup,
foreground return, and Apple's revoke event. Confirmed revoked/not-found states
end only the matching session; a newer login or unavailable check is preserved.
Four focused tests passed, and the mobile source check passed for 156 modules.
Real-device revocation remains untested to protect the owner's only Apple account.

Android checkout continuation: one emulator was started with a requested 1.5 GiB cap (the emulator raised its guest allocation to 2.5 GiB); the current client
is being built in `/tmp/lb-android-map-audit` against the isolated local backend
at emulator host `10.0.2.2:62321`. Cleartext transport is enabled only in that
throwaway native test build. Java 17 and the installed Android SDK are explicitly
selected for the build. No production native project settings were changed.

Android checkout reached native Stripe TEST mode ($5.50), but card input hit an
ANR in `PaymentSheetActivity`. The captured main thread was waiting in Android's
hardware frame renderer, and the emulator log explicitly reported a forced
software graphics fallback from host memory pressure. Evidence: `/tmp/lb-android-checkout-anr-detail.txt`
and `/tmp/lb-android-checkout-emulator.log`. This is not yet established as an app
defect; a cold boot with explicit host graphics is the next verification step.
No successful payment occurred in this attempt.

### Android native decline/retry passed

Cold boot with `-gpu host` eliminated the observed emulator input/rendering stall.
The same QA app then completed native card entry and payment normally. This is
an emulator configuration finding, not evidence requiring a production app change.

On Android API 36, Stripe TEST checkout for report
`94000000-0000-4000-8000-000000000001` displayed the insufficient-funds message for
card ending 9995. Replacing it with Stripe's successful 4242 test card completed
**the same PaymentIntent `pi_3UEZwXKUBoEpySr61zQEJX86`**. Stripe's API verified
`livemode=false`, `status=succeeded`, and `amount_received=550`. The isolated
ledger contains one succeeded contribution (principal 500, total 550). The app
showed “Contribution received” with the correct $5/$5.50 amounts. No redundant
own-report `cleanup_fund_increased` notice was created or displayed.

Evidence: `/tmp/lb-android-decline.png`, `/tmp/lb-android-retry-receipt.png`, and
`/tmp/lb-android-payment-evidence.json`. The earlier emulator restart also retained
the unfinished $5 checkout and resumed the same payment. This is useful Android
recovery evidence, but does not substitute for the requested interruption check
on a physical phone.

### Physical iPhone interrupted checkout passed

On the physical iPhone 6s (iOS 15.8.2), the isolated QA build opened Stripe TEST
checkout for report `94000000-0000-4000-8000-000000000002` with a $5 contribution
and $5.50 total. The app was terminated while the payment sheet was open, before
payment confirmation, then relaunched. Opening the report through My activity
and Fund cleanup retained the $5 amount and resumed the same PaymentIntent
`pi_3UEaGfKUBoEpySr61hEMUGxR`. Completing with Stripe's test card showed
“Contribution received” with the correct amounts. Stripe API verification returned
`livemode=false`, `status=succeeded`, and `amount_received=550`. The local ledger
has exactly one succeeded contribution and the report fund is 500 cents.

Evidence: `/tmp/lb-iphone-interrupted-payment-evidence.json` and
`/tmp/lb-iphone-interrupted-payment-receipt.png`. This covers force-quit before
confirmation, not force-quit after the charge but before webhook acknowledgement.
The disposable local reviewer was used; the owner's Apple account was untouched.

### Server rollout and final checks

The full `npm run check` passed after correcting the callback test's missing
account-storage mock and updating the configuration parity expectation for the
already-shipped Android splash sizing fix. Two additional Apple worker tests
passed (22 server tests total): an empty queue is untouched, missing configuration
or a provider failure retains the retry, and only a successful revoke completes it.
These tests intercept Apple requests and do not revoke any real account.

All three new migrations applied in order against the pre-change schema inside
an isolated transaction, then rolled back to preserve local fixtures. The local
security advisor reported no warnings. Production dry-run selected exactly those
three migrations; they were applied successfully to `mvaygkflcjswtwchflrk`.
Updated admin-cleanup-case, send-cleanup-notifications, store-apple-authorization,
delete-account and run-financial-maintenance functions deployed successfully.
Unauthenticated probes of the four authenticated endpoints returned 401.

Production advisors still report existing public privileged functions, pg_net's
schema, anonymous-access policy notices, and disabled leaked-password protection.
The new Apple and moderation RPC wrappers were not flagged as exposed privileged
functions. The storage evidence policy requires the existing administrator check;
it is not an unrestricted evidence grant. This is not a claim of a warning-free
production project. Apple credentials and actual revocation, real administrator
push delivery, updated client installation and separate-user Facebook coverage
remain incomplete. Web UI rollout is tracked separately from this server rollout.

### Web and iPhone rollout

Main commit `6144913` was pushed. Vercel deployment
`https://litterbugs-6f9t0tr9j-grant-9890s-projects.vercel.app` completed and aliased
`litterbugs.app`; the live admin page renders the new Community & cleanup review
heading and authenticator sign-in guidance. Production administrator sign-in was
requested to finish the private queue and alert walkthrough.

The current iPhone QA client was bundled, signed and installed on the physical
iPhone 6s, then opened successfully. The first bundle retained an old Metro
sandbox transform; a clean-cache rebuild corrected it. Byte-level checks confirmed
the production Supabase URL and configured public key and absence of the sandbox
URL before final installation. The final native transport settings prohibit
arbitrary loads. The owner's Apple account was not changed or deleted.

Payment test cleanup: three disposable local reviewer sessions were removed,
the local function server and Stripe forwarding process stopped, the dedicated
litterbugs-audit VM shut down, and the temporary Stripe credential file and
listener log removed. The unrelated default VM was left alone.

### Remaining access dependencies

Production secret-name inspection confirmed no Apple settings were present. A
new 32-byte encryption key was generated and stored as APPLE_TOKEN_ENCRYPTION_KEY
in Supabase; no existing key was overwritten, and the temporary input file was
removed. APPLE_SIGN_IN_CLIENTS is still missing, so automatic Apple authorization
revocation is not operational yet. This requires the matching Apple client/team
credential; the owner's only Apple account remains protected from deletion tests.
At this stage an authenticated browser session was not yet available. The
subsequent walkthrough and alert results below supersede that limitation.
Separate-user Facebook coverage remains unverified.

### Authenticated production moderation walkthrough

Google sign-in and the owner's authenticator verification opened the production
admin inbox. Alert preference was enabled. Existing case evidence and findings
loaded; decision buttons stayed disabled without a reason. The Community report
filter correctly showed no matching open cases. No production report was removed
or financial decision submitted. The page reported no registered notification
device for this administrator account.

The connected iPhone control session was restored. Its Google chooser contained
only the Gmail account, so the administrator's grant@burrowbase.com sign-in is
required before real administrator push delivery can be tested. The phone was
left on Google's sign-in page and the owner was asked to finish that sign-in.
Apple developer changes remain deferred following the owner's clarification
that the published app belongs to Luke's developer account.

### Production administrator alert and decision completed

The owner completed grant@burrowbase.com sign-in on the physical iPhone 6s.
The admin page then confirmed a registered notification device. One clearly
labeled administrator-only test case was created, with no member concern,
public report, profile change or payment attached. Only Grant received its alert.

Delivery was accepted on its first attempt and the Expo/APNs receipt returned
`ok`. The native app displayed the administrator alert with an Open admin inbox
button. That button opened the correct Community & cleanup review sign-in page
in Safari. Safari has a separate authenticated session from the native app;
no additional mobile browser sign-in was needed to verify this destination.
Background notification-banner appearance was not visually verified.

The authenticated desktop admin page dismissed test case
`f4b7822a-87c2-4a76-8439-c1e95bd6eae2` using No violation found, with the reason
"Authorized notification-delivery test completed. No member concern or content
violation." The UI confirmed "Decision recorded. No content was removed," and
the database audit history contains the corresponding `dismiss_report` action.
The test is retained in audit history rather than deleted.

Evidence: `/tmp/lb-admin-alert-confirmed.png` and
`/tmp/lb-admin-link-destination.png` (local temporary screenshots).
Apple credential configuration remains deferred; separate-user Facebook remains
unverified. No Apple/Google store publication, real charge or social post occurred.
