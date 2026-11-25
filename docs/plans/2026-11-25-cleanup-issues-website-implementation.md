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

## Follow-up: utility, report document and team review

Owner screenshots supersede the initial local styling. Existing Litterbugs owns
all typography/bugs/tokens. Refero Airbnb style2b556363-5cb0-443f-a550-7273d108fea9
supplies grouped controls/white stages; Notion9ebdf4f5-e978-4e1f-8c60-e5fdbd3b3c4a
supplies compact labeled secondary controls; Airbnb support screen
c512d201-72ae-425a-8ec7-e4f724d4cf57 supplies icon+text contextual help choices.
Borrow hierarchy only; do not import their palette/typography/marketing layout.

- Cleanup options is now help-circle+label+chevron with brand pale-blue fill,
  #9bbbf3 border, #234485 text, Nunito800,46px touch target, rounded corners and
  subtle bottom edge. Group with evidence heading. Workspace width matches form.
- Resolved conversation becomes quiet history with explicit Resolved status.
- Account report uses a bounded4:3 photo/document layout, one full-width Timeline,
  one role-correct Continue cleanup. No duplicate Cleanup progress/payout prompt.
  Map styling is untouched. Reporter sees their own available actions, not a
  misleading Continue cleanup. Staff case opens directly to private conversation
  with one Back to review; no unrelated payment-review stack.
- Staff choices hold/ready/close require a note; close requires confirmation.
  Notes become immutable private messages. Reporter replies never clear safety.

Migration20261125175248_cleanup_issue_team_decisions.sql is LOCAL ONLY. New
MFA2-only versioned/idempotent decision RPC records outcome/note/actor/time. Old
local no-note approval is revoked. Hold keeps site/case paused; ready resolves
staff case but leaves explicit cleaner resume; close releases retained claim,
uses existing full refund queue, closes case/thread, notifies both participants,
never creates completion/reward. PostgREST schema cache reloaded after local SQL.

Browser: unsafe request -> reporter inbox/composer/reply -> real TOTP MFA2 staff
inbox -> hold -> cleaner stays paused -> ready -> cleaner resumes same claim,
314 seconds restored. Missing litter -> reporter reply -> staff close/confirmation
-> released claim, closed report,3500 principal+350 fee/3850 total refund_pending,
no payout/completion. Both cases resolved. Extended SQL suite passes MFA/member,
required-note, stale-version, retry, held/resume/close/full-refund/no-payout checks.
Fresh safety/missing scenarios remain for owner testing; default access request
awaits reporter, and its new notification has a working reply form. Old resolved
notification is deliberately read-only history. Desktop/390px responsive bounds
checked; temporary viewport reset. Evidence/logs in existing local fixture folder.

Tester now has scenario tabs and Use team. This dedicated local admin uses real
GoTrue TOTP challenge verification/AAL2; no personal credentials or core MFA bypass.
Secret is server-only in0600 browser-users.json, never rendered. Cached Edge Runtime
stalled before binding; its review container is stopped. Local review-adapter.cjs
runs existing admin-cleanup-case source in Node capped256MB on loopback62344, with
real local Auth/RPC/Storage. Dev-only guarded proxy permits list/get/read-alert only;
all case RPCs retain MFA/RLS. Providers/payments disabled; installed Supabase SDK
used. This does not verify deployed Deno runtime. Start via start-review-adapter.cjs
in the local fixture folder; logs review-adapter.log. New decisions use real RPC.
No hosted schema/web/function/OTA/store/mobile deployment or native source change.

Final verification:139 tests/12 files pass, extended SQL transaction rolls back
successfully, TypeScript/scoped lint/git diff checks pass. Temporary viewport reset;
no mobile source files changed. Current fresh Access issue347ca014-2032-4797-a49a-
c3bcdd91227d is open as reporter, with a blank reply box ready for owner testing.
Screenshots: branded-cleanup-options.jpg, revised-report-details.jpg,
reporter-active-reply.jpg, team-held-review.jpg, team-closed-report.jpg and
fresh-reporter-reply.jpg in the local fixture folder. Blue control is intentionally
secondary; mint remains the positive-state color. No deployments.

## November25 visual regression and broader local recheck

Owner found Share overlapping the title and directions escaping the details column
at medium widths. Earlier workflow/automated checks did not justify a blanket visual
readiness claim. Fixed both: embedded account heading and Share now occupy distinct
in-flow grid cells, with visible Share label (including resetting inherited clip-path).
Account document explicitly owns grid/flex/block/overflow at every breakpoint;
legacy map display:contents rules no longer flatten its panel/scroll container.
At900px and below the report stacks into a bounded photo plus a single details column.
Consolidated account/utility CSS overrides. Reporter sees Reply on an outstanding
issue and no redundant paused-cleanup footer beside Edit report.

Separate QA reports were created without changing the owner's pending scenarios.
Browser-verified current code:
- Actual report and a67-character title at1280/900/800/390/320: no title/Share
  intersection, no horizontal overflow, Share text unclipped, directions within
  panel and after heading. Measurements and screenshots saved outside repo.
