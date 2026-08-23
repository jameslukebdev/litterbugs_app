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
