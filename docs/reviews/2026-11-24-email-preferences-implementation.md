# Email preferences — implemented, not deployed

Grant authorized implementation after reviewing the samples: website first, then
both apps. Existing and new accounts start subscribed; signup has no newsletter
checkbox or marketing-email wording. No Resend integration or email sending.

Source checkpoints on `codex/email-preference-implementation-20261124` in
`/tmp/litterbugs-mobile-funders-20261120`:

- Website/shared backend: `db31a0b`.
- iPhone/Android settings and replay exclusion: `05dab6b`.
- Additional access/form checks and extension-free hashing: `8094f48`.

Own changes are also in the shared working tree. Shared Claude work was preserved;
checkpoint commits contain the feature changes rather than the unrelated working
changes. The shared checkout remains on its existing branch.

## Implemented behavior

- Website `/account/email-preferences` requires a verified signed-in permanent
  account. Settings links to it. It loads the actual preference and only reports
  a save after the server confirms it. Failed reads never appear as default on.
- Public `/unsubscribe` accepts an email without sign-in. Only an explicit POST
  writes; GET and email link scanners do not change preferences. Responses do not
  reveal account existence, echo addresses, or expose backend errors. Requests
  have origin/content/body validation, a bot trap, and a database-backed hourly
  request limit using a hash of the proxy-provided source address.
- `/admin/email` requires existing admin membership and MFA in both the page gate
  and the database. It lists confirmed, permanent email accounts, excluding
  review, deleted and currently banned accounts. Every Bcc/CSV export fetches the
  current preference again, independently of the cached/search-filtered table.
  CSV cells escape formula prefixes; exports contain only subscribed addresses.
- Luke can copy a footer with privacy, unsubscribe and preferences links after
  entering a valid business postal address. This page does not send email. Old
  Gmail drafts do not update when someone subsequently unsubscribes.
- Both apps have Settings → Email preferences. They use the same RPCs, refresh
  when focused/foregrounded and never pretend a device-only save changed email
  delivery. Phone-alert settings remain separate. Replay pauses on this screen.
- Prepared privacy policy text describes default subscription, withdrawals,
  Gmail, essential-email separation and retention of address hashes for suppression.
  The current source effective date is November24; update it if release is later.

## Backend prepared, never applied to the hosted project

Migration: `supabase/migrations/20261124211058_weekly_email_preferences.sql`.
It creates private RLS tables for address-hash preferences, change history and
unsubscribe rate limits. Plaintext recipient emails remain in Auth, joined only
by the MFA-protected admin function; no marketing list is copied into a public
table. Hashes are SHA256 of the trimmed lowercase address, not anonymous data.

At application time, existing non-guest email accounts are backfilled subscribed;
Auth triggers handle new accounts, OAuth/conversion and email changes. A prior
withdrawal survives account recreation and carries to a changed email address.
Explicit resubscription is available only to the signed-in owner. Anonymous
users cannot read or change preferences, enumerate recipients, or directly call
the service-only public-unsubscribe RPC.

Exposed RPC wrappers are security invokers; privileged bodies are in `private`
with fixed empty search paths and explicit execution grants. Existing admin MFA
checks are reused. No cron, SMTP provider, broadcasts, automatic send or OTA is
configured by this migration.

## Verification

- Website production build and full TypeScript: passed. Two existing filesystem
  tracing warnings in `social-card-bugs.ts` remain outside this feature.
- Selected website tests: 19 passed, including save failures, generic public
  confirmation, invalid/cross-origin/oversize requests, rate-limit errors, MFA
  gating, and fetching fresh recipients at export time.
- Shared contract tests: 3 passed (validation, fail-closed parsing, safe export).
- Native controls/client, notification and analytics tests: 52 passed.
- Native source checks: 232 modules, zero errors.
- iOS and Android Hermes release bundle exports: passed, locally only, under
  `/tmp/litterbugs-email-implementation/{ios,android}-export`.
- Disposable PostgreSQL17 migration/role tests: passed. Covers defaults,
  withdrawals, email changes, account recreation, idempotence, exclusions,
  anonymous/non-admin/non-MFA denial and rate limiting. No hosted data was used.
  Reproduce using `node scripts/test-weekly-email-preferences.mjs`. The bootstrap
  fixture is only for a new disposable database; never run it against a project.