- Share opens/closes, photo viewer opens/closes, Escape works, menu Escape and
 320px menu/form work; primary button remains reachable in scrolling request modal.
- Private request+processed photo -> reporter inbox -> reply -> funded public
 description/information/photo replacement -> reload/re-login persistence ->
 Still an issue -> second reply -> cleaner explicitly resumes same attempt.
 Public revisions2/claim original1 retained, fund3500 unchanged,97s restored.
- New safety request -> reporter reply -> real local MFA2 staff inbox -> hold ->
 ready -> cleaner resume;112s restored, fund unchanged. New missing-litter request
 -> reporter confirmation -> staff close+confirmation;3850 total refund_pending,
 no completion or reward. These use existing documented local case-handler adapter.
- Other member sees explicit public updates but no private message; private thread
 returns not-found. Owner issue347ca014-2032-4797-a49a-c3bcdd91227d remains
 awaiting_reporter. Reporter session and normal browser viewport restored.
- No relevant console warnings/errors or framework overlays.139 regressions plus
 40 existing ReportDetail tests pass (179 total), TypeScript/scoped lint/diff pass.
 No SQL/schema/new migration, hosted write, native source or deployment in this pass.

Evidence prefix /tmp/litterbugs-cleanup-issues-local-20261125/recheck-:
layout-measurements.json, report-{width}.jpg, long-title-{width}.jpg,
fixed-header-desktop.jpg, fixed-report-mobile.jpg, public-editor-390.jpg,
conversation-390.jpg, team-review-390.jpg, closed-800.jpg and check logs.
For browser automation, await the local role switch's303 destination before a
second navigation; its helper redirect otherwise races scripted goto calls.

Remaining boundaries: this is local website QA, not native app/push/email/provider
or real payment/refund verification; live delivery/Deno/provider limitations from
prior sections remain. Public report presentation vs separate account route was
explained to owner; consolidating those routes is a recommendation, not completed
work or new scope authorization. Do not claim that consolidation has been built.


## November 25 — consolidate account actions into the existing report

Owner approved removing the duplicate account report summary, keeping the private
conversation separate, with no deployment or native changes. Design target is the
existing public report layout previously supplied by the owner, not another new
report presentation. Its photos, status/share row, typography, single Timeline,
location, canonical metadata and structured data remain the presentation.

Implemented a client-only account-actions island on the public report: reporter
Edit report, assigned-cleaner Continue cleanup, owner Review cleanup, submitted
cleaner status, and participant-only private issue shortcut. Reads use signed-in
RLS; private excerpts/actions are absent from anonymous server HTML. Available
report owners retain the public Fund/Clean controls alongside Edit. Guests and
other members keep public actions. Closed/completed records have no active task
controls. Role changes clear old participant actions; failed reads offer retry.

Old /account/reports/[id] summary links redirect to /reports/[id], which resolves
to the unchanged readable canonical URL. The old ReportDetail summary rendering
was removed. Explicit task=cleanup/review routes remain focused submission/review
forms. Their Back link, the editor default return and conversation Back link all
point to the existing report. Explicit Resume still opens the cleaner task form.
Private conversations, receipts and staff review retain their authorization;
withdrawn/moderated public records are not republished by this consolidation.

Verification:
- 129 targeted tests pass in 9 files: role actions/SSR/private content/sign-out/
  retries/closed states, alias redirects and task authorization, public page,
  canonical routing/structured data, site history, and existing ReportDetail.
  TypeScript, scoped ESLint and git diff --check pass.
- Real local browser: old account link redirects through the id route to the
  readable report URL; reporter Edit form returns to it; private conversation
  remains separate. Cleaner Continue opens the existing branded utility/form.
- New isolated local report11925729-8fe6-4ce8-b978-050808087802: cleaner request,
  reporter Reply shortcut -> separate conversation -> reply, cleaner Response
  ready shortcut -> Resume -> cleanup form. Same attempt retained, issue resolved,
  pause cleared, synthetic fund3500 unchanged. No completion/payout generated.
- Outsider: no private message/action/shortcut on the report; direct issue URL
  renders not-found. Anonymous HTTP HTML contains neither local private test text
  nor Edit action; canonical unchanged. Only observed browser warning was existing
  header-logo LCP guidance, with no app errors.
- Layout at1280/900/390/320: no horizontal overflow, controls within viewport,
  one Timeline; desktop screenshot visually inspected. Default viewport restored.
  Original pending issue347ca014 remains awaiting_reporter, reporter session restored.
  Final screenshot: /tmp/litterbugs-cleanup-issues-local-20261125/consolidated-report-final.jpg.

Resource management: stopped only owned dev server while serial tests ran, cleared
its disposable .next output and reduced restart heap cap from1536MB to1024MB.
Turbopack disk cache remains disabled. Existing Chrome test tab stalled at CDP
focus setup; used and closed one temporary QA tab. No other chats, user tabs,
simulators or native builds were stopped. Host free-memory snapshots35–40%; disk
remains constrained and fluctuates with other work. No production database,
functions, website deployment, app build or OTA publication. Prior provider,
external delivery, actual refunds and Deno-runtime limitations still apply.
