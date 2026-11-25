# Cleanup issues website implementation — local only

Owner authorized real local website implementation and full-flow testing. No hosted
schema, deployment, mobile edit, OTA, store change or real notification delivery.
Source worktree /tmp/litterbugs-cleanup-issues-web-20261125 from356c2d9 (websiteba1feca
plus design-only commits). Preserve all unrelated shared changes.

Approved product scope: active cleaner can privately request information, retain or
release claim, reporter privately replies, cleaner sees newest response from inbox
or persistent cleanup shortcut and explicitly resumes. Paused claims retain remaining
time. Safety/missing/moved concerns require team review; saving or replying never
self-clears those. No payout/completion for an issue. Public report corrections are
separate: reporter can edit description/photos/additional information with retained
original evidence/revisions, including funded/claimed reports. Funds, donors/privacy,
site/report identities and prior cleanup history remain intact.

Implementation plan:
1. Separate additive SQL migration for private issues/messages, neutral report hold,
   pause timestamps and content revisions. RLS participant/admin reads; authenticated
   RPC mutations require permanent current actor, ownership, active claim, idempotent
   request IDs and expected version. Guard old claim/fund/submit/expiry paths server-side.
2. Typed website issue API/data helpers and authenticated issue route. Existing inbox
   gets issue-specific links/events; private photos use scoped private Storage. Public
   edits use narrow revision RPC and approved media pipeline; preserve old files.
3. Quiet ellipsis utility in actual Your cleanup workspace/detail, persistent response
   shortcut, simple conversation screen with one back link, newest message, composer
   or Resume/Still an issue as appropriate. No repeated fund card, original report
   accordion, duplicate navigation, stacked divider lines or directional prose.
4. Run against isolated loopback Supabase with two test accounts. Dedicated local
   website port3001 avoids changing shared3000 or hosted data. No provider sends.
5. Verify SQL authorization/concurrency/hold/resume/revision/privacy and actual browser
   report→issue→reporter inbox→reply→cleaner inbox/shortcut→resume. Test refresh/relogin,
   private/public separation, safety and released claim. Check mobile web readability,
   existing cleanup/media/inbox regressions, TypeScript/lint. Commit own files and log.

Design lock: existing Litterbugs website + approved Refero-backed utility/conversation
flow. User screenshot supersedes prototype clutter: one report back-link, no repeated
Original report block or footer Back to cleanup; use whitespace over decorative rules.
Mint #b9e9dd/#8ed7c5 for successful resume, neutral utility/white surfaces, blue report
information, concise states and error recovery only. No new app work.


## Local implementation and verification

Implemented the actual authenticated website flow, additive local-only migration
20261125171211_cleanup_site_issues.sql, processed private photo storage and RLS,
issue inbox links/receipts, exact claim pause/resume, release/safety guards, staff
review link, and narrow public report edits. Public revisions/old files are immutable;
cleanup comparison and completed-public before photos use the claimed revision.
Private conversation has one back link, newest message, earlier messages disclosure,
explicit public report updates/photos when present, and state-specific actions.
No decorative divider stack, original-report accordion, fund card or duplicate footer.

Browser evidence used real local Auth, RPC, Storage and persisted database rows:
- Cleaner saved access request + processed private photo; reporter inbox linked
  directly to the private issue; reporter replied and separately edited a funded
  report description, additional information and replaced its public photo.
- Cleaner found response from the paused workspace without the inbox, saw newest
  reply and public report update, then resumed the exact same claimed attempt.
  Database confirmed 306 seconds restored, $35 unchanged, original photo revision1
  retained and current report revision2. No completion or payout was generated.
- Other member saw public edits, anonymous funder credit, and no private text;
  direct private conversation URL returned not-found. Reload and role re-login
  retained saved messages. Desktop/390px mobile web inspected, viewport restored.
- SQL suite supabase/tests/cleanup_site_issues.sql passed on a fresh isolated schema:
  participant/outsider/anonymous authorization, retry IDs, stale versions, exact pause,
  maintenance expiry skip, funded revisions/retained photos, safety MFA review,
  released claims/new claim/funding holds, no issue-driven completion/payout.
- TypeScript and scoped lint pass. Final combined cleanup/media/inbox/admin/public-share regression suite passes
  all139 tests in12 files, including original-photo preservation after public edits
  and four private issue notification destinations (website-regressions-complete.log).
  Node26 requires NODE_OPTIONS=--no-experimental-webstorage for jsdom review tests.

Test at http://127.0.0.1:3001/local-testing/cleanup-issues. The role switcher is
server-only development/loopback guarded and uses dedicated test accounts, not the
owner's account. Use cleaner -> Cleanup options -> Report an issue; use reporter
for inbox/reply/public edit; return to cleaner for response/resume. Existing saved
conversation is resolved, so a new request starts another real cycle.

Resource/recovery details (local paths contain private fixture credentials; never
publish their contents): /tmp/litterbugs-cleanup-issues-local-20261125/start-server.py
starts the dedicated website from this worktree. Docker context colima-litterbugs-audit,
2GB VM; isolated database litterbugs_cleanup_issues_20261125, API127.0.0.1:62341.
Service container names end litterbugs-issues-20261125; do not point this site at hosted.
Local cloned cron.launch_active_jobs is OFF to prevent any outbound jobs. Dev server
is capped1.5GB, Turbopack disk persistence disabled after clearing its disposable cache.
Existing shared3000 and all app sources are untouched. Keep these services for testing.

Not deployed / later release work: migration has NOT been applied to hosted; no web,
Edge Function, OTA or store deployment. Real email/native push delivery and external
malware/AI services are not verified here: provider responses are local fixtures;
image preparation/sanitization, Storage, authorization, private photo delivery and
in-app notifications are real local paths. Production notification-worker native
routing must be integrated/reviewed against current source before a future release.
No automatic unresponsive-party timeout is introduced; held cases remain held until
participant/staff resolution. Apps are unchanged and require their own later work.