- Browser: actual unsubscribe page reviewed at desktop and390px; no horizontal
  overflow. Signed-out account preferences redirect to sign-in with the target
  preserved. Admin recipients are gated by admin sign-in. No real unsubscribe,
  account creation, email sending or authenticated production change was tested.
- A broader pre-existing account-dialog test fails:
  `clears only the deleted account’s draft and journal after confirmed deletion`.
  Reproduced with the pre-change account-dialog source via a test transform,
  without modifying the shared file. Remaining24 account-dialog tests passed.
  This separate deletion issue was not changed. Its evidence is in
  `/tmp/litterbugs-email-implementation/baseline-test.log`.

## Release remains on hold

Nothing was deployed, no hosted migration applied, no app installed/uploaded,
and no OTA or email published. The new functions do not exist on the hosted
project yet; the new screens correctly report unavailable if pointed there.

When separately authorized, release backend first, verify it, then website,
then app OTA. Recheck actual authenticated cross-device behavior against that
backend before publication. Keep suppression records if rolling back the UI.

Gmail's prohibition on unsolicited commercial mail and its recommendation to
use opt-in remain unresolved for silent default enrollment. Coding this feature,
or adding the privacy text, does not clear that sending policy. The recorded
sources are `artifacts/email-opt-in-20261124/gmail-policy-review.json`.
Luke's valid business postal address must be used in actual email footers.

## Copy revision

Source `fd4fbd9` removes explanatory UI copy, email-address subtitles, example
email placeholders and frequency claims across the website, apps and previews.
The unsubscribe title is “Unsubscribe from email list”. Subsequent source
exports must be regenerated before any future authorized release.


## Local end-to-end verification (latest, November24)

Source `dc4b506` fixes a real reverse-proxy origin mismatch in the public
unsubscribe route, found while exercising the form through Next. The route now
compares the browser Origin with the validated configured public site origin,
without trusting arbitrary Host/forwarded input. Five endpoint tests pass,
including a public-origin/internal-request-URL regression. The remaining admin
home link now says Email list.

A disposable PostgreSQL17 instance plus PostgREST16.4 ran the actual prepared
migration. The actual website client/API and native iOS EmailPreferencesScreen
used that backend. Auth sessions were synthetic local fixtures; this is not a
hosted Auth/OAuth/MFA integration test. The iOS harness reused the2.1.1 native
libraries in a separate QA bundle identifier, with remote updates and analytics
disabled. The original simulator app and its data were preserved.

Observed passes:
- Website preference save, reload and persistence.
- iOS preference save reflected by website reload.
- Public unsubscribe confirmation reflected on iOS screen refocus.
- Native failed save shows an error, with successful retry.
- Admin home → Email list navigation and member suppression in the recipient list.
- CSV export fetched fresh data after native resubscription (two recipients) and
  public withdrawal (one), without manually refreshing the old admin table.
  Bcc copy also returned only the one subscribed fixture address.
- Real REST calls denied anonymous preference reads, member/non-MFA admin access,
  and member access to the service-only unsubscribe function.
- Latest full production-entry Hermes exports passed for both platforms in
  `/tmp/litterbugs-email-e2e/production-export`; bundles contain the expected
  project endpoint and no QA endpoint. Native configuration/dependencies match
  published source8855578, so the JS-only feature is eligible for runtime2.1.1 OTA.

Android runtime verification remains **pending**: Android36 fails to mount its
first-stage system partitions before the app starts. ADB detection was corrected
with the installed SDK binary; the failed emulator was stopped. A connected Pixel
was requested for a separate QA-namespace test. Android compilation/export is
passed, not native runtime. Test screenshots, request logs and REST results are
in `/tmp/litterbugs-email-e2e/`. No real user preference was changed.

These later local tests supersede the earlier 'not installed/authenticated' local
QA status above. Nothing was deployed or published. Hosted backend/website
verification must still follow an authorized backend deployment, before an app
OTA. Luke's future path is Admin → Email list (`/admin/email`), using his existing
admin account with MFA; that route is not live yet.
