# Supabase project boundary

This directory belongs only to project `mvaygkflcjswtwchflrk` in
jameslukebdev's organization. Any future change to that organization or project
requires explicit owner authorization.

The earlier migrations and Edge Functions predate the web replacement. Version
2 profile work adds new migrations and extends `delete-account` while retaining
the established report and photo behavior. The former website project
`syvgqzfbhkczkwozvola` was permanently deleted on August 21, 2026 and is
historical-only. Never attempt to connect or apply this directory to it.

## Baseline

The Supabase CLI is linked to `mvaygkflcjswtwchflrk`. The `baseline` directory
contains a read-only snapshot of the hosted public schema, functions, report
RLS, and custom Storage policies. Supabase-managed Auth and Storage internals
are not vendored.

The shared database types were generated directly from this project. The first
new migration narrows photo uploads to the existing `uid/report-id/file` path
shape and permits the same owner to delete those photos. It also fixes the two
existing function search paths and changes report ownership checks to evaluate
the same `auth.uid()` value once per statement. These are security/performance
hardening changes; report fields, defaults, results, and mobile paths remain the
same. The second migration adds the authenticated asynchronous photo-cleanup
path described below.

The three existing local migration filenames now use the authoritative hosted
timestamps. Their SQL was unchanged. The CLI-generated
`20260821031042_harden_report_and_photo_ownership.sql` and
`20260821032154_add_report_photo_cleanup_webhook.sql` migrations were applied to
the only live target on August 21, 2026 after explicit owner authorization.
`supabase migration list --linked` shows the full history aligned.

The cleanup migration adds an asynchronous database webhook for report deletes.
Its secret is generated inside a private, RLS-protected schema and is never
committed. The deployed `cleanup-report-photos` Edge Function validates that
secret, verifies the report no longer exists, and accepts only photo paths under
the deleted report's existing `uid/report-id/` prefix. This preserves the
mobile-facing delete result while removing its associated Storage objects.

`tests/report_and_storage_ownership.sql` passes in the hosted project's SQL
Editor with the new migration wrapped in the same transaction and rolled back.
No hosted schema or test fixtures were retained. It proves report
insert/update/delete ownership, the existing expiration trigger, fixed function
search paths, owner-folder photo uploads, cross-user upload rejection, and the
owner-delete policy. Storage API deletion and mobile upload behavior remain
release gates.

The applied hosted policies passed a live two-user API test: signed-out
insertion failed; User A could not insert, update, or delete User B's report or
upload into User B's Storage folder; owner operations succeeded; exact public
coordinates and expiration behavior were unchanged; and asynchronous photo
cleanup succeeded. Both temporary Auth identities were deleted and zero
fixtures remained.

The applied `20260821202747_guest_read_only_reports.sql` migration preserves
public report and photo reads while requiring a non-anonymous Supabase JWT for
report inserts, owner updates/deletes, and report-photo uploads/deletes. It also
removes report write grants from the signed-out `anon` role. Its expanded SQL
test passed against the hosted schema after deployment inside a single
transaction that rolled back every fixture. Live policy verification confirmed
the permanent-user helper, owner-only report and photo writes, retained public
reads, and removed signed-out report write privileges.

The deployed account-deletion function has separately passed a live disposable
Guest test: one object uploaded under the user's existing folder convention was
removed, the deleted Auth identity no longer resolved, and the object was no
longer downloadable. No report fixture was created by that test.

## Version 2 profile foundation

The hosted `profile_foundation` and `profile_foundation_advisor_indexes`
migrations were applied on August 23, 2026. They create one public profile for
each permanent Auth identity, preserve original Auth creation dates, detach
legacy anonymous report ownership, relate reports to profiles, maintain a
lifetime report counter, and add owner-only block and insert-only moderation
tables. The new public `profile_avatars` bucket accepts one image of at most
5 MB at `uid/avatar`; owner insert, select, update, and delete policies support
Storage upserts.

