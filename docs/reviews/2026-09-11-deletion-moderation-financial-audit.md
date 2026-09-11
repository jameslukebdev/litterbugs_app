# Deletion, moderation and payment recovery — September 11

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