Post-deployment reconciliation found 30 permanent Auth identities, 30 profiles,
zero anonymous profiles, zero anonymously owned reports, one retained owned
report, and a matching lifetime-counter total of one. Read-only policy checks
confirmed public profile reads, no client profile insert/delete or counter
updates, no client moderation reads/status writes, private trigger isolation,
and all avatar write policies. Security-advisor warnings related to anonymous
Auth remain until the planned release cutover; write policies also require the
permanent-user boundary. The updated `delete-account` function is active and
removes the fixed profile-avatar path before deleting the identity.

## Volunteer cleanup backend foundation

The hosted `cleanup_backend_foundation`,
`cleanup_backend_foundation_advisor_fixes`, and
`complete_cleanup_phase1_model` migrations were applied on August 24, 2026.
They preserve the legacy `reports.status` field while adding a
server-managed cleanup-state projection, soft report expiration, immutable
cleanup attempts, versioned completion submissions, private reviews, and
versioned waiver acceptances. No placeholder or final legal waiver text was
seeded.

Phase 1 stores ordered after-photo metadata in
`cleanup_submission_photos` instead of an array on the submission row. Every
submission is transactionally constrained to one through three photos, while
each revision and its evidence remain immutable. Completed attempts record an
explicit `reporter_approved`, `self_approved`, or `auto_approved` outcome and
the final manual reviewer when that profile still exists. Request-change
reasons are limited to the four product-approved structured values.

The migrations replace both dashboard-created destructive expiration jobs with
one version-controlled once-per-minute `litterbugs-workflow-maintenance` job.
Existing reports were backfilled to `available`; expired available reports are retained
with `expired_at` instead of being physically deleted, and completed reports
are excluded from report expiration. Report owners retain the existing create,
edit, and delete behavior only while reports are available and active. Cleanup
workflow columns and transactional tables have no direct client write grants.

The private `cleanup_photos` bucket accepts JPEG, PNG, WebP, HEIC, and HEIF
images of at most 5 MB under the future `uid/attempt/submission/file` path
contract. Its policies reserve writes for the cleaner on active attempts and
public reads for accepted evidence on completed attempts.

`tests/cleanup_backend_foundation.sql` and `tests/cleanup_phase1_model.sql`
passed against the hosted schema inside transactions that rolled back all Auth
users, reports, waiver rows, attempts, submissions, reviews, photo metadata,
Storage fixtures, and scheduler assertions. The hosted performance advisor
reports no missing cleanup foreign-key indexes or duplicate cleanup SELECT
policies; newly added indexes remain expectedly unused until workflow traffic
begins.

## Volunteer cleanup transition security

The hosted `secure_cleanup_state_transitions` migration was applied on August
24, 2026. Cleanup mutations now run only through the authenticated
`claim_cleanup`, `release_cleanup`, `submit_cleanup`, and `review_cleanup` RPCs.
Each RPC derives the cleaner or reviewer from `auth.uid()`, rejects anonymous
Supabase users, validates the current state, and creates timestamps in the
database. Clients retain no direct write grants on cleanup transaction tables.

Claiming locks the report row before checking availability, expires a stale
claim within the same transaction, and relies on the existing partial unique
index as a second concurrency guard. Only a permanent user who accepted the
current active waiver can claim. Concurrent callers therefore cannot create two
active attempts for one report.

Submission requires one through three owned objects in the private cleanup
bucket and records an immutable revision. Review permission comes from the
original report owner rather than a client-supplied ID. Reporter approval,
self-approval, structured change requests, 24-hour claim expiration, and
48-hour automatic approval all preserve attempt and submission history.

`tests/cleanup_phase2_security.sql` passed before deployment with the migration
loaded in a rollback-only transaction and passed again against the deployed
schema. It covers guest denial, missing-waiver denial, atomic claim conflicts,
direct-write rejection, unauthorized release and review attempts, spoofed photo
paths, revision history, all approval methods, claim expiration, auto-approval,
and exact function grants.

## Cleanup release and expiration

Cleanup claim and review durations are centralized in the private database
functions `cleanup_claim_duration()` and `cleanup_review_duration()`. Their
production values are fixed at 24 hours and 48 hours. Cleanup transition RPCs
use those functions, and table constraints independently reject inconsistent
deadlines.

The server runs `private.run_cleanup_maintenance()` once per minute through one
`litterbugs-workflow-maintenance` Cron job. The stored `claim_expires_at`
timestamp remains authoritative: expiration history records that exact value,
the report returns to `available`, and an unread `claim_expired` notice is
created for the cleaner. The mobile app checks unread notices while active and
when returning to the foreground. Mobile timers are used only to retrieve
server-created notices; they never decide whether a claim expired.

To test the 24-hour or 48-hour paths without changing production durations,
use a rollback-only SQL transaction with disposable users and reports. Backdate
both timestamps while preserving their constraint relationship, run
`private.run_cleanup_maintenance()`, assert the resulting state, and finish with
`rollback`. `tests/cleanup_phase5_expiration.sql` demonstrates this method. Do
not edit the private duration functions for QA and do not commit shortened
intervals.

## Cleanup waiver and eligibility

The hosted `cleanup_waiver_and_eligibility` and
`cleanup_waiver_advisor_indexes` migrations were applied on August 24, 2026.
They independently version the cleanup acknowledgment and safety guidelines,
record immutable acceptance timestamps, and preserve both accepted versions on
each cleanup attempt. Direct acceptance inserts were removed from clients;
`accept_cleanup_waiver` derives the permanent user from `auth.uid()` and accepts
only the exact active version pair displayed by the app.

The launch migration publishes a production-draft acknowledgment and separate
safety-guidelines and assumption-of-risk/release bodies. It covers protective
equipment, roadways, parking, hazardous materials, sharps, property access,
local disposal rules, stop-if-unsafe guidance, funded-reward review, Stripe,
taxes, and Gemini processing. It is not described as attorney-approved.

The mobile report detail view offers **Clean Up** only to permanent users for
available, unexpired, uncancelled reports. Every cleanup claim presents the
current text and requires a fresh unchecked confirmation in the app before the
claim screen continues. The server still requires an immutable acceptance of
the exact active version pair and copies both versions onto each cleanup
attempt; changing either version therefore forces a new database acceptance.

`tests/cleanup_phase3_waiver.sql` verifies guest denial, exact-version
acceptance, immutable/idempotent acceptance records, removal of direct inserts,
claim version history, and required re-acceptance after a version change. All
earlier cleanup suites were updated for the two-version contract and pass
against the deployed schema in rollback-only transactions.

`tests/profile_foundation.sql` is a rollback-only disposable-database suite for
profile provisioning and validation, lifetime counts, block/moderation RLS, and
avatar paths. It must not be run directly against retained hosted data.

A final hosted-data reconciliation on August 21, 2026 found four older
anonymous, email-less QA identities from earlier acceptance work. They owned
exactly five test reports and three matching `report_photos` objects, with no
profiles or provider identities. Those exact rows, objects, sessions, and Auth
users were removed from `mvaygkflcjswtwchflrk`. A post-cleanup query verified
zero remaining target users, identities, sessions, profiles, reports, Storage
objects, or report titles containing `QA` or `test`.

Before the deleted project was removed, its schema-only historical backup was
verified at
`/Users/grantgibson/Downloads/Litterbugs-US-East-syvgqzfbhkczkwozvola-schema-2026-08-21.sql`:
1,854,591 bytes; SHA-256
`863f11ff194d721fd02c30cdad83d5aa07cfa87f74a260d9cb36539162bf9a20`;
147 `CREATE TABLE`, 500 `CREATE FUNCTION`, 41 `CREATE POLICY`, and 10
`CREATE SCHEMA` statements; no table data.
