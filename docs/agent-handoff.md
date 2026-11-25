# Agent handoff log (Codex ⇄ Claude)

Grant uses two AI assistants on this project: **Codex** (ChatGPT desktop, works
directly in this folder) and **Claude** (Cowork, works mostly from a cloud copy).
They cannot talk to each other directly. This file is how they share context.

## Rules for both agents

1. **Read this file before starting work. Add an entry when you finish.** Put
   the newest entry at the top of the log. Keep each entry short: what you
   changed, what you deployed, what's still pending, and anything the other
   agent must not undo.
2. **Coordinate through this log.** Check existing changes before editing,
   preserve other work, and record unfinished tasks. Do not reserve editing
   access for an agent or require an agent handback before authorized work.
3. **Commit before handing off.** Don't leave uncommitted work for the other
   agent. The website's git history stopped on Oct 3, 2026 and the last month
   of work exists only as uncommitted changes. Fixing that is the top priority.
4. **Deploy only from committed code**, and record the commit hash in your entry.
5. **Database changes:** note every Supabase migration applied to production,
   with its file name.
6. Follow `AGENTS.md`. That includes the analytics rules: keep visitor
   analytics on, and exclude test browsers.

## Log

### 2026-11-25 — Codex (returned-litter mobile OTAs prepared; publication held)

- Prepared both full production2.1.1 Hermes exports fromb18dda0 on isolated branch
  codex/recurring-cleanups-mobile-20261125; NOT PUBLISHED, pending owner approval.
  Current production group5c8ab976 and both update IDs/mapping remain unchanged.
- Added single Timeline below Reported by in opened detail; blue dragonfly Needs
  cleaning again opens ordinary five-step flow with fresh photos/new owner/fixed
  site. Separate durable drafts/journals, retry/race guards, linked-site browsing;
  historical ownership/evidence/funds retained. Websiteba1feca/backend already live.
-702 mobile tests pass/1 existing skip;236-module check/lint pass. Both production
  exports/78 hashes verified.427 inherited files, all67 assets/platform retained;
  $35/funders/privacy/hearts/email preserved; native/dependencies unchanged.
- Sequential iPhone/Android native UI harness checks with real public history pass
  through Review/cancel; no report/upload/provider write. Full production exports
  compile; actual OTA download/activation awaits publication. Android local QA
  signature map-tile limitation retained. Original apps/data unchanged; owned test
  devices stopped, memory65% free. No store/backend/website publication in this task.
- Review: docs/reviews/2026-11-25-recurring-cleanups-mobile-ota-readiness.md;
  artifacts/mobile-recurring-cleanups-20261125/. Use frozen source/export, not dirty
  shared tree. Recover by republishing5c8ab976, never embedded. Other assistants'
  shared mobile/location-recovery, website and store screenshot work preserved.

### 2026-11-25 — Claude (new-look store screenshots submitted on both stores)

- Built 8 screenshots from the live 2.1.1 iPhone app (production data, Boone) in the
  new pastel style, using the October PPO winner's wording and order:
  See litter / Make real money / Donate / Map / See the difference / Track / Next
  cleanup / Get others involved. Outside members' names and photos are blurred.
  Source, renderer and exports: `release-assets/store-screenshots-2026-11-25/`
  (`node render.cjs apple|google`).
- Google Play: replaced the 8 phone screenshots in order 01–08, chose "Don't label
  assets", and sent 1 change ("Change Phone screenshots") for review. Managed
  publishing is still ON, so publish it from Publishing overview once approved.
- Apple: a live version's screenshots can't be edited. Created PPO test "New look
  screenshots - November 2026" (4fb6f1e6-2081-4ef8-a009-14a24487831f), 1 treatment,
  50% traffic, English (U.S.). Treatment A's 6.9" iPhone slot holds the new 8 in
  order; the 6.5" slot was cleared so it scales from 6.9". iPad 13" now has the new
  6 (see update below). Submitted to App Review (up to 48h).
- Pending: once Apple approves it, apply Treatment A to the original product page.
  This makes the new set the main listing and stops the test. On Google, publish
  the approved change. No code, build, OTA or deployment.
- Update (same day): added a 6-image iPad 13" set (2064x2752, captured from the
  live app on an iPad Pro 13" simulator; Report/Fund left out because they need
  sign-in) to Treatment A, replacing the old 3. To edit, the waiting submission
  2b604be7 was cancelled and the test resubmitted (Waiting for Review again).
  Files: `ipad-2064x2752/`, `source/ipad/`; `node render.cjs ipad`.

### 2026-11-25 — Codex (recurring-cleanup website published)

- Owner explicitly authorized website release. Source ba1feca (feature d56f7c3)
  deployed as dpl_6dT24qAxFCwMi31yqS6ekiaCDYGW; litterbugs.app points there/READY.
  Previous live00ed676 / dpl_ChohVa5bmXref91Qze5TH8a8Ewr7 is website rollback.
- Applied ONLY20261125013903_recurring_report_sites.sql to production
  mvaygkflcjswtwchflrk; exact source/history SHA256 verified.85 existing reports
  have separate site IDs. Guarded transaction proved original report/evidence,
  cleanup/contribution/reward rows and publish/claim/review definitions unchanged.
- Live pages/photos/API/sitemap/email-preference routes200. Browser renewal form
  opens; blue dragonfly action, compact Share and inset single map Timeline verified.
  No false recurrence/upload posted. Staff analytics exclusion retained. Legacy
  mobile-style read passes; anonymous reserve denied. Security58→58/no new issues;
  final deployment runtime error scan0. Vercel login refreshed and working.
- No native/Edge Function edit/deploy, OTA, store release, payment or send. Existing
  OTA5c8ab976 unchanged; native UI remains pending. Do not drop site/history schema
  or email suppression on website rollback. Other shared changes preserved.
- Details: docs/reviews/2026-11-25-recurring-cleanups-website-release.md.
  Evidence: /tmp/litterbugs-site-history-release-20261125/ .


### 2026-11-25 — Codex (website release readiness; no deployment)

- Optimized Next16.3/Turbopack production build of d56f7c3 passed, including TS
  and all37 static pages, using one page worker. Log:
  /tmp/litterbugs-website-readiness-20261125/production-build-final.log.
- Confirmed candidate descends from live00ed676 and contains no mobile source or
  Edge Function change. Recurrence migration is additive; ordinary report/cleanup
  RPC signatures and earlier report/evidence/fund identities remain intact.
- Website implementation is ready for release. Operational blocker: Vercel CLI
  rejected the saved authentication; whoami found no usable login. Stopped its
  automatic device-login wait; no new credential/access was granted. Refresh
  Vercel authentication before a hosted build/promotion. Secret env values are
  omitted by env pull; local build used the existing public Supabase project key.
- No deployment, hosted migration, mobile release, OTA or send. Existing holds
  remain. Shared localhost retained; only ignored build/dependency artifacts in
  the isolated worktree. Generated next-env change restored; other work preserved.


### 2026-11-25 — Codex (cleanup flow and action layout verified locally)

- Source d56f7c3 on codex/recurring-cleanups-local-20261124, mirrored into shared3000.
  Removed Find another cleanup; compact Share by the heading. Needs cleaning again
  uses the existing blue dragonfly reporting style under Reported by; map Timeline
  is inside the padded facts body. Real completed page/map +390px verified.
- Full local Auth/Storage/RLS lifecycle and browser report→claim→evidence→approval→
  recurrence pass; two cleanup cycles preserve original credit/evidence. Fixed
  JSON-null draft reservation and durable/edited/uncertain publication recovery.
  Map groups explicit site IDs; action/Timeline refresh shares one public read.
- 146 scoped regression tests, opt-in full-stack lifecycle test, disposable SQL,
  full TS and scoped lint pass. External verdicts/GPS are test fixtures; no real
  payment or delivery. Review: docs/reviews/2026-11-25-recurring-cleanups-full-flow.md.
- No deploy, hosted migration, native edit, OTA, store release or send. Prepared
  20261125013903 migration remains NOT APPLIED hosted;00ed676/5c8ab976 unchanged.
  Native work pending. Normal real-report localhost restored; QA VM/services
  stopped, overrides cleared, retired4.2GB generated cache removed. Other shared
  changes and Claude’s latest handoff entries preserved.


### 2026-11-25 — Codex (Apple screenshot test stop investigation)

- Read-only ASC check: exact October screenshot PPO test a046d8a4 is Stopped by
  Developer, November 2–5. Existing November 5 handoff records Grant requested
  stopping it while preparing replacement screenshots; upload controls were disabled.
- Analytics: original9.34%/15 unique impressions; Treatment A19.88%/11,
  +112.85% estimated improvement,3.5% confidence, Inconclusive. No proven winner.
- No store/test/settings/code change, restart, deployment or publication. Other
  assistants' existing work preserved. This entry is the only change from this check.

### 2026-11-24 — Codex (real website recurrence integration, local only)

- Owner rejected fictional examples. Normal localhost /cleanups and /reports now
  read actual published reports through anonymous RLS and group explicit site IDs
  before pagination. Existing unrelated/nearby reports are never auto-merged.
- Needs cleaning again on real completed pages opens the normal five-step form.
  Local recurrence verifies the real permanent member and fresh nearby GPS;
  new photos and occurrence metadata save only under the OS temporary directory
  litterbugs-local-website-sites. No hosted report/upload/financial write occurs.
- Added /sites/<site-id> for combined Timeline/current condition; recurring cards
  link there. Original readable report URLs, self canonicals, evidence and each
  occurrence's own Timeline remain. Prepared grouped RPCs and sitemap additions;
  20261125013903_recurring_report_sites.sql remains NOT APPLIED to hosted DB.
- CUA verified actual directories, real Hobby Lobby cleanup action/form, site
  overview and evidence.390px rendered width: no overflow, one Timeline; viewport
  restored, final console clean. Save/auth/location/concurrency, SEO, feed/page,
  existing wizard/detail tests, disposable SQL, full TS and scoped lint pass.
- Source8e904b9 on codex/recurring-cleanups-local-20261124, mirrored into shared3000.
  Evidence: /tmp/litterbugs-recurring-cleanups-20261124/real-cleanup-desktop.jpg and
  real-site-phone.jpg. Prior f000 fixture flow is retired from actual report loaders.
  No false recurrence was posted to a real site during browser QA.
- Still pending: isolated hosted-path quarantine/funding/claim/cleanup/notification
  integration, durable edited-draft recovery, map consolidation and native work.
  Local-only new reports deliberately cannot enter hosted fund/claim transactions.
  No deploy, hosted migration, OTA, store release, send or search submission.
  Website00ed676 / OTA5c8ab976 unchanged; unrelated shared changes preserved.

### 2026-11-24 — Codex (local recurrence actions simplified; SEO architecture review)

- Moved Needs cleaning again / View latest report into the existing public-page
  action stack below Reported by. Removed the redundant Cleaned twice / View
  timeline row from the actual local feature; count stays in the Timeline heading.
  Site data is loaded once on the server and passed to separate action/Timeline
  renderings; there is still one visible Timeline.
- Archived the local QA reports.json under the OS temporary directory (not erased)
  so the cleaned sample again offers Needs cleaning again. CUA confirmed its form
  opens, clean layout after closing, one Timeline, no redundant row, clean console.
 19 activity/page tests, TypeScript and scoped lint pass. No new simulator/build.
- Owner raised SEO integration: reviewed existing readable report URLs, metadata,
  canonical, sitemap, structured data and active/completed listings. Recommend
  preserving occurrence URLs and both directories, with a distinct stable site
  overview for recurring locations; no SEO routing/canonical change implemented.
- Three-URL live SEO sample returned200 for both directories and a completed report
  (existing id URL307 to readable URL). No GSC/GA evidence joined. Raw HTML canonical
  placement warning requires rendered verification because Next streams metadata;
  it is not a confirmed indexing/ranking defect. One external TikTok check blocked.
- Source on codex/recurring-cleanups-local-20261124; all shared unrelated work
  preserved. No deploy, hosted migration, native change, OTA, send or search submission.
  Evidence: /tmp/litterbugs-recurring-cleanups-20261124/corrected-actions.jpg.
  Previous readiness limitations remain; see the local implementation review.

### 2026-11-24 — Codex (local recurring-cleanup website build; release held)

- Existing report page/map detail now integrate one grouped Timeline and Needs
  cleaning again via the existing five-step wizard. New occurrences keep the
  new submitter; previous reporters, donations, evidence and cleanup credit stay.
- Added persistent local review dataset at /reports/f0000000-0000-4000-8000-000000000002.
  QA created Jamie occurrence f0000000-0000-4000-8000-6bb60bfff335 locally only.
  Fixture saves/photos never write to hosted Supabase.
- Prepared20261125013903_recurring_report_sites.sql, NOT APPLIED to hosted DB.
  Isolated local PostgreSQL tests pass for identity/funds/idempotency/duplicate/
  privacy gates.88 targeted web tests, full TS and scoped lint pass. CUA form/
  server save/reload/Timeline/evidence checks pass; final console clean.
- Owner reported application-memory exhaustion. Removed generated4.2GB Next
  Turbopack cache and shut down test iPhone17 Pro without erasing data. Its
  background services exited; about8.4GB disk available afterward. Personal
  Chrome/Claude preserved; checks switched to sequential. No simulator restart.
- Checkpoint on codex/recurring-cleanups-local-20261124, isolated worktree
  /tmp/litterbugs-site-history-preview-20261124; own changes mirrored to shared3000.
  Release still held: native work, map/list consolidation, recurrence form recovery
  hardening, narrow rendered QA and full backend integration remain pending.
- Review: docs/reviews/2026-11-24-recurring-cleanups-local.md; evidence:
  /tmp/litterbugs-recurring-cleanups-20261124/. No deploy/hosted migration/native
  change/OTA/store publication. Website00ed676 and OTA5c8ab976 unchanged.
  Preserve unrelated shared work and previously published email/$35/funder/privacy/heart changes.

### 2026-11-24 — Codex (updated recurring-cleanup previews with existing Timeline)

- Preview only: Jamie owns the new occurrence; Alex/Riley retain earlier reports.
  Normal reporting/review remains simulated. Existing Renew stays separate.
- One embedded Timeline groups report/donation/claim/cleanup events and expandable
  evidence. Cleaned twice jumps to it in App and Website mockups.
- Concurrent submission opens Taylor's current report with an inline notice,
  without another public Jamie report/pin/fund. Product copy remains concise.
- Scoped TypeScript/ESLint and interaction checks pass;1440x1080 and390x900 layouts
  have no overflow/broken images. One editing-time Fast Refresh warning did not
  recur after reload. Evidence: /tmp/litterbugs-site-timeline-preview-20261124/.
- Committed on codex/site-history-preview-20261124; mirrored to shared localhost3000.
  No production build/deploy, schema, actual Timeline/native/OTA change.
  Website00ed676 and email OTA group5c8ab976-b063-4497-b5be-d15045622988 unchanged.
  Actual site identity/concurrency/financial integration remains pending.

### 2026-11-24 — Codex (recurring-cleanup ownership and Timeline discussion)

- Recorded owner's intended new-report attribution: the new submitter owns that
  occurrence; normal reporting/cleanup/review/reward rules apply. Existing Renew
  for an open report keeps its author and remains a different operation.
- Checked existing website Timeline. Recommended one expanded site Timeline with
  grouped occurrences/cleanup evidence, instead of a duplicate chronological history.
  Already reported is a stale/concurrent-report exception; recommend opening current
  report with a notice rather than another normal-flow page. These are discussion
  recommendations, not implemented preview changes or deployment approvals.
- Updated recurring-cleanup research plan on codex/site-history-preview-20261124.
  Preview, production website/backend and all OTA updates unchanged.

### 2026-11-24 — Codex (recurring-cleanup research and local preview only)

- Researched FixMyStreet, SeeClickFix, TrashOut, NCDOT pickup records and Refero
  activity/photo/reporting patterns. Recommended one site with separate linked
  report occurrences; preserve previous photos, cleaner credit, funds and payouts.
- Added development-only /dev-review-preview/site-history with App/Website views:
  cleaned site, new photo report, review, active again, expandable dated history,
  duplicate handling. Client-state fixtures only; no live report/API/payment writes.
- CUA initial flow and Chrome visual checks pass at1440x1080 and390x900, no horizontal
  overflow/broken images or console errors. Required-photo/submit/review/history/
  duplicate/dialog loops passed; scoped TypeScript/ESLint passed. App view is a
  browser mockup, not a native implementation. Viewport overrides restored.
- Product copy stays concise. Existing mint/bugs/Nunito retained. New fund starts
  at0; old35 payout stays in history; new photo reactions start at0. Sample photos
  are from an already public report; all repeated events/names/dates are illustrative.
- Plan: docs/plans/2026-11-24-recurring-cleanups-research-preview.md; evidence:
  /tmp/litterbugs-site-history-research-20261124/. New preview files committed on
  codex/site-history-preview-20261124, mirrored to shared preview server3000.
- No deployment, schema migration, native app change or OTA. Email preference
  production group5c8ab976-b063-4497-b5be-d15045622988 and website00ed676 unchanged.
  Actual backend/site identity/concurrency/financial-history work remains pending.
  Preserve unrelated shared work and in-progress public report timeline.

### 2026-11-24 — Codex (email preferences OTA published and native-verified on both)

- Grant explicitly authorized publishing and download/run checks. LIVE production
  group5c8ab976-b063-4497-b5be-d15045622988 at7:31p.m. Eastern, runtime2.1.1.
  iOS01a2101d-affe-71ae-91a6-3520ab426438;
  Android01a2101d-affe-7799-af82-c27f73cba200. Frozen app source4cb2161;
  EAS publication commit3db81d5 (identical app scope, later tooling/docs only).
- Both native updaters downloaded the exact published bundles; each launched twice,
  zero failures. Real review-account Settings/preference save/reload/cross-platform
  sync passed; Android cold restart persisted sign-in and preference. Original on
  preference restored and confirmed in production DB. Temporary password copy removed.
- $35 tutorial visually retained on both; funders/privacy/hearts source unchanged,
 426 inherited files and67 assets/platform unchanged. Only12 email-related files
  differ from prior live8855578. All74 hosted unique asset/bundle checksums pass.
- Final channel/group readback and runtime checks pass. Scope is existing iPhone
  simulator and Android QA emulator with released27 native code/local QA signature;
  no physical phones connected. Known Android QA-certificate map tiles limitation.
- No new website/schema/store build, payments or sends. Silent updates retained;
  both staff devices analytics excluded and apps left open. Previous email OTA
  publication hold is superseded. Website/backend remains00ed676; provider exclusions
  unchanged. Shared unrelated edits preserved, no shared reset/staging.
- Review: docs/reviews/2026-11-24-email-preferences-ota-publication.md; full evidence:
  artifacts/mobile-email-preferences-20261124/. Recovery republishes prior22df191b
  group to preserve previous OTA improvements; never rollback to embedded.

### 2026-11-24 — Codex (both email-settings OTAs ready; prior updates preserved)

- Prepared, NOT PUBLISHED, full production iOS/Android Hermes OTA exports for2.1.1
  from4cb2161; toolingd4e06f4. Website/backend00ed676 already live and unchanged.
- Compared against current live8855578/group22df191b-5980-40c9-9a09-ec76a43cb2bb:
  $35 tutorial/funders/donation privacy/hearts retained,426 inherited files unchanged,
  zero removals, all67 prior assets/platform byte-identical. Only12 email-related
  app/shared files differ; native configuration/dependencies unchanged.
- 683 mobile tests pass/1 existing skip;231-module check and scoped lint pass.
  Both full frozen exports/78 hashes and EAS offline inputs validated. Prior local
  native flow checks passed; actual published OTA download remains pending.
- Production channel/group unchanged. Publication tool now stops if the live OTA
  baseline changes; simulated freshness guards pass, no actual update invoked.
  Recovery plan republishes the prior OTA group, never rolls back to embedded.
- Evidence: artifacts/mobile-email-preferences-20261124/; review:
  docs/reviews/2026-11-24-email-preferences-ota-readiness.md. Use isolated mobile
  checkout/source bundle, not the website branch or dirty shared tree. Publication
  remains held; no store builds, sends or unrelated shared changes.

### 2026-11-24 — Codex (email website/backend published; app OTAs still held)

- Grant explicitly authorized website/backend publication. LIVE source00ed676
  on codex/email-preferences-web-release-20261124, based on exact liveee03802;
  only the prepared email feature was merged. Shared unrelated work preserved.
- Vercel production dpl_ChohVa5bmXref91Qze5TH8a8Ewr7 promoted from the checked
  production build to litterbugs.app. Rollback: dpl_CmFQNjduJ1pyQboeKs1nM7bBdtsS.
- APPLIED20261124211058_weekly_email_preferences.sql to mvaygkflcjswtwchflrk,
  exact migration history/source hash verified;93 non-guest addresses backfilled
  default-on. No Edge Function, email sending, schedule or financial change.
- All1219 web tests/167 files,3 shared tests, local SQL/role checks, TypeScript
  and cloud production build passed. Lint zero errors/four inherited warnings.
- Live staff browser: Settings link, preference load, public unsubscribe, off
  after reload, save on and reload persistence passed. Staff preference restored
  to true. Anonymous/private/member/MFA/service guards passed; test SQL writes
  rolled back. Advisors58→58, zero new; runtime error scan zero records.
- Privacy disclosure is live (November24). Luke's list: /admin/email with existing
  admin+MFA; local dashboard/export UI and live DB role checks passed. No new
  administrator/MFA setup or emails. Checking browser analytics excluded.
- App OTAs remain UNPUBLISHED/held. Use the prepared mobile implementation branch
  for any later OTA, not this website branch's unchanged mobile source. Preserve
  suppression on rollback. Gmail sending-policy finding remains; no sends enabled.
- Details: docs/reviews/2026-11-24-email-preferences-website-release.md; evidence:
  /tmp/litterbugs-email-web-deploy-20261124/. No shared reset or force-push.

### 2026-11-24 — Codex (localhost preferences error diagnosed; deployment hold preserved)

- Confirmed localhost3000 uses the hosted Supabase project. Its application RPC
  returns404/PGRST202: get_weekly_email_preferences is absent from schema cache.
  The prepared email migration remains unapplied, so the real-account screen
  cannot load there yet. Earlier passes used isolated local PostgreSQL/PostgREST
  and synthetic Auth/native harnesses; they were not hosted-account verification.
- Explained this distinction to Grant. No behavior/source changes, hosted schema
  changes, website/app deployment, OTA or email sends. Existing hold preserved;
  feature source remains dc4b506. A localhost UI does not make a hosted backend
  migration a local-only change.

### 2026-11-24 — Codex (Android emulator repaired; local native email checks passed)

- Replaced the failing disposable profile's incorrect system-partition mapping
  with a valid isolated QA profile. Android16 reached home and completed a full
  OS restart. Saved ADB GUI preference explicitly to the installed SDK binary.
  New durable launcher: ~/Applications/Litterbugs Email QA.app; profile:
  ~/.android/avd/Litterbugs_Email_QA.avd. Uses the installed emulator37.1.11,
  cold boot/no snapshot saves. Newer37.3.10 was tested separately and removed.
- Local Android production EmailPreferencesScreen/SessionProvider/Supabase client
  ran in a native2.1.1 harness. Save persisted in real local PostgreSQL/PostgREST;
  public website unsubscribe appeared after native refocus; simulated failed
  save left DB unchanged and showed an error; retry and cold-app relaunch passed.
  Native libraries/DEX/Kotlin resources matched the original payload. Corrected
  QA-only package resource stripping and refreshed fixture auth; app source was
  unchanged. This supersedes the previous Android-runtime pending status.
- Fixtures use synthetic Auth against a disposable backend, not hosted login or
  production preferences. No real user changes or sends. Tests/photos/results in
  /tmp/litterbugs-email-e2e/. QA app removed after testing; local services stopped;
  temporary index/client/Next config restored. Original app data preserved.
- Disk cleanup removed generated QA builds/caches. Obsolete Small_Phone and
  Litterbugs_API_36 Quick Boot caches were archived and verified under
  ~/Library/Application Support/Litterbugs/QA/ before removing the raw caches.
  Installed apps/userdata were preserved; recovery instructions are beside the
  archives. The new launcher avoids RAM snapshots.
- Source dc4b506 remains the latest feature fix; this pass changes verification
  records only. NO hosted migration, website deployment, app/OTA/store publication
  or email send. Backend/website/app deployment remains on hold; hosted checks
  must follow a separately authorized release. Gmail-policy finding persists.

### 2026-11-24 — Codex (local email flow verification; release still held)

- Source dc4b506 fixes public unsubscribe origin validation behind a reverse
  proxy using the configured site origin, and renames the remaining admin link
  to Email list. Five endpoint tests passed; own edits mirrored to shared.
- Actual website forms/admin and the production iOS preference screen passed
  against disposable PostgreSQL17 + PostgREST16.4 using synthetic test sessions:
  website save/reload, iOS save → website refresh, public unsubscribe → iOS focus
  refresh, failed native save/retry, Admin → Email list, and fresh Bcc/CSV export
  after resubscribe/withdrawal. Local-only helper auth and native harness; this
  does not prove hosted Auth/MFA integration or physical-store-device behavior.
- REST role checks passed: anon preferences denied; non-admin/non-MFA admin list
  denied; signed-in member cannot call service-only unsubscribe. Latest full app
  iOS/Android Hermes exports passed; native config/dependency diff from published
  8855578 is empty, so the feature remains OTA-compatible with runtime2.1.1.
- Android native runtime is NOT verified: local Android36 emulator fails its
  first-stage partition mount before the app can launch. ADB discovery fixed
  using the installed SDK path; failed emulator stopped. Pixel connection
  requested for a separate QA-namespace test, without replacing its store app.
- Evidence/logs/screenshots: /tmp/litterbugs-email-e2e/. Hosted migration remains
  UNAPPLIED; no website deploy, OTA/store publication, real preference changes or
  email sends. iOS QA app was isolated from the existing simulator app. Release
  order remains backend → website → apps; hold and Gmail-policy finding persist.

### 2026-11-24 — Codex (concise email UI; frequency wording removed)

- Owner copy preference: new screens should rely on headings, field labels and
  actions, without explanatory subheadings, directions or developer/meta copy.
  No promised email frequency. Use Email list / Litterbugs emails in the UI.
- Changed unsubscribe heading to Unsubscribe from email list; removed the two
  helper paragraphs and example placeholder. Email input is empty. Removed the
  standalone member email beneath Email preferences on website/apps/previews.
- Simplified confirmation, preferences and admin/export/footer copy; preview
  helpers removed. Prepared privacy disclosure no longer promises a frequency.
  Essential form errors and privacy-policy disclosure remain functional.
- Source fd4fbd9 on codex/email-preference-implementation-20261124 in isolated
  checkout; mirrored own edits to shared, preserving unrelated work. TypeScript,
  scoped lint,13 web and3 native screen tests passed. Browser confirmed blank
  unsubscribe field/no placeholder, concise headings and no email subtitle.
  Screenshots: /tmp/litterbugs-email-copy/. No backend/behavior changes.
- Nothing deployed, no migration applied, no app/OTA published or email sent.
  Earlier native export artifacts precede this copy pass; regenerate from final
  committed source during any later authorized release. Existing release hold
  and Gmail-policy finding remain in force.

### 2026-11-24 — Codex (website then apps implemented; deployment explicitly held)

- Grant authorized the approved default-on email concept to be built, website
  first then apps, with no deployment. No signup checkbox or newsletter wording.
- Website: /account/email-preferences, public /unsubscribe, existing-admin/MFA
  /admin/email with fresh Bcc/CSV and copyable footer; prepared privacy text.
  Migration20261124211058_weekly_email_preferences.sql is UNAPPLIED on hosted DB.
  Private RLS/address-hash suppression/history; owner-only preference RPCs and
  service-only unsubscribe; withdrawal survives recreation/email changes.
- Both apps: Settings → Email preferences; shared RPC, server-confirmed saves,
  focused/foreground refresh, replay disabled. Phone notifications unchanged.
- Source checkpoints in isolated codex/email-preference-implementation-20261124:
  website db31a0b; apps05dab6b; verification/hashing8094f48. Own edits mirrored to
  shared checkout without reverting/staging others' changes. Review record:
  docs/reviews/2026-11-24-email-preferences-implementation.md.
- Website production build/TS/lint passed;19 selected web +3 shared +52 native
  tests passed;232 native source modules clean; iOS and Android Hermes exports
  passed locally. Disposable PostgreSQL migration/role tests passed. Actual public
  page checked desktop/390px and signed-out access gates. No live authenticated
  cross-device verification yet; backend is intentionally not deployed.
- Existing account-dialog draft-deletion test fails also with pre-change source;
  other24 tests pass. Existing social-card-bugs filesystem-tracing build warnings
  remain. Neither issue was changed. Evidence in /tmp/litterbugs-email-implementation.
- NO hosted migration, website deploy, app installation/upload, OTA, or email send.
  No automation. Gmail silent-enrollment policy gap persists; postal address must
  be supplied in real footers. Later authorized order: backend, verify, website,
  apps/OTA. Preserve suppression on rollback. Existing unrelated work preserved.

### 2026-11-24 — Codex (default subscription concept; Gmail/privacy checks)

- Grant superseded the unchecked signup concept: existing and new accounts start
  subscribed, with no newsletter checkbox or email messaging in signup. Preview
  only; no live implementation, account writes, sends or policy publication.
- Updated seven-screen sample gallery, including a separate Privacy draft. New
  sample Jamie increases subscribed count200→201, is labeled Signup default,
  and unsubscribe restores200 with1 unsubscribed. No signup checkbox/marketing
  copy in product form; desktop/390px reviewed, ESLint/targeted TS pass and no
  console errors/warnings. Prior Gmail clipboard readback limitation remains.
- Live Gmail program policy (updated Oct20) prohibits unsolicited commercial mail;
  sender guidance recommends opt-in and discourages automatic subscription.
  U.S. CAN-SPAM opt-out allowance is not Gmail approval. The requested silent
  enrollment concept is NOT cleared for Gmail sends; a privacy update alone
  does not establish permission. Consumer Gmail's published500-recipient/message
  threshold is a separate volume limit, not consent or delivery assurance.
- Live litterbugs.app/privacy describes operational email/providers but not weekly
  marketing/default enrollment/email unsubscribe. Draft disclosure exists only
  in preview; no live policy edit. Evidence with official Google/privacy links:
  artifacts/email-opt-in-20261124/gmail-policy-review.json.
- Source checkpoint2eb339b, branch codex/email-preference-previews-20261124 in
  /tmp/litterbugs-mobile-funders-20261120; own files mirrored to shared checkout.
  Preview: http://localhost:3000/dev-review-preview/email-opt-in?screen=signup.
  New screenshots: /tmp/litterbugs-email-previews/signup-default-on.jpg and
  privacy-draft.jpg. No deployment/migration/OTA/store work. Gmail permission,
  actual sending workflow and business postal address remain unresolved.

### 2026-11-24 — Codex (Gmail email preference previews; sample data only)

- Grant wants a simple Gmail workflow for Luke at teamlitterbugs@gmail.com;
  explicitly excludes Resend for now and requested previews before live changes.
  Current accounts should remain subscribed until withdrawal; new signup choice
  starts unchecked. Existing account default is not represented as explicit consent.
- Added development-only /dev-review-preview/email-opt-in with app preferences,
  signup, sample Gmail/footer, public unsubscribe + confirmation, website
  preferences, and recipient Bcc/CSV export. All 200 initial records are fake;
  in-memory state only, no database/network writes or email sending. Reset restores
  the fixtures. Production route returns notFound. Business address is a placeholder.
- Source checkpoint 7ce0121 on codex/email-preference-previews-20261124 in
  /tmp/litterbugs-mobile-funders-20261120; own files mirrored to shared checkout.
  Existing Claude/shared edits preserved. No website, OTA, store or DB deployment.
- Browser checks passed: current member starts on; saved opt-out and footer
  unsubscribe update setting/list; unchecked signup stays out; checked signup
  joins; CSV has 199 sample addresses after Alex opts out, excluding Alex.
  Copy reports success but browser clipboard readback is empty, so independent
  clipboard content verification is pending. Scoped ESLint/TypeScript passed;
  desktop and 320/390px layouts checked, no console warnings/errors.
- Local gallery: http://localhost:3000/dev-review-preview/email-opt-in.
  Screenshots and QA evidence: /tmp/litterbugs-email-previews/. Live integration,
  mailing address and actual Gmail copy/paste workflow remain future work.

### 2026-11-24 — Codex (email opt-in research recovered; silent OTA choice confirmed)

- Grant explicitly chose to keep OTA updates silent for now; do not add a
  restart/applied popup without a new request. No lifecycle/UI change made.
- Recovered original November20 research in Research email opt in setup,
  ChatGPT6b006b52-0dc8-83ea-8d6f-149012600584, from its backing history.
  Initial recommendations: optional unchecked signup choice, dismissible existing
  member invitation, account Weekly emails setting, public confirmed subscription
  form; consent/withdrawal evidence and sender unsubscribe/suppression sync.
  Keep transactional mail separate; account creation alone is not opt-in.
- It was research only; no marketing implementation or emails/list edits were
  made. Current reviewed mobile notification settings remain phone-alert controls.
  Resend Broadcasts was a candidate, not an established provider decision.
- Luke's weekly sending service and current list consent provenance remain
  unverified. Read-only Resend domain/broadcast discovery returned401 because
  connector key is restricted to sending. No send, contact edit, expanded access
  or retry with other credentials. Need Luke's sending-platform name to select
  the integration. Recovered findings saved in
  artifacts/email-opt-in-20261124/recovered-research.json.
- No app/backend/website/OTA/store deployment or database change. Other shared
  work preserved; research handoff checkpoint committed in isolated checkout.

### 2026-11-24 — Codex (latest OTA tutorial verified on both; silent-update research)

- Grant requested actual latest OTA download/run and $35 tutorial checks plus
  research into optional restart messaging. No new publication or app code edit.
- Latest group22df191b verified natively: iOS01a20f3c-2fa6-79f0-afeb-1394efa0a864
  downloaded and launched on current2.1.1 simulator,1 successful/0 failed launches;
  Android01a20f3c-2fa6-73e4-8ccd-e4e81d54d573 downloaded/launched on released27
  native QA harness,2 successful/0 failed launches. Cached SHA256s match latest
  exports. Both visibly show tutorial pin $35 and card Pays $35. Android compact
  720x1280 hides its card summary by design; normal-height720x1600 verifies Pays.
- Screenshots/native DB/hash evidence: artifacts/mobile-tutorial-20261124/
  device-activation/activation-verification.json and adjacent PNGs. No physical
  phones connected; Android temporary-signature Maps limitation remains. Native
  startup fatal-error scan zero. No real payment or donor/favorite mutation.
- Device analytics explicitly excluded; Android's restored old snapshot had no
  saved choice but embedded analytics-disabled config/simulator detection; opted
  out before downloaded OTA activation. Its tutorial preference/display override
  restored after checks. Android emulator/Studio stopped before reopening iPhone.
  iPhone remains open, signed in, normal real map visible; local simulator-only
  production request header retained so it can run latest published OTAs. Original
  prepared production-preview app preserved; only local header/signature differ.
- Used Refero Design/Firecrawl research: Expo documents default asynchronous
  download/next cold-start activation; Slack/Spotify desktop offer optional
  badge/menu restart; Refero REKKI user-initiated Settings check and FoodNoms/
  Daylish What's New examples inspected. Evidence/links and caveats saved in
  artifacts/mobile-tutorial-20261124/update-messaging-research.json.
- Recommendation only: keep routine OTA fixes silent. For important updates,
  optional dismissible Update ready / Restart now / Later notice after completed
  download and outside active report/photo/payment/cleanup work. Applied means
  already running; do not say applied and then ask to restart. No popup, update
  lifecycle, website/backend/store or production configuration changes made.

### 2026-11-24 — Codex ($35 tutorial follow-up OTA published to both apps)

- Grant explicitly requested publishing the $35 tutorial change to both apps.
  Published at15:25 EST from committed8855578 (feature505fb96), production
  environment/channel/runtime2.1.1. Against the preceding publication2ab8143,
  only FirstRunTour.jsx changes: both sample pin states and Pays label from
  $6 to $35. All earlier funder/privacy/heart changes are retained. No native,
  dependency, permission, real fund/payment, backend or website changes.
- New latest group22df191b-5980-40c9-9a09-ec76a43cb2bb;
  iOS01a20f3c-2fa6-79f0-afeb-1394efa0a864;
  Android01a20f3c-2fa6-73e4-8ccd-e4e81d54d573. Both EAS source maps uploaded.
  Earlier group1e72e3f9 remains history and is superseded for new downloads.
- Both Hermes exports include Pays $35. Scoped lint/onboarding4 tests passed;
  all78 saved files verified. Server/channel readback confirms exact latest IDs;
  production manifests and downloaded bundles match the exports; all74 unique
  hosted bundles/assets fetched and SHA256 verified. Artifacts/evidence live in
  artifacts/mobile-tutorial-20261124/, including publication-verification.json.
- The artifact publish helper's local JSON parser initially rejected an EAS
  warning prefix AFTER successful publication. Recovered the IDs with read-only
  server readback and corrected the parser. No second publication was attempted.
  Ignore that local postpublication exit as an app/upload failure.
- Native device activation was not repeated for this text-only follow-up;
  both download/run paths passed on current2.1.1 native test devices for the
  preceding group earlier today. No simulator/emulator change for this release.
  Clients receive the newer complete bundle on normal launch/restart. No store
  submission or new permission needed. Earlier local-only tutorial hold is
  superseded; no publication remains pending. Shared unrelated work preserved.

### 2026-11-24 — Codex (tutorial example fund changed to $35; not published)

- Owner requested replacing the tutorial's $6 example with $35. Updated
  FirstRunTour.jsx: the resting pin, selected pin and Pays label now use $35;
  shared component covers iPhone and Android. No real report fund changed.
- Scoped lint passed; existing firstRun tests4/4 passed. Source commit505fb96
  on codex/tutorial-fund-35-20261124 in the existing isolated mobile checkout;
  shared source matches. Earlier frozen OTA artifacts/production group unchanged.
- No new export, OTA publication, native/store build or backend/website change.
  This additional tutorial change is local and is not in the earlier published
  funder/privacy/heart OTA. Preserve unrelated shared website/mobile changes.

### 2026-11-24 — Codex (both published OTAs downloaded and run natively)

- Owner requested actual app download/run verification after publication and
  separately reported their phone appeared to update automatically. No physical
  device was connected; direct testing used current2.1.1 simulator/emulator.
- iPhone17Pro: device analytics explicitly opted out first. Temporarily changed
  only the local simulator Expo request header to production and ad-hoc signature;
  app JS/assets unchanged. Native expo-updates downloaded published iOS ID
  01a20f2c-2b62-7481-93e2-45d21cc61d23. After restart its DB recorded1 successful
  launch/0 failures; cached Hermes SHA256 exactly matches frozen/published iOS.
  Real map, funded marker, report/photo and funder rows visibly passed while
  running that OTA. Original production-preview native shell restored afterward;
  original channel restoration removes the production cache selection/row.
- Android16 QA emulator: existing native2.1.1(27) local harness, production
  channel, unchanged80 native libraries/7 DEX, temporary test signing. Device
  analytics opted out before launch. Native expo-updates downloaded exact Android
  ID01a20f2c-2b62-7058-a37d-ef5a7dabd959; restart recorded1 successful launch/0
  failures. Cached Hermes SHA256 matches published/frozen Android. Running UI
  visible; zero scanned JS/native fatal startup errors. Known temporary-signing
  Google Maps tile limitation remains; this is not physical-store Maps acceptance.
- Evidence: artifacts/mobile-funders-20261124/ota-device-activation/
  activation-verification.json, per-platform DB/hash readbacks and screenshots.
  Only one virtual guest ran at a time. Android stopped; original iPhone simulator
  reopened and app/map visible, analytics exclusion retained. No new OTA/build,
  store/website/backend deployment, payment or donor/favorite mutation.
  Production group/source unchanged; earlier device-activation-pending notes are
  superseded by this scoped native verification. Documentation checkpoint saved
  in the existing isolated candidate; unrelated shared changes preserved.

### 2026-11-24 — Codex (funder/privacy/heart checks passed; both production OTAs published)

- Current installed iPhone17Pro native/runtime2.1.1 verified again; internal
  analytics disabled. Existing Google session signed in normally. Real Roby
  Greene funders appear directly below Get directions, above Litter/Notes;
  two separate $25 rows and relative dates verified. Anonymous checkbox starts
  unchecked, toggles with correct text, and was restored before leaving checkout.
- Existing paid-out Ridge Road donation shows Donation privacy, Your name is
  shown and Hide my name. No payment or donor-visibility mutation. Selected red
  photo hearts have no white circle on list/map previews; white outline verified.
  Temporary favorite add/remove completed; original unselected state restored.
- Under Grant's existing explicit authorization, published both frozen exports
  to production/runtime2.1.1 at15:08 EST. Export source ba39bbe; publication
  checkout2ab8143 (later documentation only). Group1e72e3f9-55ce-4ef8-8377-a8ca25d0bf4f;
  iOS01a20f2c-2b62-7481-93e2-45d21cc61d23;
  Android01a20f2c-2b62-7058-a37d-ef5a7dabd959. EAS source maps uploaded.
- Production channel and native Expo delivery requests verify both exact IDs,
  runtime and frozen Hermes SHA256s. All74 unique hosted bundles/assets fetched
  with manifest-provided authorization and content hashes verified. All78 frozen
  files remain unchanged. Evidence: artifacts/mobile-funders-20261124/
  publication-verification.json and current-iphone-feature-verification.json;
  screenshots in ios-simulator-current/. Documentation checkpoint is committed
  in the isolated candidate; unrelated shared website/Claude work preserved.
- Production-device OTA activation not claimed: internal simulator targets
  production-preview. Existing store2.1.1 clients download on a cold launch and
  activate on a later full restart; older runtimes need the store update first.
  Android temporary-signing map limitation remains documented. No store/native,
  website or backend release; no payment or lasting privacy/favorite change.
  Simulator left open; no automation or forced restart added. No remaining
  publication hold for these two now-published updates.

### 2026-11-24 — Codex (current iPhone installed and startup verified)

- Grant ran scripts/verify-current-iphone.py in normal macOS Terminal. Saved
  installed-native-verification.json confirms main com.litterbugs.app native2.1.1,
  runtime2.1.1, build1, disabled internal analytics, and exact prepared Hermes
  SHA256cd2e3841e2e43ff79105b3881a8281dfc46a1d902ff74202719b1244a0a606b6.
  App launched; reviewed current-iphone-installed.png shows real map tiles,
  report markers, Boone search and normal controls/navigation; no error overlay.
- Latest-native installation/startup gate is now passed. Feature visual checks
  remain pending: funder placement, anonymous checkbox interaction, payment owner
  name-control display, heart appearance. Do not mark these passed from startup.
- This session still lacks functioning native UI controls; alternate runtime
  reports missing CODEX_CLI_PATH. Owner asked how to remove restrictions. Saved
  config already says never/danger-full-access; actual session profile differs.
  Local Codex CLI help verified explicit --sandbox danger-full-access and
  --ask-for-approval never flags for a fresh owner-launched local session.
- Publication of both exact frozen OTAs is authorized; do not request approval
  again. Source/artifacts unchanged. No OTA/store/backend/website/payment/donor
  mutation. Continue actual visual checks then publish and verify delivery.

### 2026-11-24 — Codex (iPhone testing continued; verified installation helper)

- Continued at Grant's explicit instruction. simctl remains inaccessible.
  Alternate native-control runtime reports “Managed execution requires a usable
  CODEX_CLI_PATH”; no native-control session started. Read-only saved config
  confirms approval_policy=never and sandbox_mode=danger-full-access, matching
  Grant's screenshot; no user restriction or rejection inferred.
- Added scripts/verify-current-iphone.py, ready to run in owner's normal Terminal.
  Installs only the prepared internal2.1.1 app onto the already-booted iPhone17Pro,
  preserves app data, verifies actual installed native/runtime/bundle hash and
  disabled analytics, launches and saves screenshot/JSON evidence. Never publishes,
  creates payments or claims visual acceptance. Syntax and source-artifact
  verification passed; source artifact codesign deep/strict passed again.
- Awaiting execution outside this restricted session. Actual installed2.1.1 and
  funder/privacy/heart visual acceptance remain pending. Existing authorization
  to publish both frozen OTAs after final checks remains recorded; no reapproval
  required. No production/store/backend/website/payment/favorite changes.

### 2026-11-24 — Codex (OTA publication authorized; session access blocks execution)

- Grant explicitly instructed “Okay, do these things now” after the remaining
  final simulator checks and publication of both OTAs were listed. Publication
  of this exact prepared release is now authorized; do not request approval
  again. Prior approval-hold entries are superseded for this release only.
- Isolated committed source remains unchanged: export ba39bbe; current HEAD
  bd336a7 before this documentation checkpoint. Verifier passed all78 saved
  file hashes and app-source consistency. No rebuild or feature edit needed.
- Current session still cannot connect to CoreSimulator. Read-only installed
  plists confirm com.litterbugs.app remains2.0.1. Latest-native2.1.1 UI checks
  remain pending, not passed or waived.
- Expo prepublication channel check cannot reach the service: DNS resolution
  fails for api.expo.dev and registry.npmjs.org. The npx registry wait was
  canceled; installed EAS27.1.0 was used to independently check the service.
  No publication command executed. No OTA group created or deployment claimed.
- Needs a session with working native simulator access and Expo network access
  to finish the authorized checks/release. Do not bypass sandbox restrictions.
  No website/backend/store/payment/donor/favorite mutation. Shared .git remains
  read-only; documentation checkpoint is committed in the isolated candidate.

### 2026-11-24 — Codex (continued installation check; manual drag still needed)

- Read-only device/app plist check confirms iPhone17Pro is booted (state3),
  but its Litterbugs native apps still show2.0.1/runtime2.0.1; no2.1.1 install
  found. The prepared2.1.1 simulator app remains ready in the artifact folder.
- simctl still cannot connect to CoreSimulator from this session. System
  Events automation returned-10827; native-control runtime call was rejected.
  No alternative install or control attempt made after that rejection.
- Next owner step remains dragging the prepared Litterbugs.app from Finder
  onto the open iPhone simulator. Latest-native funder/privacy/heart checks
  remain pending. No source changes, OTA, store/backend/website deployment or
  payment/donor/favorite mutation. Shared .git is read-only; log uncommitted.

### 2026-11-24 — Codex (simulator reopened; installation still blocked)

- Grant reopened iPhone17Pro. CUA can operate its UI; simctl still fails with
  CoreSimulator connection/access errors from this session. The fresh2.1.1 app
  is ready in Finder, but is not installed (existing installed app remains2.0.1).
- Opened Apple's Accessibility Inspector while troubleshooting GUI placement;
  Grant asked what it was. Explained it and quit it; app inventory confirms
  Inspector/Xcode/Android Studio are closed. No app/security setting changes.
- Requested one manual drag of Litterbugs.app from the prepared Finder folder
  onto the open iPhone to finish installation, then resume latest-native checks.
  Do not claim UI acceptance or publish OTA. Production78-file export unchanged.

### 2026-11-24 — Codex (current iPhone simulator app built; window handoff)

- Owner-approved Expo simulator build13bf4e5c-2f44-4e08-8883-6a234d489f46
  FINISHED from71d1d1c. Downloaded through Expo's official download helper.
  Archive SHA256b2b8e1e685d2d919557836f7900f39661cbfe28f757c76c578424967fc24d9f7.
  Extracted Info/Expo plists verify native/runtime2.1.1, iPhoneSimulator target,
  analytics disabled/internal; codesign deep/strict verification passed.
  Simulator build counter resolves to1 (separate from released iPhone30).
  Native/feature source is current; no production mobile code/config changes.
- Ready app: artifacts/mobile-funders-20261124/ios-simulator-current/unpacked/
  Litterbugs.app. Archive/verification and the source bundles are preserved.
  All78 production OTA files still pass checksum/source consistency checks.
- INSTALL/UI CHECKS NOT COMPLETE: existing iPhone17Pro remains shutdown; its
  old installed shell is2.0.1. Session simctl is unable to access CoreSimulator,
  and CUA cannot target Simulator when no device window is open. Requested
  Grant reopen the iPhone17Pro window; Finder is already open to the new app.
  Next: install the fresh app, verify actual installed2.1.1 plists, then funders,
  anonymous checkbox, payment-privacy display and heart/map regression checks.
- Removed28 obsolete untracked old native build binaries,1.74GiB total; latest
  store originals/current OTA/source backups and all evidence retained.
  No local native compilation; Android emulator/Studio, Xcode and temporary
  Activity Monitor were closed. Last memory_pressure check63% free percentage,
  Activity Monitor pressure graph was green. One simulator at a time only.
- No production/preview OTA, store submission/release, backend/website change
  or payment/donor/favorite mutation. OTA publication still requires approval.

### 2026-11-24 — Codex (current simulator build authorized; QA ongoing)

- Grant explicitly approved uploading the prepared source to Expo for the
  current simulator-only build and removing unneeded old builds. This resolves
  the prior cloud-upload approval rejection; it does NOT approve OTA publication.
- Submitted existing production-simulator profile from committed71d1d1c:
  build13bf4e5c-2f44-4e08-8883-6a234d489f46, iOS2.1.1(30), simulator=true,
  currently IN_PROGRESS. Native/app config and feature source unchanged.
- Removed28 untracked superseded native build archives/APKs/IPAs/AABs from
  older artifact folders, freeing1.74GiB. Kept both latest2.1.1 store binaries,
  frozen OTA/source bundles, all tracked files, source and screenshots/logs.
  Exact paths/sizes/checksums: old-build-cleanup.json in current OTA artifacts.
- Heavy build is remote. Android emulator/Studio stopped; Xcode and the temporary
  Activity Monitor were closed after checking normal/green memory pressure.
  Read-only memory_pressure reported56–58% system-wide free percentage.
- Current iPhone simulator remains shutdown/no device window. simctl cannot
  connect from this session; CUA also cannot target Simulator without a device
  window. Asked Grant to reopen iPhone17Pro while the build finishes. Do not
  claim2.1.1 native UI acceptance until installed app Info/Expo plists and the
  native funder/privacy/heart checks are verified. No OTA/store/backend release.

### 2026-11-24 — Codex (native QA follow-up; current iPhone shell pending)

- Owner accepts emulator/simulator testing but explicitly requires latest
  versions. Fresh Expo history/Apple listing confirms latest store sources
  iOS2.1.1(30)/Android2.1.1(27), both4835975. Frozen78 OTA files unchanged.
- Android16/API36 arm64 QA emulator used1GB RAM/two cores. Local APK embeds
  exact prepared Hermes code in27 native components (80 native libraries and
  seven DEX files identical). Analytics disabled/test signing only in this
  local harness. Startup, report list/deep link/photos and funders placement
  passed. Map tiles unverified: Google rejects the temporary QA certificate;
  production maps configuration/signature unchanged. Android signed-in payment
  controls not exercised. Screenshot/evidence saved in mobile-funders artifacts.
- Rechecked iPhone funders and anonymous checkbox, then discovered its actual
  installed native Info/Expo plist is2.0.1(1)/runtime2.0.1 despite current JS.
  Do NOT claim latest2.1.1 native simulator acceptance. No current simulator
  build exists locally or in Expo history; fresh2.1.1 build required.
- Automatic approval review REJECTED cloud simulator build submission because
  it uploads private source to Expo without explicit owner upload approval.
  No build ID/replacement artifact; do not retry or bypass. Local native build
  not started with only~2.7GB free disk. Prepared exact cloud-test plan; await
  explicit approval for source upload, separate from OTA publication approval.
- Android emulator/Studio stopped. Original AVD preserved; stopped QA AVD is
  Small_Phone.avd, display name Litterbugs OTA QA. Generated APK project remains
  ~/ApkProjects/universal. No payment, donor/favorite mutation, hosted OTA or
  store/backend/website release. App code unchanged. Full follow-up is in the
  November24 readiness review; shared .git remains read-only.

### 2026-11-24 — Codex (both OTA packages ready; publication held)

- Revalidated the isolated funder/privacy/heart app source `bf053f6` against
  approved native baseline `4835975`. No app feature changes were needed.
  Added local preparation and checksum-verification/release helpers; their
  default paths do not publish. Export source `ba39bbe`.
- 677 tests passed/1 existing skip, 229 modules/0 source errors, scoped lint
  zero errors, all 46 installed direct dependencies match the lockfile.
  Production iOS/Android Hermes exports passed with one worker and 3 GB heap;
  EAS offline reader verified 67 assets each and all 78 saved files were hashed.
  Fixed only isolated dependency/workspace links used for packaging.
- Signed store artifacts both target runtime2.1.1/production; Apple public
  listing now2.1.1. Older runtimes require the store2.1.1 update first. Existing
  November20 iPhone simulator checks retained; no new emulator/native build.
- Package/evidence/restorable committed source saved under shared workspace
  `artifacts/mobile-funders-20261124/`; details and release/rollback commands in
  `docs/reviews/2026-11-24-mobile-funders-ota-readiness.md`. EAS source-map upload
  is prepared; PostHog secrets remain EAS-only, with matching maps saved locally.
- Final read-only production-channel check still shows no update groups.
  NO production/preview OTA, store upload/submission/release, backend/website
  deployment, payment or donor-setting mutation. Grant must explicitly approve
  publication. Preserve unrelated Claude/shared work. Shared handoff remains
  uncommitted because shared .git is read-only; isolated candidate is committed.

### 2026-11-20 — Codex (favorite heart circles removed; OTA held)

- Removed the selected white circle from shared ReportPreviewHero, covering
  map previews and report/photo cards. Filled red heart, unselected white
  outline, tap targets, saved favorites, haptics and hop animation retained;
  subtle photo-contrast shadow applies to both icon states.
- 32 focused preview/gesture/photo tests and scoped lint passed. Single-worker
  iOS Hermes export passed; existing iPhone simulator visibly confirmed the
  already-favorited Roby Greene card shows the red heart directly on its photo.
  No favorite toggle, real payment or donor-visibility change for this check.
- Committed `bf053f6b7288df7f7148b0dc773d28870bb9c34c` on the existing isolated
  `/tmp/litterbugs-mobile-funders-20261120` candidate, following funder commit
  `a34d464`. Shared heart file matches. Temporary local transport removed after
  QA. One existing simulator/one capped export worker; no native build.
- Approval hold remains: NO production/preview OTA, store submission, website
  or backend deployment. Await Grant's explicit OTA approval. Shared handoff
  remains uncommitted because this session cannot write the shared .git.

### 2026-11-20 — Codex (mobile funders complete locally; OTA approval required)

- Checkpoint `a34d464a9090376b464c09d2eaca865911aadd1f` in the isolated local
  clone `/tmp/litterbugs-mobile-funders-20261120`, based on approved `4835975`.
  All 12 feature/test files also match the shared workspace. Preserve unrelated
  shared work; its pending location-recovery changes are excluded from candidate.
- Owner's final placement: donor panel directly below Get directions, above
  Litter and Notes. Individual names, amounts, relative dates, 3-row expandable
  list; no donors on listing cards. Checkout has an unchecked Donate anonymously
  choice; completed payment owners can Hide/Show their name. Old null choices
  remain public. Reserved choices survive recovery/retry; server mismatch blocks
  opening Stripe. Existing live website donor APIs reused; no backend changes.
- Final isolated candidate: 677 tests passed, 1 existing skip; lint passed;
  source check 229 modules/0 errors. Single-worker iOS/Android Hermes exports
  passed. Map code, artwork, app/runtime/native config and dependencies match
  approved source exactly. No native build or Android emulator was started.
- Reused only the existing iPhone simulator, with analytics disabled. Its old
  Metro address had unavailable artwork; exact approved-source map/assets plus
  feature now load via a loopback-only local manifest. Real Roby Greene report
  shows two separate $25 donations; final higher placement visibly verified.
  Native anonymous checkbox unchecked/checked verified; returned before payment.
  Caught/fixed Hermes lacking RelativeTimeFormat; regression test added. Temporary
  scroll instrumentation was never loaded and is absent from final source.
- Grant explicitly requires approval before ANY OTA publication, including
  preview channels. NO OTA, store build/submission, website/backend deployment,
  charge, payout or donor-visibility mutation. One simulator/one worker and
  capped heaps used. Local simulator transport removed after QA; full reload
  would need that local transport recreated. Existing website server retained.
- Source is committed in the isolated clone; shared handoff edit remains
  uncommitted because this session cannot write the shared .git directory.

### 2026-11-20 — Codex (roadmap OTA release advice)

- Read Grant's Google Doc roadmap and local Expo configuration. Recommend
  implementing/testing items individually, publishing small related batches,
  and shipping urgent fixes or email consent independently when ready.
- Suggested groups: visual changes; email consent; cleanup lifecycle/issues;
  leaderboard/funder points; separate payment/tipping work. Web/backend-only
  items need no OTA. Native dependencies/permissions require new store binaries;
  respect appVersion runtime matching and older installed clients during rollout.
- Advice only: no app changes, OTA, build, deployment, document edit or email.
  Handoff uncommitted because shared .git is read-only in this session.
- Follow-up: confirmed ON_LOAD with zero startup wait and no custom fetch/reload
  flow in mobile source. Explained automatic background OTA download on cold
  launch and activation on a later full restart; no store action or notification
  by default. No runtime/device update was published or tested in this lookup.

### 2026-11-20 — Codex (weekly marketing email opt-in research)

- Reviewed notification-preference migration, privacy source and prior Resend
  setup records. Existing preferences control phone alerts; no newsletter
  consent flow found in the reviewed source. Luke's weekly sending tool and
  existing list's consent provenance were not verified.
- Recommend optional unchecked weekly-email signup choice, dismissible in-app
  invitation for existing members, account email setting and public subscription
  page. Keep existing documented newsletter consent; treat unproven account
  addresses as not subscribed. Verify public-form addresses before activation.
- Record consent time/source/wording version and withdrawals in Supabase;
  synchronize with sending-provider suppression without silently resubscribing.
  Resend Broadcasts is a practical candidate given existing SMTP setup. Official
  FTC/ICO/Resend guidance reviewed; US opt-in law and provider rules differ.
  Avoid a blanket permission-request email to the unconsented global list.
- Research only: no emails, list mutations, app/website changes, migration or
  deployment. Marketing flow remains unimplemented. Handoff entry uncommitted;
  this session has read-only access to the shared .git directory. Preserve other
  agents' existing shared changes.

### 2026-11-20 — Codex (cleanup fraud prevention recommendations)

- Grant confirmed an on-site visit proved the Blue Deer cleanup was not done.
  Reviewed current submission SQL, web/native evidence flows, Gemini prompt and
  review transitions. Current source queues completion AI only for paid attempts;
  volunteer submissions use reporter review, with timeout approval when untouched.
- Recommended verification for both types, fresh on-site evidence with accuracy-
  aware location checks and manual fallback, positive landmark matching in Gemini,
  first-cleanup human review and timing/reuse flags. Timing alone is not proof.
  Location and camera evidence are signals, not guarantees of completed work.
- Advice only: no code, account restriction, moderation, migration or deployment.
  Handoff edits remain uncommitted because this session cannot write .git objects;
  preserve the existing shared changes. Production rollout was not re-inspected.


### 2026-11-20 — Codex (fraudulent cleanup account lookup)

- Read-only production lookup matched report `c1482a8c-329f-41d6-85bd-020916d32553`
  to its submitting cleaner, distinct from reporter James Luke Barber. Checked
  profile/auth details, all cleanup attempts/submissions, review and payout record.
- One attempt/one submission, no completed cleanups, no reports and no transfers.
  Submission claims 120 minutes/50 lb but followed claim by 2m42s; account was
  created about five minutes before submission. Stripe onboarding remains pending
  with payouts disabled. Existing review is changes_requested, not a recorded
  final fraud rejection; auth ban is unset. Findings reported to Grant privately.
- No account restriction, moderation change, app/website change, deployment or
  production data mutation. Dashboard SELECT query auto-saved as a private snippet.


### 2026-11-19 — Codex (donor privacy released; Vercel authenticated)

- LIVE: source `ee03802e163b0ce47fe750a2bbbf2dd9938b8eb0` on GitHub branch
  `codex/donor-privacy-release-20261119`. Based on Claude's live favicon commit
  `4325be7`; all seven favicon/layout files byte-identical. No shared checkout
  reset or force-push. Full pre-release source snapshot retained.
- Vercel production `dpl_CmFQNjduJ1pyQboeKs1nM7bBdtsS`, alias litterbugs.app,
  promoted from the checked staged build without rebuilding. Rollback website
  `dpl_7oderqZgmmcZYfxRRK8VpZGvuqHC`. Keep the additive database migration if
  rolling the website back; the original reservation API remains compatible.
- APPLIED: `20261120010000_cleanup_contributor_visibility.sql` to production
  `mvaygkflcjswtwchflrk`, including migration history and financial integrity
  assertions. Only checkout Edge Function `create-cleanup-contribution` deployed,
  ACTIVE version30, verify_jwt=false as before; downloaded source matches commit.
- Names default public; anonymous checkout choice persists; completed donation
  owners can Hide/Show their name. Public report details and itemized timeline
  share donor names/amounts/times. Listing cards omit donors. Card menu adds See
  full report and Hide, opens upward without resizing. Empty-state visibility
  measurement included; no native app or unrelated payout/notification release.
- Passed 1,210 website tests/164 files, typecheck, production build, handler/SQL
  integration. Live browser confirmed actual donors below About, itemized times,
  no report page errors and identical card dimensions before/after menu open.
  Production owner hide/show and nonowner denial passed in a rolled-back
  transaction; no lasting donor change or real payment. Claude's live favicon
  hashes match. Local-only POST routes and preview page return404 in production.
- Advisor delta is three expected warnings for intentionally granted SECURITY
  DEFINER APIs (public sanitized credits for anon/authenticated; owner visibility
  for authenticated). Ledger inaccessible to anon; owner and permanent-account
  checks verified. No unrelated security grants or policy changes.
- Followed vercel.com/get-started.md: CLI50.43 authenticated as grant-9890 and
  existing project linked. Credentials stored only in ignored .vercel/cli-auth
  for later CLI use. Optional global Codex MCP addition blocked by read-only
  ~/.codex/config.toml; not connected. Deployment does not depend on that setup.
- Evidence and release details: docs/reviews/2026-11-19-donor-privacy-release.md.
  Preserve this release and all Claude/shared uncommitted work.

### 2026-11-19 — Codex (checkout checkbox and card-menu sizing)

- Reviewed Refero's PayPal donation checkbox. Fixed the anonymous checkbox
  inheriting text-field dimensions: explicit 20×20px input, 44px label row,
  short Donate anonymously label and help text; removed oversized green fill.
  Verified the actual signed-in local checkout. Payment behavior unchanged.
- Both map and public-card menus now include See full report and Hide/Unhide.
  Map menus open upward inside the card and support Escape/focus restoration.
  The old downward overflow created a scrollbar and shrank the single card.
- Before/after browser measurements confirm identical card width, height and
  list scroll geometry when opening the fixed menu at 1296, 900 and 375px.
  Verified navigation to the canonical full report. All 55 focused tests,
  scoped lint, typecheck and diff checks passed. Evidence is in
  `docs/reviews/2026-11-19-card-menu-and-anonymous-control.md`.
- Local checkpoint `d196d7f` in `/tmp/litterbugs-local-donor-names.HGVR4M`.
  No deployment, production database update, app change or payment.

### 2026-11-19 — Codex (donation privacy implementation completed locally)

- Finished checkout anonymity, owner Hide/Show controls, safe retry choice
  recovery, and synchronized donor details/timelines across tabs. Checkout now
  refuses a charge when its server cannot save the anonymity choice.
- The real localhost payment pages work before backend rollout through a
  development/loopback-only bridge. Each read/save verifies the real signed-in
  owner and payment status, then writes only the local choice file. Extended
  the read-only donor export with private per-payment IDs for exact matching.
  Production RPCs take precedence once activated. No production write.
- Verified Grant's actual $5.50 paid-out receipt: hide, reload, anonymous report
  details/timeline, show, and immediate name restoration in the other tab.
  Left the receipt public as originally found. The actual Fund dialog also
  shows the unchecked-by-default anonymous choice and updates its description.
- Passed 175 website tests, 37 payment/funding handler tests, the real
  handler+PostgreSQL integration test and SQL authorization matrix, scoped lint,
  typecheck, and desktop/mobile report checks. Integration substitutes only
  Stripe; reservations/owner mutations/public credits/rank filtering execute
  the real SQL. No charge or app changes. GitHub main checked at `e00973a`.
- Code checkpoint `f6dd3de` is in `/tmp/litterbugs-local-donor-names.HGVR4M`.
  Release order and evidence: `docs/reviews/2026-11-19-donation-privacy.md`.
  Website, database migration, and Edge Function deployment remain on hold.
  Live activation and post-release smoke checks are deployment steps, not
  evidence of a live release. Preserve all unrelated Claude changes.

### 2026-11-19 — Codex (simpler donation privacy setting)

- Reviewed Refero's Pinterest profile visibility and Arcade privacy settings.
  Restyled the shared payment name control as a compact Donation privacy row
  with an eye icon, one live status, and Hide my name / Show my name action.
  Removed the redundant success notice from the actual screen and preview.
- The control shows Saving… during the request and keeps the prior setting
  if saving fails, with a separate plain-language error. Six payment tests,
  scoped lint and website typecheck passed. Desktop/mobile preview verified.
- Local checkpoint `830cf10` is in
  `/tmp/litterbugs-local-donor-names.HGVR4M`. No deployment or backend writes.
  Existing backend activation requirements remain pending.

### 2026-11-19 — Codex (interactive name privacy preview)

- Added `/dev-review-preview/payment-privacy?name=shown` and `?name=hidden`.
  These use the same PaymentNameVisibility component as actual payment details,
  with example $25 contribution/$5 fee totals and browser-only state changes.
- Opened and left the page in Grant's Chrome, verified Hide my name switches
  to Show my name and back. Five payment tests and scoped lint passed.
  Local checkpoint `5f5dfa9` is in `/tmp/litterbugs-local-donor-names.HGVR4M`.
  No deployment, real donation visibility changes, or backend writes.

### 2026-11-19 — Codex (anonymous controls status check)

- Verified the checkout checkbox, public-by-default choice, retained choice on
  retries, and owner show/hide controls in the website source. Fixed Payments
  treating older null choices as hidden even though credit defaults to public.
- All 27 focused checkout, retry, and payment settings tests passed, including
  the older/null, public, and anonymous settings. The supporting database and
  checkout function updates remain unapplied, so controls are not yet active
  in the regular localhost flow. No deployment or backend write.

### 2026-11-19 — Codex (funders in details and itemized timeline)

- Removed donor panels from every listing card, including map results, so
  card sizes stay consistent. Moved the standalone donor panel into the
  report details below About this report and its litter facts. Map and
  expanded-dialog funders now sit inside report-detail-body after site details.
- Timeline lists each donation chronologically with the principal amount,
  public name or anonymous status, and exact confirmation timestamp. Times
  explicitly show UTC. The generic first-donation entry is only a fallback
  for reports without itemized donation data.
- Browser-verified both real $25 entries, absence from headers and cards,
  compact and expanded map views, standalone page, and mobile. Typecheck,
  lint, and relevant timeline/layout tests passed. An existing pin-cancellation
  timing test failed in the broad run and passed its isolated retry.
- Local-only checkpoint `edf37f2` is in
  `/tmp/litterbugs-local-donor-names.HGVR4M`. No deployment or backend writes.

### 2026-11-19 — Codex (donor details load with report cards)

- Report discovery, initial map data, public feeds, standalone report pages,
  and account report pages resolve donor details before showing report content.
  Cards and details receive the completed data and avoid a second initial
  browser request. Explicit credit updates and focus refresh still work.
- Real localhost browser observation confirmed donor names and amounts at
  first insertion for public cards, map cards, and map details, including an
  artificially slowed donor request. Standalone server HTML includes donors.
  All 128 focused tests, typecheck, lint, and diff checks passed.
- Local changes only. No deployment or backend writes. Snapshot is the latest
  commit in `/tmp/litterbugs-local-donor-names.HGVR4M`.

### 2026-11-19 — Codex (donor list amounts and dates)

- Donor panels now show each real contribution separately with profile name,
  principal amount, and time ago. Cards show two entries; details show three
  with a See all action when needed. Honey-yellow panels and initial avatars
  follow the website's existing funding styling. Owner removed the heading
  and bee after reviewing the first version; final panels have neither.
- Updated the pending credit reader and local read-only export with donation
  amounts and confirmation dates. Anonymous entries omit the donor name.
  Refreshed the local export for all 12 reports. No production changes.
- Verified real Roby Greene donations on desktop map, cards, and mobile report.
  Typecheck, scoped lint, and isolated PostgreSQL privacy/amount/date checks
  passed. Checkpoint `1315686` is in
  `/tmp/litterbugs-local-donor-names.HGVR4M`.

### 2026-11-19 — Codex (actual donors verified on localhost)

- Owner reaffirmed permission for the read-only donor lookup. Export succeeded
  for 12 funded reports. The regular local cards, map details, and mobile report
  now show verified donor profile names, with no sample names or test copy.
- The feature covers reports by ID and all future donations. Current database
  credit takes precedence over the local review copy after backend rollout.
  Names show by default and explicit anonymous choices are honored.
- Verified both funded Boone report cards against the read-only export.
  Typecheck, scoped lint, and diff checks passed. Latest GitHub main remains
  `e00973a`. No deployment or production write. Local copy is a snapshot and
  can be refreshed with `scripts/prepare-local-contributor-credits.mjs`.

### 2026-11-19 — Codex (actual donor names on local cards)

- Prepared a read-only donor-name export and a loopback-only reader for the
  regular localhost cards. The reader rechecks each report's public visibility
  and returns names and anonymous counts only. The exporter is not run.
- Updated pending migration to show existing donors by default as requested,
  honoring explicit anonymity. Typecheck, scoped lint, and diff checks passed.
- Automatic approval review rejected retrieving the project API credentials.
  Await explicit approval to read the donation records for the localhost
  preview. No backend, website, database, or deployment changes were made live.
  Local checkpoint `9f73fb4` is in `/tmp/litterbugs-local-donor-names.HGVR4M`.

### 2026-11-19 — Codex (supporter names on the website payment flow)

- Replaced mock checkout and donor data on regular website routes with the
  existing checkout and payment-account flow. The map, cards, and report
  page read contributor credit from the cleanup contribution ledger. The
  section is omitted when there is no public credit or anonymous gift.
- Added `20261120010000_cleanup_contributor_visibility.sql` and checkout
  handling. New web payments show the Litterbugs profile name by default
  with an anonymous option. Existing donors can choose to show their names
  in Payments. Visibility changes leave the payment intact.
- Passed 116 focused web tests, typecheck, browser checks on regular routes
  with isolated replies, and a PostgreSQL fixture check for the migration
  and permissions. Local checkpoint `da60080` is in
  `/tmp/litterbugs-local-donor-names.HGVR4M`. Production migration, checkout
  function, and website deployment remain pending. No real charges or writes.

### 2026-11-19 — Codex (real report donor display)

- Removed prefilled fictional donor records from the existing $1 and $50
  reports. The donor section has no sample label or extra dollar line. The
  separate supporter preview uses the same layout with fictional names.
- Verified the real totals and absent donor names on localhost, and checked
  the example on desktop and mobile. Typecheck and lint passed. Local
  checkpoint `b79e008` is in `/tmp/litterbugs-local-donor-names.HGVR4M`.

### 2026-11-19 — Codex (local supporter names shown by default)

- The regular localhost checkout shows the sample donor name by default and
  offers a **Make this contribution anonymous** checkbox. Existing test
  receipts still let donors hide their name after paying.
- The New River Grill and Roby Greene Road reports show a labeled sample name
  from browser-scoped simulated payments. Existing real donations and totals
  are untouched. Verified both visibility choices, the card and report views,
  and hiding a name from Payments on localhost. Typecheck and lint passed.
- Reviewed GoFundMe's public donation list and its help pages for anonymity at
  checkout and after paying. Local checkpoint `87692ea` is in
  `/tmp/litterbugs-local-donor-names.HGVR4M`. No deployment or real charges.

### 2026-11-19 — Codex (supporter names on the regular localhost website)

- Added supporter names to the existing localhost map details, report pages,
  and report cards. Local checkout keeps names private by default. Donors who
  choose to show the sample name can hide it in Payments. The name disappears
  from the report and Funders while the test contribution remains.
- Verified on the $1 New River Grill report, including mobile checkout. All
  108 focused tests and the web typecheck passed. GitHub `main` was `e00973a`
  when checked. Preserved the existing local branch and its unpublished work.
- Test transactions use data scoped to the local browser session. No Stripe
  charges, production database writes, app changes, or deployment. Live
  payment and database integration remains pending.
- Scoped code checkpoint `8d40f5a` is in
  `/tmp/litterbugs-local-donor-names.HGVR4M`, based on the pre-change local files.

### 2026-11-19 — Codex (Roby Greene Road Stripe verification)

- The live Stripe dashboard showed two successful Nov 19 payments with the
  exact report ID and the same billing name. Each $30 charge included $25
  for the cleanup and $5 in fees. Shared the verified billing name privately
  with Grant. No payment, database, or deployment changes.
- Follow-up comparison confirmed the same contributor ID and two distinct
  checkout request IDs, with success at 4:43 and 4:47 p.m. Donor intent is
  unknown.

### 2026-11-19 — Codex (Roby Greene Road funding lookup)

- Verified that the public report shows a $50 cleanup fund and dates its first
  contribution Nov 19. The public report does not identify the contributor, and
  the connected Supabase account could not access the private ledger.
- Read-only lookup. No application, payment, database, or deployment changes.

### 2026-11-19 — Codex (local website supporter-credit preview)

- Built `/dev-review-preview/supporter-credit` on localhost with supporter
  credit on report cards, standalone report and map details, anonymous-by-default
  test checkout, owner hide-credit and refund actions, and a public Funders view.
  Uses per-browser preview fixtures and simulated payment confirmation.
- Browser-verified both credit choices, checkout resume/edit, public credit and
  its removal from reports and Funders, and reversals. Checked desktop, 390px,
  and 320px. All 57 focused tests, scoped lint, and isolated typecheck passed.
- Preview is in the shared checkout and clean commit `b1ad361` in
  `/tmp/litterbugs-supporter-credit-20261119`. Preview route and fixture API
  require development mode. Live website payment/data integration is pending.

### 2026-11-19 — Codex (website donor credit research)

- Traced website checkout, the private contribution ledger, the map and web
  report surfaces, and the Funders leaderboard. Recommended optional public
  credit using a short profile name, anonymous by default for web checkout,
  and no retrospective names on reports. Keep individual amounts private.
- Plan uses an optional visibility choice on the existing payment reservation,
  a sanitized batched web reader, and an owner-only option to hide credit from
  Payments. Account for retries, refunds, profile deletion, cache invalidation,
  and public Funders leaderboard/champion attribution before rollout.
- Research and recommendations only. No application, payment, database,
  release, or deployment changes.

### 2026-11-19 — Codex (visible empty-map tracking)

- PostHog `map_discovery` stage `empty_state_seen` and Clarity
  `lb_map_empty_state_seen` record once per empty-map appearance when at least
  half the message heading is in the viewport of a visible tab. The impression
  includes filter status. Raw `results_empty` retains its existing definition.
- Tests cover hidden tabs, offscreen prompts, duplicate observer callbacks,
  the report picker, and delivery to both providers. All 1,191 web tests passed
  on rerun after an intermittent pin-selection test failure. Typecheck and
  scoped ESLint passed.
- Applied the scoped edits to the shared checkout. Clean release commit
  `7c5dc65` based on `2a5dbec` is in the isolated checkout
  `/tmp/litterbugs-empty-state-analytics-20261119`. Deployment and live event
  verification are pending. No production provider or schedule changes.

### 2026-11-19 — Codex (website friction review)

- Reviewed the seven-day Clarity replay list and all four dead-click timelines,
  inspected key playback frames, and cross-checked PostHog through Nov 19.
  Two tracked report starts ended in explicit location-picker cancellation.
  The current picker lacks instructions for moving the map under its fixed pin.
- One mobile replay stayed on an empty map, then returned home. Five PostHog
  sessions returned an empty viewport, with no closest-report requests. One
  empty event fired on `/report` while the empty-state UI was hidden. Recommended
  clearer pin instructions, a more obvious empty-map recovery action, and a
  separate event for the actual empty-state prompt becoming visible.
- No tracked foreground map timeout, website exception, or participation failure
  in the window. The flagged App Store click showed an outbound handoff. No
  production site testing, product edits, deployment, or schedule changes.

### 2026-11-19 — Codex (latest analytics and recommendations)

- Reviewed the live owner dashboard, PostHog, Clarity sample and Play Console.
  Nov 12–18 vs Nov 5–11: 72 vs 140 tracked site sessions, 10 vs 7 new reports,
  2 vs 4 completed cleanups, $26 vs $36 in cleanup funding. Eight reports
  arrived Nov 18. Backlog was 20 available, one funded. Map reach was 26.4%
  vs 27.1%. No foreground map timeout was observed in tracked events.
- Recommended one Boone campaign around a specific cleanup, with tagged report
  links and verified completions as the outcome. The dashboard showed 25 tracked
  app sessions on eligible builds, and Play reported 19 device acquisitions and
  13 device first opens over its last 28 days. Apple downloads were unavailable
  in the current session. Play's Nov 17 warning about older native libraries on
  16 KB devices is pending verification on the published Android build.
- Read-only product review. No application changes, deploy, push, database or
  store release changes. Monitoring schedules were not restarted.

### 2026-11-18 — Codex (combined website release live)

- Grant lifted the hold and requested the GitHub push plus the approved Get the
  App page. Released commit `2a5dbec` from `codex/website-updates-20261118`,
  pushed and verified on `origin`. The exact staged Vercel deployment
  `dpl_5y1mWDvez2wxEpAfifFNVE2QTS8N` was verified and promoted to litterbugs.app.
  Previous production rollback target `dpl_BWUkHL1xU2W3u6uzPDjT3ZYJd3jL`.
- Includes the Get the App hero, burger-menu beetle, YouTube link, selected-report
  notification links, closed-by-default rank panels, and shorter community meta
  descriptions. 1,189 tests and the production build passed. Live browser checks
  passed at desktop and mobile widths with analytics off. Preview mockups stayed
  out of the release.
- Applied and recorded `20261118165228_capture_daily_nearby_alert_reports.sql`.
  Verified the report ID snapshot column and the existing single alert job. No
  monitoring schedules restarted and no mobile store changes.

### 2026-11-18 — Codex (Get the App backdrop restored)

- Restored the original lavender backdrop, mint base and four surrounding
  bug accents on local Get the App. The phone keeps its latest frame, tilt,
  simplified map pins and removed labels. Verified six viewport widths and
  the report handoff. No deployment.

### 2026-11-18 — Codex (Get the App phone graphic toned down)

- Revised the actual localhost Get the App phone artwork with fewer pins,
  native-style white markers, a darker frame, a milder tilt and smaller bug
  accents. Removed the Example map and Apple Maps labels.
- Verified six widths and the app-store and report-map links. No deployment
  or changes to the production site.

### 2026-11-18 — Codex (Get the App redesign on actual local route)

- Implemented the approved hero on localhost `/get-app` in `53f2f99`, with
  the cleanup-photo section and phone caption removed. The phone uses a
  cropped map capture with illustrative open, funded, in-progress and completed
  markers. The QA profile avatar is outside the crop.
- Checked six widths from 320px to 1440px, badges, Instagram attribution,
  and the report-specific Continue link into the map. Scoped lint and web
  typecheck passed. Existing uncommitted metadata edits were preserved
  separately. Local review only, no deployment or push.

### 2026-11-18 — Codex (duplicate download-page QR removed from mockup)

- Removed the QR block from the Duolingo localhost mockup. The site's
  desktop header panel already provides the phone handoff. Verified desktop
  and mobile mockups retain both store badges and the website link.
  No live edits or deployment.

### 2026-11-18 — Codex (Get the App mockup copy and badges refined)

- Updated the Duolingo local preview to the requested See Litter headline,
  removed the subheading and Open the app link, and removed the added store
  badge frames. The desktop QR now explains the phone handoff.
- Decoded the QR codes in the live desktop header panel, live download page
  and mockup. All open `https://litterbugs.app/get-app`. Verified the desktop
  header opens its panel in place. Earlier recorded visits include Instagram.
- Tested 320–1440px and refreshed screenshots. Preview payload in ignored
  `apps/web/work/get-app-preview/`. No live edits, deployment or analytics
  requests from the test browser.

### 2026-11-18 — Codex (rank path disclosure and website release hold)

- Grant said not to deploy yet. Live alias verified on the previous deployment
  `dpl_BWUkHL1xU2W3u6uzPDjT3ZYJd3jL`. The pre-hold build `7f8dde0` was already
  staged as `dpl_6EJDj9JiaBBy4yXCuNP8B3yXmFXb` without assigning production
  domains. No promotion, remote DB migration, push, or monitoring restart.
- Fixed the leaderboard rank path locally and in `cf6254b` on
  `codex/website-updates-20261118`. Next point starts closed. Its panel and
  earned-stone details take up their own space between stones. Verified opening,
  closing, and zero stone overlap at desktop and 360px. Nine focused tests,
  lint and typecheck passed. The staged build predates this fix. Local preview
  remains at `http://localhost:3000/communities`.

### 2026-11-18 — Codex (live Get the App page shown)

- Captured the published desktop Get the App page for comparison with the
  local mockups. The live page centers the app icon, store badges, QR code and
  website button. Test browser excluded from analytics; no events requested.
  Screenshot saved in this chat's visualization folder. Read-only check.

### 2026-11-18 — Codex (leaderboard search descriptions ready for combined release)

- Code57d0cf4 on `codex/community-meta-description-20261118`, isolated from live
  base4ed9b42: community metadata uses the existing activity sentence and concise
  invitation, with compact complete-sentence fallbacks for long names/counts.
  Title/body/canonical/robots/styles unchanged; shared localhost copy updated.
-17 focused tests, scoped ESLint and isolated full web typecheck passed. Local
  rendered Boone119/Avery County116 characters; OG/Twitter descriptions match,
  canonical paths retained. Local metadata origin is localhost by configuration.
- At Grant's explicit request sent “Add beetle to leaderboard menu button” thread
  the exact tested commit for its combined release. No deployment/push here;
  release pending that thread. No new audit, DB/provider change or schedule
  restart. Other shared untracked/staged Claude changes preserved; cherry-pick
  only the isolated commit, not the whole shared checkout.

### 2026-11-18 — Codex (Duolingo-inspired Get the App variant)

- Added a second local design at
  `http://localhost:3000/dev-review-preview/get-app?style=duolingo`. It uses
  Refero's tilted device, character-led composition and raised button treatment
  with Litterbugs assets. It reuses the current iPhone map, verified Winkler's
  Creek photos, and download links.
- The original preview remains at the plain URL. Variant mockup files are in
  ignored `apps/web/work/get-app-preview/`. Both previews are local only.
  Verified 320–1440px, download anchor, and production 404. No deployment.

### 2026-11-18 — Codex (localhost preview restored)

- Port 3000 had no running server. Restarted from the shared checkout under
  the Mac login session as `com.litterbugs.local-preview`, independent of this
  chat. Logs are in `/tmp/litterbugs-preview-3000.alyL2j`. To stop the preview,
  use `launchctl remove com.litterbugs.local-preview`.
- Verified the homepage and Get the App mockup in Chrome and the map's HTTP
  response. No application edits or deployment.

### 2026-11-18 — Codex (fresh Ahrefs audit and Bing recheck completed)

- One-time Ahrefs project10711029 crawl completed17m1s:480 URLs,206 internal
  pages,health100%,0 URLs with errors (previous1). Original sitemap canonical,
  long-title and incomplete OG issues cleared. All33 report HTML metadata checks
  pass. Two remaining long descriptions are new community pages (Boone161,
  Avery County165), a low-priority template follow-up; no product edit made.
- Bing still preparing search data. Sitemap Success49 URLs/last crawlNov15,
  versus102 in live sitemap. Saved homepage DNS failure contrasts with fresh
  successful Bing live fetches for homepage and repaired Greensboro report;
  neither inspection establishes indexing. No DNS change or indexing request.
- Evidence in isolated `docs/reviews/2026-11-18-bing-ahrefs-*` and
  `2026-11-18-ahrefs-live-check.json`. No deployment,push,DB write,paid upgrade
  or schedule restart. Concurrent shared changes preserved.

### 2026-11-18 — Codex (Get the App localhost preview)

- Served the existing mockup at `http://localhost:3000/dev-review-preview/get-app`
  via dev-only route `aaaa1a6`; standalone preview payload stays in ignored
  `apps/web/work/get-app-preview/index.html`. The live Get the App route was
  not edited. Production guard returns 404.
- Replaced the October screenshot with a fresh native iPhone 17 Pro simulator
  capture from current mobile source `17447cc` using the existing QA client.
  The Boone map is shown with its current markers and controls. The public
  Winkler’s Creek photos are retained. iPhone simulator left running with
  internal analytics disabled; no mobile rebuild, store action or deployment.
- Verified the final localhost response and layout from 320px to 1440px.

### 2026-11-18 — Codex (YouTube social link)

- Added the owner-confirmed `@LitterbugsCommunityCleanup` channel beside the
  existing social icons through shared `SocialLinks`, including the footer,
  phone drawer and map footer. Verified actual channel opening and the layout
  at 320px. Scoped lint and diff checks passed.
- Source `e3cf614`. Localhost:3000 remains running. No live deployment.

### 2026-11-18 — Codex (nearby alerts open selected map reports)

- Replaced the general map destination with report-specific selection. Verified
  Grant's two already-read local inbox links open the Hobby Lobby and Dollar
  General reports with their map detail panels visible, respectively. A digest
  with multiple visible matches lists the reports with links to select each.
- Older alerts use the saved alert area and sent time because they did not store
  report IDs. Migration `20261118165228_capture_daily_nearby_alert_reports.sql`
  captures the exact report IDs for future sends without storing an alert area.
- Source `3a38147`. 75 focused web tests, typecheck, scoped lint, and an isolated
  PostgreSQL migration smoke test passed. Localhost:3000 remains running. No
  production deployment, migration, notification mutation, or mobile release.

### 2026-11-18 — Codex (Get the App visual mockup)

- Built a standalone mockup and desktop/mobile previews in the chat's
  visualization folder `01a1ef8f-1783-7bb2-8999-2eb09cd3e606`. The mint layout
  shows a real iPhone Boone map capture from the October 30 release assets
  and the original public Winkler’s Creek underpass before/after photos from
  report `80fa643d-b494-4975-96e8-99eb6dcbe714`.
- Verified that assets load and the layout fits at six widths from 320px to
  1440px. Design preview only. No product edits or deployment.

### 2026-11-18 — Codex (Refero Styles evaluated)

- Tested Refero Styles search and full style retrieval. Reviewed Ecosia,
  Airbnb.org and Duolingo for product demonstration, documentary cleanup
  photography and rank milestones. Public library offers DESIGN.md, Tailwind,
  CSS variables and design-token exports.
- Recommended piloting the approach on Get the App and documenting Litterbugs'
  own mint, bug artwork and component rules for Codex and Cowork. Research
  only. No app or website changes, Refero settings changes, or deployment.

### 2026-11-18 — Codex (local website preview)

- Started the shared checkout at `http://localhost:3000` and left it running.
  Browser checks confirmed the mobile drawer beetle and Leaderboards link, the
  available-cleanups map destination, and the notification inbox sign-in return.
  The inbox needs the member's local login to show their alerts. No production
  deployment or database changes.

### 2026-11-18 — Codex (saved Ahrefs/Bing findings summarized)

- Recovered original November15 audit/backlink and Bing checks from committed
  history4a4df7d/0e3b53d/67e1f1c. Distinguished Ahrefs100% health with warnings,
  already-deployed URL/metadata/share-tag fixes, and vendor-classified spam links
  from penalties. Bing49 sitemap discoveries are not indexed-page proof;
  November17 performance remained pending. No fresh provider check claimed.
- Advisory recap only. No product edit, deployment, push, outreach or schedule
  restart; concurrent root changes preserved.

### 2026-11-18 — Codex (daily nearby alerts in the web inbox)

- Read-only production check confirmed that the November 16 and 17 5 p.m.
  notifications shown by Grant match daily nearby-litter alerts. The deployed
  inbox did not recognize the event type and fell back to Current cleanups.
- Existing and future daily alerts now show “New litter near you” and link to
  the map filtered to available cleanups. The map uses its normal saved area.
  A regression test verifies both old alerts and acknowledges only the one opened.
- Shared source commit `88df097`. Isolated website candidate `b2e90b6` on
  `codex/web-nearby-alert-routing` (base `4ed9b42`), 30 focused tests passed;
  shared typecheck and scoped lint passed. Deployment is pending. No live
  notification, account, mobile, or database changes.

### 2026-11-18 — Codex (Leaderboards burger-menu beetle)

- Added the existing crowned beetle beside Leaderboards in the website burger
  menu using the same icon sizing and spacing as the other menu items.
- Verified the mobile link opens the leaderboards and the desktop link remains
  text-only. All 20 header tests passed. Applied in the shared checkout and
  isolated in commit `76dbaac` on `codex/burger-menu-beetle`, based on `4ed9b42`.
- Production deployment is pending. Existing concurrent work was preserved.

### 2026-11-18 — Codex (Stripe Global Payouts decision read)

- Read latest Stripe email dated November16,2:24AM ET in existing Gmail thread.
  Internal review declined supporting current cleaner-payout model through Global
  Payouts and declined requested country access/funding arrangement. Email gives
  no specific reason or remediation and does not instruct stopping current US
  Connect payouts; it is not affirmative approval of current Connect flow.
- Explained scope and recommended seeking explicit Connect clarification and
  reasons/alternative supported structure. No reply sent, provider settings,
  payment action, deployment or application source change.

### 2026-11-18 — Codex (scheduled-job status update)

- Read-only status check confirms daily analytics and weekly SEO automations
  were deleted in the analytics chat at the owner's request; international
  payout follow-up remains paused. No schedules restarted or changed here.
- Summarized last saved November16 SEO/analytics findings; no fresh indexing
  inspection, provider query, production edit or deployment in this check.

### 2026-11-18 — Codex (scheduled monitoring stopped at owner request)

- Grant requested stopping the cron jobs during today's analytics review.
  Deleted daily Clarity/analytics and weekly SEO schedules through the app;
  the separate international-payout follow-up was already paused and remains so.
- Partial read-only findings saved in
  `docs/reviews/2026-11-18-analytics-monitoring-review.md` in the isolated review
  checkout. No new confirmed failure; owner dashboard not rechecked before stop.
  No product edits, deployment, push, provider/database or store actions.
  Preserved all concurrent root changes. No further scheduled reviews will run.

### 2026-11-17 — Codex (app notification inventory)

- Read-only check of frozen mobile source4835975 and matching server copy
  identified26 notification types, including2 admin-only and2 opt-in nearby
  alerts. Provided simple title list; no notification sent, preference changed,
  implementation edit or deployment.

### 2026-11-17 — Codex (cleaner public profile checked)

- Read-only same-cleaner profile lookup: display name Aud, joined November5;
  username, bio and location are unset. No private contact/identity details
  retrieved, profile edit, production write or deployment.

### 2026-11-17 — Codex (cleaner pending-payment display checked)

- Read-only verification against frozen mobile source4835975: completed paid
  cleanup rows show Payout pending for pending, Sending payout for processing,
  Payout sent for transferred; Payments totals include pending as on the way.
  Stripe-funds waiting reason is not fetched/displayed in these rows. Explained
  distinction from current 48-hour review state. No product edits or deployment.

### 2026-11-17 — Codex (incoming Stripe payment traced)

- Read-only DB/payment-dashboard reconciliation confirms incoming $17.18 is
  the November16 $18 contribution charge for Winkler Creek: $15 principal +
  $3 service fee less $0.82 Stripe processing. Stripe shows November18 funds
  availability. No payment, refund, transfer, settings change or deployment.

### 2026-11-17 — Codex (pending cleanup reward inventory)

- Read-only production lookup excluding sample/reviewer cases confirms Aud's
  $25 is the only current funded cleanup reward awaiting approval; other
  untransferred historical attempts are released/expired. Distinguished the
  previously observed $17.18 incoming Stripe settlement from cleanup approval.
  No approval, transfer, provider edit or deployment performed.

### 2026-11-17 — Codex (live Stripe available funding checked)

- Signed-in Litterbugs Stripe balance shows $24.96 available and $17.18
  incoming November18. Current available balance is $0.04 below Aud's $25
  pooled reward; incoming settlement would cover it if balance is otherwise
  unchanged. Review deadline remains November19. No payment, transfer,
  account setting change or deployment performed.

### 2026-11-17 — Codex (Aud payout process explained)

- Read-only live case: $25 frozen reward, photo/financial review passed,
  no dispute, admin review not required; reporter window ends Nov19 at
  3:35 p.m. Eastern. Explained reporter early approval or automatic approval,
  then automatic Connect transfer and separate bank payout timing. No approval,
  payment, provider edit or deployment performed.

### 2026-11-17 — Codex (Aud Stripe payout readiness verified)

- Read-only DB and live Litterbugs Stripe account retrieval agree: onboarding
  enabled, payouts enabled, transfers active, details submitted, one payout
  destination and no currently/past-due or pending-verification requirements.
  No approval, transfer, payout, account edit or deployment performed.

### 2026-11-17 — Codex (Aud cleanup submission photos retrieved)

- Owner-requested read-only lookup retrieved and inspected all three submitted
  after photos for the Winkler Creek/321 underpass case. Originals saved only
  to this chat's local visualization folder and shown to owner; no approval,
  payment, public upload, production write or deployment performed.

### 2026-11-17 — Codex (Winkler Creek funders checked)

- Read-only same-report payment lookup confirmed three successful contributions
  totaling $25 in cleanup principal. No production writes or deployment;
  concurrent edits preserved.

### 2026-11-17 — Codex (Winkler Creek cleanup claimant checked)

- Read-only lookup identified the screenshot report's current cleaner and
  confirmed its status is completion_submitted, claimed this morning.
  No production writes, deployment or outreach; concurrent work preserved.

### 2026-11-17 — Codex (traffic and signup decline investigated)

- Read-only report/evidence saved in `docs/reviews/2026-11-17-traffic-drop-*`.
  GA sessions113→64; Instagram/Facebook54→14 explain40 of49 fewer
  sessions.21 of29 prior-week account creations fell Nov4–5. Promotion/reach
  cause not verified; owner asked. Accounts span app+web, not web conversion.
- Nov13 admin-browser exclusion may reduce later direct traffic; decline
  precedes it. No recorded participation auth-failure spike; incomplete funnel
  prevents ruling out intermittent signup issues. No production/provider changes,
  deployment or outreach. Existing concurrent edits preserved.

### 2026-11-17 — Codex (business growth and usage update)

- Read-only live totals saved in `docs/reviews/2026-11-17-business-growth-update.md`.
  Nov10–16:74 website sessions,3 registrations,2 reports,0 completions,$26
  cleanup principal; prior week154/29/6/5/$36.28 days:9 cleanups,$92
  principal,$19.40 gross platform fees. Staff/owner participation may remain.
- Published-build app sample:10 sessions/5 identities; limited Nov14–15+
  coverage. Stripe account identity verified, but scoped credential denies
  balance/subscription/charge-list reads; latest supporter zero remains Nov15.
- No deployment, production/provider write, store action or outreach. Existing
  concurrent work preserved. No automatic monitoring created.

### 2026-11-17 — Codex (Ahrefs/Bing capabilities and reporting availability)

- Read-only owner-requested check: Bing Webmaster Tools lists litterbugs.app;
  Search Performance still displays “Please check back in 48 hours while we
  prepare the data for your site.” No clicks, impressions or positions available
  from this page today; do not interpret the pending state as zero traffic.
- Explained Ahrefs Free audits/backlinks/estimated Google visibility and limits,
  and Bing search metrics, indexing tools, backlinks/research and AI Performance.
  Official provider documentation checked. Local SEO Bing API is unconnected;
  signed-in browser access works. No new credentials or settings changed.
- Documentation only; no implementation, deployment, database/provider write,
  indexing request or push. Concurrent Claude/root changes preserved.

### 2026-11-16 — Codex (weekly SEO monitoring)

- Saved `docs/reviews/2026-11-16-seo-weekly-baseline.json`: 55 sitemap URLs,
  31 reports (14 open / 5 expired / 12 completed), one new cabin cleanup with
  verified before/after images. All report pages return 200, self-canonical,
  crawlable and linked from their directories; 30 old addresses reach the
  matching current URL through the intentional 307s. Preserve that policy.
- 48 bounded Google inspections: all 14 saved old priority report URLs indexed,
  including both repaired expired reports. Current readable URLs: 2 indexed,
  13 discovered/unindexed, 16 unknown. This follows the November 14–15 URL
  migration; do not compare new-address counts directly with old-address counts
  or claim report identities disappeared. Winkler's old crawl remains November 6.
- Finalized Nov 8–14: 4 clicks / 35 impressions versus 2 / 25; 28 days: 11 / 79
  versus 2 / 20. Sparse traffic; visible queries omit private terms. Next: watch
  URL adoption, encourage factual report descriptions and real cleanup proof.
- Monitoring/documentation only; no indexing requests, content changes, deploy,
  database writes or visitor analytics. Concurrent changes preserved.

### 2026-11-15 — Codex (monthly supporter check)

- Read-only check of the live Litterbugs Stripe account `acct_1U2HZe40KMkUKMFW`:
  Subscriptions shows the empty onboarding state; no monthly supporters yet.
- Used the signed-in dashboard because the Stripe connector belongs to another
  business. No payment/account/product changes, deployment or database writes.
  Existing concurrent website changes preserved; nothing pending from this check.

### 2026-11-15 — Claude (rank path, homepage leaders and nav tidy-up deployed)

- LIVE: release branch `claude/rank-path-release-20261115` (pushed), commit `4ed9b42`
  on `4c45227` (the leaderboards release). Deployment `dpl_BWUkHL1xU2W3u6uzPDjT3ZYJd3jL`
  (litterbugs-e4ksqjja9), staged with `--skip-domain`, checked, then promoted.
  Rollback: `dpl_9PofLNMspV89k5tNVELCBdo1WbsL`.
- Leaderboards: signed-in members see their path to the next rank bug under Your
  standing (`components/community-leaderboard/rank-path.tsx`, `lib/rank-path.ts`).
  Every leaderboards title leads with the crowned beetle (`leaderboard-title.tsx`),
  which hops once on arrival; the beetle is gone from the header.
- Homepage: Top towns (cleanups only; All time when fewer than 3 towns have one this
  month) and Cleanup leaderboard under the map (`public-website/home-leaders.tsx`).
- Header: Earn = butterfly/plum, Support = caterpillar/green (also the Cleaner guide
  label); Leaderboards link hover box matches Report/Donate/Earn.
- Database (live, additive, applied before release at Grant's instruction):
  `supabase/migrations/20261115192746_my_rank_point_events.sql` adds
  `public.my_rank_point_events()` (caller's own events only; authenticated only).
- Checks: typecheck, scoped lint, 1,173 web tests on the release tree; staged and
  live pages verified with plain requests (no analytics).
- Not released: `dev-review-preview/home-*` design mock-ups; this working folder's
  other uncommitted edits were left untouched.

### 2026-11-15 — Claude (Leaderboards, town finder, site cleanup and Ahrefs fixes deployed)

- LIVE: release branch `claude/leaderboards-release-20261115` (pushed), built on
  Codex's live source `5bc2553` via `67e1f1c` (keeps the Ahrefs/Bing verification
  tags). Commits `686c4b9` (feature) + `5968768` (unused import). Deployment
  `dpl_9PofLNMspV89k5tNVELCBdo1WbsL` (litterbugs-mauqfyl87), staged with
  `--skip-domain`, checked, then promoted. Rollback: `dpl_Ufyfut4xMLfRbV8TTyXxDaqDVLEx`.
  Same changes as an unpushed local branch on the working history:
  `claude/leaderboards-source-20261115` (`dface39`, parent `4c0d7b6`).
- Leaderboards (menu item, crowned champion-beetle bug): automatic city/county
  community pages with Cleaners/Reporters/Funders boards, Global home with town
  finder (search, Near me, your towns), Busiest towns, country/state browse pages.
  Opt-out switch in account settings; privacy sentence added (effective date not
  yet changed). "Get the app" now collapses before Leaderboards in the header.
- Removed the old editorial Communities system, Boone static pages, /locations,
  /organizations, home previews and unused assets; 308 redirects in next.config.ts.
- Ahrefs fixes: report towns now come from stored community-cell lookups (sitemap,
  page canonical and redirects agree; 6 live sitemap entries were missing towns),
  report titles ≤65 and descriptions ≤155 characters, full share tags on 10 pages.
- Database (all live, additive): migrations 20261115160657 … 20261115173304 in
  supabase/migrations (community tables/jobs/RPCs, finder, report towns, daily
  cron-history purge, two unused functions dropped). Also compacted
  net._http_response and deleted 158 orphaned photos with Grant's approval:
  DB 372 → 25 MB, report photos 500 → 182 MB.
- Checks: typecheck, scoped lint, 1,165 web tests on the release tree; staged and
  live URLs verified (pages, redirects, finder, sitemap, report/rank share images).
- Not done: mobile app opt-out switch, privacy effective date, leaderboard analytics
  events. Working folder's uncommitted Codex edits (.claude/launch.json, this log)
  and dev-review-preview pages were left untouched and not released.

### 2026-11-15 — Codex (MCP business-value estimate)

- Advisory review found no MCP server implementation in searched web source.
  Current MCP documentation confirms client connections are required; server
  publication alone does not establish distribution or customer acquisition.
- Recommended treating a read-only MCP as a small partner-led experiment.
  Acquisition figures in the answer are explicitly hypothetical funnel
  arithmetic, not observed conversion rates or revenue forecasts. Ordinary
  website widgets would use the API; MCP specifically serves AI clients.
- No implementation, outreach, production testing, deployment, push, database
  or store actions. Preserved concurrent staged and working changes.

### 2026-11-15 — Codex (website recovery/analytics and saved drafts deployed)

- LIVE source `66f823d`, pushed branch `codex/website-recovery-20261115`, based on
  prior live85adaad. Final deployment dpl_F9z1u3RoMSj71saxGCyr8qkjFJiW,
  litterbugs-l2khct9qb-grant-9890s-projects.vercel.app, staged/checked then promoted
  to litterbugs.app. Immediate rollback is dpl_GxE5ogMVWZmKkeEZBZXzEAvWYNTa
  (sourcee48e040, recovery/analytics only); original live6jERvD7 remains earlier.
- Website portions of17447cc and branded map recovery646e20c are now deployed:
  GPS retry/settings recovery,20s location cap,published-build/staff eligibility,
  split app timing signals/cache policy,and12s visible-time map timeout with
  Try again/Browse reports. Approved native app timings/builds untouched.
- Local draft source40c9cf4: Saved drafts now has a single compact summary,
  caterpillar/Nunito/mint styling,Resume/Continue and Delete draft with inline
  confirmation. Removed copy/version/sync instructions,coordinates and expiry
  detail from this section; simplified adjacent draft-attention copy.
- Deletion uses existing revision-guarded draft RPC/tombstone and local clearing,
  not published-report deletion or cleanup cancellation. A listed revision can
  be deleted without downloading its photos; concurrent changes/failures retain
  the row. Account-switch/inflight-read guards prevent cross-account updates.
  Successful deletion clears false draft-attention status. No schema migration.
- Exact final release:1180 web tests passed (Node22,maxWorkers2,testTimeout20s),
  27 draft-sync tests passed,web typecheck/scoped lint and Vercel production
  builds passed. Initial Node26/workspace dependency issues and concurrent-test
  timeouts resolved; no production-code workaround. Full legacy shared mobile
  parity checks still fail5 historical expectations; not modified or a web gate.
- Real component browser QA at1100/390/320px: no overflow,confirmation/cancel,
  mocked revision7 delete and removal passed. No real owner draft deleted.
  Live map normal tiles loaded; injected map stall offered branded recovery and
  Browse reports opened real list. Production test browser analytics declined.
  Screenshots in this chat's visualization directory; fixture route removed.
- Existing public report-page SEO/location changes preserved. Other agent's
  header/footer/leaderboard/preview/migration edits excluded and left untouched.
  No mobile build/OTA/store/provider settings or DB writes/migrations. Earlier
  native location recovery remains local, pending mobile acceptance/delivery.

### 2026-11-15 — Codex (branded map recovery and visible-time timeout implemented locally)

- Source `646e20c`: website tile-startup timeout now counts12 seconds of visible
  page time, pausing while hidden and resuming its remaining budget. Late tiles
  still recover automatically; missing configuration/auth/initialization failures
  remain distinct. Analytics retain backgrounded/wall-duration semantics.
- Branded recovery uses existing caterpillar artwork/Nunito type, mint Try again
  (#b9e9dd/#8ed7c5) and outlined Browse reports. Retry recreates only the map,
  cancels old listeners/timers/markers and ignores stale callbacks; URL area,
  filters and report state retained. Browse opens the existing report list, which
  remains searchable during retry. No native map/camera/startup changes.
- Full web suite1178 passed; final map regressions64 passed after listener cleanup;
  typecheck/scoped lint passed. Actual MapExperience browser QA at1440/390/320px:
  no overflow,46px buttons,retry and report-list navigation passed. Controlled
  unresolved SDK verified30s hidden causes no error, return resumes budget.
  Automatic late-tile recovery verified in component tests, not live Google QA.
- Final browser run had no runtime errors/overlay; preload-only development
  warnings remain. Browser plugin unavailable; Playwright used. Temporary local
  fixture route removed; generated next-env changes restored. Screenshots outside
  repo in this chat's visualizations. Existing preview/Claude edits preserved.
- No deploy,push,provider/DB changes,migration,app build,OTA or store change.
  Website delivery remains pending with earlier local location/analytics source
 17447cc; no live-effect claim. Owner approved this map implementation scope.

### 2026-11-15 — Codex (map recovery buttons preview)

- Created conversation-only website timeout preview: mint Try again and outlined
  Browse reports, with simulated retry/loading/failure and example report-list
  transition/back. Existing map surface/system type retained; buttons stack on
  narrow screens. No live requests or product-source edits.
- Verified interactions and no overflow at736px/320px outer widths, no browser
  runtime errors; inspected rendered preview. No deploy,push,DB,provider,app,
  build,OTA or store change. Preview outside repo in this chat's visualizations.
  Existing location/analytics source17447cc remains local. Other work preserved.

### 2026-11-15 — Codex (map timeout source review and recommendation)

- Source confirms website12-second tile startup timer continues while the page
  is hidden; visibility currently only tags analytics. Late tiles already clear
  the timeout message. Recommended visible-time timeout plus explicit retry/list
  recovery. Separate empty report results already have clear-filter/search and
  closest-report guidance; do not conflate them with failed tile loading.
- Advice only: no product changes, deploy,push,build,OTA,provider or DB changes.
  Prior local location/analytics fixes and approved native timings unchanged.

### 2026-11-15 — Codex (Clarity follow-up and daily analytics review)

- Read-only Clarity/PostHog follow-up through about9:50am Eastern:9 recordings
  in Last3days. Sampled map timeout was backgrounded; later foreground map ready
  in0.8s. Sampled dead click coincides with outbound App Store badge click,
  not a confirmed broken control or install. No participation_failure today.
- Created active daily9am Eastern heartbeat litterbugs-clarity-and-analytics-review
  in this chat, analysis/recommendations only; existing weekly SEO unchanged.
  Baseline:docs/reviews/2026-11-15-analytics-monitoring-baseline.md.
- No product/provider/DB/store changes, deploy,push,build or OTA. Location and
  analytics source17447cc remains local; delivery/acceptance pending. No new
  confirmed fix recommended from this small sample. Other agents' work preserved.

### 2026-11-15 — Codex (location and analytics fixes implemented locally)

- Source `17447cc`: app pin/submission recovery and web submission recovery offer
  retry/settings guidance while keeping the pin/answers/journal. Web GPS waits
  are bounded; a partly submitted web report can retry with editing still locked.
  Fresh GPS/50-mile checks and approved map/startup/camera timings preserved.
- Owner dashboard now requires explicit published OS/version/build cutoffs and
  excludes known prerelease installs across later public-build visits. Old app
  cache/snapshot values cannot bypass the policy. iPhone fallback and Android
  loaded timings show separately with samples. Live read-only query verified.
  Add verified future releases to `app-release-policy.ts`; Apple30 not yet listed.
- Web full suite1172 passed plus new snapshot regression; app663 passed/1 existing
  skip;226-module check,typecheck,scoped lint passed. Actual web components checked
  desktop/390px. Temporary QA route removed; native device acceptance not claimed.
- No deploy,push,new app build,OTA,DB migration,store change or publication. Frozen
  icon candidates4835975 unchanged. Website deployment and mobile QA/delivery
  remain; isolate from unrelated website work. Homepage/funded shortcuts omitted.
  Review:docs/reviews/2026-11-15-location-analytics-fixes.md. Other edits preserved.

### 2026-11-15 — Codex (analytics fixes visual preview)

- Owner requested a preview and app/website scope clarification. Created an
  interactive conversation preview outside the repo: Web CTA/funded entry,
  iPhone/Android funded shortcut, GPS/permission recovery, owner analytics rules
  and platform timing labels. Existing art/photo/map evidence reused; list
  examples and simulated recovery explicitly labelled. No invented clean totals.
- Checked desktop and narrow mobile rendering, assets, tabs, funded list,
  location-state changes/dismissal and admin-rule disclosure. Preview only;
  no product source, device, analytics-provider, DB, store, build, OTA, deploy
  or push changes. No startup-timing change proposed without clean measurement.
  Other agents' existing edits preserved.

### 2026-11-15 — Codex (analytics review and fix recommendations)

- Read live owner dashboard, PostHog695338 and one Clarity recording. Nov8–14:
  web87/app32 tracked sessions;2 cleanups,$31 funding,3 reports,4 contributors.
  Current backlog14,including4 funded;oldest27 days.28-day totals9 cleanups/$77.
- App totals contain withdrawn iOS28(14 screen sessions),Android25 and other
  prerelease activity despite production flags. Recommend release-date/build
  eligibility plus staff-device exclusions before interpreting conversion.
- Location failures: Android26 location_unavailable and web location_denied;
  separate tagged QA event excluded. Recommend clearer retry/settings recovery,
  preserve fresh-GPS/50-mile checks.5.5s map median includes intentional4s iOS
  fallback; split timing signals/platforms before changing approved startup UX.
- Recommend funded-cleanup discovery and clearer web map entry. Clarity11.1%
  dead-click signal not a confirmed broken control: sampled mobile click hit a
  homepage image. Recommendations only;no app/web/provider/DB/store changes,
  migrations,deployment,push or publication. Existing unrelated edits preserved.

### 2026-11-15 — Codex (Google27 published; Apple30 publication authorized)

- Owner explicitly requested publication of both icon updates when ready.
  Verified Google27(2.1.1) approved; publication confirmed, ready queue empty,
  Last published November15. Managed publishing remains ON for future changes.
- Apple30 still WAITING_FOR_REVIEW/MANUAL. Active check/release session78077
  will request manual release for exact2.1.1(30) once approved, under this owner
  instruction; no scheduled automation and no additional publication approval
  needed. Earlier2.1.1 public hold superseded. No source/build/OTA/web/backend
  changes; frozen4835975. Google screenshot and current Apple status saved
  under artifacts/mobile-2.1.1/device-evidence. Other work preserved.

### 2026-11-14 — Codex (Google27 approved; active Apple30 monitoring)

- Owner requested approval monitoring and notification. Fresh Google Console
  confirms27(2.1.1) approved/Changes ready to publish; Managed publishing ON.
  No Publish action taken. Apple API still WAITING_FOR_REVIEW, MANUAL.
- Continuing Apple checks in this active chat (local session73441); no scheduled
  automation or automatic release. Neither icon update publicly released.
  Evidence apple-approval-watch.json under mobile2.1.1/device-evidence. No app,
  build, submission, website/backend, notification or deployment changes.

### 2026-11-14 — Claude (public report pages: SEO, addresses, location, layout — deployed)

- Live on litterbugs.app. Source `85adaad` on isolated release branch
  `claude/report-pages-seo-20261114` (cut from the previous live source
  `d142b2c`, pushed to GitHub). Production deployment
  `dpl_6jERvD7hHf6wHekXmXt1p3ecL3K4`, built on Vercel and promoted after checks.
  Previous deployment/rollback: `dpl_8MYNXYQc8CDo2aHCUTCgy3ATLFQT`.
- Website only. No app changes, no database migrations, no native build. The
  release branch deliberately excludes this checkout's unreleased work
  (`cleanup-notifications` changes and `dev-review-preview` pages).
- Report pages (open, completed, expired) now live at
  `/litter-reports/<title>-<town>-<id>`. `/reports/<id>` redirects there (307) and
  stays the address the mobile app, share links, photos and share images use; do
  not put words into `/reports/<id>`, the published app only routes that shape.
- Missing or non-public reports return a real 404 (checked in `proxy.ts`, one
  small database read per report view; a failed read passes through).
- Town and nearest street address come from OpenStreetMap Nominatim
  (`lib/report-town-lookup.ts`), cached 90 days in the server Data Cache, one
  request a second. Town lookups send a position rounded to ~1 km; address
  lookups send ~10 m. Owner approved both.
- Owner decision: report pages now show the address, coordinates and a live map
  pin. The share dialog line "won't see the exact location" was removed.
- Fund now shows on reports that already have funding (the page no longer treats
  `funding_locked_at` as "cannot be funded") and on open reports outside Boone.
- Also: head metadata for answer-engine crawlers (`htmlLimitedBots`), Article and
  breadcrumb structured data, all photos with tap to enlarge, share dialog on
  report pages, facts strip, timeline, nearby reports by distance, `llms.txt`,
  sitemap with readable addresses and completion dates.
- Checks: 1165 web tests, typecheck and lint passed on the release source. Live
  spot checks passed for home, listings, map, admin analytics, a report page,
  redirect, 404, photos, share image, sitemap and the app link file.
- Pending: the same changes are committed locally on `codex/map-first-navigation`
  but that branch is not pushed. Not done: town/ZIP listing pages, report page
  caching, removing the loading shell for non-JS crawlers, clearer "bag/item"
  numbers (needs the cleanup form). Cleanup time shows only when a cleaner
  recorded it; no public report has one yet.
- Do not undo: the `/reports/<id>` → readable-address redirect, the 307 status
  (the address changes with title and town), or the Nominatim rate limiting.

### 2026-11-14 — Codex (fresh2.1.1 approval check; neither approved)

- Existing ASC API read confirms icon-only iOS2.1.1(30) still WAITING_FOR_REVIEW,
  releaseTypeMANUAL. Google Console now says changes are in review for27(2.1.1);
  initial quick-check countdown has gone, Managed publishing remains ON.
  Neither approved or publicly released. Status evidence:
  artifacts/mobile-2.1.1/device-evidence/approval-status-20261114.json.
- Read-only store check; no release, new build/upload/submission, OTA, deploy,
  notification or watcher. Frozen4835975 unchanged. Other changes preserved.

### 2026-11-14 — Codex (approved full-logo2.1.1 builds checked and submitted)

- Owner approved both full-wordmark icons and explicitly requested otherwise
  identical apps to yesterday. Build source4835975 from frozen5e0c5fd; shared
  source1cd2c5b. Only two icon assets plus required2.1.1 version/assertion changed.
  658 tests pass/1 existing skip;225-module check passes;432 other source/
  dependency files match. Actual finished iOS/Android JS bundles are byte-identical
  to29/26; Android80 native libraries identical, manifests/config/entitlements/
  signatures/splash images preserved apart from versions. Final icons inspected.
- Native icon-only previews passed physical Pixel and iPhone17Pro simulator;
  Pixel outer circle matches normal icons. Both temporary apps removed; Pixel
  retains only Google Play26/data. Physical iPhone unavailable, no full new
  journey acceptance claimed. Existing provider-test exclusions preserved.
- iOS2.1.1(30) e0eb7de2 uploaded/attached; submission66f32d96-b03c-44b5-8e22-0714e05e1879
  WAITING_FOR_REVIEW, MANUAL. Android27 build495a8fd6 uploaded via native picker
  after generic first-upload failure; draft6 contains27 only, zero blockers/
  device loss, existing optional deobfuscation warning. Changes in review with
  quick checks continuing; Managed publishing ON. Store metadata/privacy/screens
  retained; notes mention icon only. Neither update public;2.1.0 stays live.
- Pending store checks/reviews and later owner public-release instruction. No
  OTA, backend/website deploy, notification, GitHub push or automatic watcher.
  Evidence artifacts/mobile-2.1.1; docs/reviews/2026-11-14-icon-only-release.md.
  All other Claude/web changes and pre-existing handoff additions preserved.

### 2026-11-14 — Codex (full-logo iPhone and Pixel appearance previews)

- Owner requested icons before proceeding. Used the exact existing white
  Google Play listing artwork from release-assets/google-play/
  2026-10-30-refresh/v12/listing-assets/litterbugs-icon-white-512.png;
  preserved all lettering/colors/bugs. Rendered rounded-square iPhone and
  circular Pixel previews, enlarged and at60/56 CSS-pixel home-screen sizes.
- Visually checked all four logo instances render with no clipped bugs. HTML,
  PNG and reference note saved outside repo in current conversation visualization
  root as litterbugs-full-logo-icon-preview.* and litterbugs-icon-preview-reference.txt.
  These are appearance mockups, not native build/device acceptance. No app asset,
  config, phone, OTA, build, upload or store changes. Owner selection pending;
  final native icon resources still need implementation/verification if approved.

### 2026-11-14 — Codex (consolidated maintenance-release advice)

- Owner wants to avoid repeated store updates. Recommended one coordinated
  maintenance release with full-wordmark icons for both platforms, a focused
  check of native branding/configuration, and owner's preview of actual
  installed candidate icons before submission. Existing apps can remain live
  during preparation; group other confirmed fixes before freezing candidates.
- Future eligible screen/text/logic fixes can use existing Expo OTA; native
  changes still require store releases. Checked Apple alternate-icon docs:
  alternate artwork must be included in the binary, so icon-switching support
  would not remove that limit. Advice only; no source edits, build, OTA,
  upload, store submission/publication or deployment. Other work preserved.

### 2026-11-14 — Codex (full-logo OTA feasibility checked)

- Current Expo documentation confirms launcher icons are native resources
  requiring a new binary/store release; OTA updates cover JavaScript/assets.
  Inspected actual Apple29 Info.plist: no alternate icons (iPhone/iPad).
  Installed Play26 AndroidManifest contains zero activity aliases; project
  has no alternate-icon switching dependency/implementation. Full-wordmark
  installed icons therefore need new store builds for each targeted platform.
- Advice/read-only verification only; no product edits, OTA, build, upload,
  submission or publication. Sources: expo.dev/articles/updates-and-rollouts/
  over-the-air-updates and docs.expo.dev/develop/user-interface/
  splash-screen-and-app-icon/. Other pending work preserved.

### 2026-11-14 — Codex (Pixel Play listing logo distinction observed)

- Read-only Pixel screenshot shows Google Play listing uses the full black
  Litter Bugs wordmark with colored bugs, distinct from submitted Apple29's
  standalone ladybug and installed Android26's adaptive placeholder. Clarified
  separate store-listing and installed-app artwork; previous "correct" label
  for Apple ladybug was an assumption about owner's intended logo. No phone,
  source, artwork, store or deployment changes. Screenshot in /tmp only.

### 2026-11-14 — Codex (icon history traced; Apple29 artwork verified)

- Android adaptive placeholder bytes and configuration are unchanged from
  initial commit b5888f0 (January2) through frozen release5e0c5fd; August move
  only relocated the asset. No evidence of a recent logo replacement in this
  repository. Explained separate Android override and missed release check.
- Extracted primary AppIcon60x60@2x from actual submitted iOS2.1.0(29) IPA;
  visually verified correct red/black ladybug on white with green corners.
  Bundle/version29 confirmed and matched existing Apple release evidence.
  Apple build does not share Android placeholder defect. No product edits,
  new build, store mutation or deployment; Android correction remains pending.

### 2026-11-14 — Codex (Pixel duplicate removed; Android icon defect diagnosed)

- Owner requested removal of older Litterbugs copies from the physical Pixel5.
  Verified Google Play installer for com.litterbugs.app, version2.1.0/code26;
  uninstalled only com.litterbugs.app.qa successfully. Recheck confirms only
  the Play package remains, with its original installation/data preserved.
  The unrelated Business Profile WebAPK was inspected and retained.
- Owner reported incorrect launcher artwork. Extracted installed Play26 APK
  confirms adaptive launcher foreground is the grid/circles placeholder from
  assets/adaptive-icon.png; app.json points Android there while the general
  icon setting points to the ladybug assets/icon.png. Explained modern Android
  downloads inherit this release defect; correcting it requires a new Android
  binary/update. No source/icon/store changes or new build/deployment. Icon
  correction and any replacement release remain pending. Other work preserved.

### 2026-11-14 — Codex (Apple29 released; update behavior explained)

- Existing ASC API credentials verified2.1.0(29) approved/PENDING_DEVELOPER_RELEASE.
  Owner had already requested publication of both stores. Manual release request
  accepted; API now lists live2.1.0(29) READY_FOR_DISTRIBUTION,no pending/in-review
  version. Android26 already published. Evidence apple29-released-20261114.json.
- No new binary/code,OTA,website/backend deployment or push. Frozen5e0c5fd.
  Store propagation can vary. Old app has no store-update popup; explained
  automatic store updates/manual Update. No announcement notification sent.

### 2026-11-14 — Codex (Android26 published; Apple29 still waiting)

- Fresh Console showed Google26(2.1.0)+Data safety approved/ready. Owner then
  explicitly requested publication. Publish changes confirmed; Last published
  November14 and ready queue empty. Managed publishing staysON. Google says
  usual propagation≤1hour; universal availability not independently verified.
- Existing ASC API credentials verified2.1.0 attached29 WAITING_FOR_REVIEW,
  releaseTypeMANUAL; live2.0.1(24).29 TestFlightVALID/internal testing is not
  store approval. Apple release pending approval; no setting/release mutation.
- Frozen app source5e0c5fd unchanged. No new build,OTA,website/backend deploy,
  GitHub push or scheduled watcher. Evidence release-status-20261114.json and
  google26-publishing-20261114.png under mobile2.1 device-evidence.

### 2026-11-13 — Codex (full refreshed2.1.0 app rebuilt and resubmitted)

- Frozen source5e0c5fdd1637ace4e50b044d56ff3e9d82870ab5 includes all latest
  approved styles/maps/cards/compact-text fixes. Cloud builds FINISHED:iOS29
  12ef6048-cb30-49a5-badc-103d4d2103bb;Android26
  813e0ecf-f422-4a9d-bd6d-dbd8d927e65b. Original artifacts/signatures/version/
  production analytics verified;Android cert matches25,min24/target36.
- Withdrew Apple28;29 now Waiting for Review under submission
  dd3d93ce-b697-44e7-9bbd-2534e11ddb8f. Manual release retained.29 has Luke's
  existing Burrow Bros group;testing/review notes updated for full redesign.
- Google25 reached approval during withdrawal but was held from publication;
  removed/discarded. New draft5 contains26 only;26+retained Data safety now
  Changes in review,quick checks continuing,Managed publishing ON. No blocking
  errors/zero device loss;existing optional deobfuscation warning.
- No public release,OTA,website/backend deploy or GitHub push. Store approvals/
  actual review feedback and owner public-release instruction remain. Evidence
  under artifacts/mobile-2.1.0/device-evidence;current candidates/readiness updated.

### 2026-11-13 — Codex (multi-size mobile audit; local responsive fixes)

- Source `16582b9fc7cacd7248dfe8a09ab3eaabce0c3a14` keeps compact map pins, card grabber/X and
  all tutorial Next/Skip controls clear;150% text gets the existing enlarged
  Report Litter layout. Header drag now dismisses after content scroll. Normal
  styling and approved iOS/Android motion timings preserved.658 tests pass/1
  skip; scoped lint and225-module source check pass.
- Native UI checks: iPhone6s375×667 (current local JS in isolated27 QA shell),
  iPhone17Pro simulator402×874/default+larger text, Pixel5 virtual displays
  320×568/default+150%,360×640,412×915. Both phones passed scrolled grabber
  dismissal. Pixel display/font and simulator text restored; simulator left
  open. Existing draft preserved; no live publishing/payment/claim test.
- Evidence: local artifacts/mobile-2.1.0/device-evidence/screen-size-audit.
  Owner paused rebuild/replacement submissions for size review: no earlier
  review canceled, new store binary/upload/submission, OTA/deploy or push.
  Both refreshed store artifacts/checks pending; public release stays manual.

### 2026-11-13 — Codex (local link outreach approach researched)

- Advice/research only;no outreach, forms, partner enrollment, spending or
  live changes. Recommend one useful ask per prospect:existing Boone resource
  link, public volunteer/event listing, or editorial cleanup coverage. Businesses
  can participate in a real cleanup and choose to publish a linked recap.
- Verified primary routes:App State CEL partner/community pages list
  cel@appstate.edu for service newsletter requests and jamesba@appstate.edu
  for volunteer requests (~6 weeks ahead). Formal database targets nonprofits;
  Litterbugs eligibility unconfirmed. Sources:cel.appstate.edu/community-partners/
  and /community-partners/partner-with-us/.
- High Country Press hcpress.com/about-us lists info@highcountrypress.com
  for calendar/general submissions. Watauga Democrat site/contact.html lists
  editor Moss Brennan,moss.brennan@wataugademocrat.com;official forms directory
  includes photo/news-release submissions. Boone Area Chamber correct domain
  boonechamber.com/contact-us (828-264-2225);excluded unrelated Boone County
  boonechamber.org result and made no membership/free-placement claim.
- MountainTrue current site links volunteer opportunities and partnership
  routes;existing directory entry is not an affiliation. Proposed small
  personalized batch,existing page URL,original photos/credits,dates,clear
  request for public website link;one follow-up. No ranking/link guarantees,
  fabricated partner claims or paid-link arrangement. Prior work preserved.

### 2026-11-13 — Codex (nine external-link sources identified)

- GSC drilldowns identify5 AppAgg copies of the Android listing (cs/fr/hu/it/pl)
  plus4 Chrome-Stats pages:one /a/ listing and app copies fr/ko/zh-CN. All
  resolve in GSC to homepage;AppAgg adds referral parameters. Nine recorded
  pages across two domains, mostly translated app listings. Exact URLs added
  to live-seo-gap-audit.json. Two source-page web reads inaccessible;current
  link presence not independently confirmed. No outreach/settings/site/deploy
  changes;existing work preserved.

### 2026-11-13 — Codex (live SEO gaps audited; earlier story proposal corrected)

- Read-only sitemap health:49/49 HTTP200. Linked crawl100 URLs/180 discovered,
  capped, JS off. Independently parsed live homepage/Boone/About/Beacon pages
  to reject false Please wait thin-content counts and streamed-metadata noise.
  GSC UI reports59 indexed/13 excluded as of Nov8;2 crawled-not-indexed are
  images,1 discovered-only is old unavailable report outside current sitemap.
  That old report currently streams200 with Report unavailable/noindex.
- Fresh focused Google snapshots:homepage, report/clean/fund guides, cleanups,
  Winkler, Beacon and Boone all indexed. Full sitemap monitor timed out at
  300s; no complete49-URL indexing claim. Winkler still last crawled Nov6.
- Actual priorities:GSC Links sample9 external links from AppAgg5/ChromeStats4,
  all homepage;seek genuine relevant references to existing hub/report pages.
 11/31 sitemap report titles lack generated locality outside Boone;Beacon body
  lacks town/state. Add only verified broad locality. Homepage has zero direct
  Boone-hub anchors;add contextual link.22 long report-title review candidates;
  shorten search text while preserving original report titles. No new duplicate
  story page. Existing guides/local resources/photos/stories/schema retained.
- Evidence:docs/reviews/2026-11-13-live-seo-gap-audit.json. Semrush insufficient
  API units;live SERP provider unavailable;no demand/ranking forecasts. GSC
  Core Web Vitals lacks field data. No site edits/settings/index requests,
  outreach/deploy/push/database/store changes;HTTP/local reads did not execute
  visitor analytics. All other Claude/mobile/preview edits preserved.

### 2026-11-13 — Codex (local cleanup story preview)

- Owner requested a concrete preview of a shareable cleanup story. Created
  conversation-only draft at thread visualization root/boone-cleanup-story.html
  with story/post tabs and real public Winkler Cemetery report photos/details
  (ea46b81e-7000-4f5f-82af-64a6c624e040):reported Nov5, completed Nov8 by
  Nevan, reporter James Luke Barber;3 bags/items and100 lb labeled cleaner
  recorded. Photos show original litter and collected bags, not matched views.
- Reference lock: existing Litterbugs rounded sans/purple, owner mint CTA;
  Airbnb.org photo-first story hierarchy, Clipdrop input/result pairing.
  No fabricated quotations or impact metrics. Desktop render and390px mobile
  inspection completed; photo sizing corrected, no horizontal overflow, both
  tabs work and all embedded photos load. Preview and assets outside repo.
- No live page/publication/social post/outreach/deploy/push/database/store
  changes. HTTP-only public evidence; local browser QA generated no visitor
  traffic. Existing Claude/mobile/preview edits preserved.

### 2026-11-13 — Codex (organic search growth priorities)

- Read-only fresh query export Aug13–Nov10 retains7 query rows/35 impressions,
  including litterbugs25 and unrelated game/meaning/TV terms; hidden queries
  prevent a complete intent diagnosis. Evidence at
  /tmp/litterbugs-gsc-query-growth-2026-11-13.json.
- Network SEO audits of homepage and Boone hub:200, robots allowed, single
  matching canonicals, zero tool-reported issues; two-page scope only. Existing
  Boone hub already has resources/results; reporting, funding and cleaner
  guides exist. Recommended improve those existing pages, original local
  cleanup evidence, genuine participant/organization links, then expand hubs
  where real activity supports them. Candidate search phrases are proposals,
  not measured keyword-volume evidence. Track nonbrand impressions and useful
  participation over28-day periods; no ranking forecast.
- Advice only: no product edits, outreach, index submissions, database/store
  changes, deployments or push. HTTP/API checks generated no browser visitor
  traffic. Existing Claude/mobile/preview work preserved.

### 2026-11-13 — Codex (Search Console graph explained)

- Read-only fresh GSC API check matches owner's screenshot:14 clicks,131
  impressions,10.7% CTR,14.4 weighted position. Final daily rows cover
  Aug13–Nov10;42 of90 days have zero impressions and78 have zero clicks.
  Requested Nov11–12 final rows were unavailable, not assumed zero. Sparse
  volume explains jagged clicks/impressions and gaps in recorded position;
  no reporting mismatch established. Recommended weekly clicks/impressions
  and equal28-day comparisons; GSC covers Google Search, not all visitors.
- Prior Nov11 inspection evidence showed four pending pages newly indexed;
  no new indexing-health claim or submissions. API-only, no visitor traffic,
  code/settings/database/store/build/deploy/push changes. Raw evidence:
  /tmp/litterbugs-gsc-reading-2026-11-13.json. Existing work preserved.

### 2026-11-13 — Codex (removed test-only welcome replay link)

- Source `0d7bedb49c763363da22ab978fc5f783ff1af6d6` removes the Profile “Replay the welcome (test builds only)” row/comment from the shared iPhone/Android screen. It was already guarded by __DEV__ and absent from store builds; it is now absent from test builds too. “How Litterbugs works,” normal first-launch welcome and map tour remain unchanged. No map/animation/style changes.
-8 existing onboarding/discovery-memory tests, Profile lint and225-module source check pass. Two-line source removal applies to both platforms; no additional native UI verification claimed. Local only: no build/upload/resubmission/public release/OTA/deploy/push. Existing manual public-release holds retained; submitted28/25 unchanged. Other work preserved.

### 2026-11-13 — Codex (smooth Android map-card entry and exit)

- Source `00e95d84d295d38964da02072cf149a22aa12cce`: Android floating previews wait for native card layout and translate by measured card height + bottom clearance/shadow, instead of a full screen. Native transform360ms up/280ms down with eased endpoints and hardware texture; retain card until exit completes. Content relayout cannot restart entry; quick reopen reverses from current position; stale exit cannot clear new selection. iPhone retains original240/180ms transition and distance; pins/maps otherwise untouched.
-648 mobile tests pass/1 existing skip, scoped production lint and225-module source check pass. Physical Pixel QA open/close recordings show continuous movement; owner confirmed “Yes, both directions feel smooth.” Gesture/short-screen/scroll/action/reduced-motion tests pass, with explicit iPhone timing preservation. Evidence android-card-smooth.json/open+close MP4 and frame sheets in local device-evidence. Single existing Metro/mirror; free memory46% during check.
- Local only, no native build/upload/store review changes/public release/OTA/deploy/push. iPhone simulator stays open, existing manual release holds retained. Submitted iOS28/Android25 still need refresh to include local follow-ups; no iOS rebuild/resubmission during Android pass. Other Claude/dashboard/preview work preserved.

### 2026-11-13 — Codex (Android map steady; drop starts on rediscovery)

- Source `419f6377c1f912e27098df37948882ada3c59f6e`: Android-only clustered map adapter lets Google Maps own gestures; native settled regions update app state without being sent back as camera moves. External search/location requests still animate, duplicate Android camera commands removed, automatic native marker centering disabled. iPhone uses the original clustered map component/configuration.
- Android replay opt-in hides pins offscreen, sends a fresh native drop on return and starts during movement (next scheduled frame), rather than waiting for camera settling. Owner clarified startup delay, so native520ms fall/60ms stagger/100ms first-image readiness are unchanged. Shared hook default/iPhone branch preserved; approved PinLanding/cards/MapPin/framing hashes match.
-642 mobile tests pass/1 existing skip; scoped production lint and225-module source check pass. Physical Pixel QA reload verified new module; search, cluster zoom, pan away/return and identical idle map crop recorded. Owner confirmed prompt start and stable map: “Yes, both feel right.” Evidence android-map-rediscovery.json/mp4 in local device-evidence. Single low-resource mirror/Metro retained; memory36%, iPhone simulator open.
- Local only. No native build, store upload/submission/review change, public release, OTA, deploy or GitHub push; submitted iOS28/Android25 remain unchanged and lack this/local shared-card follow-ups. Future candidate refresh remains pending; no iOS build authorized in this Android pass. Other Claude/dashboard/preview work preserved.

### 2026-11-13 — Codex (large report controls; Hide removed on both phones)

- Sourcef37328aee983c15e165d8456bb22eef8b23fe980: detail-toolbar heart/share20→32-point glyphs,52-point targets, spaced into removed Hide slot. Back label stays clear. Removed Hide action from detail toolbar and report list menus; existing hidden items can still Restore, with saved preferences/filtering preserved and no DB writes.
-9 existing focused tests, scoped lint and224-module source check pass. Native simulator visual/AX check confirms large favorite/share and no Hide; screenshot large-report-toolbar.png. Shared iPhone/Android implementation; no physical Android claim. Local only, both release candidates still need refresh before public release. No builds, uploads, review changes, OTA, deploy or push; manual public release and completed privacy retained. Other work preserved.

### 2026-11-13 — Codex (faster iPhone pins; swipe-down cards on both phones)

- Source06fcdef4e95e3eabdb431af6fb099d241f6d73ac, local only. iPhone floating drops280ms/stagger25; Android native520/60 timing unchanged. Both platforms' map previews enter from bottom240ms/exit180ms, swipe down from content top to close, retain normal scrolling/actions and honor reduced motion. Fixed close44×44 stays reachable on short phones. Prior225a0be re-entry fix retained.
- Owner refined header after Refero research: continuous photo/card edge,36-point rail,3-point gray grabber,18-point X vertically centered, gray circle removed per final instruction.634 mobile tests pass/1 existing skip;22 focused checks, component lint and224-module source check pass. CUA verified X dismissal and final appearance; owner confirmed swipe closes cleanly. No physical Android claim. Evidence report-card-final.png/map-preview-motion-local.json; memory35%, no new native worker/simulator.
- Both submitted iOS28 and Android25 now need refreshed builds to include shared card changes before public release; supersedes earlier iOS-only refresh note. Existing reviews/manual release and completed Apple privacy unchanged. No build/upload/OTA/deploy/GitHub push. Other Claude/dashboard/preview changes preserved.

### 2026-11-13 — Codex (iPhone re-entry drop fixed locally; new iOS build pending)

- Owner explicitly requested iPhone-only map change. Source225a0bec528424fa241b81624961b77a9ea96db5: iPhone floating-landings hide resting pins as they leave view and clear visibility so returning pins drop into an empty spot, even during one continuous swipe. Stale handover timer cannot cut short the new drop. Android inPlace=true path/marker files unchanged; Android drop-identity regression passes.
-6 hook regressions/12 focused tests pass, hook lint and224-module source check pass. Remote simulator drag did not move map; owner manually swiped and confirmed the empty-spot full drop. Quick-return timer guard verified by test. No automated native gesture/physical Android result claimed. Metro retained; no new native worker/simulator, free memory38%.
- Local only: submitted iOS28 lacks this follow-up and needs a refreshed iOS build before public release. Android25 and both review submissions unchanged; Apple privacy19 remains complete/manual public release. No build/upload/OTA/deploy/GitHub push. Updated current candidates/readiness/evidence; preserved other Claude/dashboard/preview work.

### 2026-11-13 — Codex (platform-specific map work guidance)

- Owner asked how to work on Android maps without changing iPhone. Read-only source check: MapScreen/styles/MapPin/mapFraming remain shared; AndroidStillMarker and PinLanding already separate native marker/landing behavior. Recommended keeping shared report/business logic, isolating Android/iOS rendering/config only where needed, scoping small changes with Platform.OS and checking both platforms after shared edits. No cause or fix for the unspecified reported regression claimed. No code/build/store/OTA changes; uploaded review binaries remain frozen.

### 2026-11-13 — Codex (simulator versus submitted app clarified)

- Read-only comparison: no committed or uncommitted apps/mobile differences between frozen7e4275b store source and current mobile workspace. Existing Metro8081 serves that workspace, development client/one worker, analytics explicitly false; submitted originals use production analytics true. Same implemented mobile UI/styles, different development/production configuration and native shell. No claim of identical pixels, account state or simulator-native binaries. No code/store/phone/deployment changes.

### 2026-11-13 — Codex (Stripe support updates checked)

- Original case `sco_VJarfjNbi0QKE3`: Stacy acknowledged our answers November6;
  latest November13 follow-up says internal review continues, no final guidance.
  No new information requested in that reply. Case remains open.
- Pricing case `sco_VZJHsoGY2oq3z3`: Ellah’s November5 reply says Express/Custom
  volume discount analysis generally requires net$150k/month for3 calendar
  months; discounts not guaranteed. Case closed November5. No reply sent,
  settings changed, financial action or deployment made.

### 2026-11-13 — Codex (Apple2.1 privacy complete; public release manual)

- Owner explicitly requested completing Apple privacy details now. Published six remaining types (Phone Number, Physical Address, Other Data Types; Crash/Performance/Other Diagnostic Data) with prepared purposes/linkage/no tracking, plus Analytics for Coarse Location. Existing13 declarations preserved. Reload verified19 types, zero Set Up items and published timestamp. This supersedes earlier pending-label handoffs; Apple privacy no longer remains for launch.
-3:18PM ET readback:2.1.0(28) still Waiting for Review, Manually release selected, automatic options0. No app public release, review resubmission, provider changes, code/build/deploy/push/OTA. Evidence in device-evidence/apple-privacy-210-completion.json and matching screenshot/AX snapshots. Current candidates/readiness/store handoff/AGENTS updated. Remaining: store approvals/actual review feedback and owner’s explicit manual public-release instruction. Other dashboard/Claude changes preserved.

### 2026-11-13 — Codex (release checklist status readback)

- Read-only store check for owner's remaining-release question: Apple2.1.0(28) still Waiting for Review; Google25/Data safety explicitly in review, managed publishing ON. Luke's internal access remains configured. Remaining launch work: approvals/actual review feedback, prepared Apple2.1 privacy-label additions, then explicit owner instruction for manual public release. No store settings, code, build, upload, deploy or submission changes in this check.

### 2026-11-13 — Codex (Luke TestFlight access; Google checks finished)

- Owner asked to ensure Luke can test28 and both stores are submitted. Added existing Account Holder james barber (jameslukeb@yahoo.com) to existing Burrow Bros internal group;1 tester added confirmed, now2 testers. Group Builds shows2.1.0(28) Testing. Existing prior install2.0.0(18);28 installation not claimed. No account/role/security credential changes.
-3:08PM ET readback: Apple28 remains Waiting for Review; Google quick checks finished and overview explicitly says Your changes are now in review for Production25/Data safety. No duplicate submissions or public release. Manual Apple release/Google managed publishing preserved. Evidence/readiness/current candidates updated; no code/build/deployment/push/OTA changes. Remaining Apple2.1 label additions stay for authorized manual public release.

### 2026-11-13 — Codex (pin fixed; both2.1 apps submitted, public release manual)

- Owner authorized upload and review submission with manual public release. Fixed selected-pin framing30%→22% (eaa461a); Metro restart restored the existing ladybug artwork. Two focused tests and repeated simulator selection passed. Frozen release7e4275b contains only that helper change over acceptedc34f569; refreshed signed iOS28 / Android25 built successfully, signatures/config verified. Original hashes/evidence are in current candidates/readiness records;27/24 superseded.
- Apple28 upload finished, attached and submitted2:52PM ET:2abda04e-5782-41bf-99ed-d2005198cc12 visibly Waiting for Review. Manual release remains selected. Google25 and Data safety submitted2:55PM ET, visibly Changes in review with quick checks still running; managed publishing ON. No public mobile release, OTA, backend deploy or GitHub push. Native file picker succeeded after the browser chooser's generic upload failure.
- Corrected Apple's current2.0.1 privacy baseline to13 complete linked/no-tracking categories. Apple publishes label edits immediately; six additional2.1 categories plus Coarse Location Analytics remain prepared for manual public release, not a saved label draft. Full new collection disclosed in private review notes/published policy. Google saved and submitted Address/Phone/Other info for embedded Stripe onboarding, preserving SDK analytics declarations. See store privacy handoff.
- Dedicated reviewer login preserved; no credentials printed/extracted. Dashboard chat informed both apps remain unreleased. Existing dashboard/Claude/preview changes preserved. Memory42% available; cloud builds avoided new local native workers. Metro8081 retained with768MB heap/one worker/analytics disabled for current simulator assets. Before public release: approvals/actual feedback, final Apple2.1 labels, then explicit owner release instruction.

### 2026-11-13 — Codex (owner analytics dashboard deployed)

- Live at https://litterbugs.app/admin/analytics. Source `388c930`, isolated release
  branch `codex/website-analytics-20261113` pushed to GitHub; production deployment
  `dpl_8MYNXYQc8CDo2aHCUTCgy3ATLFQT`. Previous deployment/rollback:
  `dpl_6HFe4Af232YP6LiQjUPDw3pWKkhg` (source `5c32ab8`). Root native history not pushed.
- Verified live admin/MFA session: business totals and PostHog website sessions,
  GA acquisition, GSC search data and Clarity signals all returned real hosted
  data for both periods. Clarity kept one completed request across period/view
  switches. App correctly awaits release; no native changes/build/update released.
- Applied only `20261113191709_owner_analytics_hosted_connections.sql`: guarded
  aggregate business RPC and private shared Clarity quota/cache. Read-only Google
  OAuth/PostHog/Clarity credentials are sensitive Vercel production envs. No new
  service-role/SQL key. Local source connection changes retained as `bf543fa`.
- 86 focused tests, typecheck, scoped lint, business fixtures, rollback SQL security/
  quota checks and Linux production build passed. Signed-out gate/noindex verified.
  Existing unrelated Stripe boundary failures and social-card tracing warnings are
  recorded, unchanged, in `docs/reviews/2026-11-13-owner-analytics-production.md`.
- Five-minute visible-page refresh; Google/PostHog cache 15 minutes; Clarity at
  most six-hourly. Missing app/impact data stays unknown. No outstanding dashboard
  connection blocker. Preserve provider exclusions, permanent-user/MFA checks and
  private aggregate-only storage.


### 2026-11-13 — Codex (review-account exclusions and date-boundary correction)

- Source `6a071c5494656d940d6305f00b64b34a0acfcea6`, local only. Business aggregates
  exclude server-marked review accounts as report authors, cleaners, funders and
  contributors, plus fixtures on their reports. Verified the new Apple review
  account's flag and zero business rows. No identity sent to analytics.
- Read-only CTE fixtures exposed implicit DATE AT TIME ZONE selecting timestamp
  without time zone. Explicit casts now produce true NY-midnight timestamptz
  bounds, including prior periods. Correct7-day funding is$37 versus$47: the old
  cutoff included two Nov5 payments totaling$10 outside Nov6–12. Counts6 reports /
  4 completed cleanups and28-day funding$77 remain. No payment record changed.
- New manual regression `node scripts/check-owner-analytics-business.mjs --linked`
  (or --local) uses CTE-only fake rows: both periods pass reviewer/parent exclusion,
  user-metadata spoof resistance, real refunds, late-night/boundary funding and
  daily reconciliation. Actual aggregate query passes;9 focused adapter tests,
  script syntax and diff checks pass. No DB migration/writes, deploy or push.
- App release flags and production/test telemetry filters unchanged; app/combined
  visits remain unknown pending release. Other native/preview/Claude work preserved.

### 2026-11-13 — Codex (dedicated reviewer login saved; Pixel remote push passed)

- Owner explicitly approved creating/saving a dedicated review login. Created standard member app-review-210@litterbugs.app, UUID3f455759-11f0-4387-bf0f-244e7852038e, server app_metadata.review_account=true, email confirmed and zero admin memberships. Production Auth password sign-in and own-profile read passed; verification sessions globally signed out. Apple2.1 draft has Sign-in required enabled, credentials saved and updated access instructions; reload confirmed masked fields/disabled Save. Local plaintext secret removed; no password in repo/logs or dashboard message. Personal Apple identity untouched. Native full-flow login with this account is not claimed.
- Owner then made Pixel available again after earlier skip. Disposable com.litterbugs.pqa reused95 unchanged native/dex/resource/service entries from2.1(24) acceptance APK, with only package/config/signing/push-only JS changes. Expo token request explicitly mapped app ID com.litterbugs.app to existing production FCM credentials. A labeled remote test arrived in background; Expo ticket01a1d64b-b70f-735d-804f-8fd26550f519 and FCM receipt ok. Tap reopened test copy; actual app helper returned App > Map/showNearby for nearby_reports_daily. This is transport/tap-helper proof, not production queue/full navigator/iOS production APNs acceptance.
- Test copy uninstalled; original installed apps/data retained. Temporary APKs/bundle/source/token/phone XML/private UI dumps removed. No app DB push registration or real business events. Evidence in artifacts/mobile-2.1.0/device-evidence; readiness/store/candidate notes updated. Dashboard chat received reviewer UUID/marker for exclusions only, no password. Memory remained51–59% available; final52%, disk5.0GiB. No new simulator/native build or lingering test worker.
- Apple remains Prepare for Submission, manual release, no build upload/attachment and no Add for Review action. Privacy-label publication remains for actual release; no provider setting, migration, deploy, GitHub push or OTA. Existing unrelated dashboard/Claude/preview edits preserved.

### 2026-11-13 — Codex (automatic owner dashboard connections, local only)

- Source `6cb5cfc0c2a7ecaba34a0c31e643ceec7707a2ee`. GA/GSC, PostHog web/app and
  Clarity now use live private reads locally; all five adapters plus business
  totals passed actual7/28-day reads. Existing layout retained. Visible page
  refreshes every5minutes; successful GA/GSC/PostHog reads cache15minutes,
  business5minutes, Clarity6hours with persistent local request/failure budget.
- New project695338 query:read key and project z60itnrbpn export token stored only
  in ignored0600 local settings. Google uses the existing read-only OAuth SDK in
  a bounded child process; credentials stay in its store and access tokens stay
  in the child. Temporary service-account route was blocked by org policy,
  then its grants/binding/account were cleaned up; no security policy weakened
  or key created. Reporting/IAM APIs enabled; no capture/privacy settings changed.
- Corrected Clarity denominator semantics: sessionsCount is the examined total,
  not affected sessions. Dashboard uses API signal percentages. Missing/error
  results stay unknown; failed provider reads do not poison the15-minute cache.
-77 focused tests, types, scoped lint, script/diff checks pass. Real browser
 7/28 views and app awaiting release checked, private signed-out gate verified.
  Evidence under ignored output/owner-analytics and apps/web/.analytics-local.
- No dashboard deployment, GitHub push, mobile edits or database writes. Latest
  app still unreleased; QA/emulator exclusions and unknown app/combined visits
  retained. Production publication still needs hosted Google/business credentials
  and persistent hosted Clarity ingestion. Local server is running on3000.

### 2026-11-13 — Codex (Apple2.1.0 draft saved; phone testing skipped)

- Luke accepted Apple's Developer agreement; refreshed App Store Connect cleared the block. Created2.1.0 in Prepare for Submission for existing app6757313862. Saved short release notes, updated2.1/build27 review instructions, litterbugs.app/support and marketing URL. Saved litterbugs.app/privacy for the next version; URL dialog explicitly releases it with that version. Reload verified saved fields and manual release. No build attached/uploaded and Add for Review not clicked.
- Existing listing assets present: seven inherited iPhone thumbnails plus three iPad screenshots. No screenshot upload or artwork change. Proof: artifacts/mobile-2.1.0/apple-2.1.0-draft-20261113.jpg and apple-privacy-url-20261113.jpg. Privacy data-type wizard still ends in immediate Publish even with version draft; canceled inspection, no label published/draft saved. Prepared16-type inventory remains local for release. Guest review notes inherited with sign-in-required unchecked and no demo credentials; full reviewer access must be verified before eventual submission.
- Owner skipped further phone testing. Remote-push harness export completed with one worker/768MB heap but never installed, sent no push or registered a token; temporary source and unused APK/bundle copies removed. Phones/original artifacts untouched. Existing older simulator showed host keychain error and was not used as2.1 evidence. Memory readings53/57/41% free; disk6.1/5.9GiB before final cleanup. No new simulator/native build or lingering test worker. Dashboard excluded from this app pass; unrelated edits preserved. No deployment, GitHub push, OTA or store upload/submission.

### 2026-11-13 — Codex (Luke emailed; local release copy prepared)

- At Grant's explicit request, sent the approved “Apple Developer agreement update” email from gegibson@icloud.com to jameslukeb.evj@gmail.com. Apple Mail Sent confirmed the subject/recipient today at1:40pm ET; no claim of delivered/read/accepted. Apple account-holder agreement remains pending.
- Prepared `release-assets/mobile-2.1.0-release-notes.md`: short public notes, exact candidate references, review checklist and clear separation of completed native checks versus additional live server-push/identity checks. Sent the authorized dashboard chat an update; its live read connections can proceed independently, with app/combined visits unknown until release.
- Mail controls briefly failed with disk nearly full; removed only regenerable inactive `apps/web/.next/cache/turbopack`, preserving active dev cache/source/release artifacts. Free space recovered to933MiB. No code/settings/deployment/push/store upload or submission changes; unrelated work preserved.

### 2026-11-13 — Codex (Apple admin access verified; agreement blocks version draft)

- Owner authorized applying Apple privacy answers and completed sign-in. Grant Gibson admin access works for Litterbugs6757313862 under James Luke Barber; current iOS2.0.1/build24 is Ready for Distribution. This updates store-access scope only; Apple revocation/FB exclusions remain unchanged.
- Add iOS App is blocked by Apple's updated Developer Program License Agreement, which must be accepted by Account Holder James Luke Barber. No agreement accepted, version created, build uploaded or review submitted. Evidence: `artifacts/mobile-2.1.0/apple-agreement-blocker-20261113.jpg`.
- Current privacy label has four unlinked functional types and an old GitHub policy URL. Prepared/reconciled16-type2.1 inventory against actual native manifests and account-linked flows; recorded in store handoff. Current UI ends in Publish, not Save Draft. Temporary category selections discarded; reload verified original label/URL. No saved draft or published answer claimed. After account-holder agreement: create2.1 draft, update policy URL to litterbugs.app/privacy, enter reviewed answers and coordinate public analytics declarations with actual release per Apple's current-version rule.
- Updated AGENTS/readiness/candidate/store notes only. Existing production candidates and checks unchanged; no deployment, GitHub push, mobile OTA or store submission. Unrelated Claude/dashboard/preview changes preserved.

### 2026-11-13 — Codex (app/dashboard connection status checked)

- Read final release-readiness evidence: PostHog event/replay/privacy and saved
  opt-out verification complete; production build27/24 symbol uploads match.
  Latest app remains unreleased, QA excluded; no production crash occurrence
  claimed. Clarity remains website-only.
- Checked local dashboard configuration by key presence only: dedicated Google,
  PostHog-read and Clarity-export credentials are not configured; local reviewed
  snapshots remain in use. Business read adapter is development-only. Dashboard
  is not yet automatically live-connected or deployed; release flag remains off.
- Status review only; no settings, credentials, code, deployment or push changes.

### 2026-11-13 — Codex (release preparation verified; stores withheld)

- Frozen production source `c34f569`: iOS2.1.0(27), EAS `14f76fb5-40d9-4f3d-8c95-13489935ec7f`; Android2.1.0(24), EAS `e6a72070-4f04-4626-afec-29e9956874be`. Both finished, original signatures/config/hashes verified and matching PostHog JS/native symbol uploads confirmed. Production analytics defaults ON with no automatic permission popup. Readiness/hashes/evidence: `docs/reviews/2026-11-13-mobile-release-readiness.md`; local artifacts `artifacts/mobile-2.1.0`.
- Physical iPhone6s/iOS15.8.8 and Pixel5/Android14 passed guest/maps/reports/link checks and saved analytics exclusion. iPhone original production native/JS bytes in a separate test-config identity delivered correctly attributed test events; actual replay stops for Auth/exposed Map, resumes for safe/covered screens, and visually masks report photos/text. Zero QA events after opt-out/relaunch. Separate native-module fixtures on both phones completed/refunded sandbox card payments, rendered Connect onboarding and handled a local notification tap/destination. No identity/bank submission or live server-push acceptance claim. Initial short-lived Connect fixtures expired during packaging; a temporary Android repack omitted Kotlin service resources, corrected without changing production code/dependencies.
- Website media/legal only source `5c32ab8`, deployment `dpl_6HFe4Af232YP6LiQjUPDw3pWKkhg`, is live. Dashboard/other preview work excluded. Content relay `ace4313`, Cloud Run00006-cuz, remains photo-content-20261113 tag only; canonical funding traffic stays on00004-rxr. Google photo content checking plus existing malware/sanitization works; released-client legacy avatars retain the prior provider path. Effective privacy/Terms November13, including optional account-linked rounded nearby area.
- Deployed functions: create-cleaner-onboarding-link v33 and send-cleanup-notifications v25. Applied/recorded `20261112150000_notification_preferences_and_nearby_alerts.sql`, `20261112160000_reporter_payout_waiting_notification.sql`. Owner then confirmed old direct-upload builds were unused development versions and authorized closure: source `13dc98f`, migration `20261113170000_enforce_sanitized_media_outputs.sql` applied/recorded. All four direct final-bucket insert/update policies removed; final buckets JPEG-only. Live authenticated raw uploads/replacement denied while both new/released-client processor paths passed; fixtures removed. Exact rollback tested locally in a rolled-back transaction.
- Verification:619 mobile tests +1 existing skip, lint,224-module check;1084 isolated website tests, build/types/scoped lint;40 media tests,10 relay tests,66 Deno tests; local notification SQL checks pass. Scoped final evidence/docs commits `6cfaedb`, `50ee633`, `87bccda` plus this handoff. Other-chat dashboard received schema/build/test-exclusion and activation details; app/combined visits remain unknown until actual release.
- Cleanup: disposable test accounts/files removed, sandbox payments refunded, temporary native-check apps uninstalled. Original phone apps/data preserved; staff device analytics remains OFF. Native drivers/mirror/launcher stopped; local DB/Colima stopped with backup/data preserved and Docker context default. Metro8081 remains for existing QA. No GitHub push, OTA publish, or store upload/submission. Prepared Apple privacy entries still require the owning account before a future submission; do not request Luke's unavailable access or change Grant's Apple settings. Owner-excluded Apple grant revocation and separate-user Facebook tests remain excluded, not passed.

### 2026-11-13 — Codex (mobile release preparation in progress)

- Owner authorized finishing release preparation, analytics ON by default, no store submission. Mobile candidate c34f569 (same app changes as8ec516e plus obsolete Stripe0.50.3 patch removal) is frozen in an isolated release branch. iOS2.1.0(27), EAS14f76fb5-40d9-4f3d-8c95-13489935ec7f, finished; original IPA signature/version/runtime and Hermes debug ID checked. dSYM UUID73D0F0A8-184B-3AB5-B21C-BAA90D27ED33 matches the uploaded PostHog symbol set bound to com.litterbugs.app/2.1.0+27. Android24/AAB and acceptance APK still building/queued. No push, OTA or store submission.
- Inline, unchecked photo-processing/Terms approval now gates report/cleanup and new profile-photo uploads; simulator selection/blocked Save/discard verified without profile changes. Analytics remains separate/default-on;619 mobile tests, lint and224-module check pass. Stripe0.72 already contains the old NSInteger fix; four remaining native patches apply cleanly. Expo doctor still flags the intentional Stripe version difference from SDK54's recommendation; native payment checks pending.
- Photo publication guard: existing malware check plus bounded content review. Cloud Run ace4313 revision00006-cuz is only on the photo-content-20261113 tag, with canonical funding-review traffic100% on00004-rxr. Direct tag401/400/200 and isolated web Google+malware+promotion succeeded with non-user fixture images; disposable accounts/photos removed. Existing relay secret reused server-side in Vercel, never logged. Legacy avatars use Cloudmersive NSFW; approved new mobile avatars and report/cleanup use paid Google to avoid20 extra scanner credits per photo. Website candidate remains unaliased, based on exact live4d4e2e8; dashboard excluded.
- Deployed committed mobile return-target support: create-cleaner-onboarding-link v33 (rollback source v32 downloaded in /tmp/litterbugs-edge-release-audit-20261113). send-cleanup-notifications v25 (old v24 downloaded). Applied and recorded20261112150000_notification_preferences_and_nearby_alerts.sql and20261112160000_reporter_payout_waiting_notification.sql.66 Deno tests and local SQL preference/nearby/dedup/reporter-readiness checks pass; test counts now scope their own fixtures. No manual push send or real payment. Nearby alerts start OFF.
- Prepared privacy/store-note addition: nearby alert area is rounded2-decimal location LINKED to the account for app functionality, separate from anonymous PostHog/GeoIP. Apple account-holder forms still prepared only; do not request Luke's unavailable access or alter Grant's Apple settings. Live media direct-write compatibility policies remain an explicit unresolved release gate; do not claim universal filtering or silently retire old clients.
- Pixel5 and iPhone6s/iOS15.8.8 connected. Owner approved native test tools and iPhone UI Automation. Original installed QA apps/data preserved; separate iPhone QA variant uses existing signing/profile, unchanged native/JS with test config. Fresh phone UI/replay/payment verification is ongoing. Temporary local notification DB/Colima started for SQL checks; stop it after verification.

### 2026-11-13 — Codex (read-only mobile map screenshot review)

- Reviewed `/tmp/litterbugs-release-pixel-map.png` and current map source for the
  mobile release chat. Colorful lower-left lines are likely Google's ski-run/lift
  geometry near Appalachian Ski Mtn.; map style hides labels but retains geometry.
  No matching app-drawn multi-color polylines found. Sent source/reference evidence;
  fresh-binary geographic zoom/pan confirmation stays with the mobile chat.
- No mobile edits, provider changes, database writes, deployment or push.

### 2026-11-13 — Codex (simplified owner metrics dashboard, local only)

- Source commit `ef258db32ce00cf757afbd7f222d3d8fdcdc3030`. Added six overview metrics:
  total visits with web/app split, completed cleanups, cleanup funding principal,
  new reports, distinct registered contributors and current eligible backlog.
  Daily chart, attention items and reported impact retain field coverage.
- Simplified Overview/Website/App presentation; removed provider/source/freshness,
  citation and technical explanatory UI. White/purple/mint style, no added imagery.
- Local-only business adapter runs a fixed aggregate SELECT through the existing
  verified linked CLI after admin/MFA auth; bounded timeout/cache, no credentials
  copied or raw identities returned. Read-only live records checked for7/28-day
  totals, final-submission deduplication and NY calendar/DST comparisons. No DB
  migrations, writes or provider changes. Production business connection remains
  pending; original website tool snapshots/read-credential limitations remain.
- App sessions query verified read-only; never sum launches with website sessions.
  Unreleased app and combined visits remain unknown, website count stays visible.
  Future release flag documented but unset; native production coverage unchanged.
-66 focused tests, TypeScript, scoped ESLint and diff checks pass. Desktop/320/390px,
  period/tab retention, signed-out no-data gate and analytics exclusion verified.
  No deployment or GitHub push. Claude/native/preview edits preserved; latest app
  release prep and separate media/legal work remain with the mobile chat.

### 2026-11-13 — Codex (owner KPI research and proposed definitions)

- Researched Amplitude value metrics, marketplace fulfillment/liquidity, Stripe
  transaction-volume distinctions, PostHog session definitions and Clarity signals.
  Added proposed owner metrics to existing dashboard plan: total visits, new reports,
  completed cleanups, confirmed cleanup funding, active contributor accounts and
  aged report backlog; impact/retention/conversion/health remain supporting views.
- Total visits may combine same-rule web/app sessions, not launches/pageviews or
  unique people. Business totals need private backend/payment records, not browser
  event counts. Funding excludes service fees; refunds, balance and revenue differ.
  Impact is reported data with field coverage and one final submission per cleanup.
- Recommendations only: no dashboard implementation, live business query, provider
  setting, credential, DB migration, deployment or GitHub push. Existing app/dashboard
  source and unrelated Claude edits preserved; documentation diff check passes.

### 2026-11-13 — Codex (release-readiness and analytics-choice clarification)

- Read-only readiness review: analytics setup is complete; latest2.1.0 still needs a frozen mobile candidate,
  fresh native production artifacts and final-device acceptance. Current local UI/payment-total edits remain
  outside analytics commit e690eb5. Older AI-photo/data-sharing and offensive-content findings lack a current
  closure record; flag for review without restoring owner-removed UI or treating excluded Apple revocation /
  separate-user Facebook tests as blockers. Apple store labels/submission remain account-holder release work.
- Clarified analytics choice defaults on in production (saved exclusion persists); screenshot is off because
  the test simulator was excluded. Off stops future PostHog events/diagnostics/replay on that device, not core
  application records, existing analytics or separately controlled website analytics. No product/provider change.

### 2026-11-13 — Codex (final mobile handoff synced to dashboard notes)

- Verified mobile handoff/evidence for local e690eb5: event/timing schemas unchanged,
  staff opt-out complete, local symbol files verified without production binding.
  Updated owner dashboard plan; no dashboard code or data-definition changes.
- App remains unreleased and dashboard awaits production data/read connections.
  Native crash coverage stays unclassified. Separate privacy-only4d4e2e8 is live;
  dashboard452c394 and app changes were excluded. No deploy/push from this chat.

### 2026-11-13 — Codex (mobile analytics verified; privacy published)

- Finished local app analytics: replay starts paused; install/open attribution; nested person-property scrubbing;
  stale-link failure guard; device-wide Profile/Settings → Analytics choices (also signed out). Saved choice is
  read before SDK startup. Simulator switch verified off after reopening; no account/push/database writes.
-617 mobile tests pass (1 existing skip), lint and223-module source check pass. Both Hermes exports/debug IDs
  verified. Real SDK/mock-native tests cover privacy, offline redelivery, notifications, opt-out and excluded relaunch.
- At Grant's later explicit request, enabled PostHog695338 recording and exception autocapture; read back.
  Existing IP discard stays on, but does not disable GeoIP: retain coarse location disclosure. Website explicitly
  disables its PostHog replay/exception capture; Clarity unchanged. Production EAS now has project-restricted
  error_tracking:write key and project ID secrets; production upload flag on, acceptance off. Actual CLI upload
  and PostHog symbol-set readback verified both local maps. No secret values stored in repo/logs.
- Privacy-only production source4d4e2e8 (based on prior live30adc6c), deploymentdpl_2A2dd4XGKrLZ2kEyK1wSSn3eWd2d,
  is live on litterbugs.app; effectiveNov13. Live alias/HTTP200 checked. Rollbackdpl_7sr5ycQSEebuddcoSr7pg22oiwo5.
  Google Play's existing five analytics categories/purposes already cover the additions; verified, unchanged.
  Apple answers prepared only: Luke's access unavailable; Grant's Apple settings/account untouched.
- Coordinated with Finish bug animation preview: dashboard452c394 stays local and was excluded from deployment.
  No GitHub push, mobile OTA/store build or submission. Phone notification taps, NDK crash and physical-device
  performance still unverified; prior native replay/crash evidence is Claude'sNov12 isolated builds. Fresh native
  prebuild required (workspace generated iOS Pods are stale). Details: docs/reviews/2026-11-13-mobile-analytics-verification.md.

### 2026-11-13 — Codex (private owner analytics dashboard, local only)

- Source commit 452c394da27df420c5a3a1f60312cce4d4a83d9d. New /admin/analytics combines GA, GSC,
  PostHog and Clarity in Litterbugs styling, with Overview / Website / App views,
  7/28 complete-day controls and per-source dates/freshness. Existing /admin
  moderation inbox retained; server membership+MFA checked before data retrieval.
- Real local aggregate snapshots cover all4 website tools; ignored directory
  apps/web/.analytics-local is development-only and never read in production.
  GA CLI requests returned502; signed-in GA UI supplied audited session totals
  and channels only (no fabricated daily trend/unique users; property-wide scope).
  GSC totals use dimensions=[] and reconcile with daily clicks. Clarity's recent
  3-day window stays separate from7/28 periods. No cross-provider visitor sum.
- Server-only live adapters prepared, but dedicated read credentials are NOT set
  up or credential-tested. Automatic refresh and persistent Clarity quota/history
  ingestion remain setup work before publication. Source guide and references:
  docs/plans/2026-11-13-owner-analytics-dashboard.md.
- App queries follow docs/mobile-analytics.md and the parallel mobile thread's
  production/test/emulator rules. New app remains awaiting production data;
  timings exclude background spans and show sample counts. Native crash production
  coverage explicitly unclassified pending verified release/build attribution.
  EAS symbol-upload write key must never be reused for dashboard reads.
- Admin routes do not mount visitor analytics; existing browser exclusion keys
  also keep subsequent staff use out. Already running Clarity is reset with a
  fresh private document on SPA entry. Normal visitor defaults unchanged.
- 51 focused tests, TypeScript, scoped ESLint, script syntax and diff checks pass.
  Authorized desktop and320/390px layouts verified; date/view selection retained;
  separate signed-out context exposes only sign-in, noindex and zero telemetry.
  No dashboard runtime errors; existing unused CSS/ladybug preload warnings remain.
- No deployment, GitHub push, DB migration, native edit or provider-setting change
  from this chat. Preserve concurrent mobile/preview/privacy edits. Mobile thread
  separately owns app diagnostics settings, staff opt-out, EAS/store disclosures
  and privacy-only deployment; its app is still unreleased.

### 2026-11-13 — Claude (mobile analytics release prep, local only)

- OTA updates: `scripts/mobile-update.mjs` uploads Hermes source maps to PostHog after a successful
  `eas update` when `POSTHOG_UPLOAD_SYMBOLS=true` and `POSTHOG_CLI_*` are set; refuses to publish if the flag
  is set without credentials; unchanged otherwise.
- Drafted (not deployed) "App analytics and diagnostics" in `apps/web/app/privacy/page.tsx` (effective date
  not changed) and a PostHog addendum to the App Store/Play privacy notes. Needs Grant's review before
  the website deploy and store forms.
- Notification-tap opens still unverified on device: enabling notifications in the signed-in QA app would
  register a production push token, so not done. Unit-tested; shares the link-open tracking verified natively.

### 2026-11-13 — Codex (LBAnalyticsTest crash alert identified)

- Owner screenshot shows macOS crash dialog for LBAnalyticsTest. Read local
  DiagnosticReports: five reports belong to separate simulator bundle
  com.gegibson.litterbugs.analyticstest, all Nov12 evening; none from today.
  Earliest reports show test-build startup faults; later native signals align
  with Claude's documented deliberate crash-reporting verification. Do not
  characterize every historical report as an intentional crash.
- No LBAnalyticsTest process running; simctl confirms its app container is
  absent from the booted simulator. Existing Litterbugs app remains running.
  Owner can dismiss this old test-app alert with Ignore. No application code,
  simulator settings, website deployment or analytics settings changed.
- Clarified dashboard is hosted in PostHog695338/dashboard2346165, not website
  /admin. Website tracking deployed Nov12; an /admin analytics view was never
  implemented. No new dashboard work or publication authorized in this turn.

### 2026-11-12 — Claude (mobile analytics verified in native release test builds)

- Built isolated iOS (simulator) and Android (emulator) release test apps with the new PostHog plugin, sending only
  to a local mock collector (separate bundle IDs; app copy deleted afterwards, no store/EAS builds). Both compile
  and run. Verified: delivery with `app_environment: test` and update keys; replay masks all text and images;
  replay stops on sign-in/payment/account screens; JS fatal errors and rejections arrive scrubbed; native crashes
  (iOS SIGSEGV/SIGABRT with debug images, Android Java crash) arrive on next launch; shared-link opens report
  `shown`/`unavailable`. Symbol upload wiring generated on both platforms but not run (needs PostHog CLI key).
- Fixes from that testing: replay now also stops while the map itself is in front (tiles show street names
  around the person; masking the map blanked every frame) and resumes when report details/form cover it;
  `launch_to_map` only times launches that open on the map. Docs: `docs/mobile-analytics.md`.
- Freed disk: pruned uv's unused package cache and npm's download cache (both re-downloadable).
- Local builds from this folder hit expo-updates/Expo script bugs with the space in "Burrow Base" (EAS unaffected).
- Not verified: notification-tap opens on a device, symbol upload, Android NDK crash, real-phone performance.

### 2026-11-12 — Codex (website PostHog/Clarity analytics deployed)

- Owner approved deploy/push with Claude's app changes excluded. Website source
  30adc6cc201791298fe6116b11383912d909f98f is on GitHub branch
  codex/website-analytics-release-20261112. Its diff from live e5411e2 contains
  only6 web source/test files plus event guide/handoff. Native files, lockfiles,
  dependencies, extra local previews and fee pages unchanged; no native commits
  were pushed. Root development history remains local to preserve that boundary.
- Promoted exact verified production build dpl_7sr5ycQSEebuddcoSr7pg22oiwo5
  (https://litterbugs-7wfkv8lz0-grant-9890s-projects.vercel.app) to litterbugs.app.
  Alias deployment/source SHA verified. Rollback: dpl_7ybf24ASXLanJNFKCqq6FtyWMyCn.
  Dashboard is https://us.posthog.com/project/695338/dashboard/2346165, not /admin.
-100 tests pass in isolated release checkout; TypeScript/scoped lint pass.
  Local jsdom checks use NODE_OPTIONS=--no-experimental-webstorage and existing
  workspace dependency links. Remote production build passes; unchanged social
  image filesystem-tracing warnings remain. No DB migration or provider-setting
  changes. Production protection retained; staged QA used authenticated vercel curl.
- Staged home/map/report200; cleanup-start/loading/report-sheet dev previews404.
 22 deployed chunks contain v9, lb_map_failed/lb_cleanup_cancelled/version tags.
  Live home and390px report render without overflow/errors; mobile map/markers
  render and report-data GET/OPTIONS200 after reload. One initial connection-
  closed report request recovered on reload; no persistent failure reproduced.
  Deployment runtime error scan returned0 records. Every browser visit excluded
  before scripts; zero analytics requests. No real claim/auth/preference/money
  submissions or synthetic visitor events. Real Clarity ingestion/new filter
  availability awaits genuine activity; mocked delivery/ordering tests passed.
- Local3000 remains available. Concurrent Claude native edits and unrelated
  local previews/handoff additions preserved. No store build or app deployment.

### 2026-11-12 — Codex (website PostHog/Clarity friction events, local only)

- Owner requested local website analytics for map failures and cleanup exits.
  Added safe Clarity projection in lib/clarity-journey.ts: map started/ready/
  failed/recovered/empty/results-failed; cleanup start/safety/claim/evidence/
  submission/other-step/failure/explicit-exit/resume markers. Fixed enum tags
  include failure reason, stage, foreground/background, load-duration bucket.
  Version v9 is tagged in Clarity and PostHog. No raw IDs/text/locations/photos,
  filenames, URLs or provider error payloads; anonymous identity policy unchanged.
- Existing PostHog event names retained. Critical map failures/recovery and
  cleanup failures/decisions now request immediate beacon delivery. SDK-readiness
  buffering preserves original order across steps, failures and decisions via
  a local WeakMap sequence that never becomes a provider property.
- Clarity delivery is independent of PostHog/Google readiness, each provider
  sends once per accepted delivery. Tag bootstrap waits for load; provider queue
  capped150, bootstrap capped250 if recorder dependency blocked. All tracking
  remains best effort. Saved exclusion/DNT/GPC/local/preview behavior preserved.
  No inferred permanent abandonment from pagehide, hidden tabs or OAuth handoff.
-100 focused tests pass; web TypeScript/scoped ESLint/diff checks pass. Covers
  late/blocked/failed providers, mixed-event ordering, privacy, Strict Mode,
  queue bounds, cancellation/claim separation and no duplicate sends. Browser
  localhost3000: renders, no horizontal overflow/runtime errors; zero external
  analytics requests and no Clarity/Google initialization. Existing CSS preload
  warning only. Delivery verified with mocked providers, not real ingestion.
- Event/filter guide: docs/plans/2026-11-12-website-recording-events.md.
  New live Clarity filter choices require deployment plus first received events;
  no Clarity/PostHog project settings, saved segments or dashboards changed here.
  Local3000 stays available. No deploy/push/DB migration. Preserve Claude's
  concurrent native analytics, package-lock and unrelated preview changes.

### 2026-11-12 — Claude (unreleased mobile analytics finished and verified locally)

- Audit fixes: `payment_submitted` was sent before Stripe's sheet opened (cancelled sheets counted); now
  `payment_ready` → `payment_submitted` only when submitted. Added missing payment start/form/confirmation, report
  upload and cleanup photo-step failures, sign-in `verification_sent`/`closed`, claim `payout_setup`, `cleanup_approved`.
- New: `map_discovery` (search sessions, results after filter/search changes, empty recovery, filter changes),
  `app_timing` (launch_to_map, report_details, photo_upload, submission with attempts/recovery), `app_open_target`
  (shared links/notifications, `shown` only when the destination appears). Definitions: `docs/mobile-analytics.md`.
- Privacy: `before_send` scrub; SDK was attaching the launch link (report IDs / auth tokens) to Application Opened.
  Push token registration, replay console/network capture off. Replay stops on auth, payment, payout and account
  screens; notes/names masked. Environment gate: production|test only, never simulators (unless test).
- Crashes: replaced legacy replay package with `@posthog/react-native-plugin` 2.13.0 (native + NDK crashes).
  Symbol/source-map upload wired behind `POSTHOG_UPLOAD_SYMBOLS=true` + EAS secrets `POSTHOG_CLI_API_KEY`,
  `POSTHOG_CLI_PROJECT_ID` (not set yet). Release attribution adds `app_environment` and `$expo_*` update keys.
- Verified: 606 tests, lint, source check, release iOS export with debug IDs, no secrets in bundle. Real SDK
  delivery checked in the simulator against a local mock collector (temporary dev hook, removed): events, offline
  queue and redelivery, no leaks; nothing sent once removed. **Not verified:** native build with the new plugin,
  replay masking, native crash capture, symbol upload, Android, deep-link/notification opens on device.
- No deploy, store build, push, migrations or PostHog setting changes. Native builds need a fresh prebuild/pod
  install for the new plugin. Concurrent ProfileScreen/WelcomeScreen/ui/paymentTotals/launch.json edits untouched.

### 2026-11-12 — Codex (website PostHog dashboard created)

- Owner authorized website dashboard only; native analytics remain Claude's work.
  Created and pinned private project695338 dashboard2346165:
  https://us.posthog.com/project/695338/dashboard/2346165
  Name: Litterbugs website performance. Default last7days, America/New_York.
-16 native insights plus2 notes: traffic/map-reach/report-open/failure cards,
  devices/referrers/pages, homepage-map-report funnel, daily map reach by device,
  map results/recovery, report/fund/claim/evidence funnels, auth outcomes and
  failure reasons. Ordered visitor funnels use30min; map reach uses distinct
  sessions and includes direct arrivals, distinct from homepage-only conversion.
- Dashboard and every insight restrict production host, exclude is_test=true,
  virtual bots, test_environment/test_run_id, .invalid QA referrers, and apply
  filterTestAccounts. Existing cohort673394 has0 members: older unmarked testing
  may remain. Found historical QA referrer absent normal test flags; excluded.
  Starter dashboard and prior phone insight untouched; no capture setting changes.
- All16 saved charts executed successfully; evidence funnel honestly has no data.
  Map-loading taxonomy still absent: no misleading0ms chart. Visible note explains
  timing coverage and first observed map/participation eventsNov9. Browser counts
  are not platform totals/financial ledger; repeat result polling isn't visits.
- Catalog initially empty. Saved3 source-insight metric proposals (NOT approved):
  litterbugs_website_tracked_visits (ze7I0H10), litterbugs_website_map_reach
  (CjpWYru8), litterbugs_website_workflow_failures (9jDVgAeH). No canonical claims.
- Browser verified saved7day filters,156visits/28.2% map reach at audit time,
  successful14day override recalculation, no horizontal document overflow.
  Widened metric cards and switched funnels horizontal for readable step labels.
  No visitor-site tests, app/web source changes, deploy, push or DB migration.
  Dashboard remains private; no alerts, subscriptions or invitations created.

### 2026-11-12 — Codex (unreleased app analytics and dashboard recommendation)

- Owner clarified latest app is not deployed. Reviewed local mobile code only;
  no claims of live native telemetry or release readiness. Existing analytics
  covers screens, first-run tour, sign-in, participation and payout stages;
  production profile enables analytics while acceptance profile disables it.
- Local config requests replay and JS error capture, not full native crashes.
  Recommend real-build delivery/masking checks, native crash symbols/source maps,
  full interaction timings, missing discovery/deep-link/notification outcomes,
  build/update attribution and separately labeled QA validation before release.
  Replay uses legacy plugin still listed as supported peer by installed SDK;
  current docs recommend renamed plugin. No confirmed incompatibility asserted.
- Recommend PostHog for behavior/funnels/performance, existing MFA/admin-gated
  /admin for authoritative cleanup/review/financial operations and a small
  summary linking to analytics. Avoid duplicating entire analytics platform.
  Clarity supports native React Native but isn't installed; prefer verifying
  existing PostHog replay before adding a second native recorder.
- Advice only: no app/web/analytics settings changes, deploy, push or DB changes.
  Preserve concurrent mobile, preview and handoff work.

### 2026-11-12 — Codex (PostHog/Clarity capability and configuration review)

- Read-only review requested. Confirmed PostHog695338: one starter dashboard
  (2274370), zero alerts/surveys/experiments/flags. Automatic exceptions/vitals,
  PostHog replay/heatmaps/surveys off; site disables flags/surveys, uses cookieless
  mode and person_profiles never. Starter retention isn't authoritative member
  retention under this identity setup. No settings or capture changes made.
- Signed-in Clarityz60itnrbpn inspected through existing main-Chrome MCP connection
  in a separate temporary tab: five Clarity-defined events (Find a location,
  Login, Outbound click, Sign up, Submit form), zero funnels. Site code only
  configures Clarity/consent, not custom event/tag delivery. Closed only audit tab;
  original recordings/user tabs intact. No site visits or test traffic generated.
- Highest-value next work: site-specific PostHog funnels/health dashboard using
  existing bounded journey events; safe named button/outcome/timing signals;
  mirror important outcomes into Clarity events/release tags and save segments;
  inspect mobile homepage scroll/attention and slow-interaction recordings.
  Threshold alerts after baseline; sparse-traffic minimum-volume guards needed.
- Reviewed current PostHog docs via connected docs-search and Microsoft Learn:
  funnels/paths, flags/experiments, surveys, errors/performance, identity limits,
  Clarity heatmaps/Smart Events/funnels/Copilot/performance/export. API export is
  aggregate dashboard data (1–3-day window,10 requests/day), not replay download.
  Additional options: selected error diagnostics, later stable-assignment tests,
  optional feedback, aggregate database outcomes/retention and AI metadata costs.
- Recommendations only: no dashboard/alert/survey/flag launch, deploy, push,
  identity expansion or private-data collection. Website remains releasee5411e2.

### 2026-11-12 — Codex (cleanup start and button improvements deployed)

- Owner approved cleanup-start and tested button improvements. Live sourcee5411e2
  on codex/cleanup-buttons-release-20261112 contains exactly25 web source/test
  files from00318cb,6a90480,58778ad, based on prior production65a80e9.
  Release branch pushed to GitHub; unrelated native/root history not published.
- Promoted tested build dpl_7ybf24ASXLanJNFKCqq6FtyWMyCn
  (https://litterbugs-nt7t4wv92-grant-9890s-projects.vercel.app) to litterbugs.app.
  Rollback: dpl_2HqQdm5DFN686ELFm1Rom2YfheNs. No dependencies/DB migrations,
  native changes, fee-page edits, unapproved homepage redesign or local previews.
- Includes native-style butterfly cleanup start/first-time agreement dropdown,
  saved-agreement site check, stable footer/button label and existing payout/version
  guards; homepage intent prefetch/shade feedback, responsive carousel/photo arrows,
  profile/bell navigation. Pending feedback has no underline or repeating animation.
-82 focused tests, TypeScript/scoped lint/diff check and remote production build
  pass. Existing social-card filesystem tracing warnings persist in unchanged code.
  Staged home/map/report200 and local cleanup-start/cleaner previews404. Actual
  staged pending cue fades to opacity.055 with unchanged See this cleanup label,
  no underline/animation, then report/images render. Live alias identity verified.
- Live390px and1440px smoke checks: home/report/map render, no horizontal overflow,
  two rapid carousel clicks settle653px (two steps), photo arrow selects loaded
  image, homepage Open map renders Google map. Browser and runtime-error scans
  clean. Analytics excluded before all visits. Cleanup first-use/version/payout
  acceptance is verified with local workflow tests; no real acceptance, claim,
  sign-in, preference/profile write or money submission used for production QA.
- Local3000 remains running, including safe cleanup-start preview. Concurrent
  mobile edits and other preview/handoff additions remain intact.

### 2026-11-12 — Codex (website cleanup start matches native, local only)

- Owner supplied native cleanup-start screenshot and requested website parity.
  Real CleanupAction now opens a white butterfly sheet with three colored steps,
  exact funded amount (or3 points for volunteer), lilac Start my cleanup button,
  and a fixed footer. Scoped CSS leaves later evidence/review screens unchanged.
- Matches current native CleanupWaiverModal: first-time full agreement opens from
  Read the cleanup agreement; one initially unchecked box affirms both agreement
  and site safety, locked until opened. Returning users only confirm site safety.
  Full current guidelines/body/release and separate release heading retained.
  Existing accept_cleanup_waiver/claim_cleanup RPCs, active version checks and
  payout gates unchanged. Version-pair key resets local document-open state.
-27 focused tests pass (21 cleanup workflow,4 UI,2 document integrity), including
  no automatic consent/claim, saved agreement/site confirmation, busy labels,
  payout failures, and new-version reacceptance after a rejected claim. TypeScript,
  scoped lint and diff check pass. No production writes, DB migration or deployment.
- Browser actual shared panel:390/320px phone and1440px desktop, first-time and
  returning states, accordion enablement, scroll-to-release, stable footer,
  no horizontal overflow or browser errors. Refero Contra acceptance dialog was
  secondary structure reference; screenshot/native source own visual direction.
- Safe owner preview: http://localhost:3000/dev-review-preview/cleanup-start.
  Close modal to switch accepted-agreement/funded flags and reopen. Start in this
  preview performs no write; production NODE_ENV returns404. Real website workflow
  uses the updated panel. Local3000 remains running; no deploy/push. Preserve
  concurrent mobile work and other local-only previews/handoff additions.

### 2026-11-12 — Codex (subtle button shade replaces pending underline, local only)

- Owner disliked the underline. Replaced pending-line/pulsing styles with a5.5%
  current-color tint over the existing rounded button/link, transitioning120ms.
  No new palette, text, layout, route/prefetch or loading timing changes. No loop;
  reduced motion removes the transition. Refero Tally surface restraint and bundled
  motion guidance informed the tiny tint; existing Litterbugs colors are primary.
- Browser local390px confirms tint, inherited rounding, unchanged size/labels,
  no underline/animation and reduced-motion transition0s. Six existing link tests
  and scoped diff check pass. Committed locally; no deploy/push. Previous live
  remains65a80e9; homepage responsiveness00318cb also awaits approval to deploy.

### 2026-11-12 — Codex (homepage button responsiveness follow-up, local only)

- Owner requested broader homepage button checks. Added ResponsiveLink: original
  labels/layout stay intact, pending navigation gets the existing subtle pulse,
  full destination prefetch starts on mouse/focus/touch intent. Report cards keep
  viewport prefetch disabled; hidden menu links no longer force full prefetch.
  Applied to homepage actions/map/pins/cards/header/footer; signed-in Profile now
  uses a real prefetchable account link; notification bell uses the same feedback.
- Fixed rapid carousel clicks losing steps during smooth scroll: accumulate the
  intended target, clamp at ends, reset after manual scroll/scrollend/resize.
  Card photos warm both neighbors on mouse/touch/focus and prioritize the selected
  image on click. Existing grouped photo reveal and reduced motion remain intact.
-46 focused tests pass, TypeScript/scoped lint/diff check pass. Browser local3000:
  desktop1440 and phone390 render without overflow/overlay/console errors; menus,
  search focus, login dialog, photo switch work. Two rapid carousel clicks settle
  at653px (two326.47px steps). Choose a spot pending cue appears at first18ms sample
  with unchanged label. This is one local response sample, not production speed.
- Production guest baseline samples: Report trash155ms / report card214ms to
  route shell, with no button cue; destination data readiness measured separately.
  All production visits excluded from analytics. Store/social hrefs preserved;
  no actual sign-in, preference writes, money submissions or DB changes tested.
- No deploy or push; previous live65a80e9 remains. Local3000 left running for review.
  Preserve concurrent mobile/notification/preview edits and handoff additions.

### 2026-11-12 — Codex (approved button/save/map fixes deployed)

- Owner approved deployment and GitHub push. Live source65a80e9 on
  codex/navigation-map-release-20261112 contains exactly25 web/shared files
  from tested local commits2f6c8e0,c8ce7b0,6b26f03, based on prior release.
  Working branch codex/map-first-navigation also pushed through6b26f03.
- Promoted exact verified production build dpl_2HqQdm5DFN686ELFm1Rom2YfheNs
  (https://litterbugs-solpk74f6-grant-9890s-projects.vercel.app) to litterbugs.app.
  Previous live/rollback: dpl_97HKBRMdUPK8wmDAP2CNvLdvNVPy. No DB migrations,
  dependency changes, native updates or unapproved homepage redesign released.
- Includes map startup timing/failure diagnostics, unchanged button labels with
  subtle pending cue, report loading boundaries and streamed related reports,
  responsive local preference saves during cloud sync, reliable map-type clicks
  and12s browser-location deadline. Publication proximity checks unchanged.
-145 targeted tests pass (130 web,10 shared sync,5 profile regression), web/shared
  TypeScript, scoped lint and remote production build pass. Existing boundary
  checker rejects four unchanged Stripe files/dependencies already live; no new
  violation. Build retains pre-existing social-card filesystem tracing warnings.
- Staged home/report/map HTTP200; local-only photos/hours/loading previews404.
  Staged cleanup click keeps See this cleanup while aria-busy=true, renders
  original/result images and six related reports. Temporary staged hostname is
  intentionally not allowed by Google Maps referrer restrictions; actual live
  domain renders map/pins and satellite toggle correctly. No key restrictions
  weakened. Verified live deployment identity, home/map/report HTTP200,390px
  phone report without overflow, working cleanup link/images, no Opening/Saving
  labels. Browser console/runtime error scan clean. All browser tests excluded
  from analytics before scripts; no real preference/profile/financial writes.
- Root local3000 remains available. Preserve concurrent mobile, notification and
  preview work; not part of this website release. New telemetry awaits real
  visitor data for subsequent analytics review.

### 2026-11-12 — Codex (save/map delays and unchanged button labels fixed locally)

- Owner requested local save/map fixes and no visible technical progress labels.
  Cleanup CTA now retains See this cleanup with a subtle reduced-motion-aware
  underline pulse; removed visible Opening page text from route shell too.
  Actual browser samples keep label unchanged and show no Opening wording.
- Found preference engine's single queue/cross-tab data lock held throughout
  network sync (web deadline8s), blocking local Favorite/Hide writes behind it.
  Added opt-in nonBlockingSync used by web only: network work gets a separate
  cross-tab lock, local writes remain durable/fast, responses rebase newer
  pending operations. Concurrent sync callers share a flush. Native/default
  mode unchanged. No backend RPC/schema/RLS changes. Hide/Unhide re-enables
  after device save so undo needn't wait for cloud; latest-action notices win.
- Map style clicks now advance from a ref to avoid lost batched rapid clicks;
  disabled before map initialization, preserve choice when map initializes.
  Map location request has a12s wall-clock deadline (even if browser never
  calls back), drops late results and prevents duplicate requests. Fresh
  publication location checks in requireReportLocation are unchanged.
- 40 targeted tests pass:26 web save/geolocation/map/link/closest tests,
  10 preference-engine tests (including slow sync, offline retry, cross-tab
  ordering, lost response, retirement and native defaults),4 profile-save
  regression tests. Web/shared TypeScript, scoped ESLint and diff check pass.
- Actual local browser: satellite toggle works; one hung fake-location request
  shows busy icon, then control re-enables; no browser errors. Cleanup CTA
  label stays constant through pending navigation. No real location prompt,
  live profile/preference writes or destructive actions used in testing.
  Local server remains running at3000 for review. No deploy/push/DB changes.
  Preserve concurrent native/notification/preview work and earlier pending
  map telemetry2f6c8e0 / navigationc8ce7b0 local-only changes.

### 2026-11-12 — Codex (slow cleanup navigation reproduced and improved locally)

- Owner reported repeated See this cleanup taps and broader slow buttons.
  Excluded isolated production test reproduced a 1202ms click-to-report delay:
  old homepage/button persisted without any status; report RSC request1112ms,
  despite partial prefetch. One sample, not visitor average. Button is a normal
  Next Link; force-dynamic report lacked a loading boundary. Main render also
  awaited optional related links; reporter lookup was serial after completion.
- Local fix: cleanup CTA uses useLinkStatus for immediate Opening… feedback;
  shared root and explicit report loading boundaries use existing delayed/glowing
  firefly and white branded layout. Existing map/sign-in/account fallbacks keep
  priority. Optional related links stream in their own Suspense boundary, and
  reporter lookup runs alongside cleanup evidence. No stale data cache or RLS
  changes. This addresses navigation links, not every save/dialog/map action.
- Actual local browser: pending feedback present at first51ms sample; full report
  and 6 recommendations render, photos preserved, no console errors. Another
  report-list link shows shared fallback at218ms. Dev compilation/network differ
  from production: no claim of reduced production load time yet. Local /report
  HTTP200 verifies actual read path after changes. Port3000 dev server started
  (was stopped) and left running for owner review; no production build.
- 41 focused tests pass, including blocked recommendations not blocking report,
  eventual related links, parallel reporter read, pending reset and photo errors.
  Web TypeScript, scoped ESLint and diff check pass. Preserve all concurrent work.
- PostHog14-day raw rage-click scan (staff cohort673394, test/bot flags excluded)
  finds seven records, all /map, none identifies this CTA. Clarity7-day rage
  filter has no matching recordings; owner-observed repeated clicks plus direct
  reproduction are the evidence for this fix. Restored Clarity3-day URL view.
- All production test browser visits excluded before scripts and verified;
  separate local review tab retained. No real participation/money submission,
  database change, deploy or push. Map telemetry2f6c8e0 remains locally pending.

### 2026-11-12 — Codex (signed-in Clarity connection restored; recordings reviewed)

- Owner screenshot confirmed main Chrome listening at 127.0.0.1:9222. Both
  --autoConnect (missing DevToolsActivePort) and --browserUrl (/json/version
  HTTP 404) fail on this permission-based listener. Official installed MCP
  1.13.0 connected successfully with --wsEndpoint=ws://127.0.0.1:9222/devtools/browser.
  Persistent standard MCP client in node_repl read owner's signed-in Clarity
  tab and played/seeks recordings. No extra login or cookies copied. Global
  MCP config untouched; default tools still use isolated browser.
- Last-three-day production URL view lists 29 recordings; dead-click subset
  lists 2. Inspected Nov 10 desktop 16:48 session: Report menu visibly opens
  at 20:09 despite dead-click label. Two funding flags at 21:22/23 point into
  blank dialog space. No confirmed broken control. Edit/Delete controls appear
  in this session; cannot treat it as known non-staff traffic. A 39-second
  navigation gap includes a user-left-site interval; not map load duration.
- Inspected Nov 12 14:52 Instagram shared-report timeline and replay: two taps,
  report content/photos loaded; menu appears clipped in replay. Current same
  report in excluded mobile Chrome at 390px does not reproduce: page width390,
  drawer x0..320, Open map x16..303; no console errors. Real Instagram/iOS
  device verification remains needed before calling this a website defect.
- Nov 12 04:00 ChromeMobile session has Google Play outbound at 01:10, page
  hidden at 01:11; consistent with store handoff, not proof of install or bug.
  No newly confirmed user-facing defect this pass. No policy/fee/homepage edits.
- Production verification used separate test browser, both analytics exclusions
  set before page scripts and verified true. Test tab returned to about:blank;
  normal owner tabs untouched. Local server currently refused port3000, so
  did not restart/build it. No deploy, push or DB changes. Map telemetry 2f6c8e0
  still awaits deployment approval. Future Chrome attach must use WebSocket
  path above, not the missing discovery file or /json/version HTTP endpoint.

### 2026-11-12 — Codex (Chrome attachment rechecked after owner enabled debugging)

- Retried official --autoConnect after owner reported enabling remote debugging.
  Main Chrome is running, but it still reports missing DevToolsActivePort in
  its default user-data directory; bounded filesystem check confirms absent.
  No connection prompt/recordings reached. Existing isolated MCP browser is
  still a separate profile and cannot verify owner's Clarity authentication.
- Requested current chrome://inspect/#remote-debugging screenshot to diagnose
  the actual setting state without another blind sign-in/restart instruction.
  No settings modifications, cookies copied, browser closures, website changes,
  push or deploy. Local map tracking remains pending owner deployment approval.

### 2026-11-12 — Codex (signed-in Clarity session located by owner)

- Owner screenshot confirms Clarity is signed in in normal Chrome. Earlier
  sign-in guidance targeted the isolated MCP profile and was misleading.
  Current connector config contains --isolated; fresh profile remains signed out.
- Tested installed official chrome-devtools-mcp 1.13.0 --autoConnect through
  its standard MCP interface, without changing config or Chrome settings.
  It cannot attach: main Chrome DevToolsActivePort absent; remote debugging
  must be enabled via chrome://inspect/#remote-debugging and owner-approved.
- No fresh recordings reviewed. No cookie/credential copying, global settings
  changes, browser closures, website changes or deployment. Normal signed-in
  Chrome session preserved. Local map tracking 2f6c8e0 remains undeployed.

### 2026-11-12 — Codex (Clarity browser timeout investigated)

- Earlier failure occurred on Emulation.setFocusEmulationEnabled, before page
  inspection; no evidence that Clarity itself was timing out. Fresh Chrome
  DevTools connection navigated to project z60itnrbpn in 2.4s and read its UI.
- Fresh browser shows session-expired/sign-in screen. Google sign-in reached
  successfully but requires account entry; no saved authenticated account.
  Owner sign-in needed in that browser before recording access can be verified.
  No cookies copied, credential access, browser/app restarts or closures.
- Memory pressure remains level 2; observed as context, not established cause.
  No website change, push or deployment. Local map tracking 2f6c8e0 still awaits
  deployment approval; no new Clarity recording conclusions.

### 2026-11-12 — Codex (map startup measurement added locally)

- Added map_loading journey signals: started, first tiles_ready, failed and
  recovered after timeout. Five fixed failure reasons cover missing config,
  initialization, Google authorization, 12-second startup timeout and marker
  construction. Startup timing begins at the map effect, not navigation;
  elapsed_ms rounded to 100ms/capped at 120s, backgrounded marks hidden tabs.
- Existing bounded queue/provider sanitizers carry these signals; privacy
  exclusions remain enforced. No raw errors, locations, keys or report IDs.
  Repeated tiles/pans and discarded Strict Mode effects do not duplicate loads;
  late marker failures still recorded. Bundle marker bumped to v8.
- 71 focused tests pass: actual MapExperience handlers, timeout/recovery,
  configuration/auth/initialization/marker failure, Strict Mode, unmount cleanup,
  safe provider transport and exclusion. Web TypeScript and scoped ESLint pass;
  local /map HTTP 200. No local production build or new browser test traffic.
- Continued read-only PostHog record inspection over 14 days (same production,
  staff-cohort/test/bot exclusions): Nov 12 report-location cancellation has no
  matched failure signal; not sufficient evidence of a new UX bug. No payout
  setup rows in the bounded inspection. Store clicks do not prove installs.
- Clarity existing-tab focus still times out. Fresh replay review remains
  unavailable; no new replay claim. Changes committed locally only; no push,
  deployment, database changes or app closures. Live ingestion awaits approval
  and deployment; localhost remains excluded. Preserve concurrent native work.

### 2026-11-12 — Codex (PostHog follow-up; map startup measurement gap)

- Read-only PostHog project 695338 review: production-host events exclude
  staff cohort 673394, explicit is_test and bot flag. Last 3 days contain
  no participation_failure/rageclick rows; last 7 days show one Nov 9
  location_denied failure from v3, predating the location workflow fix.
  No map/search/closest failure rows in the last 7 days. Small activity
  sample and unlabelled testing remain limitations; not proof of no errors.
- Thirty-second results_loaded events are visible-tab background refreshes,
  not deliberate searches or separate visitor actions. Hidden/offline refresh
  guards already exist. New app_choice/shared_report_sign_in events have not
  appeared in current taxonomy/results; cannot infer broken delivery or usage.
- Confirmed code measurement gap: map result telemetry returns before tiles
  ready or on mapError. SDK startup rejection, 12-second timeout, key/auth and
  marker construction failures only set UI errors; no map startup outcome or
  timing event. Recommend bounded, sanitized startup outcomes/timing, without
  location/report IDs, URLs or raw exceptions. No implementation authorized yet.
- Fresh Clarity recordings unavailable: existing browser tab CDP focus timed
  out twice; native browser access also timed out. Did not claim new replay
  findings. No test visits, builds, app closures, deployment or database changes.
  Preserved concurrent native/notification/onboarding work and prior handoff edits.

### 2026-11-12 — Codex (cleanup hours and social links deployed)

- Owner-approved source 7638185 on codex/cleanup-hours-social-release-20261112
  is live at litterbugs.app: dpl_97HKBRMdUPK8wmDAP2CNvLdvNVPy /
  litterbugs-9u6drffx1. Previous live/rollback: dpl_DeCmzBrM6UdhTNAdQDKMmRYiLuoL.
  Release branch and working branch through approved 9b81fc6 pushed to GitHub.
- Exactly 22 reviewed production/test files match approved local 9b81fc6:
  optional hours field with draft/review/minute conversion and existing duration
  RPC, plus all three confirmed social destinations with Font Awesome brand
  icons and no subheading. Native work, backend migrations, dependencies,
  dev previews, homepage layout and policy pages match previous live.
- 80 web + 3 shared tests pass against clean release. Remote compile/TypeScript
  and production build pass (20s); existing two social-card filesystem tracing
  warnings remain. No local production build or database changes.
- Staged home/map/report HTTP 200; cleanup-hours/loading previews HTTP 404.
  Three social URLs and no subheading verified in staged HTML. Promoted the
  same build; production domain identity is the new deployment above.
- Live excluded-browser checks pass: all three URLs, 44px phone menu targets,
  no overflow or subheading at 390/1280px, no browser errors. Last-10-minute
  deployment error scan empty. No real cleanup submitted during verification.
  Analytics set off in test browser; temporary viewport restored and live test
  tab closed. Local review previews preserved. Concurrent work stays untouched.

### 2026-11-12 — Codex (website cleanup hours added locally)

- Optional How long did it take? (hrs) field added below bags/weight, matching
  native form layout. Decimal hours convert to whole minutes (1.5 -> 90),
  validate before review/send, appear in review and existing completed stats.
- Hours retained in device/account drafts, restored drafts and conflict
  summaries; optional shared payload field keeps older drafts readable.
  Submission with time uses existing submit_cleanup_with_details and preserves
  weight/bag values; no fallback that silently drops entered time. Blank time
  retains existing submit_cleanup_with_weight path and missing-time behavior.
- 63 focused web/contract tests pass, including controller-to-service conversion,
  draft edits/restoration, account-draft round trip, legacy drafts, invalid
  input, duration/weight RPC and existing submission recovery/cleanup display.
  Web/contract TypeScript, scoped lint and diff check pass.
- Read-only linked DB catalog checks confirm authenticated execute permission,
  duration and weight support. No schema/data changes; Supabase connector lacked
  permission, so used documented CLI read-only queries. No cleanup submitted.
- CUA: 390px form and 1280px review have no overflow, invalid 25h rejected,
  1.5h retained through Edit and shown in review, browser errors empty. Original
  app/form styles are reference lock. Preview uses real component, disables
  submit and is production-404 guarded: /dev-review-preview/cleanup-hours.
  Temporary viewport reset; local preview left open. No production build,
  push or deployment. Concurrent native/other previews/handoff preserved.

### 2026-11-12 — Codex (cleanup-hours parity check)

- Source audit: native CleanupSubmissionScreen already has optional decimal
  hours input (How long did it take? (hrs), example 1.5). Website evidence
  panel and submission action only collect bags/items and weight; no hours
  entry, draft field or duration passed by that form yet.
- CompletedCleanup already displays recorded duration_minutes as hours.
  Answered owner's question; no workflow changes, push, deployment or DB
  actions. Concurrent work preserved.

### 2026-11-12 — Codex (confirmed Facebook page added locally)

- Owner supplied Facebook screenshot: Litterbugs Community Cleanup,
  profile.php?id=61573402678573. Added that exact URL to SocialLinks with
  Font Awesome Facebook brand icon, alongside confirmed Instagram/TikTok.
- Footer, map footer and mobile drawer share the icon-only component.
  Scoped lint/diff check pass; CUA confirms all three URLs, 44px targets,
  no subheading and no overflow on the narrow local preview.
- No push/deployment or account changes. Local preview remains open.
  Concurrent native and handoff changes preserved with isolated index.

### 2026-11-12 — Codex (icon-only social links; Facebook search)

- Removed visible Follow along label from shared SocialLinks and its CSS.
  Instagram/TikTok use existing Font Awesome Brands via react-icons/fa6,
  not custom SVG drawings. Accessible destination labels remain.
- Scoped lint and diff check pass. Local CUA footer confirms both logos,
  no visible subheading and no overflow. Preview stays open; no deploy/push.
- Further Facebook search: Firecrawl found App State reposts mentioning the
  exact full name; browser-verified mentions link back to Instagram, not a
  Facebook page. Instagram public links/Account details show no Page link.
  Other search hits were unrelated, and no official Facebook destination
  could be verified. Facebook remains unlinked; no new credentials requested,
  no account/settings changes or messages. Research tab closed.
- Concurrent native/handoff work preserved via isolated Git index.

### 2026-11-12 — Codex (confirmed TikTok added locally)

- Owner confirmed @litterbugs.commun is theirs. Added TikTok beside Instagram
  through shared SocialLinks, covering footer, map footer and phone drawer.
- Scoped ESLint and diff check pass; CUA confirms correct destinations,
  44px targets and no overflow at 319px. Local preview remains open.
- No push or deployment. Facebook remains unverified and unlinked.
  Concurrent native/handoff changes preserved.

### 2026-11-12 — Codex (Instagram links added locally)

- Added owner-confirmed instagram.com/litterbugs_app to shared SocialLinks:
  regular footer identity, phone drawer, and compact map footer (More below
  1440px; inline above). Existing lavender/charcoal tokens, 44px phone targets,
  accessible destination names and new tabs; no external embeds or SDKs.
- Refero reference lock from preceding entry retained. Fixed narrow-footer
  logo/copyright/social grid placement. Map footer remains 48px at 1280px.
- 20 existing header/navigation tests, scoped ESLint, TypeScript and diff check
  pass. CUA verifies desktop/phone layout, no overflow at 319/390/1280px,
  drawer and map More access, and actual Instagram click opens correct profile.
  Initial mid-edit HMR/hydration errors stopped after clean reload; no new
  browser errors in final checks. Temporary viewport/CDP overrides restored;
  local home preview remains open; research tabs closed. No production build.
- Owner asked us to find other profiles. Instagram bio links only own website.
  TikTok search found @litterbugs.commun with matching full name but no avatar,
  bio or videos; ownership unverified, owner question pending, not linked.
  Facebook search failed to yield a verified official page; not linked.
- Local only: no push, deployment, native/backend or DB changes. Preserved
  concurrent mobile files and other handoff edits via isolated Git index.

### 2026-11-12 — Codex (social-link placement research)

- Refero: Duolingo and Bumble full styles plus Kickstarter footer screen
  7573bf28. Plan: quiet social icon row by footer identity and in the mobile
  drawer, using existing lavender tokens and 44px touch targets; keep map
  footer height stable. Existing site is the visual reference lock.
- No official Instagram/TikTok/Facebook profile links found in source or
  public search. Asked owner for URLs/usernames before wiring destinations.
  No product changes, deployment or push. Concurrent work preserved.

### 2026-11-12 — Codex (filter, card and loading improvements deployed)

- Owner-approved release 89f6da0 on codex/filter-loading-release-20261112 is live:
  dpl_DeCmzBrM6UdhTNAdQDKMmRYiLuoL / litterbugs-bjki2fcru. Release source and
  completion notes pushed to GitHub. Rollback: dpl_GxyQnRbtykjhEeDhTUMWN3FCGBYh.
- Exactly 20 reviewed production web/test files from bda0f8a on prior live
  2bebc0f: filter state/URL recovery, single selected filter with X, no After
  cleanup card badge, delayed pulsing firefly, removed loading ants, and visible
  photo batches. Homepage copy/layout unchanged; only loading behavior updated.
- Dev previews, notification/native/backend work, dependencies, policy pages
  and database changes excluded (verified byte-identical to prior live for
  excluded paths). No mobile/store release or local production build.
- Exact release: 76 tests pass. Vercel Next.js compile/TypeScript/build pass;
  existing social-card filesystem tracing warnings remain. Staged home/map/
  cleanups/photo/firefly asset HTTP 200. Loading/photos preview pages and local
  delayed-image route HTTP 404. Production domain identity matches release.
- Live excluded-browser checks: homepage collage 4/4 decoded/revealed; Favorites
  appears once and toggles off; completed results show 9 cards, zero photo
  badges/ants and decoded visible photos. 390px removable-filter/card layout
  passes; no browser errors. Last-10-minute deployment error scan empty.
- Analytics choices set off for test browser; temporary viewport reset and
  production test tab closed. Local previews and concurrent work preserved.
  Memory pressure moderate (2); tests used one worker and build ran remotely.

### 2026-11-12 — Codex (coordinated photo reveal and clearer glow, local)

- Visible report photos now download/decode behind fixed-size frames and reveal
  together in one animation frame, with a 180ms fade. Added shared batching to
  map results, public report grids/carousels, existing homepage collage and
  before/after proof pairs. Content/links stay usable; offscreen/hidden slides
  never hold the group or get promoted to eager loading by the coordinator.
- Observer work is scheduled by intersection/layout/source changes, not per-
  pixel scrolling in supported browsers. Reuses existing img requests (no extra
  full-size preloads). Handles cache, errors, retry/source changes and cleanup.
  A 5s outlier deadline releases ready photos; late photos can still recover.
  No-JS public pages get a noscript visibility fallback. Reduced motion skips
  the fade. Report loader stays continuous from fetching to visible decoding.
- Strengthened the firefly halo: .22–.65 opacity and .92–1.12 scale over slow
  alternating 1.8s phases. Body stays still; reduced-motion glow remains static.
- Local /dev-review-preview/photos uses three intentionally staggered local
  image responses (180/1400/2600ms); page/image route are production-404 guarded.
  References: MDN HTMLImageElement.decode and Intersection Observer docs, local
  Next Image docs; existing brand/motion rules remain the visual reference.
- 76 focused tests pass; lint, TypeScript, CSS compilation and diff check pass.
  Tests cover atomic decode/reveal, cache, failure, stale source, scroll groups,
  5s deadline/recovery and resource cleanup. CUA saw image 1 fully downloaded
  while all 3 remained at opacity 0, followed by all at opacity 1. Real report,
  homepage collage/proof and phone preview checks pass with no browser errors.
  Stronger glow confirmed running at 1.8s; temporary network/viewport settings
  restored, loaders stopped and previews kept open.
- No push, deployment, DB changes or local production build. Memory pressure
  moderate (2); tests use one worker. Other agents' notification/native files
  and handoff changes preserved with an isolated index. Approved filter/card
  deployment remains paused while the owner reviews these loading updates.

### 2026-11-12 — Codex (GivePulse individual participation clarified)

- Official volunteer guide confirms free individual accounts, opportunity
  search, impact logging and creating a group to publish opportunities.
  Many events accept registration without group membership. Organizer posting
  uses group/event setup; no claim that registered nonprofit status is always
  required. Earlier comparison emphasized institutions too heavily.
- Recommended preserving Litterbugs individual report/claim/cleanup flow and
  making potential group tools optional. Advisory only; no product changes,
  outreach, deployment, push or database changes.

### 2026-11-12 — Codex (calmer lightning-bug loader, local; deployment paused)

- Owner interrupted the approved filter/card release before deployment to review
  loading changes. Nothing pushed or deployed this turn; last live remains
  2bebc0f / dpl_GxyQnRbtykjhEeDhTUMWN3FCGBYh.
- Replaced ReportBrowser's bee with the existing lightning-bug SVG: 350ms reveal
  delay (including initial mount/retries), 180ms entrance/exit fade, stationary
  body with subtle 2.4s halo breathing. Loader stays mounted for exit; ready
  results are never delayed or blocked. Reduced motion uses a static glow.
- Removed rendered AntWalk loaders from homepage feed, account section and
  completed-photo placeholders. Kept stable quiet skeletons and existing
  non-loading bug artwork/motion; no hero or before/after-hover changes.
- Research: Carbon loading guidelines (prefer stable skeletons, avoid competing
  indicators), NN/G progress-indicator guidance, Refero skill motion reference.
  Existing Litterbugs white/purple/yellow art is the reference lock; timing
  values are our implementation choices, not quoted source requirements.
- Added guarded development-only /dev-review-preview/loading comparison with
  150ms, 1.8s and manually held loads using the real component. Production
  requests call notFound(). No report data changes are made by this preview.
- 51 focused tests pass, including fast/slow/retry/unmount timing and existing
  report/photo/motion regressions. Scoped ESLint, TypeScript, CSS compilation
  and diff check pass. CUA verifies delayed reveal, immediate results during
  fade, 150ms bypass, 390px layout, reduced-motion static glow, real map wiring
  and no browser errors. Media/viewport overrides reset; preview left open.
- No local production build. Memory pressure moderate (2); Node dev server
  remains capped at 1536MB. Concurrent staged native/migration and handoff
  changes preserved using a temporary Git index.

### 2026-11-12 — Codex (GivePulse comparison and growth lessons)

- Compared current GivePulse official workflows/pricing with Litterbugs source:
  institutional groups/affiliations, opportunity registration, impact logging,
  organization verification and transcripts versus report-led cleanup evidence
  and optional funding/rewards. Existing Litterbugs duration is recorded time,
  not a school-approved service-hours credential.
- Recommended organizer-led local pilots, group attribution, useful impact
  summaries and repeat participation before broad API/enterprise work. These
  are proposed growth hypotheses, not verified GivePulse acquisition results.
- Advisory only; no product edits, outreach, deployment, push or database
  changes. Preserve concurrent staged and working changes.

### 2026-11-12 — Codex (single selected filter control and quieter cleanup cards, local)

- Refero research: visitors.now/shadcn style references, LinkedIn jobs filters
  (0ed16707) and [untitled] toggles (7c614cd9). Existing Litterbugs white/purple
  tokens remain the visual lock; adopted selected controls in place, rather
  than repeating their labels in another row.
- Desktop selected presets now include an X; active chips below omit filters
  already represented above. Favorites/Hidden toggle independently of status
  and advanced choices; status presets preserve unrelated saved/advanced
  filters. Phone layouts retain the complete removable chip row.
- Removed “After cleanup” photo badge from both ReportBrowser and public
  ReportCards. After-photo ordering and cleaned status remain unchanged.
- 57 focused tests, scoped ESLint, TypeScript and CSS compilation pass. CUA
  checks: one visible Favorites control at 1280px and 390px, toggle removal,
  mixed priority/Favorites, and 9 completed cards with after photos and no
  badge. Browser errors empty; viewport reset, local preview kept open.
- No deployment, push, production or database changes. Used an isolated Git
  index to commit only this task; concurrent staged native/migration work and
  other handoff edits preserved.

### 2026-11-12 — Codex (website filter state and recovery fixed locally)

- Favorites (1) was a saved-count shortcut, not an active-filter indicator;
  Hidden in the screenshot could have no shortcut when zero saved IDs existed.
  Fixed reproducible stale-draft reopening through the toolbar after Show
  results. One applied filter object now drives map/list callbacks and controls.
- Fresh/shared links no longer silently restore unrelated session filters;
  explicit URL filters (including URLs without browse=1) and back/forward still
  restore choices. Matching session memory retains expanded results/scroll.
- Added removable chips for every active filter plus Clear all, including on
  phones; removed ambiguous saved counts/Custom filters placeholder. Empty
  Favorites/Hidden stay explicit rather than silently switching to Available.
- 54 focused tests pass: status/workflow, funding, priority, distance, text,
  saved scopes, URL restoration, cancelled drafts, individual removal and
  map/list consistency. Scoped ESLint, TypeScript and CSS compilation pass.
  CUA checks at 1280px, 390px and 320px: dialog sync, X removal, Clear all,
  returning cards/pins; no browser errors. Local preview kept open, viewport
  reset. No deployment, push, production testing or database changes.
- Concurrent mobile/notification changes and other handoff edits preserved.

### 2026-11-12 — Codex (mint cleanup stats deployed)

- Owner-approved release 2bebc0f on codex/cleanup-stats-release-20261112 is live:
  dpl_GxyQnRbtykjhEeDhTUMWN3FCGBYh / litterbugs-3qo0b6po1. GitHub release
  branch pushed. Rollback: dpl_G9Q15QaLjZDr825x4a6CBqusEPp6.
- Deployed only the three reviewed CompletedCleanup files on prior live source
  d80611d: mint card, clearer cleaner identity, bag/item, pound and recorded-hour
  stats; missing durations show “time not recorded”. Homepage, policy pages,
  native work, untracked previews and database remain outside this release.
- Exact release source passes 48 cleanup/report tests; remote Next.js build and
  TypeScript pass. Staged home/map HTTP 200; bug-animation dev preview 404.
  Live alias identity matches the new deployment. 390px live report verifies
  mint RGB(226,248,243), all stats, no overflow and no browser errors. Browser
  Analytics choices set off; temporary viewport reset. Recent deployment error
  scan empty. Existing social-card filesystem tracing warnings remain.
- Current local work and concurrent Claude commits preserved. No cache files
  deleted; no local production build or mobile/store release.

### 2026-11-12 — Codex (integration acquisition shortlist)

- Researched official Nextdoor, Wix/WordPress, GivePulse, Eventbrite, Meetup,
  Idealist and Benevity documentation. Prioritized user-initiated Nextdoor
  sharing, willing local website widget placements, and campus partnerships.
- Nextdoor Share Plugin needs no API approval; Publish API does. Meetup API
  requires Pro plus approval. GivePulse access/partner arrangements need
  confirmation; App State platform usage was not established. Idealist blocks
  for-profit categories from volunteer postings; Benevity has nonprofit gates.
  Importing another platform's feed does not establish outbound distribution.
- Advisory only: no integrations, outreach, live tests, deployment, push or
  database changes. Preserve pending work by other agents.

### 2026-11-12 — Codex (API and MCP growth examples)

- Researched official Booking.com partner API, Calendly embeds, Jotform/Zapier
  case study (2023), and Notion MCP documentation. Explained partner reach,
  product exposure, retention and AI-workflow access as distinct mechanisms.
- Historical Jotform retention figures are vendor-reported cohort comparisons,
  not causal forecasts for Litterbugs. Notion docs show MCP functionality,
  without a measured acquisition result. No implementation, outreach,
  production testing, deployment, push or database changes.

### 2026-11-12 — Codex (mint cleanup stats and recorded duration, local)

- Matched the owner's phone reference: pale mint #E2F8F3 surface with #B9E9DD
  border/dividers, purple outline icons, and aligned bag/item, pound, time stats.
  Website now reads existing cleanup_submissions.duration_minutes and displays
  hours like native (one decimal); older cleanups show “time not recorded”.
- 48 cleanup/report tests pass, including recorded/missing/duration-only cases;
  scoped ESLint, TypeScript and CSS-module compilation pass. Real local report
  c9de971b checked at 390px and 320px with no overflow or browser errors. Preview
  kept open and temporary viewport reset. No deployment, push or DB changes.
- Read-only cache check found ~3.8 GB Codex updater cache and ~961 MB browser
  cache under Library/Caches. Nothing deleted; chats/settings/project preserved.
  Memory pressure normal (1). Other agents' native/launch/handoff work preserved.

### 2026-11-12 — Codex (cleanup summary restyled locally)

- Restyled CompletedCleanup's About the cleanup panel: soft lavender surface,
  lavender border/subtle lower edge, charcoal heading, purple avatar initial,
  clearer spacing and two-column bag/weight totals. CSS is scoped to this
  component; cleaner profile behavior and cleanup data remain unchanged.
- Existing Litterbugs styles are the reference lock; Refero Aave informed soft
  lavender grouping and Airbnb informed cleaner identity/spacing. Recorded
  owner's mint-green-only preference for new/restyled UI in AGENTS.md.
- Local report c9de971b-9b18-4e63-8b2d-00bba1de799c checked at 390px, 320px
  and 1280px: no horizontal overflow or browser errors; cleaner opens profile.
  Three existing cleanup tests and CSS-module compilation pass. Local preview
  remains open; viewport reset. No production testing, deployment or push.
- Restarted the stopped port-3000 dev server with a 1536 MB Node heap cap;
  no production build. Memory pressure is now normal (1). Other agents' native,
  launch, generated and handoff changes preserved.

### 2026-11-11 — Codex (API and MCP acquisition strategy)

- Advisory follow-up: prioritize partner-hosted cleanup feeds/cards, newsletter
  links and sponsor result pages; connected AI tools are a later distribution
  experiment. Proposed a small Boone pilot with attributed report visits,
  first contributions/cleanup claims and confirmed completions as outcomes.
- These are unvalidated channel hypotheses, not growth forecasts or existing
  partner commitments. No outreach, implementation, live testing, deployment,
  push or database changes. Preserve prior pending work.

### 2026-11-11 — Codex (restoring hidden reports guidance)

- Source review confirmed website Hidden filter and report-card Unhide report
  action; native Search and filters has Hidden reports → Hidden and a report
  visibility toggle. Explained restoration paths. No product changes, live
  testing, deployment, push or database changes.

### 2026-11-11 — Codex (API and MCP feasibility advice)

- Read-only source and current Google/MCP documentation review: existing public
  report loaders can support a small documented read-only API and MCP tools.
  Rough estimate: 1–2 focused days for the API, another 1–2 for a basic MCP
  integration, subject to scoped implementation review. These are estimates.
- Recommended useful public pages and local cleanup evidence first for search;
  API/MCP value is connected assistants and partner distribution, with no
  automatic ranking or AI-citation benefit. No implementation authorized,
  product changes, production testing, deployment, push or database changes.

### 2026-11-11 — Codex (approved map performance and analytics release live)

- Owner approved deploying completed work and pushing GitHub, with new homepage
  work held back. Clean release `d80611d` on
  `codex/analytics-map-release-20261111` is live as
  `dpl_G9Q15QaLjZDr825x4a6CBqusEPp6` (litterbugs-dcclnt0cl).
  Rollback: `dpl_6xn6UFxSv9YBM1oTZJaBBeTPZdpC`.
- Based on last live `3f3d78d` plus the 18 changed web files from `6cab301`:
  public-profile analytics privacy, map search/discovery attribution, deferred
  Stripe/hidden thumbnails, independent provider delivery, and app choices.
  Homepage source is byte-identical to previous live. No fees/rewards/refunds,
  database, native release, new homepage design or untracked previews shipped.
  Both release branch and working branch through `6cab301` were pushed.
  Concurrent later native payout work remains outside this web release.
- 156 focused release tests and scoped lint passed; remote production build
  and TypeScript passed. Isolated-test setup initially lacked workspace modules
  and used a different Node executable; linked existing dependencies for tests
  and used Node 22.22.0, then removed links before uploading clean source.
  No local production build. Existing social-card-bugs tracing warning remains.
- Staged home/map/get-app HTTP 200; dev-review-preview/bug-animations 404.
  Promoted and verified production deployment identity. Live 390px test:
  Continue on website -> loaded map -> Boone suggestion -> results -> report
  list -> completed report with loaded after photo. No initial Stripe or
  report-photo requests; photos load after list/detail opens. Zero analytics
  requests and browser errors. Test browser remains opted out of analytics;
  temporary viewport reset. Bounded production error-log scan was empty.
- Refero research for recommendation only: three style searches, Duolingo and
  Airbnb full styles, two Airbnb map/search/detail screen references. Preserve
  Litterbugs white canvas, rounded type, colorful bugs, existing button roles;
  put usable map/search into opening composition and move collage/app badges
  lower. No homepage implementation yet; approval required before deployment.
  Memory remains warning level 2; Android stayed closed, iOS left running.

### 2026-11-11 — Codex (guest browsing clarified)

- Read-only source check confirms guests already browse/search/filter the map,
  open report details/photos and public profiles, share/get directions, and
  favorite/hide reports locally. Guest preferences do not sync remotely.
- Report form continuation requires auth after location selection; funding
  and cleanup claims prompt auth. Cleanup evidence/reviews, owner management,
  payouts/account features and member report/block actions require sign-in.
  Previous map-first recommendation was about prominence, not removing an
  existing browse restriction. No product changes, deployment or GitHub push.

### 2026-11-11 — Codex (explained homepage-to-map reach)

- Read-only follow-up: most inspected phone homepage sessions have no later
  public-page view; a few visit About/Communities/Support. These paths do not
  prove why visitors stop or whether an app-store departure succeeded.
  Raw path inspection contains 19 sessions and does not reproduce the typed
  query's project test-account filters; keep 3/18 from the earlier typed funnel
  as the reported rate, not a new denominator from these records.
- Source confirms homepage hero prioritizes app-store badges; map preview is
  later in the page. /sign-in renders the live map behind its form while its
  private route is omitted from pageview tracking. The reported 16.7% measures
  /map navigation, not every map impression or successful map interaction.
- Suggested making the map the initial usable experience if near-universal
  map exposure is the objective, then measuring map readiness and meaningful
  interactions separately. No design/code, deployment, push or tracker changes.

### 2026-11-11 — Codex (mobile friction review, app choices and map reach)

- Fresh PostHog participation record review found no new tracked failures.
  Clarity production-only last-three-days dead-click filter has four sessions;
  newest (Nov 11 9:11 AM, mobile Safari) tapped the Cleanup and reward policy
  heading at 2s, not an interactive control. No policy edits. Nov 9 Instagram
  shared-report insights show login tap then page hidden; this alone cannot
  establish a failed sign-in. Reused one existing Clarity tab; playback ended.
- Added local `app_choice` stages: open_requested, store_fallback,
  download_page_requested (desktop), website_continued. Allowlisted destination
  report/map and store category only. Existing app/report destinations and
  fallback timing preserved. Fallback is recorded only when it actually runs;
  hidden-page/cancelled timers do not count. No install/app-open-success claim.
  Uses the bounded per-provider queue and immediate PostHog beacon; normal
  analytics exclusion applies. Version `web-participation-2026-11-11-v7`.
- Since Nov 6 midnight ET through Nov 11 query time: mobile homepage-entry
  visits -> /map = 3/18 (16.67%, ordered same-session funnel, one-day window).
  Earlier ~4% baseline was 1/28 homepage phone visits. All phone visits with
  any map view = 15/49 (30.61%), including 9 direct map-entry visits. These are
  tracked sessions, not confirmed individuals; small samples and untagged
  historical owner testing limit interpretation. No causal rollout claim.
- Read-only typed PostHog queries in project 695338: filterTestAccounts=true,
  production hosts, marked test traffic, QA referrers and detected bots excluded.
  No governed map metric matched. Existing saved watcher 1kdPlWal is a broader
  ordered phone-visit -> map funnel (18.18% for partial week Nov 8), not the
  homepage-entry measure; a single pageview direct map entry can be omitted
  by that two-event definition. Do not compare these denominators directly.
- 64 focused tests, scoped ESLint, TypeScript and diff checks passed. Mocked
  analytics only, no production test events or new browsers/builds. Memory
  pressure remains warning level 2; no further applications closed.
  Committed locally with this entry; no deployment, GitHub push or live
  analytics/dashboard changes. Existing pending releases still await approval.

### 2026-11-11 — Codex (analytics provider-readiness delivery fixed locally)

- Reproduced early map/report/cleanup flow events reaching PostHog but being
  lost to GA when Google's script loads later. Confirmed outcomes had the
  same gap; an unavailable PostHog SDK also blocked otherwise-ready GA flows.
- Added bounded in-memory delivery tracking per provider (150 flow events,
  30 confirmed outcomes). Preserve safe original pages across navigation,
  deduplicate outcomes per provider, and clear pending deliveries on opt-out
  or privacy signals. Shared-report sign-in handoffs stay PostHog-only;
  IDs remain local deduplication keys and are not sent in event payloads.
  Measurement bundle version: `web-participation-2026-11-11-v6`.
- 52 focused analytics tests, scoped ESLint, TypeScript and diff checks pass.
  Regression tests use mocked providers; no production test events. No build,
  new browser, deployment or GitHub push. Local changes are in this commit;
  earlier reviewed local improvements still await owner release approval.
- Memory was normal at start, warning level 2 after checks (43% memory-pressure
  free percentage). Android remains closed; iOS and owner apps left running.
  Continue lightweight work and avoid builds/extra browser sessions.

### 2026-11-11 — Codex (Android emulator closed at owner's request)

- Owner approved closing Android only. Gracefully stopped emulator-5554 via
  adb; verified its process exited and adb lists no devices. iOS Simulator
  and its Litterbugs processes remain running.
- Memory-pressure free percentage is now 45%; VM pressure still reports
  warning level 2. Continue light work; no further apps were closed.

### 2026-11-11 — Codex (continued friction review; memory-limited)

- Read-only PostHog refresh: no new tracked participation failures in the last
  48 hours; a Nov 11 browser sequence reached clean/safety_review then
  claim_confirmed. It is not proven to be an external visitor. Rage-click
  examples remain Nov 4–9, not new regressions. Old rapid auth open/close
  bursts are insufficient evidence to redesign sign-in and may include QA.
- Reused one existing Chrome test tab for Clarity, production-only last three
  days. Nov 10 5:50 PM mobile replay: Continue on the website at 5s -> map,
  Reports at 17s -> report list. No broken handoff observed in that sample.
  Useful next measurement: explicit app-open versus website-continue choices;
  current store-badge events cannot separate these paths or prove installs.
- Owner requested low memory use. 16 GB Mac reported warning-level VM pressure
  (2); swap rose from ~7.4 to ~7.9 GB. Extra profiling server is stopped,
  no builds/headless browsers launched; one replay reviewed and playback ended.
  Android emulator is the largest resident process (~1.2 GB). Asked owner
  which emulators may be closed because closing them interrupts mobile tests;
  no answer/closure yet. Do not assume that approval from elapsed time.
- No product edits, deployment, GitHub push, moderation, payment or analytics
  configuration changes. Prefer releasing reviewed pending local improvements
  after approval and gathering new evidence over inventing additional bugs.

### 2026-11-11 — Codex (SEO progress checked with fresh Google data)

- Fresh URL Inspection: patio report, Cleanup Safety, Help and Photo Review
  now PASS / Submitted and indexed with matching canonicals; crawled Nov 10
  UTC. These four were still pending in the Nov 9 review. No live rendering
  tests, indexing submissions, website changes or deployment.
- Final Search Console web totals Nov 3–9: 26 impressions / 5 clicks vs
  18 / 3 for Oct 27–Nov 2 (GSC Pacific dates). Sparse retained query rows:
  `litterbugs` (3 impressions) and `cleanups in my community` (1, no clicks).
  Query rows omit anonymized terms; use date/property totals for volume.
  Nov 10 fresh/incomplete data excluded. Growth is small and not attributable
  solely to recent changes; the ~20 daily visitors are from all sources.
- Winkler cemetery is still indexed but last crawled Nov 6, before cleanup.
  Next: grow useful Boone/cleanup evidence and check search outcomes over
  subsequent weeks. Preserve existing weekly monitoring; no new automation.
  Evidence: `/tmp/litterbugs-seo-progress-2026-11-11.json` and raw GSC JSON.

### 2026-11-11 — Codex (daily website visitor readout)

- PostHog project 695338 daily unique pageview visitors, America/New_York:
  Nov 4–10 = 20, 45, 17, 21, 7, 20, 12; average 20.3/day. Nov 11 partial = 3.
  Production URL filter, internal/test-account filtering, detected bots and
  explicit QA tags excluded. Untagged historical testing can remain.
- One-off query, no governed catalog definition; daily cookieless browser
  estimates are not confirmed individuals or a deduplicated weekly total.
  Oct 28–29 zeroes precede the current setup and were not used in the average.
  Read-only analysis; no app changes or deployment.

### 2026-11-11 — Codex (mobile map startup profiled and improved locally)

- Live phone profiling found Stripe.js loading before any checkout and four
  eagerly loaded photos in the hidden report list. Used Stripe's documented
  `/pure` loader; it now loads only when an intent supplies a publishable key.
  Hidden list thumbnails are lazy, becoming eager/high priority when opened.
- Compared baseline `6aa0f7c` with these two changes in isolated Turbopack
  production builds. Three fresh iPhone-sized Chrome contexts per version,
  1.6 Mbps down/150 ms latency/4x CPU: median map ready 8437 -> 7276 ms,
  pins 6965 -> 6289 ms, final LCP 9452 -> 7872 ms; transfer 1,623,239 ->
  957,619 bytes. These are simulated local-build timings, not visitor averages.
  Google tiles remain the final LCP content. Early invalid test-port runs were
  discarded; verified runs routed the existing authorized localhost:3000
  origin internally to the isolated build, preserving browser throttling.
- Both production builds, 34 focused tests, scoped lint and TypeScript passed.
  Real local phone/desktop checks: zero initial Stripe/report-photo requests;
  opening Reports loads photos and opens a report. Confirmed a phone detail
  photo loads too. No browser errors/overlays or visitor analytics requests.
  No live payment was submitted. Existing payment tests verify deferred Stripe
  still initializes with the payment key after explicit Continue.
- No deploy or GitHub push. Main local server remains on port 3000. Profiling
  artifacts: `/tmp/litterbugs-map-speed-summary.json`, raw verified before/after
  JSON and `/tmp/litterbugs-map-startup-profile.mjs`. Next investigate the
  remaining app-JS/Google Maps startup chain before adding broader changes.

### 2026-11-10 — Codex (map search funnel ready locally)

- Added actual search-start and suggestions-shown stages, plus selected-search
  report outcomes (loaded/empty/failed) and first matching report open. Normal
  map panning/zooming, filters, intermediate fitBounds frames and stale responses
  do not become search outcomes. Homepage-to-map handoff is memory-only and
  expires after 30 seconds; IDs, queries and coordinates are not transmitted.
- Bundle measurement version is now `web-participation-2026-11-10-v5`.
  Search report-open measurement expires after five minutes or another result
  response, navigation/clear or map gesture. No backfill or deployment.
- 105 focused tests, scoped lint and TypeScript passed (final map suite: 50).
  Isolated phone-sized
  Chrome on localhost selected a Google suggestion and rendered the map/pins;
  no page errors, framework overlay or visitor analytics requests.
- Further Clarity review: production-only, last seven days had five recordings
  matching poor LCP (at least 4s), all mobile; three entered on map and two on
  homepage. Latest Nov 10 5:44 PM recording showed typing then selecting a city
  at 7s. This is a small flagged sample, not a site-wide speed or failure rate.
  Next investigate mobile first-render timing before choosing a performance fix.
  Filter: https://clarity.microsoft.com/projects/view/z60itnrbpn/impressions?URL=2%3B0%3Bhttps%3A%2F%2Flitterbugs.app%2F&WebVitalsLCP=poor&date=Last%207%20days

### 2026-11-10 — Codex (public profile analytics and traffic quality)

- Local GA and PostHog public member views now use `/members/profile`,
  without member IDs or profile click autocapture. Tested both payloads and
  navigation between profiles. No deployment or live settings changes.
- Clarity quick-back filter showed 23 recordings in seven days; a visited
  URL prefix of `https://litterbugs.app/` left 22. The excluded Cloudflare
  preview replay is consistent with the bounded Nov 8 analytics QA.
- PostHog recorded 9 empty-map and 153 loaded-map events over seven days
  after excluding marked QA and detected bots. These are map responses,
  not people or deliberate searches. No location-search or closest-report
  stages appeared in this window. Next: track suggestions shown and
  outcomes for deliberate attempts; keep preview QA out of visitor views.

### 2026-11-10 — Codex (PostHog and Clarity friction follow-up)

- Rolling seven-day PostHog production-host review excluded tagged QA and
  detected bots where available. Four rage clicks were on the map, all
  before Nov 10, with no element chain. Nov 10 through the query had five
  recorded pageviews and 32 map events, with no participation stages.
  The shared-report sign-in event had not appeared in the taxonomy.
- Clarity showed 91 recordings, 14 flagged for dead clicks and none for
  rage clicks under its own filters. Five flagged recordings entered and
  exited on Get the app. Two Instagram replays showed App Store badge
  taps. Phone-sized Chrome followed the current badge to the expected
  Apple URL. The external store handoff inside Instagram remains unverified.
- The public member route is outside the GA/PostHog page allowlist.
  Consider an ID-free member route and fixed action labels for map controls.
  Read-only analysis, with no product or analytics configuration changes.

### 2026-11-10 — Codex (public member profile update live)

- Pushed release source `3f3d78d` to `origin/codex/web-profile-rank-release`
  and promoted Vercel deployment `dpl_6xn6UFxSv9YBM1oTZJaBBeTPZdpC`.
  Previous live deployment is `dpl_E5T6XVHDoNi2y49FrbdXxmQJFESr`.
- Released the white public profile, avatar, unboxed rank, eight-rank points
  guide, steadier report tabs and the More actions menu for Report and Block.
- Remote build, 901 web tests and lint passed. Staged HTTP and live Chrome
  checks verified the profile, both report tabs and both safety dialogs.
  Analytics were off in the test browser. The bounded production error
  query returned no entries.

### 2026-11-10 — Codex (public profile safety actions menu)

- Moved Report and Block into a More actions menu beside the member name.
  The existing forms open in a dialog, and the map profile popup retains
  its inline actions. No moderation actions were submitted in testing.
- Verified both dialogs, focus return, and dismissal in local Chrome,
  including a 320px viewport. Five safety tests, lint and typecheck passed.
  Local review pending.

### 2026-11-10 — Codex (public member profile ready locally)

- Matched the public profile to the white account layout, added its saved
  avatar with an initial fallback, and removed the rank card border.
  Removed Browse cleanups in the local review version. Verified browser
  Back from the full profile returns to the originating map report.
- Verified the avatar, eight ranks and layout in Chrome at desktop and
  phone widths. The earlier version with the button was pushed as
  `c1f3575` on `codex/web-profile-rank-release` and staged as
  `dpl_DUaLg2Fe5PmjbdXYmb9Ao9tSQyEU`. Promotion is on hold during review.
  The live deployment remains `dpl_E5T6XVHDoNi2y49FrbdXxmQJFESr`.

### 2026-11-10 — Codex (deduplicated points guide heading)

- Removed the repeated heading inside How points work. Verified the point
  rules and all eight ranks on the local member profile. Local review pending.

### 2026-11-10 — Codex (smooth member report tab switching)

- Kept the previous report list at its existing height while the other
  tab loads. The old rows are dimmed and inactive until the new list
  arrives. The transition respects reduced motion.
- Verified desktop and phone Chrome with delayed responses, rapid
  tab changes, and a failed request followed by retry. Lint and
  typecheck passed. Local review pending.

### 2026-11-10 — Codex (rank guide and member report styling)

- Made the web points guide easier to scan and added all eight rank icons
  and thresholds. The guide is shared by the account and full member profile.
- Updated the public member report tabs and rows to match the account styling.
  Clicking the selected tab now leaves its loaded reports in place.
- Local Chrome verified the full profile at desktop and phone widths,
  both report filters and the account guide. Typecheck, scoped lint and
  32 focused tests passed. Local review pending.

### 2026-11-10 — Codex (web profile and rank update live)

- Pushed release source `37e3954` to `origin/codex/web-profile-rank-release`
  and promoted Vercel deployment `dpl_E5T6XVHDoNi2y49FrbdXxmQJFESr` to
  litterbugs.app. Previous live deployment is `dpl_CzgTAJEwFocsFE2iPioEXmbnknkp`.
- Released the compact map member profile and integrated account profile,
  with the simplified Ladybug and larger cocoon. The release branch is
  scoped to the approved web changes. Mobile app work and local previews
  remain in the shared checkout.
- The remote production build, 901 web tests, lint and typecheck passed.
  Staged HTTP smoke checks and live Chrome verified both profile surfaces,
  the new artwork and account points guide. Analytics were off in the
  test browser. The bounded production error query returned no entries.

### 2026-11-10 — Codex (simpler Ladybug rank artwork)

- Simplified the web rank Ladybug to a two-tone spotted shell and antennae.
  Increased the cocoon progress marker from 28px to 32px.
- Verified the local account in Chrome at desktop and phone widths.
  Local review pending.

### 2026-11-10 — Codex (rank artwork refreshed locally)

- Added a shaded Ladybug SVG for web ranks. Map pins and report status
  artwork still reference the original ladybug. Enlarged the cocoon and
  centered it over the progress bar in the account and member preview.
- Verified the account artwork in Chrome at desktop and phone widths,
  including the cocoon's settled progress position. Scoped lint and 27
  focused tests passed. Local review pending.

### 2026-11-10 — Codex (integrated account profile)

- Removed the separate profile and rank boxes on /account. Both use one
  aligned column and the progress bar uses the cocoon. The next-rank points
  and How points work disclosure are still available.
- Verified the signed-in page in Chrome at desktop and phone widths,
  including opening the explanation and entering and cancelling Edit.
  Scoped lint, typecheck and 27 tests passed with Node experimental
  Web Storage disabled for the test workers. Local review pending.

### 2026-11-10 — Codex (integrated rank in member popup)

- Removed the inner rank card and next-rank points message from the popup.
  Kept the current rank and points, with a cocoon marking the slim progress
  bar. The full profile retains its detailed rank card.
- Verified the popup in local Chrome at 320px and 1220px and followed its
  full profile link. Seven focused tests, scoped lint and typecheck passed.
  Local review pending.

### 2026-11-10 — Codex (compact map member profile ready locally)

- Updated the popup with the account page's spacing and lavender borders,
  a saved avatar with an initial fallback, and an outlined full profile
  link. The [Kinhive profile preview](https://refero.design/pages/e4f5d8fb-2c8a-4765-89e8-6a9013e5ff89)
  informed the avatar and identity layout.
- Removed the report history and points explanation from the popup. The
  full profile still lists the member's reports. Removed legacy styles
  that made the screen reader progress element overflow the dialog.
- Local Chrome verified the avatar, full profile link, and no horizontal
  scrolling at 320px and desktop widths. Typecheck, scoped lint and 53
  focused tests passed. Local review pending.

### 2026-11-09 — Codex (report and map fixes live)

- Pushed `df6a610` to `origin/codex/map-first-navigation` and promoted
  Vercel deployment `dpl_CzgTAJEwFocsFE2iPioEXmbnknkp` to litterbugs.app.
  Previous live deployment for rollback is `dpl_9KAAk5pLnNkMzsDvsVVhKPHVtkGY`.
- Released the report photo viewer, closest report previews with and
  without an open desktop report, location checks at submit, shared report
  sign-in measurement, and the desktop app link fallback. The funding and
  refund routes and their menu link match the prior source.
- Clean Vercel build and typecheck, lint and 901 web tests passed using the
  repository's Node version. Live Chrome exercised both sides of the photo
  viewer, closest report recovery, a simulated location denial, a mocked
  sign-in return, and the download page back to the same report. Browser
  analytics were excluded. No entries in the bounded production error scan.
- Live sign-in event ingestion remains to be observed in visitor traffic.

### 2026-11-09 — Codex (participation friction assessment)

- Reviewed recent PostHog participation stages and prior Clarity evidence.
  One production report location denial and cancellation were recorded; one
  prior phone visitor closed the report sign-in prompt. Neither establishes a
  widespread cause. Payment and cleanup drop-off remain unlocated; unlabelled
  testing and missing outcome coverage limit conclusions. Location-check and
  shared-report sign-in improvements remain local, pending review. No deploy.

### 2026-11-09 — Codex (website visitor behavior)

- PostHog past-seven-day page breakdown: homepage 65 visitors, map 31,
  app download 24, privacy and report details 21 each. Seven store badge
  clicks were recorded. Production participation events excluding labeled
  QA recorded report, clean and fund taps and one report-location failure.
  Counts are small and can include unlabelled testing. Read-only review;
  no application changes or deployment.

### 2026-11-09 — Codex (website sources and growth)

- PostHog showed 20 visitors over 24 hours: 10 direct, 7 Facebook,
  1 Instagram, and 2 attributed to the site itself. The past seven days
  had 146 visitors versus 33 in the preceding seven days; test-account
  filtering enabled. Country data was unavailable. Read-only review;
  no application changes or deployment.

### 2026-11-09 — Codex (24-hour website traffic)

- PostHog rolling 24-hour website overview showed 20 visitors, 21 sessions,
  and 34 pageviews with test-account filtering enabled. Read-only analytics
  review; no application changes or deployment.

### 2026-11-09 — Codex (shared report desktop app fallback ready locally)

- Shared reports now use the site's app link. Desktop visitors reach the
  download page with the report ID, and **Continue on the website** opens
  that same report on the map. Mobile uses the existing app and store handoff.
- Verified the desktop path in local Chrome and passed 38 focused tests.
  The four PostHog rage clicks still have no control labels. One overlapped
  a replay with repeated photo taps, which does not prove the cause.
- Local review pending. The funding and refund pages were outside this fix.

### 2026-11-09 — Codex (next PostHog and Clarity issues reviewed)

- Nov 3–9 production-host PostHog records, excluding labeled QA and detected
  bots, showed 378 autocapture events and four rage-click events with no
  element chain. The four were on the map, three in Mobile Safari. Prefer
  fixed action labels on specific controls over raw element text.
- A Nov 5 1:23 p.m. phone replay went through About, the reward policy, and
  Support before choosing **Fees, rewards & refunds**. Confirmed locally that
  the link opens the top of the general funding page. A section link would
  take visitors straight to the fee and refund information.
- Confirmed locally that **Open in Litterbugs** on a shared report uses the
  app-only scheme on desktop without a fallback. The existing app-link
  component can route desktop visitors to the download page with the report
  intact. No replay established how often this fails.
- PostHog showed 24 `/get-app` pageviews and six store-badge clicks there.
  Clarity showed actual App Store taps from Instagram. Neither establishes
  installs. Consider measuring the app-open and website choices separately.
- Sources: [PostHog project](https://us.posthog.com/project/695338) and
  [Clarity recordings](https://clarity.microsoft.com/projects/view/z60itnrbpn/impressions?date=Last%207%20days).
  Review and local verification only. No application changes or deploy.

### 2026-11-09 — Codex (report location checks moved to submission locally)

- The web report picker has one **Use this location** button. It takes the
  chosen pin into the report form or sign-in without requesting GPS.
  Changing a draft pin also skips GPS. Publish checks and recovery remain.
- Review explains the 50-mile and location-access requirements next to
  **Submit report**. A failed check shows an inline alert and preserves
  the pin and form. Analytics workflow version is
  `web-participation-2026-11-09-v4`.
- Verified no GPS request through review and a visible denial at submit
  in local Chrome at 320px, 390px and desktop widths. Passed 117 focused
  tests, typecheck and scoped lint. Local review pending.

### 2026-11-09 — Codex (stacked report popup and shared-report sign-in measurement ready locally)

- Restored two full-width buttons in a compact 280 × 152 px location
  card. Removed the duplicate X. The map's Cancel button stays available
  during location checks, and the card shifts left on short screens to
  leave the pin clear.
- Added the PostHog event `shared_report_sign_in` for standalone report
  pages, direct map report links, and sign-in links on standalone reports.
  It records prompts, providers, handoff and outcomes with bounded fields.
  Events omit report IDs, credentials and provider messages.
- Verified the card in local Chrome at phone and desktop sizes. A mocked
  Google return retained shared-report context and left homepage sign-in
  untagged. Typecheck, scoped lint, and all 905 web tests passed on rerun
  with a longer test timeout. Local review and live event validation pending.

### 2026-11-09 — Codex (Search Console exclusions audited)

- Checked all 27 entries across the five Page indexing categories. Fresh URL
  Inspection showed 10 reports already indexed. The 13 URLs outside the search
  target set were aliases, an account page, an auth endpoint, malformed URLs,
  a manifest, two image assets and one unavailable report (`c44d0dd4…`, 404
  and absent from the sitemap and sampled public links).
- Confirmed Cleanup Safety, Help, Photo Review, and Basura en el patio all
  return 200, have self-canonicals and crawlable internal links, and are in
  the live sitemap. Google accepted each into the priority crawl queue.
  Actual indexing is pending. Recheck via the existing weekly SEO review.
- No site code or deployment was needed. Treat Google Inspection Tool visits
  around 9:41–9:43 p.m. Eastern as testing if they appear in visitor analytics.

### 2026-11-09 — Codex (compact report location popup ready locally)

- Kept the dragonfly header and moved the draft and location actions into
  one row. Draft uses a pencil icon and bold text. The location button
  shows a checking state during the permission request.
- Verified the row from 320px to desktop in Chrome and confirmed a denied
  location check keeps the pin in place and still lets the user draft.
  All 52 map publication and geolocation tests passed. Local review pending.

### 2026-11-09 — Codex (Search Console canonical alert verified)

- The Nov 9 alert covered one old `/?report=e08939ae…` link, last crawled
  Oct 28. Google chose the homepage as its canonical at that crawl.
  URL Inspection confirmed both the homepage and the standalone Pinnacle
  Storage cleanup report are indexed; Google chose the report URL itself.
- The old link now redirects to `/map?report=e08939ae…` with its ID intact.
  The live sitemap lists the standalone report, which returns 200 and
  declares itself canonical. No fix, validation request or deploy needed.
  Website verification was HTTP only; no visitor analytics were generated.

### 2026-11-09 — Codex (report popup badge removed locally)

- Removed the 50-mile badge at Grant's request. The popup retains the
  full-width draft button and location error message. All 45 map
  publication tests passed. Ready for localhost review.

### 2026-11-09 — Codex (report picker styling ready locally)

- Updated the location popup with the report dragonfly, rounded heading
  and full-width Continue as draft button. The popup shows the existing
  50-mile posting limit in a compact badge. The map pin stays clear.
- Verified the popup and permission-denied flow at 320px and 390px.
  Passed 52 focused tests, typecheck and lint. Ready for localhost review.

### 2026-11-09 — Codex (report location draft option ready locally)

- The signed-in location picker shows Continue as draft upfront and
  explains the proximity check. A failed check leaves the pin in place
  and offers Try again. Drafting uses the selected pin without a location
  request. Publishing still checks the reporter's location.
- Passed 52 focused tests, typecheck and lint. A phone-sized Chrome run
  with simulated sign-in and location denial verified the draft flow and
  pin position. Ready on localhost for Grant's review.

### 2026-11-09 — Codex (participation analytics follow-up)

- Reviewed Oct 27–Nov 9 PostHog website events and five recent Clarity
  timelines. A Nov 9 desktop recording showed a visitor use the report
  location picker and cancel. Its timing matches a location-denied event.
  Make the existing draft option visible before requesting browser location.
- A Nov 9 shared-report phone visit opened general sign-in before the page
  went hidden. The current participation events cover task-specific auth,
  leaving general sign-in and its browser handoff unmeasured. Recommend
  tracking prompt, provider attempt and outcome without personal identifiers.
- Samples were small and may include testing. The newest recording was
  7:53 p.m. ET. Read-only review, with recommendations pending.

### 2026-11-09 — Codex (closest-report action added to the desktop split view)

- The existing empty-map card appears beside an open desktop report when
  the map search finishes with no matches. The closest search skips the
  open report. View on map highlights the new pin and keeps the current
  report open until the visitor chooses the preview.
- Verified the full flow on localhost in desktop Chrome and passed 54
  focused tests, typecheck and lint. Ready for local review.

### 2026-11-09 — Codex (closest-report action with a report open)

- Grant confirmed the local gallery and closest-pin fixes. Desktop Chrome
  confirmed the split map still requests reports after zooming and panning.
  The map hides its empty state while a report is selected.
- Recommended showing Find closest reports only when the visible desktop
  map has no matches, excluding the open report from that lookup. No UI
  changes from this review.

### 2026-11-09 — Codex (report gallery and closest-pin preview ready locally)

- Before and After photos open the same viewer from the report sheet.
  The viewer supports zoom, loading feedback and browser Back and Forward.
- View on map highlights the closest pin and shows its preview, including
  on touchscreens. The distance label refers to the current map area.
- Verified both flows in local Chrome at desktop and phone sizes. All 894
  web tests passed with four workers. The final map checks, typecheck and
  lint passed. Changes are on localhost for Grant's review.

### 2026-11-09 — Codex (empty-map follow-up)

- Grant showed that Find closest reports is already the primary empty-map
  action. Reviewed the existing flow. View on map centers the result without
  selecting it. If the flow needs refinement, highlight the matching pin and
  show its preview, and label distance as measured from the current map area.
  The mobile report gallery remains the higher priority. Advice only.

### 2026-11-09 — Codex (PostHog and Clarity website review)

- Reviewed Nov 3–9 website events and four Clarity recording timelines.
  Clarity showed 101 sessions after bot exclusion, with 14 dead-click and
  25 quick-back flags and zero JavaScript errors. PostHog's four rage-click
  events were all on the map, three on mobile Safari. Some sessions may be QA.
- Prioritize the phone report gallery. The Nov 9 12:28 p.m. replay showed
  repeated photo taps and seven Previous photo taps. The report component
  offers full-screen viewing for Before photos only. Check both sides and
  loading feedback on mobile Safari. Next, make recovery from empty map
  results easier. Nine empty results appeared in PostHog without a captured
  closest-report request, and an afternoon replay showed the empty state.
- PostHog captured one unflagged report-location permission denial and no
  auth submissions in the participation data. The sample is too small to
  diagnose account, funding or cleanup conversion. The newest recording
  predates the evening mobile Map button release.
- Read-only analytics review. Pending work is limited to the proposed
  follow-ups. No app changes or deployment from this review.

### 2026-11-09 — Codex (mobile Map buttons fixed and live)

- The compact 44px Map width leaked into the homepage drawer. Scoped it
  to the header and restored the full-width Open map row. The header now
  shows Map beside the icon at 390–480px and below it at narrower widths.
  Browser geometry confirmed that the menu, logo, search and account
  stayed in place.
- Pushed `9c5ffd8` to `origin/codex/map-first-navigation` and promoted
  Vercel deployment `dpl_9KAAk5pLnNkMzsDvsVVhKPHVtkGY`. Previous live
  deployment for rollback is `dpl_3UD2uB3aDMCh6MVuKiMUQ4yVXCeg`.
- Clean lint, Vercel build and 892 web tests passed. Live emulated-phone
  checks covered 320–480px and opening the map from the header, drawer,
  homepage preview and a preview pin. Test browsers were excluded from
  analytics. Production error-log query returned no entries.

### 2026-11-09 — Codex (local public-site styling and search live)

- The previous animation release omitted four existing local styling edits.
  Included the left menu and compact header, the narrow hero card position,
  the Reports grid icon, and scrollable report tabs. Compared local and live
  at the widths from Grant's screenshots. Development previews remain local.
- Fixed header search before promotion. One magnifier opens a wide field
  below the compact header, including at 320px. The smallest signed-in
  headers keep Map in the drawer to fit search, notifications and profile.
- Pushed `24b78d5` to `origin/codex/map-first-navigation` and promoted
  `dpl_3UD2uB3aDMCh6MVuKiMUQ4yVXCeg`. Previous live deployment for rollback
  is `dpl_FAjtmdGvh2ZaXjpcXabBoCHFRiA1`.
- Clean build, lint, and all 892 tests passed. Live Chrome verified the
  header, hero, drawer, search selection to map, report tabs, pin landings,
  compact report sheet and both animation exclusions (#13 and #16).
  Analytics were excluded during checks. No database, Stripe or app changes.

### 2026-11-09 — Codex (bug animations and compact report sheet live)

- Grant approved production release. Pushed exact source `8443ba9` to
  `origin/codex/map-first-navigation` and promoted the clean Vercel build
  `dpl_FAjtmdGvh2ZaXjpcXabBoCHFRiA1` to litterbugs.app. Previous live
  deployment for rollback is `dpl_FAtoZbQdXoyv2Ter3HAoWtQ2f8fp`.
- Includes pin landings after pan, zoom, grouping and filter changes and the
  72px mobile sheet header. Excluded #13 hero photo hover and #16 automatic
  photo switching. Unrelated local edits and previews stayed out of release.
- Clean source lint, 892 tests, and Vercel build/typecheck passed. Staged and
  live home, map report, cleanups and after photo returned 200. Animation
  gallery returns 404 in production. Live Chrome verified map filter landings,
  both exclusions, manual photo controls, and 44px controls in the 320px sheet.
  Browser analytics were excluded. Bounded production error-log query was empty.
- No database, Stripe, or mobile app changes.

### 2026-11-09 — Codex (compact mobile report sheet)

- Reduced the grab handle and toolbar from 105px to 72px on narrow map
  overlays. Back and report actions retain at least 44px height.
- Verified at 500px and 320px in local Chrome, including Back, swipe
  dismissal, the community return label and Before/After. Desktop
  measurements matched the baseline. All 42 focused tests passed.
- No push or deployment. Await Grant’s review.

### 2026-11-09 — Codex (map pin landings after pan, zoom and filters)

- Replaced the initial-load cutoff with viewport tracking. Newly visible
  individual pins and groups land on pan, zoom, filter changes and cluster
  splits or merges. Pins already in view stay steady.
- Local Chrome verified drag out and back, zoom in and out, Completed and
  All reports filters, and an emulated phone drag. Reduced Motion skipped
  the drop. The demo still lives at `/dev-review-preview/bug-animations`.
- No push or deployment. Await Grant’s review.

### 2026-11-09 — Codex (touch behavior review)

- In Chrome with an emulated touch-only iPhone SE, a homepage pin opened its
  preview panel, the cocoon played on scroll into view, Terms progress
  followed scrolling, and tapping After played the flower bloom.
- The Explore photo stayed static on tap. Chrome synthesized hover for
  individual bug icons, so those movements can appear on taps but lack a
  dedicated touch trigger. The map-key effect and logo loop require hover.
- No application changes or deployment.

### 2026-11-09 — Codex (bug animations ready for local review)

- Claude had wired up most animations. Finished the account status bloom,
  report-list empty state, reading-page coverage, and cocoon entrance.
  Kept new-report pins visible during their animation even in clustered areas.
  Fixed funding animation cleanup and keyboard focus on the manual After switch.
- Removed #13 hero hover and #16 automatic photo switching from the site and
  gallery. The development-only gallery shows 18 demos at
  `http://localhost:3000/dev-review-preview/bug-animations`.
- Local Chrome checks covered desktop, 320px mobile, reduced motion, map,
  report photos, and a simulated checkout return. 890 web tests, typecheck
  and lint of the changed files passed. Workspace lint still reports errors
  in unrelated, pre-existing preview routes.
- Signed-in rank, publication and cleanup approval were not exercised end to
  end. Committed the animation work locally. No push or deployment. Wait for
  Grant’s approval before deploying.

### 2026-11-09 — Codex (weekly SEO check)

- Google URL Inspection confirmed 11 of the 12 previously unindexed reports now
  indexed, including Sand trash. Basura en el patio remains discovered and
  unindexed. Its repaired report history is still live and its November 8 live
  test passed. No fresh live test or indexing request was made this week.
- The new Roby Greene Road report is indexed and its photo loads. The sitemap
  lists 30 report pages, including 11 completed cleanups, across 48 total URLs.
  All 30 report pages returned 200, had self-canonicals, allowed crawling and
  indexing, and had directory links. Winkler cemetery remains indexed with a
  last Google crawl before the November 8 cleanup. Its live before/after photos
  and result details are available.
- Finalized Search Console through November 7: 25 impressions and 2 clicks
  for seven days vs 11 impressions and 4 clicks the previous week. The 28-day
  totals were 57 and 8 vs 9 and 1. Visible search terms were brand variants.
  Saved the bounded inspection and traffic baseline in
  `docs/reviews/2026-11-09-seo-weekly-baseline.json`.
- Next check: patio indexing and Google's crawl date for Winkler cemetery.
  HTTP-only website checks. No code edits, deployment, or analytics changes.

### 2026-11-08 — Claude (website redesign groups 1–5 + Codex payout fixes released LIVE)

- **Live:** commit `55b6fa5` is deployment `dpl_FAtoZbQdXoyv2Ter3HAoWtQ2f8fp`
  (litterbugs-rbmwo1siv). To roll back, use `dpl_7kN4zDvVnschF7F5EyqRgq19WFkB`.
  - Includes every Codex commit up to `d496290`, among them the payout fixes
    `66fbaa0` and `5ad4e6e`. Grant chose to include them in this release.
  - No edge function, database or Stripe changes.
- **What changed (website only):**
  - **Report lists:** /reports, /cleanups and /reports/history share
    bug-labelled tabs. "Past reports" is now "Expired reports" in the visible
    text; the /reports/history URL and its Google title are unchanged.
  - **Report cards (lists, map list, homepage):** white status tags, and
    money as coloured text (🐝 for funded) instead of tinted chips.
  - **Public report page:** status bug, one meta line, no repeated dates.
    Codex's expired-report SEO sentences are unchanged, and checked live.
  - **Reading pages:** About, Help, Get the app, Fund, Cleaner, Report
    litter, photo review and cleanup safety share one layout
    (`components/public-website/info-pages.module.css`). Loose decorative
    bugs are removed site-wide.
  - **Community pages:** moved from the blue/coral theme to the site purple.
  - **Organization pages:** removed. /organizations/* redirects (308) to
    Boone's #groups section, and group buttons link straight to the official
    sites. The organization records stay in `lib/community-resources.ts` so
    Grant can bring the pages back later.
  - **Homepage:** heading bugs (lightning bug, new `public/brand/bugs/ant.svg`,
    cocoon, flower). The cleanup example keeps its mint glow and mint button.
  - **Account:** Edit profile is a titled card, and the rank card is simpler
    (no change in height while loading).
  - **Admin inbox:** an in-page confirm replaces `window.confirm`.
    "Close report and refund" is hidden when the report's cleanup is
    complete; the database constraint `reports_lifecycle_terminal_check`
    rejected it on the sample "Test" report f2717d9a. The inbox now shows the
    server's error text.
- **Checks:**
  - Before release: 886 tests, typecheck and lint passed in a clean copy.
  - Live: 16 pages returned 200, the organization redirect works, and the
    map loaded with the new cards. Tested with analytics declined.
- **Pending:**
  - The restyled admin inbox has not been checked on screen; it needs Grant's
    admin sign-in.
  - Grant should block funding on the sample "Test" safety case.
  - Not done: Stripe notification banner, clearer transfer descriptions,
    homepage title wording, and a specific server message for the
    close-and-refund case. That last one needs an admin-cleanup-case deploy.
  - Grant: set the LITTERBUGS payout statement descriptor in the Stripe
    Dashboard.

### 2026-11-08 — Codex (live Stripe handoff and local payout regression checks)

- Live Account → Payments → Payout settings reported payouts ready. Manage
  payouts successfully redirected to Stripe Express sign-in. The saved
  purple, lavender and radius were still present in the live branding editor.
  Verifying those colors on the signed-in $0 Express screen still requires
  cleaner Express authentication, separate from platform admin sign-in.
- All 91 focused local tests passed. The browser walkthrough exercised
  eligibility, phone example, bank menu, review editing, Manage payouts
  and Express Settings without relevant console errors. No banking details,
  payout, account or deployment changes.

### 2026-11-08 — Codex (Litterbugs Express theme saved)

- Saved and reopened the live Express branding editor. It persisted
  `#5146ED` for primary and primary-button background, `#EEECFF` for
  secondary-button background, and 14 px radius. Stripe's preview shows the
  theme and transparent wordmark. The wordmark already fills the width of
  Stripe's fixed 32 px Express sidebar slot. No icon replacement in this pass.
- Reloading the cleaner's $0 Express Home requested separate Express sign-in.
  Stripe's admin “View Dashboard as” opens a different dashboard, so the
  post-save $0 Express verification awaits the cleaner sign-in. Saved-preview
  evidence is in `/tmp/litterbugs-express-theme-saved.jpg`. No website
  changes or deployment.

### 2026-11-08 — Codex (overlapping free-tier scans passed on Cloudflare)

- Tested production candidate `a67a844`, Worker
  `15e7d2f2-e608-4afe-87d6-7d7a86c07b8a`, with the existing free scanner key.
  Three batches covered one report with two simultaneous uploads and two
  reports with four overlapping uploads, both simultaneous and staggered.
  All 10 returned 200 with clean audits and sanitized JPEGs. Scanner tail
  recorded zero warnings. This tests upload overlap rather than timing
  inside Cloudmersive. No pacing or application change.
- Removed both synthetic accounts, unpublished reports, audit rows and
  photos. Evidence in `/tmp/litterbugs-cloudflare-overlap-evidence.json`.
  Candidate is ready for the owner-authorized cutover with the tested free
  key. Apex still returns 200 on Vercel and www still redirects to the apex.
  Preserve that redirect and keep Vercel available for the live smoke check
  and rollback. No deployment, DNS or billing change.

### 2026-11-08 — Codex (zero-balance Express branding reviewed)

- Confirmed the saved transparent wordmark on the live $0 Express Home.
  Stripe renders the sidebar icon at 32 × 32 px and the artwork already uses
  31.8 px of its width. The Express editor has no logo size control.
- Pending Stripe admin sign-in to apply the Express-only theme. Use Litterbugs
  purple `#5146ED` for primary and primary buttons, lavender `#EEECFF` for
  secondary buttons and 14 px corner radius. Check Home navigation and
  controls after saving. No Stripe or website changes in this pass.

### 2026-11-08 — Codex (Cloudflare production candidate staged)

- Isolated source `a67a844` includes committed website through `91e8223`,
  including the latest committed payout flow. Separate production-mode
  Worker `litterbugs-web-production`, version
  `15e7d2f2-e608-4afe-87d6-7d7a86c07b8a`, has the canonical URL, production
  Maps build values, and production analytics configuration. Its temporary
  Worker hostname is noindex and outside the analytics allowlist.
- Hosted home, map and report returned 200. Report canonical points to
  litterbugs.app. Build and 132 focused tests passed. Private JPEG passed
  scanning, sanitization, authorization and fixture cleanup with the existing
  free scanner key. Evidence in
  `/tmp/litterbugs-cloudflare-production-candidate-upload.json`.
- Vercel export withholds the existing production scanner key. The original
  Cloudmersive account recovery ticket has only acknowledgments. The free
  portal shows 800 calls/month and one call/second for this key. Awaiting
  owner's production credential choice and an upload check with that choice.
  Neither the production hostname nor DNS was changed. Live still returns
  HTTP 200 from Vercel.

### 2026-11-08 — Codex (transparent Stripe Express logo saved)

- Grant approved the shared Stripe icon after the editor disclosed that it
  applies to Stripe dashboards and hosted onboarding. Replaced the ladybug
  with the website wordmark on a 636 × 636 transparent canvas. Verified the
  wordmark pixels match the source, then reloaded the saved Express settings
  and confirmed the stored PNG and white-sidebar preview.
- The Express colors were left as configured. No website code or deployment
  changes. Local payout fixes remain local. Evidence is in
  `/tmp/litterbugs-stripe-express-logo-saved.jpg`.

### 2026-11-08 — Codex (Cloudflare readiness and current speed comparison)

- Confirmed preview Worker `5dfda076-a16e-4202-bed3-4292d47952bd` and live
  Vercel release `dpl_7kN4zDvVnschF7F5EyqRgq19WFkB` still serve HTTP 200.
  Production scanner credential and live-domain configuration remain open.
  Newer local payout fixes are outside the tested release.
- Compared 10 warm, interleaved HTTP body downloads per host and route from
  one computer. Cloudflare/Vercel medians in ms: home 459/491, Boone map
  151/228, report detail 190/291, one report image 137/325. That image's
  first sample was 1352/1103. Zero HTTP failures. This does not measure
  rendering, Maps readiness or phone networks. Analytics scripts did not run.
  Raw results: `/tmp/litterbugs-cloudflare-vercel-release-timings.json`.
  No application, configuration or deployment changes.

### 2026-11-08 — Codex (Express logo background verified)

- Verified the website wordmark is a transparent PNG and the local Express
  Home and Settings captures use white sidebars. The existing preview
  already uses that wordmark over white. Use the transparent asset for the
  live Express icon. Dashboard sign-in remains pending. No application or
  Stripe setting changes.

### 2026-11-08 — Codex (Cloudflare preview checked in iPhone Simulator)

- Ran iOS 26.5 Safari on the small iPhone QA simulator against source
  `35a7fce`, Worker `5dfda076-a16e-4202-bed3-4292d47952bd`. Boone map
  tiles and markers loaded. Guest chose a location before sign-in, and email
  sign-in returned to the report's photo step.
- Selected a HEIC sample through the iOS Photos picker. The report advanced,
  saved as a private draft and resumed on step two with the photo intact.
  Verified the cloud draft stored one JPEG. The report photo carousel worked,
  the $5 funding quote showed $6 total, and first-time cleanup showed the
  safety agreement with the claim button disabled before acknowledgment.
- Removed the disposable account, cloud draft and photo. No report published,
  payment started, agreement accepted or cleanup claimed. No deployment.
  Simulator evidence: `/tmp/litterbugs-cloudflare-simulator-photo.jpg`.
  This pass did not exercise a physical camera or cellular connection.

### 2026-11-08 — Codex (stable Manage payouts handoff and Express preview)

- The Manage payouts request used the onboarding loader, which unmounted the
  ready panel and replayed its animation when the request cleared before
  navigation. The local fix keeps the ready panel mounted, locks the action
  through navigation, restores it on browser Back, and permits retries after
  a failed link. Celebration requires a newly observed completion. A later
  Stripe-ready refresh can resume an open funded-cleanup flow.
- The local walkthrough now previews Manage payouts, Stripe's sample Express
  dashboard and Settings, with a proposed Litterbugs logo and purple. Browser
  checks and 41 focused tests passed. Demo JPEGs are in the ignored capture
  folder. No website deployment. Live Express icon replacement is pending
  Stripe Dashboard sign-in.

### 2026-11-08 — Codex (interactive payout navigation walkthrough)

- Stripe's embedded Add information button initiates provider authentication.
  The public web SDK exposes no supported way for the Litterbugs eligibility
  button to trigger that action. Kept the live flow and verification intact.
- The local walkthrough now links directly to the bank and test review screens.
  It recreates the verified Payout details dropdown over the live bank capture
  and makes both Edit buttons interactive over the test review capture. The
  start capture also advances to the phone example from Add information.
  Verified the dropdown, both edit paths, and narrow-screen fit in browser.
  No deployment or payout account changes.

### 2026-11-08 — Codex (latest committed website rebuilt and checked on Cloudflare)

- Built the latest committed website snapshot `434d4d1` with the Cloudflare
  fixes in isolated source `35a7fce`. The next local commit `0bbbf95` is
  documentation only. Left ongoing working-tree website changes out of the
  build. Preview Worker `5dfda076-a16e-4202-bed3-4292d47952bd`.
- Production build and 129 focused tests passed. Hosted JPEG, PNG, WebP,
  browser-converted HEIC and two simultaneous photo uploads passed. Confirmed
  scan audit, metadata stripping, authorization and quarantine deletion.
  Existing sign-in worked. Browser checks reached report photos, the $6
  total for a $5 contribution, Stripe payout setup, and volunteer safety.
  Tested reporting and cleanup at 393 px. No phone was attached.
- Analytics source matches the labeled delivery run and current preview
  excludes analytics by default. No public report, charge, or cleanup claim.
  The production Vercel scanner also passed with a disposable unpublished
  fixture. All synthetic users and files were removed. 83 web scans in the
  prior 30 days. Vercel hides its production scanner key from export, so
  Cloudflare still uses the free preview key. A production scanner credential
  and a physical-phone check remain before cutover. Live remains on Vercel.

### 2026-11-08 — Codex (payout entry, resume, and management review)

- Verified that Payments and funded Clean share embedded onboarding. The
  photographed Add information screen is Stripe's entry screen. No supported
  bypass surfaced in the public integration options. Account Activity has a
  Finish setup reminder for started, unfinished accounts. Returning uses the
  same connected account and Stripe's outstanding requirements.
- Confirmed the test final review has separate Edit controls for personal and
  payout details. After activation, Manage payouts opens Stripe Express Account
  settings via an account-specific login link. The focused 39 tests passed.
  No application or deployment changes.

### 2026-11-08 — Codex (independent Cloudflare preview photo processing verified)

- Removed the preview's Vercel media relay. Configured the approved free
  Cloudmersive preview key and existing Supabase service credential as private
  Worker secrets. Workers rejected the scanner's redirect mode before sending
  the request. Switched to manual redirects and reject non-success responses
  without forwarding credentials or images. Added safe failure categories.
- Isolated source `605bb0e`, Worker `1e47548e-25c2-46b4-ab84-9d15878dc069`.
  Hosted JPEG, PNG, WebP, browser-converted HEIC and two simultaneous uploads
  passed. Verified clean audit, metadata stripping, hashes, uncached quarantine
  removal, authentication and ownership. Removed all synthetic fixtures.
  Production build and 116 focused tests passed. Evidence in
  `/tmp/litterbugs-cloudflare-direct-upload-evidence.json` and
  `/tmp/litterbugs-cloudflare-parallel-upload-evidence.json`.
- Preview noindex and analytics off by default confirmed after the deploy.
  Prior labeled analytics delivery and local Workers Stripe checks still apply.
  Live HTTP 200 on Vercel. Claude's work, the mobile app, DNS and billing
  preserved. Before cutover, build the final Claude-approved release, confirm
  production scanner capacity/configuration and smoke-test on a physical phone.

### 2026-11-08 — Codex (live embedded Stripe smoke test and local walkthrough)

- Confirmed Vercel production deployment `dpl_7kN4zDvVnschF7F5EyqRgq19WFkB`
  (source `b0f4398`). With analytics excluded, opened embedded Stripe Connect
  from Payments, reached Stripe verification, and inspected the identity step,
  bank selection and empty Link manual bank form. Live Clean on the available
  $1 Winkler’s Creek report opened payout setup before the safety check.
  Entered no identity or bank data, accepted no live terms and made no claim.
- Updated `/local-payout-preview` on localhost:3000 with the funded cleanup
  handoff, current live bank captures and the real Stripe test final review.
  The name preview uses the earlier blank capture. Phone verification is
  simulated. Capture files are ignored under `apps/web/work/payout-step-previews`.
  Walked through the gallery, verified all six captures serve JPEG, confirmed
  the nonlocal guard, and passed 55 focused tests and scoped ESLint.
- The isolated test run above reached the safety check after reopening Clean.
  Immediate automatic resume after a real Stripe submission is still unverified
  in the browser. The focused cleanup tests cover the server-ready branch.
  No deployment or live configuration change in this pass.

### 2026-11-08 — Codex (funding funnel deduplication verified and deployed to preview)

- Actual Stripe test decline and successful retry from local Workerd fed
  loopback GA/PostHog collectors. Each received one labeled rejection and one
  confirmed outcome. Opt-out stopped delivery, and report/contribution IDs,
  provider secrets, test email, card data and amounts were absent. Receipt
  reopening left outcomes at one but inflated the funnel's confirmed step to
  five. Fixed the latter while retaining late-provider outcome retries.
- Repeated the same receipt loads on the fixed build. Each collector got one
  confirmed step. 35 focused tests, scoped ESLint and production build passed.
  Isolated source `e283527`, Worker `dedf97fb-343c-446d-8b20-50cdfbf4b59f`.
  Verified hosted map HTTP 200, v4 bundle, preview noindex/default analytics off
  and live HTTP 200 on Vercel. No live push, alias, application or DNS change.
- Local services stopped. Evidence in `/tmp/litterbugs-cloudflare-local-
  analytics-outcome-evidence.json` and `/tmp/litterbugs-cloudflare-analytics-
  fix-deployment.json`. Cloudmersive work inbox has support acknowledgements.
  No recovery response or free key approval yet. Independent photo uploads
  remain dependent on scanner access. Do not switch the live site.

### 2026-11-08 — Codex (approved Stripe test setup and funded-cleanup return)

- Submitted the owner-approved Stripe test-only agreement for the synthetic
  cleaner. Stripe reported payouts enabled, active transfer capability and no
  outstanding requirements. The first in-app status read was early and still
  showed "Stripe needs a few more details." Closing and reopening Clean then
  showed the safety step for the same $10 funded report. Local ledger synced
  enabled. Zero claims or transfers. Immediate automatic resume unverified.
- Local services stopped and temporary login/runtime secrets removed. Evidence:
  `/tmp/litterbugs-cloudflare-local-cleanup-after-payout.png`. No hosted or
  production changes. Focus remaining hosting checks on independent photo
  scanning and labeled workflow analytics rather than repeating shared
  Supabase settlement checks. Free scanner credential approval still pending.

### 2026-11-08 — Codex (funded cleanup opened real Stripe test onboarding)

- In the disposable local Supabase backend, a synthetic cleaner starts with
  `not_started`. The actual Edge Function rejects missing age confirmation,
  creates a real Stripe test recipient and session, and reuses the account for
  a new session. A funded claim while pending returns
  `cleaner_payout_onboarding_required` and creates no claim.
- Local Worker `165d89c` opened Stripe onboarding from the funded report's
  Clean action. Verified Stripe's test-only phone/code helpers and simulated
  bank. Paused at the browser's explicit agreement confirmation step. Browser
  handoff and loopback services remain available for that decision. Evidence:
  `/tmp/litterbugs-cloudflare-local-payout-setup-evidence.json` and
  `/tmp/litterbugs-cloudflare-test-stripe-review.png`.
- Routine cleanup approval and recoverable publication SQL passed. Settlement
  SQL originally expected an existing live fixture, so ran the same assertions
  with a synthetic approved cleanup in a rolled-back transaction. Retry, hold,
  duplicate and permission checks passed. Real settlement still pending.
- No production app, database, Stripe configuration or deployment changes.
  Free Cloudmersive key approval remains pending. Preserve the existing hosted
  preview and live Vercel release.

### 2026-11-08 — Codex (browser checkout passed in local Cloudflare runtime)

- Built disposable OpenNext/Workerd source `165d89c` with a scratch-only
  loopback Supabase guard and exact local test configuration. Desktop Chrome
  signed in with the synthetic contributor, rendered a $6 payment return
  receipt, opened Fund from report activity and loaded Stripe Payment Element.
- Entered Stripe's decline test card, saw the inline error, then successfully
  retried with its success test card. Both signed events delivered HTTP 200 to
  the local backend. The $5 principal raised the fixture fund from $5 to $10.
  Both contributions rendered in Payments after completing the synthetic
  profile. Anonymous return preserves report/contribution IDs and strips the
  provider secret. This is local browser/Workers evidence, not hosted checkout.
- Workerd, listener and local Supabase stopped with disposable fixtures saved.
  Removed temporary login/runtime secret copies. No app source, hosted deploy,
  live data or Stripe settings changed. Evidence: `/tmp/litterbugs-cloudflare-
  local-browser-funding-evidence.json`, payment-history screenshot in `/tmp`.
  Pending: independent scanner key, hosted workflow/analytics outcome checks,
  payout/cleanup end to end and physical phones.

### 2026-11-08 — Codex (real Stripe funding verified against disposable local backend)

- Litterbugs' separate Stripe Test mode (live platform ID with `sk_test_` keys)
  differs from the named sandbox. Both Stripe event destination lists in Test
  mode show only Checkout Session events enabled. The funding flow creates
  PaymentIntents. Used an ephemeral Stripe CLI listener forwarding the tested
  PaymentIntent events only to `127.0.0.1:55431`, with no destination edits.
- Fresh local `litterbugs-cf-qa` Supabase from 86 schema files and current Edge
  Functions. Initial migration runner lacked ownership of Storage policies;
  applied the source as the disposable DB owner. Seeded synthetic users and
  a funding-eligible report, set local pricing v2 to match the observed live quote.
  Actual $5 principal / $1 fee quote and same-ID reservation retry passed.
  Stripe test decline and successful retry produced signed local webhook 200s
  and ledger transitions failed/succeeded. Replayed the real test success with
  a local signature: duplicate returned true and principal stayed $5.
- Local services stopped with disposable data retained. Private configuration
  location in `/tmp/litterbugs-cf-local-qa-directory`; evidence in
  `/tmp/litterbugs-cloudflare-local-funding-evidence.json`. No production writes,
  Stripe settings edits, application code or deploy changes. Hosted preview
  payment UI/returns and payout/cleanup remain unverified. Free scanner key
  confirmation is still pending. Do not switch live hosting.

### 2026-11-08 — Codex (scanner support case opened and free account verified)

- Submitted the approved recovery ticket after separately approved human
  verification. Cloudmersive confirmed a case was opened. Original account
  plan and key remain unverified. Prior Fidelity search found no charges over
  18 months and Gmail search found no invoices or receipts.
- Signed into the already registered alternative Cloudmersive account, verified
  its login by email and confirmed Current Plan: Free Tier. Its API key list is
  empty. Free preview key awaits browser-required confirmation. No duplicate
  account, paid plan, new key, application or deployment changes in this pass.
- Cloudflare preview remains `165d89c` / Worker
  `9e338877-e3b9-4740-a73c-cd0754f1dbb6`. Claude's newer live release below
  lifts the payout hold. Confirm the actual deployed behavior before relying on
  it. Stripe test webhook isolation is still required. Support receipt:
  `/tmp/cloudmersive-support-opened.png`.

### 2026-11-08 — Claude (redesign + payouts released LIVE with Codex's work, Grant approved)

- **Live website:** commit `b0f4398` is deployment
  `dpl_7kN4zDvVnschF7F5EyqRgq19WFkB` (litterbugs-r7b94gf35).
  - It contains my redesign commit `39c1895` and every Codex commit up to
    `b0f4398`, including the expired-report history fix `9c52d14`.
  - Grant approved this release: "Yes, release payouts too" and "release all
    of the work that codex has commited". That lifts the earlier payout hold.
  - To roll back, use Codex's `dpl_9ESdGAzEhqQTBG92YFcsSoXyh8sD`.
- **Brief gap:** I first promoted `39c1895` alone as
  `dpl_BodYBH5C3WgGGm1dP5B3p9c6mppg`. That build was made before Codex's
  expired-report release, so the fix was missing from the live site for about
  15 minutes. The combined build replaced it. Both repaired expired pages (Oct 16
  ones) show "A cleanup has not been confirmed" live again.
- **Checks:** 880 web tests passed, along with the typecheck. On litterbugs.app,
  with analytics off, the map pins and the report sheet work and the console
  shows no errors.
- **Edge function:** `create-cleaner-onboarding-link` is now v32 (Codex's
  embedded-payout server code). To roll back, use v31. A request without sign-in
  gets 401, as it should.
- **Design changes:**
  - Share dialog and social card.
  - Hide/report member.
  - Sign in and sign up (the bee is still the show-password button).
  - Monthly support.
  - Account area, with loading placeholders that no longer jump and a fixed
    avatar.
  - Report sheet:
    - one-row icon toolbar
    - After/Before switch in the photo frame
    - after-photos appear all at once
    - "About the cleanup" panel
  - Payout trust: a "Secured by Stripe" line, Back at the top, a pinned
    header, and Stripe appearance settings in `lib/payout-connect.ts`.
- **Stripe:** setting the deposit name to LITTERBUGS on the 8 Express
  accounts was refused ("not authorized to edit this account"). Nothing
  changed.
- **Pending (Grant):**
  - In the Stripe Dashboard → Connect → Payouts, set the platform payout
    statement descriptor to LITTERBUGS.
  - Optionally trim the Express dashboard features and Connect emails.
  - Complete one real payout setup live to confirm the final step.
- **For both agents:** before promoting a build, check the handoff log and
  Vercel for a newer live release. A build made before that release would
  remove it from the live site.
- **Do not undo:** `apps/web/app/dev-review-preview/` is a local-only review
  folder. It is never committed.

### 2026-11-08 — Codex (approved scanner sign-in returned provider error)

- Owner approved the exact Microsoft permission request for Cloudmersive. After
  acceptance, Cloudmersive returned another server error at `/signin-oidc`;
  the official portal still shows its login page. No scanner account session,
  plan verification or key access. The original first-key email has no key.
- Official Cloudmersive support route located. Separate authorization to send
  the recovery ticket is pending; no ticket sent. Do not retry the same failed
  callback or create a duplicate scanner account. Error screenshot kept at
  `/tmp/cloudmersive-approved-sign-in-error.png`.
- No application, payment, database, deployment or DNS changes. Existing
  preview remains `165d89c` / Worker `9e338877-e3b9-4740-a73c-cd0754f1dbb6`;
  live stays on Vercel. Cloudflare test remains blocked.

### 2026-11-08 — Codex (Cloudflare testing blocked on account access/isolation)

- Revalidated Microsoft Cloudmersive consent: still awaits owner confirmation;
  no approval received and no account access granted. This access blocker has
  persisted through three goal turns. Existing request remains pending; do not
  create another scanner account or bypass consent.
- Preview remains source `165d89c` / Worker
  `9e338877-e3b9-4740-a73c-cd0754f1dbb6`. No new app or deployment changes.
  Full independent uploads still require the original scanner key; full Stripe
  tests require an isolated destination because sandbox events currently reach
  production. Existing local fixture/simulated-provider checks do not prove
  those gates. Cloudflare is not ready for a live switch.
- Goal blocked pending account access/test isolation. Leave Vercel/DNS, held
  payout backend, Stripe webhook and Claude's work unchanged. No publication,
  payment, claim, waiver or new provider account created during this pass.

### 2026-11-08 — Codex (preview source synchronized; payment sandbox risk verified)

- Cherry-picked approved main change `9c52d14` into isolated Cloudflare branch as
  `165d89c`; this was the only main app source change absent from the preview.
  23 focused tests and Next/OpenNext build/TypeScript passed. Preview Worker
  `9e338877-e3b9-4740-a73c-cd0754f1dbb6` renders the new factual expired-report
  history. X-Robots-Tag remains noindex/nofollow; labeled preview analytics off.
  Live HEAD 200 / Server Vercel. No push, main source, DNS or production deploy.
- Found existing Litterbugs Stripe sandbox `acct_1U2HaBKUBoEpySr6`; authenticated
  read-only API verification passed. **Its enabled test webhook still targets
  the production Supabase stripe-webhook function.** No test transactions,
  connected accounts, webhook edits or new keys created. Do not exercise real
  Stripe test payments until the destination is independently isolated. Audit:
  `/tmp/litterbugs-cf-sandbox-webhook-audit.json`; temporary key copies removed.
- Inspected existing local launch QA stack; only two newer migrations are absent
  from its copied source. No local/remote schema or fixture mutations. Starting
  existing Colima also resumed old local containers; all resumed containers and
  Colima stopped afterward, retaining their volumes. Original Stripe dashboard
  account restored. Claude's untracked dev-review-preview preserved.
- Still pending: Cloudmersive owner access confirmation/key, independent safe
  scanner, isolated payment webhook/backend, full workflow and physical-phone
  verification. No switch authorized. Updated preview evidence:
  `/tmp/litterbugs-cloudflare-current-source-smoke.json` and
  `/tmp/litterbugs-cloudflare-synced-preview.png`.

### 2026-11-08 — Codex (original photo-scanner sign-in investigation)

- Original Cloudmersive account confirmed from its older first-key email; its
  reset message confirms Google/Microsoft SSO, so no Cloudmersive password reset
  is needed. Do not onboard another account or purchase a replacement plan.
- Microsoft email-code sign-in succeeded, but the first return failed on
  Cloudmersive's `/signin-oidc` callback. A fresh official sign-in then reached
  verified Cloudmersive portal consent for profile/read and continued access;
  awaiting the browser-required owner confirmation before granting it. Google
  work-account sign-in recognizes the account but needs its existing password.
- Original account plan/key still unverified. No account credential, permission,
  billing, app source, deployment, DNS or database changes. No scanner key is
  configured in either checkout's current local web environment files. Preview
  still uses the documented exact-host Vercel upload relay; live remains Vercel.
  Claude's untracked dev-review-preview work preserved.

### 2026-11-08 — Codex (Cloudflare workflow analytics verified; no live switch)

- Isolated preview source `5b2a435`, Worker version
  `751d4b9d-6c0c-4161-8c90-166ae2be4975`. Added explicit exact-preview test-run
  analytics gate and test labels; normal live host/defaults unchanged. Test run
  source `0cd9bc5` / Worker `9c1bea76-e27e-4495-8fd0-0e484b8aaf54`; now off again.
  No merge/push/Vercel/custom-domain change. Claude's main code preserved.
- PostHog project 695338 received actual report location/photo entry, funding
  amount review/cancel, funded payout check/setup/start_failed/close, volunteer
  safety review/cancel, and empty test draft discard. Location freshness failed
  with location_stale; existing draft fallback works. All 18 workflow records
  labeled is_test / cf-20261108-participation-qa. No synthetic success events.
  Network observed PostHog 200, GA and Clarity 204; this is delivery evidence,
  not proof all downstream reports/replay processing completed. Test browser
  exclusion restored; server preview analytics disabled after the bounded run.
- All 63 photos from 26 currently discoverable reports plus completed after
  images passed 74 bounded public API/decoder checks. 32 analytics tests,
  scoped lint, production build/TypeScript passed. Evidence in
  /tmp/litterbugs-cloudflare-{analytics-final-evidence,public-photo-audit}.json.
- Still not migration-ready: independent upload safety key/config unavailable;
  existing exact-preview relay to Vercel remains. Original scanner account
  identified from older receipts; owner sign-in pending. Personal sign-in
  reached an unused separate Free account; do not create replacement keys or
  purchase a plan before checking the original. Held payout backend unchanged;
  full publication/payment/claim/evidence/payout and physical phone tests pending.
  No agreements, payment attempt/charge, real claim, or report publication made.

### 2026-11-08 — Codex (other Vercel projects paused at owner request)

- Paused littlefarmfinder, burrowbase-down and reviewhiker-web-live in
  grant-9890s-projects; their public URLs now return 503 DEPLOYMENT_PAUSED.
  Retirement Lists remains paused. Disabled all six Little Farm Finder legacy
  Cron Jobs, verified disabledAt and UI Disabled; new Schedules shows setup state.
- web and retire-next have no active production deployment (pause API rejects
  that state); disabled automatic production domain assignment on both instead.
  No deletion, new deployment, Git unlink, database or domain ownership change.
- Kept litterbugs-web AND legacy litterbugs unpaused; mobile source uses
  litterbugs.app for photo processing/sharing and auth.litterbugs.app for login.
  Supabase, auth bridge, stores and mobile services untouched. Live homepage 200.
- Pro subscription unchanged; pausing sites does not cancel its base charge.
  Owner's active goal: fully test Cloudflare including analytics, **do not switch**.
  Continuing in the isolated test worktree; production/Claude source preserved.

### 2026-11-08 — Codex (Cloudflare switch and Vercel cancellation readiness, read-only)

- Rechecked grant-9890s-projects: eight projects, Retirement Lists/retirecityfinder
  paused; littlefarmfinder and five legacy projects still unpaused, plus live
  litterbugs-web. Unpaused does not establish current business use. Review/move
  or retire remaining projects before canceling shared Pro; no project changed.
- DNS: litterbugs.app already uses Cloudflare nameservers and Cloudflare mail
  routing; www still targets Vercel. reviewhiker.com and retirecityfinder.com
  use Vercel nameservers; preserve or relocate required DNS/email records before
  account removal. All five listed domains have third-party registrars.
- Remaining migration work: independent upload safety processing, held funded
  payout service validation, full reporting/funding/cleanup tests and physical
  phones, reconcile latest approved Claude source, production configuration and
  deployment workflow, domain switch with rollback/observation. Temporary exact-
  preview upload relay must be removed before switching the live hostname.
- Official Pro downgrade guidance checked; stopping paid plan and deleting the
  account are separate. No app, database, account, DNS, push or deployment change.

### 2026-11-08 — Codex (Cloudflare preview photo repairs; live unchanged)

- Isolated branch `codex/cloudflare-compatibility`, final source `6debd25`, Worker
  version `c75c4687-5b90-4284-8643-de49eb4f7d9d`. Native photo conversion replaced
  by Images binding, internal encoded-photo cache added, share-image assets fixed.
  No merge/push/Vercel/DNS/plan changes; Claude's main app/untracked preview preserved.
- Real JPEG/PNG/WebP and browser-prepared HEIC uploads pass. HEIC decoder pinned
  2.1.0 fixes existing `dispose()` mismatch; consider a separate minimal main
  backport. Raw managed-codec HEIC variant still unsupported; client conversion
  passes. Temporary diagnostics/fixtures/QA secret/private credentials removed;
  sample report, test account, objects and audit fixtures cleaned up. No claims,
  agreements, report publication or money movement. No database migrations.
- Upload safety explicitly relays to the existing Vercel processor, retaining
  its auth/ownership/scan controls; **not an independent replacement for Vercel**.
  Held payout-session backend still unverified/unavailable; do not deploy it as
  a shortcut. Physical phone/file chooser and full transaction tests pending.
- 58 focused tests, scoped lint, build/TypeScript and final API/browser photo
  checks pass, including phone-sized before/after switching. Small warm HTTP
  sample: map CF184/Vercel303 ms; photo CF183/Vercel93 ms. Not phone load times;
  no overall speed winner established. Updated compatibility review with evidence.

### 2026-11-08 — Codex (separate Cloudflare compatibility test; Vercel retained)

- Review: `docs/reviews/2026-11-08-cloudflare-compatibility.md`. Isolated worktree
  `/Users/grantgibson/Desktop/Burrow Base/Litterbugs Cloudflare Test`, branch
  `codex/cloudflare-compatibility`, base `e2da91f`. Test-only commits `018a0ec`,
  `9ea86c9`, `0900e6c`; none merged/pushed. Worker `litterbugs-cloudflare-compat-test`
  at its `gegibson3113.workers.dev` address (see exact URL in review), final version
  `ecb70550-acd0-4dd5-96ed-817bc5b3bc81`, source `0900e6c`. No Vercel/DNS/plan changes;
  final live HEAD remains 200 / Server Vercel. Main app, dev server, untracked
  dev-review-preview and concurrent Claude/SEO changes preserved.
- Next16.3 retained; OpenNext1.19 needs older Edge middleware convention. Eager
  HEIC decoder crashed all pages in Workers; test branch defers decoders. Build
  now works, but fresh public JPEG conversion still fails (sharp-related runtime
  error), before/after photos unavailable, and uploads lack private safety config.
  No safety/auth bypass or production secrets copied. 78 focused tests passed.
- Browser: Google login + refresh persistence pass; real map/guest location entry
  and signed-in phone report photo step work. Location freshness timed out here;
  existing draft fallback works. Real funding quote $5+$1=$6 pass; stopped before
  live payment-intent creation. Volunteer safety renders; no agreement/claim.
  Funded Clean reaches payout setup but held backend session support fails—local
  development bridge is intentionally unavailable in deployments; do not release
  held backend as a shortcut. No report submission, charge, claim or evidence.
- Development Maps key only: added exact preview origin and localhost:8787,
  preserving old referrers/API targets. Owner approved preview auth return:
  appended exact `/auth/callback` and `/auth/callback?next=**` on that worker;
  production Site URL and old redirects untouched. No broad hostname wildcard.
  Preview analytics off/noindex. Two failed pre-query-pattern login returns hit
  live home ~4:48–4:49pm EST; mark as tests if recorded. Browser analytics excluded
  through existing choices afterwards; normal visitor defaults unchanged.
- Not migration-ready. Need compatible secure photo processing/config, held
  payout rollout decision, isolated payment/claim completion tests, and physical
  phone checks. See review for limits, exact preview URL and evidence. No schema
  changes. Keep Cloudflare-only source changes out of the main Vercel branch.


### 2026-11-08 — Codex (expired-report soft 404 repair released)

- Changed expired report pages to factual report history: historical search
  titles, original litter/details/priority, and dated reporting-period history.
  Expiry and unconfirmed cleanup remain explicit; no invented photos, geography,
  reporter details or cleanup results. Both affected records have null stored
  photo_paths, not a broken photo loader. No database edits or migration.
- Shared-checkout source `9c52d14`; isolated release `f3995d7` on
  `codex/expired-report-history-seo`, pushed to origin. Release is based on exact
  live `f08518c` and changes only four report content/page/test files, excluding
  all held payout/share/other local work. Staged and promoted
  `dpl_9ESdGAzEhqQTBG92YFcsSoXyh8sD`; previous live/rollback deployment is
  `dpl_HgNgjXJMLnpf7Ur15xApJegWnbLd`.
- 43 focused tests, scoped lint, production remote build/TypeScript passed.
  Both pages rendered locally without console errors; Find a current cleanup
  navigates to /reports. Six authenticated staged HTTP checks and both live
  target HTTP checks passed; production canonicals match, no noindex. Bounded
  10-minute deployment error-log query returned no entries.
- Google accepted repaired Sand trash into priority crawl queue. Patio request
  hit daily submission quota; separate post-release Google live test reports
  “URL is available to Google” / “Page can be indexed” (Nov 8, 4:51 p.m. EST).
  Both soft-404 eligibility failures cleared; actual indexing remains unconfirmed.
  Patio manual resubmission must wait for quota reset; sitemap already lists it.
  No repeated quota retries or schedule changes. Existing weekly SEO monitoring
  will read this new baseline. Local/staged tests did not execute live visitor
  scripts; Google live tests around 4:50–4:52 p.m. EST are test traffic.
- Evidence: /tmp/litterbugs-expired-{stage,live}-check.json and
  /tmp/litterbugs-history-{sand-accepted,patio-quota}.jpg. Concurrent untracked
  dev-review-preview preserved. Native/store and held backend work untouched.

### 2026-11-08 — Codex (remaining indexing requests and weekly SEO check)

- Submitted manual indexing requests for all nine previously discovered/not
  indexed reports. Google accepted seven into the priority crawl queue; rejected
  expired patio `42dd5736…` and Sand trash `ed1500be…` as soft 404. Both Google
  live tests fetched successfully and allow crawling/indexing. Patio screenshot
  renders the actual report/history; no app error found. Limited content and no
  report photos are review leads, not proven classification causes. Preserve
  honest expiry/history; no filler or content-policy changes made.
- Saved nine exact outcomes, screenshots, and SEO growth plan. Updated earlier
  audit to distinguish HTTP/directive eligibility from live Google acceptance.
  Baseline remains 17 indexed; accepted requests do not establish indexing.
- Owner explicitly approved weekly SEO review. Created and verified ACTIVE
  thread automation `weekly-litterbugs-seo-check`, Mondays 9 a.m. Eastern, reports
  here: indexing, new pages, search traffic, priorities. Monitoring/recommendations
  only; no automatic content edits, deployments or repeated URL submissions.
- No app/database changes, migrations, push or deployment. Browser stayed in
  Search Console; Google live tests may execute analytics—treat Nov 8 roughly
  4:23–4:32 p.m. EST Inspection Tool traffic as testing. Normal visitor analytics
  unchanged. Pending: Google inclusion and content decision for two sparse
  expired pages. Concurrent preview and hosting-cost work preserved.

### 2026-11-08 — Codex (hosting estimates include actual usage and release cadence)

- Saved inspectable assumptions/rates/calculations in
  docs/reviews/2026-11-08-hosting-cost-model.json. Vercel litterbugs-web Usage:
  Oct21–Nov8 ~64.01k requests, rounded 2GB outbound, 6.73GB-h memory, 50.49k
  function calls, 111 image transforms. CLI pagination complete (5 pages): 88
  READY production-target deployments, projected ~142/30 days. These are a
  publishing proxy, not proof each went live on the custom domain.
- Padded 30-day model: 110k requests, 4GB outward, 15GB-h Netlify compute,
  3h Workers CPU; cross-runtime compute not benchmarked. Browser Netlify price
  currently $9 Personal/$20 Pro. At 140 live publishes, ~2,352 credits: Personal
  $24 with packs, Pro $20. At 30 publishes, ~702 credits => Personal $9.
  Earlier Netlify-cheaper recommendation is conditional on reducing publishes.
- Workers model $5, planning $5–7 incl contingency; request/CPU/build/image
  allowances cover modeled usage, conditional on compatible photo processing
  without a separate paid processor. Render $7 instance + $0–6 build/bandwidth
  allowance => $7–13; 512MB must be tested, next 2GB plan starts $25. Vercel $20.
  Existing external services/tax/migration effort excluded; shared Vercel fee
  only goes away after remaining active business projects are addressed.
- GitHub connector confirms jameslukebdev/litterbugs_app is public, so private
  Git contributor restrictions aren't assumed in the Netlify model. No hosting
  changes, account signups, compatibility build, app edit, push or deployment.
  Concurrent work preserved; documentation/model only.

### 2026-11-08 — Codex (two newest Connect attempts traced, read-only)

- Stripe uses UTC. Nov 5 account/link requests actually occurred Nov 4 at
  10:38 p.m. EST; Nov 3 account/link requests occurred Nov 2 at 10:32 p.m. EST.
  Both signed return-state payloads say mobile. No form opened or submitted in
  this investigation; no onboarding URLs/signatures or identity values saved.
- Nov 5: account creation 03:38:49Z HTTP 200; setup link 03:38:54Z HTTP 200,
  request req_v2zOzn8CeCygTyJmE; four successful account reads through 03:39:26Z.
  Nov 3: account creation 03:32:49Z HTTP 200; setup link request 03:32:53Z HTTP
  200, req_v2Oyv9aoIbR0NRJWy; five successful reads through 03:33:09Z.
  One setup-link request per target appeared in Nov 1 onward endpoint-filtered
  results. Link success proves Stripe issued a URL, not mobile browser opening,
  SMS delivery, completion, or absence of a later client-side error.
- Clarity custom Nov 2–5 EST list: 63 recordings, no recording at either exact
  attempt window. PostHog project 695338: no replay in that window; exact
  03:20–03:50Z Nov 3 / 03:25–03:55Z Nov 5 event windows empty. No payout-route,
  participation-step/failure or exception record found across Nov 2–5; missing
  event families are not evidence of error-free visits. Website analytics use
  anonymous/cookieless events; no account-to-visitor identity match established.
- Supabase connector still lacks Litterbugs permission. Signed-in dashboard
  does expose Litterbugs logs, but selecting the Nov 4 evening window opens
  the retention dialog: current Free plan retains logs for 1 day. Historical
  server logs unavailable; do not describe them as checked and error-free.
  Native source has no centralized replay/crash reporting integration found.
- Evidence supports early unfinished mobile onboarding, not a diagnosed SMS,
  browser, rejection, or abandonment cause. Stripe status checks shortly after
  link creation are consistent with app return/resume but do not prove it.
  No source/config changes, sends, account updates, push or deployment. Preserved
  concurrent preview/SEO work; documentation-only investigation commit.

### 2026-11-08 — Codex (cheaper hosting recommendations only)

- Compared current official Netlify, Cloudflare Workers and Render plans with
  app source. Litterbugs is Next 16.3 with Node route handlers, sharp and HEIC
  processing, auth callbacks, and Supabase-hosted workflows. Small traffic does
  not make this a static-site-only migration. No compatibility build attempted.
- Recommend a separate Netlify preview first: supports Next App Router/SSR/route
  handlers, permits commercial Free sites; Free 300 credits, Personal $9/1,000.
  Live production deploys cost 15 credits, sharing quota with traffic/compute;
  Free pauses when exhausted. Do not promise Free fits frequent live releases.
- Workers paid starts $5 plus usage; Free's 10ms CPU/request and current photo
  code require compatibility assessment. Cloudflare's default Next path now
  vinext beta (Nov 5 docs), with OpenNext still documented; no migration chosen.
  Render paid starts $7 for 512MB; assess photo memory. Free sleeps after 15min
  and may take ~1min to wake, unsuitable for this visitor flow.
- Prices are frontend hosting only, not Supabase/Maps/Stripe fees. Replacing
  one project alone does not eliminate shared Vercel Pro if other business sites
  remain. No app/config/account changes, trial signup, push or deployment.
  Sources: Netlify pricing/Next docs, developers.cloudflare.com Workers pricing/
  Next/limits, render.com pricing/free docs. Concurrent preview preserved.

### 2026-11-08 — Codex (Vercel bill audit; Retirement Lists paused by owner request)

- Owner requested bill reduction, then explicitly asked to stop retirementlists.
  Confirmed retirecityfinder project prj_7iGvtvYEB4Q1Ytt1zF8LNepe47xT under
  grant-9890s-projects serves root/www retirementlists and retirecityfinder
  redirects. Paused only that project via official API and disabled all 15
  legacy Cron Jobs in dashboard. Fresh API: paused=true, autoAssignCustomDomains
  false, crons.disabledAt set, definitions retained. No new Schedules configured;
  Git link already null. Public retirementlists returns 503 DEPLOYMENT_PAUSED.
- Preserve code, deployments, data, credentials, DNS and domain ownership.
  Resume Service and re-enable Cron Jobs only on explicit restart request.
  Other providers/domain renewals not cancelled. Both Litterbugs projects remain
  unpaused with auto domain assignment enabled; no app deployment/code changes.
- Shared Pro cycle Oct 21–Nov 21: next invoice $20, one Pro charge, no extra fixed
  seats/add-ons. $9.09 usage entirely offset by credit, overage $0. Retirement
  project consumes $6.716 (~74%), litterbugs-web $2.3586; these are usage credit,
  not separate invoices. Pausing reduces future usage, not the $20 base fee.
  Oct invoice $20; Sep $23.74 ($3.74 overage, later $0.72 refund); Aug $31.63.
  Observability Plus is enabled at usage pricing ($1.09 within credit); paid
  monitoring/plan settings untouched. Hobby is personal/non-commercial only:
  https://vercel.com/docs/limits/fair-use-guidelines . Recommend retaining Pro
  for active business sites. No source push, DB change or Litterbugs test traffic;
  concurrent preview and handoff entries preserved.

### 2026-11-08 — Codex (report and cleanup page indexing verified)

- Audited live sitemap, every one of its 29 report/cleanup pages, all 38 listed
  photos, and all four directory/pagination pages. All accessible; report pages
  allow indexing, have matching canonicals and directory links. Automatic sitemap
  and request-time page creation work; cleanup results update the original URL.
- Google URL Inspection completed all 29 report URLs plus four hubs: reports
  17 indexed (including 7/11 cleanups), 9 discovered/not indexed, 3 unknown in API;
  all four hubs indexed. Sitemap registered, Success, last read Nov 7. Broader
  content crawl capped at 120; this is not a whole-site all-clear.
- Requested indexing for the three API-unknown URLs (library cleanup, New Market,
  Pinnacle Storage follow-up); Google accepted all three into its priority crawl
  queue. Requests are not proof of indexing. Some older discovered pages also
  remain unindexed; do not call all exclusions new-page delays.
- Saved exact evidence and findings in docs/reviews/2026-11-08-report-cleanup-*.
  Documentation only; no app/database changes, migrations, push or deployment.
  HTTP checks did not run visitor analytics; browser use confined to Google.
  Pending: Google crawl/inclusion decisions and later reinspection. No recurring
  automation created. Concurrent untracked dev-review-preview preserved.

### 2026-11-08 — Codex (restricted Connect accounts investigated, read-only)

- Inspected all five restricted recipients in the signed-in Litterbugs Stripe
  Dashboard. Connector remains linked to Review Hiker; do not use it for this
  platform. Newest Nov 5/Nov 3 entries lack external payout accounts, accepted
  terms and submitted representative information (identity task Not Started).
  Google Play reviewer likewise lacks bank/representative/terms completion.
- Joseph's Oct 28 account has accepted terms and active transfers; its sole
  current task is an external payout account. Stripe shows a Nov 5 reminder as
  Opened. Grant's Sep 10 account currently lacks bank and terms; DOB/SSN last
  four are future $3,000-volume tasks, not current blockers. It is separate
  from Grant's enabled Aug 29 entry. No identity values copied or submitted.
- Source creates the Stripe account before issuing onboarding, so list entries
  establish creation, not successful form opening or completion. Missing fields
  do not establish abandonment versus SMS/browser/technical failure; historical
  attempt logs/replays were not correlated. No rejection/review shown in list.
- No account changes, reminder sends, banking/terms actions, app source changes,
  production-site test traffic, push or deployment. Documentation-only commit;
  concurrent untracked dev-review-preview preserved.

### 2026-11-08 — Codex (Resend Forge enabled for both Litterbugs domains)

- Owner authorized Forge activation for root/auth only. Added DNS-only, Auto TTL
  CNAMEs mail.litterbugs.app and mail.auth.litterbugs.app to send.forge.rmta.net
  in Cloudflare; no conflicting hostnames. Both resolve publicly. Resend Domains
  confirms both Verified / Forge Enabled. Existing website, auth bridge, inbox,
  DKIM, legacy MX/SPF and credential configuration preserved. No app deployment.
- Fresh owner recovery email through localhost account Settings after root
  activation is delivered in Resend. No password changed, reset link opened,
  visitor email or auth-subdomain test send. Delivery engine not inferred.
- Final Resend list now has root/auth/failed retirementlists only (3 domains,
  within published Free limit). The assistant did not remove divinedms or
  retirecityfinder; they disappeared during concurrent owner dashboard use.
  Pro cancellation remains scheduled Dec 8 from the prior billing task.
  Updated auth baseline with exact DNS records; concurrent preview work intact.

### 2026-11-08 — Codex (Resend downgrade scheduled without domain removal)

- Resend accepted Downgrade to Free without deleting domains. Completed the
  cancellation flow; reloaded Billing confirms Transactional "Cancels on Dec 8"
  and success notice says no renewal after current cycle. Current paid quota
  remains 50,000 until then. All five domain registrations remain; no keys,
  hosting, DNS or website code changed in this billing task.
- Fresh owner password-reset email requested through localhost Settings using
  the existing Supabase SMTP connection. UI confirmed sent; Resend shows the new
  message delivered "just now" beside the older recovery email. No password
  changed or recovery link opened. This verifies current delivery, not the
  future Free-plan handling of five existing domains (published limit is three).
- Earlier assumption that domain removal was prerequisite to scheduling was
  incorrect. Owner now requests Forge for root/auth domains as a separate task;
  do not delete either. No application push or deployment.

### 2026-11-08 — Codex (auth subdomain clarification; removal cancelled)

- Owner questioned whether auth.litterbugs.app is needed rather than confirming
  deletion. Cancelled the bulk deletion dialog and cleared all selections;
  all five Resend registrations and Pro plan remain unchanged.
- Rechecked mobile auth.js and auth-provider-setup.md: auth.litterbugs.app/start
  is the Facebook sign-in bridge, and public request/privacy pages also live
  there. Active email uses support@litterbugs.app through root-domain Resend
  SMTP. Hosting and email sending registration are separate dependencies.
- Recommend keeping auth.litterbugs.app in Resend as well: Free allows three
  domains, so removing only the other three would leave two. No reason to remove
  the auth registration merely to fit Free. Any irreversible domain removal
  still requires concrete final confirmation. No app changes, push or deploy.

### 2026-11-08 — Codex (Resend cleanup prepared; final deletion confirmation pending)

- Owner authorized removing unused Resend registrations and switching to Free.
  Active Partner Supabase Auth key is Sending access restricted to litterbugs.app;
  used about two hours ago. All five emails in the last 30 days used that root
  domain and delivered. Legacy Litterbugs/Retirement Lists keys last used about
  three months ago; no secrets inspected or keys changed.
- auth.litterbugs.app remains a Facebook OAuth bridge host. Preserve its hosting,
  DNS and application URLs: only its unused Resend sending registration is in
  scope. retirementlists.com is failed and has no observed 30-day sends. Owner
  explicitly confirmed divinedms.com and retirecityfinder.com are unneeded.
- Four non-root registrations selected in Resend's bulk deletion dialog; root
  litterbugs.app excluded. Dialog says deletion cannot be undone, so requested
  the required final confirmation. No domains deleted or plan changed yet.
  Pending: confirmation, remove four, downgrade, verify fresh owner recovery email
  delivery through existing Supabase SMTP. No app changes, push or deployment;
  preserve concurrent dev-review-preview work.

### 2026-11-08 — Codex (signed-in Resend plan review, read-only)

- Owner signed into the `burrowbase` Pro team. Live Metrics, all domains,
  Oct 10–Nov 8 (Last 30 days): 5 emails, all litterbugs.app, 100% delivered.
  Email list confirms recent signup verification and password recovery delivery.
  Current billing cycle: 1/50,000, renews Dec 8. No sender credentials accessed.
- Free is sufficient for observed volume (3,000/month, 100/day), but team has
  five registrations: litterbugs.app, auth.litterbugs.app, retirementlists.com
  (failed), divinedms.com, retirecityfinder.com. Free allows three domains.
  Auth subdomain and failed retirementlists registration are review candidates;
  no sending from either appears in the 30-day metrics. Do not delete domains or
  change other sites' email configuration without the owner's explicit choice.
- Usage shows 0 marketing contacts, 0 automation runs, 0 AI credits, 0 inboxes;
  Webhooks says none configured. No other paid dependency established. Reviewed
  plan selector only: no downgrade, domain removal, settings/key changes or test
  email. Recommend Free after deciding which three sending domains to retain.
  Sources: signed-in /metrics, /domains, /settings, /webhooks; current pricing
  https://resend.com/pricing?product=transactional . Local app work preserved.

### 2026-11-08 — Codex (Resend use confirmed in setup records; usage pending)

- Auth baseline/checklist/cutover evidence confirms dedicated Resend SMTP for
  Litterbugs signup verification/resends and password recovery. Credentials live
  only in Supabase; none read. No custom cleanup/reminder email sender found;
  Stripe receipts and native push are separate. Earlier inventory did not name
  the SMTP provider; do not infer Resend is unused from missing SDK imports.
- Resend browser is signed out. Opened normal Google login, which offers three
  existing accounts; asked owner which owns the paid subscription before choosing
  and risking a separate account. No account selected, email sent, key accessed,
  setting/plan changed or current sending volume verified. Sign-in tab retained.
- Current public transactional pricing: Free 3,000/month, 100/day, 3 domains;
  Pro $20/month, 50,000/month, no daily cap. Check aggregate account volume/peak
  daily usage and other sites before recommending a downgrade. Source:
  https://resend.com/pricing?product=transactional . Local work preserved.

### 2026-11-08 — Codex (complete notification inventory, read-only)

- Audited notification catalog, latest SQL producers/timers, native sender and
  foreground/rank prompts, website account reminders, auth and payment email
  wiring. Found 21 user workflow events plus 2 admin events; website/native/push
  type sets match and equal the last recorded web release `f08518c`.
- Website delivery is account inbox/bell; native apps additionally support
  registered-device pushes and grouped foreground unread prompts. No web push
  implementation found. Claim reminder is 2 hours before the 24-hour deadline;
  correction window 24 hours, review window 48 hours, renewal choice 7 days.
- Account-only draft/cleanup/review/renewal/payout/sync reminders are separate.
  Auth wires signup verification/resend and password reset; contributions supply
  Stripe receipt_email. Stripe docs confirm live successful-payment receipts
  from that parameter. Stripe subscription/refund/security email settings were
  not audited; do not present dashboard-dependent emails as confirmed enabled.
- No new user delivery test, source change, push or deployment. Native rank-up
  celebrations are on-screen, not separate push events. No dedicated reporter
  reward inbox event or off-site abandoned-report/funding/payout reminders found.
  Concurrent local changes preserved.

### 2026-11-08 — Codex (funded Clean checks payouts before safety, LOCAL)

- Source `8dfbb71`, not pushed/deployed. Funded Clean now checks payout status
  before safety: unfinished accounts open the existing embedded payout setup;
  ready accounts go to safety. Server-confirmed readiness returns to the same
  report's safety check without accepting or claiming. Volunteer entry, server
  claim rules and Stripe collection/terms unchanged. Hosted fallback keeps its
  existing account-page return; automatic continuation covers embedded setup.
- Close returns to the report. Session invalidation differs from explicit cancel;
  stale checks cannot open a different report/member's flow. Clean payout check/
  setup/ready and check failures tracked; workflow tag is now
  `web-participation-2026-11-08-v3` (supersedes held v2 batch).
- 107 tests / 7 focused files, TypeScript, scoped lint and whitespace checks pass;
  one worker/capped heap. Actual localhost $1 Winkler's Creek Clean opened the
  blank Stripe name form on desktop and 393x851; close/reopen worked. Fresh reload
  had no overlay or warning/error logs. Viewport restored. Evidence:
  `/tmp/litterbugs-funded-cleanup-payout-first{,-phone}.png`.
- No identity/bank entry, terms acceptance, claim, submission, payout, migration,
  server restart or production test. Readiness-to-safety uses test fixtures;
  no real account completion. Only our five source/test files committed; all
  concurrent account/style/preview/Claude changes preserved.

### 2026-11-08 — Codex (corrected phone verification illustration, LOCAL)

- The owner spotted that the preview showed code entry without first collecting
  a phone number. Added explicit “1. Enter phone number” and “2. Enter code”
  examples, with phone entry first. The number field/Send code/Verify are disabled;
  both views say no SMS is sent. This corrects the illustration, not Stripe auth.
- The actual onboarding account creation prefills contact_email, not a phone
  number. Stripe handles its own sign-in/phone verification. No provider settings,
  required fields, account data, credentials, mobile app or real SMS changed.
- Browser checked both views and disabled actions; scoped lint/diff checks pass.
  Local preview only, no push/deploy. Preserved other agents' working changes.

### 2026-11-08 — Codex (read-only payout step preview, LOCAL)

- Added `/local-payout-preview` in source `33f05b5`, with eligibility, optional
  phone check, legal name, bank choice, alternative manual entry, illustrative
  final review, and success. Real current blank Stripe captures are used for
  name/bank/manual entry; phone/review/success are clearly labelled examples.
  No Stripe session, auth, bank-saving or agreement action is wired to the gallery.
- Page and allowlisted image route return 404 outside local development/loopback
  hosts; noindex. Captures live in ignored `apps/web/work/payout-step-previews/`;
  do not put key screenshots, emails or filled identity/bank data there. No
  screenshot bytes or credentials committed. Real setup remains separate.
- All seven view selectors and disabled final confirmation checked in browser;
  desktop and narrow layout checked, image space reserved to avoid jumps.
  TypeScript/scoped lint/diff checks passed; no full build or deployment.
  Small follow-up includes image dimensions, top reset between views and a
  horizontal step picker on phones. Existing shared edits preserved.

### 2026-11-08 — Codex (funded cleanup before Stripe setup, read-only)

- Checked current claim SQL and website flow: funded claims require enabled US
  payout onboarding and the age confirmation; missing setup rejects the claim.
  Website then says to finish payout setup. Volunteer claims do not require
  Stripe. There is no current earn-first/connect-later funded claim path.
- No application changes, tests, push, deployment or financial actions. This is
  source inspection, not a fresh production database verification: the connected
  Supabase project list exposed only the unrelated Retire City Finder project.
  Preserved all concurrent local work.

### 2026-11-08 — Codex (banking/review audit and smoother loading, LOCAL ONLY)

- Source `be4ff02`, not pushed/deployed. Kept the existing Litterbugs white page,
  caterpillar/Nunito heading, purple actions and rounded controls. Shared header
  explains manual bank entry and Stripe's Link window. Selection and manual-bank
  screens reviewed without entered/saved bank data; Link's own logo, controls and
  bank-debit authorization remain intact. No live Dashboard branding change.
- Owner explicitly chose review WITHOUT saving banking details. Inspected Stripe's
  official test-data “Review and confirm” demo, its edit/confirmation controls and
  onboarding docs. This is a generic COMPANY demo, not proof of cleaner requirements;
  do not apply its address/EIN/ownership questions to our US transfers-only setup.
  The exact live-account final screen remains unexercised until the owner supplies
  required details. Current-only collection/exclusions and terms remain unchanged.
- Fixed loading reflow: preparation overlays a reserved 520px form stage instead
  of inserting/removing an extra grid row; shared header/copy and stable scrollbar
  space keep geometry constant; heading stays visible when scrolling. Browser
  measurements matched x/y/width/height exactly before/after the initial form.
- Reuse one authenticated member's Connect instance across openings, update its
  invalidation callback, retain expiry refresh, and invalidate on sign-out/account
  switch (including pending startup). Expired unused initial secrets refresh.
  Warm the SDK/React code on intent and during idle on /account/payments only;
  no account/session created by prewarming. Local server overlaps flag/account
  reads after authentication; feature/eligibility/platform/RLS checks preserved.
- Actual reopen loaded the legal-name form with ZERO new local AccountSession
  requests. Desktop and 393x851 banking checked; mobile width/content both 393.
  Screenshots `/tmp/litterbugs-payout-banking-{desktop,phone}-after.png`; empty
  manual form `/tmp/litterbugs-payout-manual-bank-before.png`; generic demo
  `/tmp/litterbugs-stripe-official-review-reference.png`. Concurrent local saves
  caused occasional dev reloads closing the modal; no release-performance claim.
- 34 focused cases passed across final scoped runs, TypeScript/scoped lint/diff
  checks passed. One worker/capped Node heaps, no full build or server restart.
  No native-app change, backend deploy, migration, real bank/identity submission,
  agreement acceptance, payment or payout. Other agents' local edits preserved.
- Sources: https://docs.stripe.com/connect/get-started-connect-embedded-components
  (performance: one instance, early script loading, avoid unnecessary remounts)
  and https://docs.stripe.com/connect/supported-embedded-components/account-onboarding
  (exclude vs only, standard summary; StepChange is analytics-only). Refero's
  Vivid and Open Collective informed CTA restraint/contained layout; the existing
  Litterbugs style remains the primary reference and all token roles are preserved.

### 2026-11-08 — Codex (new phone clips reviewed; five tracking additions LOCAL)

- Source/review commit `d38bd79`, not pushed/deployed. Added map search/results/
  closest recovery, payout stages and server-confirmed readiness, fixed workflow
  version, coarse entry sources, and explicit cancel/save/resume/discard/new
  decisions. No raw search, location, draft, identity or payment data added.
  Existing analytics exclusions and replay settings preserved.
- Two available Clarity phone clips after the Nov 7 9:54 p.m. release cutoff:
  Nov 8 midnight and 9:44 a.m., both homepage-only, zero taps, hidden at 00:01.
  No new map/report/fund/clean blocker or conversion improvement established.
  Newer PostHog Chrome phone session browsed home/About/Support/Communities;
  no map or participation events; no matching Clarity replay available yet.
- Shared local tree: 165 tests across 12 focused files passed with one worker/
  capped heap; TypeScript passed; scoped lint zero errors (one unused image-rule
  suppression from concurrent payout heading refactor). Whitespace checks pass.
  Earlier full-suite run was interrupted; no full-suite claim. New production
  events require post-release verification. No server restart or financial work.
- Staged tracking hunks only in shared payout/map files. Preserved concurrent
  payout prewarming/reuse/layout, deletion confirmation, auth/profile/share/
  support changes without committing them. Details:
  `docs/reviews/2026-11-08-participation-tracking-and-recordings.md`.

### 2026-11-08 — Codex (local Stripe connection resolved; real embedded form verified)

- Owner supplied the approved restricted key in a screenshot after confirming
  it was saved. Extracted it locally without logging its value, verified the
  Litterbugs platform identity, and saved it to ignored web `.env.development.local`
  with mode 0600. Accounts Read + Account Sessions Write only; no replacement key
  needed. No credential committed. This resolves the pending connection below.
- Current local server picked up the settings without a restart. Actual fresh
  embedded sessions now open the legal-first/last-name page in the website.
  Closing/reopening works directly, with no old Continue setup gate. Business
  type/product description and duplicate normal footer controls remain absent;
  current-only requirements, bank collection, terms and Stripe auth stay intact.
- Desktop and 393×851 reviewed; phone root width/content both 393, one Continue,
  quiet preparation state, no framework overlay. Browser's old concurrent auth
  stylesheet errors preceded its creation; stylesheet now exists. Expected local
  HTTP warning only for Stripe. Screenshots:
  `/tmp/litterbugs-payout-local-embedded-{desktop,phone}.png`. Viewport restored.
- Website source remains `840409c`, local only. Previous 28 focused tests,
  TypeScript/scoped lint/diff checks passed; no source change since those checks.
  No full build or overlapping tests; free-memory reading was 59%. No deployment,
  backend redeploy, migration, bank/identity entry, agreement acceptance or payout.
  Concurrent analytics/social/profile/auth/support work preserved. Final bank and
  terms submission remains for the owner's local review.

### 2026-11-08 — Codex (seamless local embedded payout entry; connection pending)

- Local source `840409c`, not pushed/deployed. Returning eligible cleaners open
  directly into embedded onboarding; first-time eligibility remains. Replaced
  visible checking/loading text and disabled loading button with quiet branded
  placeholders and a screen-reader status. Closing cancels stale UI work;
  failed openings can be retried. Required Stripe fields and terms unchanged.
- Development-only `/api/local/payout-session` bridge avoids changing the held
  live backend. Requires loopback host/same origin, verified non-anonymous
  Supabase user, payments flag, eligibility, and the member's RLS payout row.
  Checks Litterbugs platform identity before account initialization; creates
  onboarding-only sessions with external-account collection and Stripe auth on.
  Production/deployed requests fail closed; responses are no-store. Keys belong
  only in ignored local env; no service-role key needed or bank data handled.
- Owner approved a restricted local key: Accounts Read + Account Sessions Write,
  all other resources None. Owner completed email verification; key was created,
  but the one-time reveal was closed before saving. Awaiting whether owner saved
  it or approves a replacement. Public key saved locally; no private key saved
  yet. Do not claim fresh-session integration is verified until this is resolved.
- 28 focused tests passed (final changed subset 20/20), TypeScript/scoped lint/
  diff checks passed; one worker and capped Node heap, no overlapping builds.
  Current localhost page confirms quiet preparation and missing-key recovery;
  actual fresh embedded form still pending. Existing dev server was already
  running and preserved. No payout, bank/identity submission, terms acceptance,
  migration or deployment. Concurrent analytics and social/profile work preserved;
  staged only our changes in the two concurrently instrumented payout components.

### 2026-11-08 — Codex (computer crash; keep resource use low)

- Owner reported a crash during local Stripe work and asked to manage memory.
  After restart, macOS reported 86% free memory; no test runner, build or local
  dev server remained. Browser automation stopped. Do not launch overlapping
  builds/tests; use one lightweight check at a time and one test worker.
- Stripe edits remain local and unfinished: direct embedded entry for returning
  eligible cleaners, quiet branded preparation state, and a development-only
  authenticated session bridge. Initial 19 payout tests and typecheck passed;
  later bridge/security tests were interrupted and need verification. No push,
  deployment, migration, new credential, bank submission or terms acceptance.
- Fresh local sessions still require a Litterbugs Stripe server key; none found
  locally. Do not redeploy the held live backend as a shortcut. Local server
  needs restarting after the crash. Preserve concurrent analytics/social edits.

### 2026-11-07 — Codex (minimal payout flow confirmed, LOCAL / HELD)

- Owner reaffirmed local review before any deployment. Updated the two payout
  components' copy to legal name → bank → review/accept Stripe terms, with
  phone verification retained. Removed the speculative address/ID lead text.
  No new fields, no address requirement, no change to current-only collection
  or existing business-prefill exclusions. All provider-issued identity, bank,
  tax and terms requirements remain collectible. Corrected earlier generic
  advice: home address is not a baseline requirement for this specific setup.
- Existing authenticated localhost preview verified: legal-name fields remain,
  one Continue, terms links, no business questions/extra address field. Preview
  left open. Screenshot `/tmp/litterbugs-payout-minimal-flow.jpg`. 18 focused
  payout/session tests, TypeScript, scoped lint and diff checks pass. No identity
  or bank details submitted and no agreement accepted; final completion untested.
- Source committed locally only. No push/deploy, backend change, migration,
  mobile edit, analytics change or server restart. Preserved concurrent social
  card/share-image and dev-preview edits. Prior restored live backend and release
  hold remain in force.

### 2026-11-07 — Codex (exact Stripe cleaner requirements checked, read-only)

- Matched code to Stripe's requirements selector/API: Accounts v2, platform US,
  account US, dashboard express, full agreement, individual, transfers ONLY
  (no card_payments). Lookup returned no validation/build errors. Published US
  update returned the same fields; no website/MCC supplemental restrictions
  for transfers. Do not apply card-payment merchant requirements to cleaners.
- Baseline: legal first/last name, external payout account, terms acceptance,
  and activity/web-profile information. Litterbugs supplies email, US/individual
  configuration and cleanup description; Express phone authentication is a
  separate sign-in step. No personal address in this exact baseline table.
- Read-only inspection of Grant's `acct_1UDyXQQMFUkXRe5p` independently confirmed
  current tasks: bank account, terms acceptance, missing representative name.
  Later tasks explicitly require DOB and SSN last four at **$3,000 volume**.
  No outstanding address or activity-profile task. Nothing submitted/changed.
- Exact selector: https://docs.stripe.com/connect/required-verification-information?accountSetupKeys=account-setup-A&account-setup-A%5BapiVersion%5D=v2&account-setup-A%5BplatformCountry%5D=US&account-setup-A%5BaccountCountry%5D=US&account-setup-A%5BdashboardType%5D=express&account-setup-A%5BtosType%5D=full&account-setup-A%5BlegalEntityType%5D=individual&account-setup-A%5Bcapabilities%5D=transfers
  API snapshots `/tmp/litterbugs-stripe-exact-requirements{,-us2023}.json` show
  300000 minor-unit payout threshold, confirmed as $3,000 in rendered public
  table and actual account tasks. No threshold hardcoded in app; provider
  requirements/capabilities stay authoritative. Keep name step; no extra home
  address requirement. App's 18+/US eligibility is separate. Account-specific
  risk reviews remain possible; this is not a guarantee of future requests.
- Documentation only; no source edits/tests/push/deploy or production changes.
  Release hold and restored live backend remain intact.

### 2026-11-07 — Codex (participation tracking verified and extended, LOCAL ONLY)

- Source `5c137c5`, **not pushed or deployed**. Preserved Claude's current
  workflows, embedded payout commits, social-card/share-image edits, helper,
  preview and handoff entries. No server restart, migration, real login/signup,
  report/photo submission, payment, claim or production analytics test.
- `participation_step` now distinguishes `auth_succeeded`, `verification_sent`
  and `payment_ready`. OAuth/email callback adds a bounded one-use measurement
  hint; destination consumes it before the resumed form step and retains the pin,
  task intent, community return and hash. General account auth is unchanged.
  Hints are measurement only, never authorization; cross-browser cookieless
  sessions still cannot be assumed to represent one joined person.
- Added `participation_failure` with allowlisted `action`, `stage`, `reason`
  and normalized page only: auth start/return/rejection/network/stall; GPS
  permission/timeout/unavailable/stale/range; photo prepare/upload/device-save;
  quote/payment start/form/rejection/confirmation unavailable; safety/claim;
  evidence lookup/unconfirmed submission. No raw error text, file names, IDs,
  coordinates, entered content or financial details in analytics properties.
- Buffer confirmed outcomes until the SDK is ready. Non-redirecting funding
  observes the existing server status-check result in the background, only when
  measurement is allowed; only `succeeded` counts. Processing and uncertain
  responses do not count as confirmed payments/failed charges. Existing receipt
  confirmation and publication/approval deduplication remain in place.
- **225 targeted tests pass in 19 files**, TypeScript/scoped lint/diff checks
  pass. Mocked SDK/backend tests cover all report stages, auth return/failures,
  funding/confirmation, claim/evidence, recovery, exclusion and payload privacy.
  Full shared web suite: 829/832; two untouched social-card casing assertions
  conflict with in-progress styling, plus one display-cache timeout. Isolated
  display-cache rerun: 6/6 pass. Social-card work left intact.
- Local guest browser 393x851: Report → choose pin → signup → close/cancel
  works; header/navigation retained, no console warnings/errors observed; viewport
  reset. Analytics remains excluded on localhost. Actual PostHog ingestion of
  the new events awaits a later authorized release/verification; no live lift or
  actual payment/provider integration completion claimed.

### 2026-11-07 — Codex (cleaner wording / required verification preserved, LOCAL)

- Owner confirmed: keep everything Stripe requires for payouts; keep this
  website-only work local. Source `21815cf`, not pushed or deployed. No backend
  redeploy, migrations, mobile edits, analytics changes or server restart.
- Kept legal-name / personal-details page and `currently_due` collection; no
  extra address requirement. Existing four prefilled business-field exclusions
  unchanged. Stripe can still request address, DOB, tax details, ID and terms.
  Its docs explicitly say excluding fields does not remove their requirements:
  https://docs.stripe.com/connect/supported-embedded-components/account-onboarding
- Existing authenticated localhost form reviewed: personal-details menu, bank
  selection, optional Link prompt (Not now), and manual routing/account/confirm
  fields with Stripe's bank-debit authorization. No identity/bank data entered,
  bank linked or terms accepted. Final submission/review not exercised.
  Stripe-owned bank/legal wording retained. Our copy explains legal-name
  verification and possible address/ID; ready-account action is “Manage payouts”.
- Desktop and 393×851 checked; no horizontal overflow or browser errors (one
  expected localhost HTTPS warning). 18 payout/session tests, scoped lint and
  diff checks pass. Typecheck passed in isolated checkout of `21815cf`; shared
  checkout's concurrent `lib/website-analytics.ts:152` TS7053 prevented its full
  typecheck at check time. Left that and all other concurrent work untouched.
  Screenshots `/tmp/litterbugs-payout-required-details-{desktop,phone}.jpg`.
  Viewport reset; existing local form left open. Live/server rollback and older
  unpromoted deployment cautions in the entry below still apply.

### 2026-11-07 — Codex (embedded website Connect, LOCAL / RELEASE HELD)

- **Owner explicitly says do not release this yet. Website only; native app
  onboarding unchanged.** Local source ends at `dddd423` (earlier `619f5ea`,
  `0eb5eb6`, `64ecc41`, `97235b1`); none pushed. Uses Claude's existing white
  full-page payout flow, caterpillar, purple actions and rounded controls.
- Real Litterbugs v2 recipient / Express-dashboard account accepted an
  onboarding-only AccountSession. Grant completed phone verification; actual
  Stripe fields rendered on localhost. No identity/bank fields or agreement
  submitted by Codex; no payments, payouts, new Stripe account or migrations.
  Normal existing payout-account status/profile reconciliation ran during QA.
- Server support was temporarily deployed from `619f5ea` as function v30 to
  verify compatibility. **Restored original server source from `2dcaef6` as
  v31 after owner's hold; downloaded source matches pre-change v29 byte for
  byte.** Live website remains `f08518c` / `dpl_HgNgjXJMLnpf7Ur15xApJegWnbLd`.
  Staged, unpromoted `dpl_FF8D3A7WJydt8JVVygzpFFTCTvNs` is older `0eb5eb6`,
  NOT the final candidate. Do not promote it. New local embedded sessions need
  the held server support; the open verified local form uses its existing session.
- Owner requested entire Product description section and business-type question
  removed. Stripe-supported requirement exclusions now hide those v1/v2 fields,
  preserving existing entity types; individual setup is preconfigured. Server
  preserves existing activity descriptions and supplies a missing one only when
  Stripe explicitly requires it. Duplicate bottom Back/Continue row removed from
  normal form; hosted recovery remains on errors only. Identity/bank/terms remain.
- QA: actual final desktop and 393×851 form starts “Verify your personal
  details”; product section, business question and duplicate continuation absent.
  No horizontal overflow. No browser errors; expected localhost HTTPS warning.
  47 adjacent web tests, final 18 focused tests, 32 shared/server tests before
  activity refinement plus final 7 handler tests passed; TypeScript, scoped lint,
  diff checks and isolated production build of `dddd423` passed. Source check
  passed for server entry. No full new-customer identity/bank/terms completion.
  Final screenshots `/tmp/litterbugs-embedded-connect-cleaner-{desktop,phone}.jpg`.
  Viewport reset; verified local form left open. Claude's social/share and dev
  preview work preserved; shared local server not restarted; analytics unchanged.

### 2026-11-07 — Codex (read-only phone funnel/replay review, about 10:20 p.m. ET)

- Reviewed PostHog website 695338 records Nov 1–7 and ran ordered Mobile
  entry/auth diagnostic funnels with internal/test filtering. Report: one person
  tapped, saw auth, closed ~2s later; no auth submission/deeper stages captured.
  Fund/Clean: no Mobile participation-step funnel data. Nine explicit QA rows
  and unknown desktop traffic excluded from phone conclusions. No Mobile events
  captured after the 9:54:03 p.m. deployment cutoff as of the query.
- Clarity Last 3 days remains 59 recordings; latest phone still 9:05 p.m., before
  release. Revisited report `1tfut0e`, Clean `1ykugca`, Fund `198lbhr` timelines
  and playback states. Historical immediate auth and repeat action entry are
  already addressed by the released changes; no new deep-form defect proven.
- Recommendations only: preserve Claude's workflows, verify post-auth/outcome
  measurement and bounded failure reasons, then assess new phone attempts and
  empty-area recovery. No application edits, tests, push/deploy, database or
  analytics-setting changes, production-site test or server restart. Preserved
  current embedded-payout and social-card work. Documentation only.

### 2026-11-07 — Codex (post-release phone check, about 10:07 p.m. ET)

- Vercel read-only inspect: `dpl_HgNgjXJMLnpf7Ur15xApJegWnbLd` READY,
  production, created 9:54:03 p.m. ET. Creation is a conservative cutoff, not
  an exact promotion timestamp. Live source remains `f08518c` per release log.
- Clarity newest phone recording still 9:05 p.m.; no post-deployment phone
  replay available. PostHog Mobile record query from 9:54:03 p.m. through
  ~10:07 p.m. returned no rows. One 9:49 p.m. phone pageview predates release.
  Wider audit has 33 participation events in one unclassified Desktop/Chrome
  session spanning release; excluded from phone conclusions, not labeled as
  confirmed visitor/test. Too early for phone progress/conversion conclusions.
- Documentation only; no application edits, push/deployment, production-site
  tests, database/analytics changes, server restart or test rerun. Preserved
  Claude's social card/share image, package/lockfile and preview changes.
  Query/time boundaries and evidence recorded in existing participation review.

### 2026-11-07 — Codex (clicked-phone backlog triaged; release baseline updated)

- Owner confirmed Claude released the held changes; using `f08518c` /
  `dpl_HgNgjXJMLnpf7Ur15xApJegWnbLd` as the live baseline. Read-only GitHub
  branch lookup matched local `02f8f66` release handoff. No independent live
  authenticated-flow test or deployment inspection in this pass.
- Refreshed Clarity: 99 recordings, 64 Mobile, 28 Mobile with clicks. Inspected
  two newly available phone sessions plus eight remaining clicked phone cards.
  Newest tapped session reached loaded Boone map, then home, without a task;
  other new session hid homepage; remaining eight were app-store taps. All 28
  clicked phone cards now triaged via timelines and playback samples across
  passes, not every frame/all 64 phone recordings. No new blocker confirmed.
  These inspected sessions predate the latest release; no outcome-lift claim.
- Documentation only; no new application edits/tests/push/deployment, production
  testing, database or analytics changes, or server restart. Preserved Claude's
  social-card/share-image changes, helper and dev preview. Existing review doc
  now distinguishes historical local-only status from the released baseline.

### 2026-11-07 — Claude (workflow redesign + Codex's local commits released)

- Pushed and deployed `f08518c` on `codex/map-first-navigation` as
  `dpl_HgNgjXJMLnpf7Ur15xApJegWnbLd`. Previous live deployment for rollback:
  `dpl_DrrjEV9yHJ26aLtu13u14hePFsus` (`9d35422`).
- **Grant chose to release Codex's 9 previously held local commits in the
  same release** (location-first reporting before signup, Fund/Clean guest
  continuation, stable reporting navigation, review docs).
- `1bd6489`: redesigned workflows. The reporter review, cleaner flow
  (claim/evidence/give back), report wizard, funding, payout setup and
  renewal now share the white full-page style, family bugs and matching
  buttons, with no "reward" wording. Also: payout stages and a "Your payouts"
  reminder in Needs your attention (`/account/connect?payout=finish` opens the
  payout screen); bug celebration at each finish (`bug-celebration.tsx`,
  `flow-done.tsx`, `celebration-toast.tsx`); on-page confirmations replace
  `window.confirm` for approve (paid), give back, and close/refund. Fixed
  success messages shown red, the phone-only camera button showing on desktop,
  and the grey strip under account pages.
- `f08518c`: Vercel's `next build` rejected `React.Ref<unknown>` in
  `map-publication.test.tsx` (from `1aaa5d7`). Typed it with `Ref` imported
  from `react`; same test logic, 41/41 pass.
- Checks: typecheck and lint clean; 784/786 tests (the same two
  website-outcomes failures). Live /map checked with analytics excluded: 40
  pins, new styles served, no console errors. Signed-in flows not exercised
  live (no test account used).
- **Not released, still local in the shared checkout:** social card restyle
  (`report-social-card.tsx`, `share-image/route.ts`, `lib/social-card-bugs.ts`).
  Unverified because share-image returns 500 on localhost even for the old
  card. Also the temporary `apps/web/app/dev-review-preview/`; never commit it.
  The share dialog redesign has not started yet.

### 2026-11-07 — Codex (five remaining phone sessions; review only, LOCAL)

- Clarity 30-day list: 97 recordings, 62 Mobile, 27 Mobile with ≥1 click;
  descriptive card counts, not people/conversion rates. Reviewed five additional
  phone sessions using timelines/playback samples. Long list visit was mostly
  hidden; two app-store outbound taps; one homepage hid after 3s; one short
  website-entry clip reached a loaded map. No new current report/fund/clean
  blocker confirmed. Evidence appended to existing participation review doc.
- No application edits, test reruns, push, deployment, database or analytics
  changes, production testing or server restart in this pass. All Claude's
  active changes and the concurrent Stripe-branding handoff entry preserved.
  Prior local action-flow source `bbe405c`; production remains `9d35422` /
  `dpl_DrrjEV9yHJ26aLtu13u14hePFsus`. These clips do not establish deep
  payment/claim/evidence completion or failure.

### 2026-11-07 — Codex (Stripe branding saved directly in live Dashboard)

- Updated Litterbugs `acct_1U2HZe40KMkUKMFW` in Chrome. Stripe MCP is still
  connected to Review Hiker; do not use it to mutate Litterbugs. Existing icon
  and logo already visually matched the requested local brand files; retained.
  General brand color now `#5146ed`, accent `#ffce38`, prefer logo enabled.
- Connect onboarding Customize independently saved the same colors; business
  name already Litterbugs. Reopened to verify persistence and preview. Kept
  Copy platform branding to new connected accounts off and support options intact.
- Owner rejected tiny dark checkout logo on purple. Final Checkout styling is
  custom white background `#ffffff`, purple button `#5146ed`, existing rounded
  shapes/system font. Saved successfully and preview verified. This replaces
  the briefly enabled Use brand colors setting. Logo remains small in Stripe's
  scaled phone preview. Proof `/tmp/litterbugs-stripe-checkout-light.jpg`;
  Connect proof `/tmp/litterbugs-stripe-connect-branding.jpg`.
- Embedded toggle in this Dashboard is a preview, not an integration switch.
  Current local website funding uses PaymentElement; recipient payout setup
  uses Accounts v2 hosted account links. Embedded onboarding would be separate
  implementation and needs compatibility verification for recipient accounts.
  No integration change, transactions, migrations, website deployment or push.
  Preserved Claude's concurrent application changes. No conversion lift tested.

### 2026-11-07 — Codex (six more phone sessions; review only, LOCAL)

- Expanded Clarity to 7 days: 91 recordings across devices, not 34 new arrivals.
  Reviewed six previously unreviewed phone sessions (Nov 1/4/5), with timelines
  and playback samples. Photo cycling responded; one completed-only community
  link was correctly under Completed cleanups. Google tap ended after ~2s with
  no provider outcome visible; another App Store outbound tap was also labeled
  Dead click. No new current report/payment/claim submission defect confirmed.
- **No application edits, push or deployment.** Prior local action-flow source
  remains `bbe405c`; production remains `9d35422` /
  `dpl_DrrjEV9yHJ26aLtu13u14hePFsus`. All Claude's concurrent funding, cleanup,
  payout, wizard and styles work left intact; shared server untouched. No
  production tests, database writes or analytics settings changes.
- Focused regressions against the current shared working tree: **95 pass in
  six files** (guest intent, funding, cleanup, map publication, homepage entry,
  auth returns). This is not a full suite/build or real payment/claim test.
  Evidence/limits appended to the existing phone participation review doc.

### 2026-11-07 — Codex (five more phone journeys; direct action fix, LOCAL ONLY)

- Local source `bbe405c` removes the repeated guest action tap after an explicit
  Fund/Clean report link. Both action components open their matching account
  prompt once when available; funding still waits for feature flags/eligibility.
  Dismissal stays closed across re-renders, manual taps do not duplicate prompts
  or participation tracking, and normal report browsing does not open auth.
  Existing signed-in amount/safety review remains; no automatic payment,
  agreement acceptance or claim. Location-first reporting preserved.
- **Not pushed or deployed**; production stays `9d35422` /
  `dpl_DrrjEV9yHJ26aLtu13u14hePFsus`. Preserved Claude's active cleanup, payment,
  wizard and style work. Only the three small guest-entry additions in
  cleanup-action.tsx were staged; the rest of that file remains Claude's work.
  Shared server untouched. No migrations or analytics configuration changes.
- Five additional Nov 5 phone sessions reviewed via timelines/playback samples:
  explicit Clean/Fund links landed on a second action; another visitor reached
  the old Rewarded empty state; two were policy browsing/shared-report viewing.
  Reproduced the duplicate Clean tap on current localhost before fixing.
  Historical empty state predates nearest-report recovery, not a new regression.
  PostHog event audit remains the same 21 rows with 9 explicit QA rows; no newer
  deep payment/claim/evidence sequence to diagnose. Evidence in existing phone
  participation review doc; no new conversion rate claim.
- Phone QA 393×851: Clean/Fund links open correct sign-in without another tap;
  dismissal works, no console errors/warnings or framework overlay observed.
  No credentials, reports, payments, claims or GPS permission submitted. 131
  scoped tests, TypeScript, scoped lint and diff checks pass; viewport reset.
  Screenshots `/tmp/litterbugs-direct-clean-signin-phone.jpg` and
  `/tmp/litterbugs-direct-fund-signin-phone.jpg`. Real sign-in, payment and claim
  completion not performed; existing mocked continuation tests passed.

### 2026-11-07 — Codex (location before signup; continued phone review, LOCAL ONLY)

- Local source commit `1aaa5d7` lets guests choose a report location before
  signup, including direct `/report` and homepage/header entries. Confirming
  the pin opens the existing account prompt. Explicit pin parameters survive
  reload/email/OAuth/Instagram handoff and restore the report at the chosen spot;
  community/viewport restoration cannot override it. Cancel clears the pin.
  No anonymous account draft/backend write before signup; publication account
  and geolocation checks remain. Existing stable navigation fix preserved.
- **Not pushed or deployed**, per owner. Production remains `9d35422` /
  `dpl_DrrjEV9yHJ26aLtu13u14hePFsus`. Preserved Claude's concurrent cleanup UI,
  notifications, account styles and globals.css work; excluded it from commit.
  Shared local server not restarted. No migrations or analytics changes.
- Signed-out localhost phone-size picker → confirm → signup and reload checks
  passed without creating an account/report or granting GPS. Tests cover auth
  returns, exact pin preservation, community context, cancellation and existing
  publication guards. Full web: 770/772 pass; only the same two pre-existing
  website-outcomes event-expectation failures. TypeScript, scoped lint and diff
  checks pass. Auth completion tested with mocks, not real new accounts.
- Reviewed three more Clarity phone sessions with playback samples/timelines:
  one historical Nov 5 looped home/list/map and opened the same report twice;
  two long durations were largely hidden-page/store-handoff time. No new current
  payment/cleanup submission defect established. Detailed evidence/limitations:
  `docs/reviews/2026-11-07-phone-website-participation-review.md`. Phone screenshots
  `/tmp/litterbugs-guest-location-first-phone.jpg` and
  `/tmp/litterbugs-guest-pin-signup-phone.jpg`; temporary viewport reset.

### 2026-11-07 — Codex (stable reporting navigation; phone behavior review, NOT deployed)

- Local commit `0e62657` keeps the map's quick-filter host, Filters, Reports/Map
  controls and phone header controls mounted during report placement. Owner's
  screenshots showed toolbar removal changing the map height. Verified identical
  map top/height before and after entry: desktop 196/552px, phone 122/729px;
  phone header stayed 59px. 36 scoped tests, TypeScript, scoped lint and local
  signed-in desktop/phone enter/cancel checks passed. No report submitted.
- **Not pushed or deployed**, per the owner's current instruction. Production
  remains `9d35422` / `dpl_DrrjEV9yHJ26aLtu13u14hePFsus`. Preserved Claude's
  concurrent cleanup-review changes, including globals.css; those were not
  included in this commit. Shared local server not restarted.
- Reviewed five phone sessions through Clarity playback samples and timelines;
  current 3-day list has 57 recordings across devices. PostHog website replay
  query remains empty; SDK recording is disabled intentionally. One phone
  report/auth sequence closed the prompt in ~1.9s without submission. Old
  search/empty-area clips predate current fixes and are not new regressions.
  Nov 7 Android 5-second clip clicked Google Play: a handoff, not a proven
  failed website flow/install. No new payment/claim submission failure confirmed.
- PostHog 3-day sample: 21 participation events, including 9 explicitly labeled
  QA events; only one remaining phone session (3 events), other traffic not
  verified as non-staff. Too sparse for deep conversion conclusions. Saved map
  watcher was read, not changed. No analytics configuration changes.
- Evidence, queries, scope limits, and recommendations are in
  `docs/reviews/2026-11-07-phone-website-participation-review.md`. Local screenshots:
  `/tmp/litterbugs-report-stable-nav-desktop.jpg` and
  `/tmp/litterbugs-report-stable-nav-phone.jpg`. Viewport reset after testing.

### 2026-11-07 — Codex (phone website follow-up and report-button smoothing)

- Owner clarified this is Chrome on a Pixel 5, using the website. The previous
  automatic recovery release did NOT clear their existing Beacon Heights copy.
  Owner then chose Start new, closed/reopened report creation, and confirmed
  "It stays cleared." This establishes current recovery, not the exact cause of
  that old copy's missing/mismatched submission association. No additional draft
  deletion heuristics or native-app changes were added in this follow-up.
- Pushed source `9d35422` and promoted `dpl_DrrjEV9yHJ26aLtu13u14hePFsus` to
  litterbugs.app. Rollback: `dpl_BatGTozi4U1jxHQCABieYgGtaBiN`. Map Report Litter
  now keeps its label/icon during draft checks, stays fully opaque while busy,
  avoids active-state scale and Android tap flash, and reserves its width through
  the Cancel transition (168px phone / 184px desktop minimums). Busy taps remain
  blocked and accessibility busy/focus states preserved. No migrations.
- Targeted map-publication/resumable-wizard regression tests: 54 pass, including
  delayed lookup and duplicate-tap prevention. TypeScript, scoped lint, remote
  production build, staged map HTTP 200 and live compiled CSS checks passed.
  Browser: local signed-in Chrome at 393x851, repeated enter/cancel; button width
  stayed 168px, opacity 1, no console errors. No report/photos/payment submitted;
  local server not restarted; viewport reset. Screenshot retained at
  `/tmp/litterbugs-report-button-pixel5.jpg`. Physical-phone button confirmation
  remains with the owner after refreshing their website tab.

### 2026-11-07 — Codex (completed report draft recovery on phone)

- Pushed source `e17fe6a` on `codex/map-first-navigation` and promoted production
  `dpl_BatGTozi4U1jxHQCABieYgGtaBiN` to litterbugs.app. Includes Claude's latest
  card-photo release. Rollback: `dpl_2A1A4uqGMcnkKnNtMQs1NZzF6eQD`.
  No database migrations; shared local server untouched.
- Report recovery now checks the exact account-owned publication ID from the
  local journal/sync metadata before offering Resume. Confirmed publication
  retires its cloud revision and atomic local draft/journal; newer account
  drafts and unsynced edits remain protected. Location inspection skips completed
  drafts without replacing another tab's editor. Read the journal after sync
  reconciliation to avoid restoring an already-cleared checkpoint. Optional
  shared sync hooks are enabled only by the web adapter; native adapter unchanged.
- Verified the Beacon Heights ID `3906e5ce-cd04-4ccf-8e9f-4fa754546019` is published
  via the live public API. Could not inspect the physical phone's IndexedDB.
  Tests cover stale phone copies, lost responses, legacy journals, newer account
  work, offline edits, cleanup races, and fresh submission IDs. Shared tests:
  165 pass; web scoped: 56 pass; full web: 746/748 (only the same two existing
  website-outcomes analytics expectation failures). TypeScript, scoped lint,
  remote production build and staged /report HTTP 200 passed.
- Live browser /report entry hydrates its map and account prompt with no console
  errors; deployment error logs empty. Turned Analytics choices off before report
  navigation. Initial homepage landing before that toggle may be assistant traffic.
  User should reload/reopen the phone web app to receive the new code; physical
  phone confirmation remains pending. No real report/cleanup/payment submitted.

### 2026-11-07 — Claude (website card photo arrows released)

- Pushed and deployed `863ae70` on `codex/map-first-navigation` as
  `dpl_2A1A4uqGMcnkKnNtMQs1NZzF6eQD`. This is Codex's live `38bc5bd` plus
  this fix only. Previous live deployment for rollback:
  `dpl_121ifRGPcPRM24wTKnuosmveUoKF`.
- These are the four indexed-photo edits mentioned below, now finished.
  Website cards (home, /reports, /cleanups) only ever got the first report
  photo, so hover arrows never showed on open reports.
  `/reports/[id]/photo/before?photo=N` serves photo N (max 10) with the same
  visibility checks. `PublicReportShareModel.photoCount` carries the count.
  `card-photo-switch.tsx` steps through all photos, with dots and preloading.
  Cleaned-up spots still lead with the after photo.
- Checks: typecheck clean; photo route, public-report and public-website
  tests pass (41), including a new `?photo=N` route test. Verified live with
  analytics excluded: 8 of 12 /reports cards and 5 of 9 homepage cards have
  arrows, and the second photo loads.

### 2026-11-06 — Codex (Boone / All reports release verified)

- Pushed source commit `38bc5bd` on `codex/map-first-navigation`, including the
  earlier `381208d` location-search/empty-map work. Built from a clean detached
  checkout, staged and promoted production deployment
  `dpl_121ifRGPcPRM24wTKnuosmveUoKF` to litterbugs.app. Previous live deployment:
  `dpl_EadGATcuiVS6ZkWvsEAky8qgixht`. No database migrations.
- Verified live desktop Map resets an old city and filters to the exact shared
  Boone preview bounds, with All reports selected and no filter-count/custom
  pill. Verified Google suggestions (one New York city result), then the phone
  menu's Open map returning from New York to Boone and clearing the searched
  place. Runtime error scan and browser console were clean for this smoke test.
- Release regression run: 741/743 tests passed under Node 22.22.0. The only
  failures were the same two previously documented website-outcomes tests;
  those implementation/test files are unchanged from the previous live source.
  Remote production build, TypeScript, scoped lint and targeted map/header
  tests passed. The temporary checkout initially used Homebrew Node 26, which
  breaks jsdom localStorage; the definitive rerun used the project's Node 22.
- Claude's four unfinished indexed-photo source edits remain local and were
  excluded from this deployment. Keep the photo-gallery follow-up in the entry
  below when finishing those edits. The shared local server was not restarted.
- Analytics QA note: the first live landing around 11:10–11:12 p.m. ET had
  analytics allowed in the browser. Treat the visit to
  `/map?view=map&browse=1&status=completed&radius=5&lat=40.7&lng=-74&zoom=13`
  in that window as assistant test traffic. Turned analytics off immediately
  after checking the preference; subsequent live navigation stayed excluded.

### 2026-11-06 — Codex (Boone map entry and concurrent regression review)

- Main desktop/mobile Map entry and homepage Explore the full map now open
  the shared Boone preview bounds with All reports and no saved discovery
  filters. Clicking Map from an already-open map resets its place, report,
  filters and viewport without restarting the map. Modified/new-tab clicks
  keep normal link behavior. Homepage group links include all report statuses.
- Preview geography lives in `lib/map-preview-frame.ts`, shared by the image
  preview and map entry so future framing changes stay aligned. Earn/Donate
  actions retain their explicit Available intent.
- Reviewed Claude's in-progress indexed-photo changes separately. The new API
  retains visibility checks, private/no-store responses and index bounds. Do not
  deploy those unfinished local edits as part of the map-entry release.
- Photo-gallery follow-up for Claude: the three width-route tests still expect
  three loader arguments; indexed delivery now supplies a fourth (`0` by default).
  Before exposing >2 card photos, update the CSS visibility/dots rules (currently
  only positions 0 and 1) or use a dynamic single-active-slide mechanism. Add
  coverage for ?photo=2&width=640, absent/invalid indexes, withdrawn reports and
  URL query preservation. A tested draft of that coverage is saved locally at
  `/tmp/litterbugs-photo-gallery-review-tests.patch`; it is not in this release.
- Regression scan before the Map-entry change: 744/749 tests passed. Two header
  picker tests had stale Census mocks after the Google picker change; updated
  these to the real current contract. Two website-outcomes failures are the
  previously documented baseline; display-photo-cache has the known concurrent
  timeout and passed in the focused run. Map/search checks passed.
- Map-entry focused checks: 89 tests passed, plus scoped lint and TypeScript.
  Production deployment verification and exact release identifier follow below.

### 2026-11-06 — Codex (location search and empty-map recovery)

- Implemented the owner-approved proposal on top of Claude's `03dc70b` release
  and `f584164` handoff. No website deployment or database migration in this pass.
  Preserved Claude's cards, header, map preview, colours and pin changes; did not
  restart the shared localhost:3000 server.
- Header/home area pickers and map pickers now use one Google Place Autocomplete
  (New) list with session tokens, correct place types, selection-time details and
  required attribution. Geocoding remains an outage fallback; Census results are
  no longer mixed into the picker. Enter highlights an ambiguous result before
  selecting it. Late responses and dismissed searches are ignored.
- City searches frame the map without a persistent town/postal boundary. Legacy
  area links still restore, but discovery follows the viewport after panning.
  Empty map mode shows the caterpillar and honey-yellow Find closest reports.
  Reports mode retains the flat layout, inline location picker and “or.”
- Closest lookup exhausts paginated expanding geographic rings, preserves report
  filters and hidden/favorite preferences, and previews the nearest report's
  distance before View on map. A radius is removed only on that confirmation.
  Loading errors remain distinct from genuine empty results.
- Google configuration: enabled `places.googleapis.com` in `litterbugs-auth` and
  appended it to `litterbugs-web-local` and the existing Litterbugs Web Maps key
  (`5528ba95-42db-4d24-bc0e-076ddad81f59`). All existing referrer restrictions and
  Maps/Geocoding targets were preserved. Android keys were not changed. Updated
  the historical Places exclusion in the boundary check and setup documents to
  reflect this explicit authorization.
- Verification: 85 focused tests, scoped lint, TypeScript and an isolated Next
  16.3 production build passed (existing libheif bundling warnings remain).
  Build exposed optional page-props signatures in /map and /report; removed
  their default arguments and updated the direct-call report test.
- Chrome verified real autocomplete responses (200), New York city selection,
  map/list empty states, phone layout at 390px, and closest navigation. A funded
  match 517 miles away was previewed before navigation; funding/status stayed
  selected and the 5-mile radius cleared only after confirmation. Analytics was
  off in the test browser. Pending: deploy this source change when requested.

### 2026-11-06 — Claude (cards, colours and homepage map preview released)

- Pushed and deployed `03dc70b` on `codex/map-first-navigation` as
  `dpl_EadGATcuiVS6ZkWvsEAky8qgixht`. Previous live deployment for rollback
  is `dpl_Gi9n38UYt43vhuh5jb4cSVt69y1a`.
- Website report cards (home, /reports, /cleanups, communities) now match
  the map list card exactly: two-line titles, severity + date row, reporter
  and ••• under one divider, before/after arrows on cleaned-up spots
  (`card-photo-switch.tsx`). Map list cards: one unified card, photo arrows
  and dots, menus close each other, heart taps no longer reload the list
  (`keepUnchanged` in map-experience).
- Homepage map preview: top "Open map" button removed; "Explore the full
  map" button on the map; hover lights it; drag/pinch shows a hint
  (`map-preview-nudge.tsx`). Snapshot `boone.webp` is now 1600 × 1100
  (origin 1145002, 1643342) so phones fill the frame. Pins still come only
  from the middle 640 px band (`pinTop`/`pinHeight` in `lib/map-preview.ts`).
- Colour families: periwinkle dragonfly = Report, green caterpillar =
  Earn/in progress, mint flower = cleaned up; bugs hop on button hover.
- Codex's uncommitted closest-report / map empty state / place-search work
  in the same checkout was left out of this commit and is still uncommitted.
  I committed only the marker attribute stubs from its
  `map-publication.test.tsx` change, which the tooltip fix needs.
- Checks: typecheck and lint clean. Tests: 2 pre-existing
  `website-outcomes` failures. `display-photo-cache` passes when run alone.
  Verified on live phone layout with analytics excluded.

**Do not undo:** the card styles are in the last blocks of `globals.css`;
they intentionally override older `brand.module.css` card rules.

### 2026-11-06 — Codex (public page reachability audit)

- Confirmed the live homepage links to /reports under the carousel as
  “Browse all litter reports” and in the footer as “Litter reports.”
  Clicked through to the report grid at 390px and 1280px with analytics
  excluded.
- Checked 19 public directory, community and guide URLs. All returned 200
  and were reachable from the homepage within three links. Checked all four
  directory/pagination pages and found links to all 27 report detail URLs
  in the live sitemap. No orphan pages found within this scope.
  No website edits or deployment were needed.

### 2026-11-06 — Codex (dragonfly Report Litter button released)

- Pushed and deployed `e791bc5` on `codex/map-first-navigation` as
  `dpl_Gi9n38UYt43vhuh5jb4cSVt69y1a`. Previous live deployment for rollback
  is `dpl_ByCGZy3BTVtDuNy9fsmEJgvbd1Q1`.
- Released the existing dragonfly and sky-blue Report Litter styling. Verified
  the asset and signed-out reporting entry on live phone and desktop layouts
  with analytics excluded. Production build and 31 map tests passed. Other
  local homepage and header edits remain outside this release.

### 2026-11-06 — Codex (map controls and footer polish)

- Pushed and deployed `b3632c0` on `codex/map-first-navigation` as
  `dpl_ByCGZy3BTVtDuNy9fsmEJgvbd1Q1`. Previous live deployment for rollback
  is `dpl_CwT7PFxYNXTsCR21yArXKM6iJccX`.
- Mobile updates bell moved to the top row. Filters aligns with search in
  the second row. Compact map footer fits in one row with More at middle
  widths. Phone legend uses shorter labels or icon counts when tight. Map
  type and location controls use lavender hover and focus styles.
- 58 focused tests, TypeScript, lint and production build passed. Verified
  live mobile at 320px and 390px and footer/hover at 950px and 1280px with
  test analytics excluded. Concurrent dragonfly Report Litter styling
  remains local.

### 2026-11-06 — Codex (guest mobile map header)

- Pushed and deployed `add4d62` on `codex/map-first-navigation` as
  `dpl_CwT7PFxYNXTsCR21yArXKM6iJccX`. Previous live deployment for rollback
  is `dpl_35d8y1M4DFLZwpNVPxduAUVoDhZB`.
- The compact map profile button appears for signed-in members. Guests use
  Log in / Sign up from the menu. Verified the guest flow on the live mobile
  layout with analytics excluded and the signed-in button in component tests.
  All 27 focused tests passed. Separate Report Litter styling edits are local.

### 2026-11-06 — Codex (mobile map layout and navigation released)

- Pushed `codex/map-first-navigation` and deployed commit `49bfa82` to
  litterbugs.app as `dpl_35d8y1M4DFLZwpNVPxduAUVoDhZB`. Previous live
  deployment for rollback is `dpl_Bm4K9MuPHbDQNuTTtL61wkbcqzXA`.
  The earlier `7c650be` staging deployment was never promoted.
- Mobile map uses a compact two-row header with Reports/Map, profile and
  menu above search, filters and updates. Removed the bottom dock. The
  homepage preview frames the pins, and mobile report card dates sit below
  author badges. Includes the earlier map-first Earn and Donate links.
- 84 focused tests, build and lint passed. Verified 320–760px and desktop
  locally, plus the live toggle and layout at 486px and the live dropdowns
  on phone and desktop. Analytics excluded during testing. Concurrent
  uncommitted Report Litter styling edits remain outside this release.

### 2026-11-06 — Codex (local website rebuilt)

- Production-mode build passed for `1e94298`. Started the local development
  server on port 3000 with its existing local map configuration. Verified home,
  map, and both discovery dropdowns in Chrome at phone and desktop sizes with
  analytics excluded. No application changes or deployment.

### 2026-11-06 — Codex (map-first discovery links)

- On `codex/map-first-navigation`, based on `claude/ui-finish` at `78aabcc`.
  Earn now has one “Find a cleanup on the map” action. Donate uses “Find a
  cleanup to fund.” Both open the interactive map with Available selected.
  Aligned the guide actions, homepage carousel, and header map entry.
  The Reports tab and the footer's report directory link remain available.
- Clarity's 3-day recording list showed a Mobile Safari session ending on
  the list-first URL. The summary did not establish which link sent it there.
  Fixed stale filters when using a menu link from the map's Reports view.
- Verified locally in Chrome at phone and desktop sizes with Google map
  tiles, report pins, and zero tracker requests. 76 focused tests, TypeScript,
  and scoped lint passed. Pending release. No push or deployment.

### 2026-11-06 — Claude (homepage, header, footer and map redesign deployed)

- Grant authorized release. Deployed commit `207a057` on `claude/ui-finish`
  (= live `75c3714` + the 2026-11-03 text-polish pass + this redesign), built
  from a clean worktree. Vercel `dpl_Bm4K9MuPHbDQNuTTtL61wkbcqzXA` promoted to
  litterbugs.app. Rollback: `dpl_2RS3Sa6512CazvnDEUqHbBZcH9p7` (75c3714) AND set
  `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` back to `4efcb52b499b446d8643528`.
- Homepage: hero is a four-step photo story labelled by bugs with a bee flight
  path and a "You earned cash" card; new "Find litter on the map" preview under
  Explore (self-hosted OpenStreetMap snapshot `public/map-preview/boone.webp`,
  live pins from `lib/map-preview.ts`, credit shown). Explore cards unchanged
  (Grant rejected a redesign there).
- Header: menu chevrons, bug + one-line intro in each dropdown, bugs in the
  phone menu, raised "Get started" button, phone header no longer overflows.
- Footer: lavender band with grouped links; compact one-row version on /map.
- Map page: bug-and-label pins (ladybug + "$5" only when funded; ladybug,
  caterpillar = in progress, flower = cleaned up), pointed tails, hover cards,
  group hover lists (3 + "N more spots here"), map key replaces zoom buttons
  (e2e now zooms with the wheel). Shared code in `lib/map-marker-glyph.ts`.
- Google Maps: new style "Litterbugs calm" + map ID "Litterbugs Web Map calm"
  (`4efcb52b499b446d52151a19`) in project litterbugs-auth; production env var
  now points to it. The old map ID and its style are untouched.
- Flicker fixes: preference refresh keeps unchanged Sets (stopped 30s blanking);
  `StableReportClusterer` reuses group bubbles whose members are unchanged.
- Grant's wording/colour preferences: avoid "reward" in new copy (use cash /
  earn); logo colours only for logo and bug icons, UI in light pastels.
- Checks: eslint clean; lib tests pass except two pre-existing failures in
  `lib/website-outcomes.test.ts` (fail on 75c3714 too). Component tests can't
  run locally (`@testing-library/react` missing). Live: /, /map, /reports,
  /about, /help, /support, /get-app 200; map verified with analytics declined
  in the test browser (0 tracker requests).
- Pending: "Reporter reward details" and other existing menu links still say
  "reward"; tablet-width compact footer wraps to two rows.

### 2026-11-06 — Codex (Luke's admin sending setup)

- Confirmed the runbook documents admin mail forwarding to both owners and
  separate support routing. Cloudflare dashboard requires Grant's sign-in.
  Luke confirmed Gmail web/app. Google Workspace is the durable Gmail option
  given Google’s announced January 2027 removal of third-party Send As. Pending
  free mailbox decision after Grant declined a paid subscription. Zoho Free
  supports a hosted domain in eligible regions, with external forwarding on
  paid plans. No mail, DNS, account, or deployment changes.

### 2026-11-06 — Codex (admin email sending options)

- Confirmed public MX records point to Cloudflare Email Routing. Reviewed options
  for Luke to send as `admin@litterbugs.app`. No mail, DNS, or deployment changes.
  Pending choice of Luke's mail client and outgoing mail setup.

### 2026-11-06 — Codex (GitHub handoff)

- Grant requested the latest code on GitHub. The working branch is
  `claude/ui-finish`, with the recent website changes, handoff notes, and
  Claude's homepage preview. The exact deployed website source is commit
  `75c3714` on `codex/report-discovery-release`.

### 2026-11-06 — Codex (steadier map discovery and centered loader deployed)

- The empty panel uses the caterpillar, a honey-yellow full-width wider-area
  action, an aligned location form separated by “or,” and a lavender Clear
  filters button. Removed the minus and the extra report action. Released
  in `fb342a8` and `9f9738c`.
- Discovery waits for restored filters and only renders matching responses.
  Panning keeps the previous cards while the new viewport loads for the same
  filter and place selection. The textless honeybee is delayed, centered, and
  64px wide on cold loads and filter changes. Production release `75c3714`,
  Vercel `dpl_2RS3Sa6512CazvnDEUqHbBZcH9p7`.
- Verified live with analytics disabled and delayed requests. Dragging
  preserved the existing cards, changing filters and reloading showed no
  unfiltered cards, and the bee centered on desktop and phone widths.
  101 focused tests and TypeScript passed.

### 2026-11-06 — Codex (flat map empty state deployed)

- Replaced the focus jump with a city/address search in the results panel.
  Widening zooms out and removes a distance limit while keeping other report
  filters. Filter recovery is contextual. Removed the boxed backgrounds and
  explanatory copy, kept a small Report litter link, and branded the search
  focus and butterfly map icon. Reporter copy now says “earn cash from
  funded cleanups.”
- Production release `c9c87a2`, Vercel `dpl_GZnE79qZGnhXTs3zcMBtGcPJqTUD`.
  Verified desktop widening, mobile Boone autocomplete, purple focus, and
  updated reporting copy live with analytics disabled. 51 tests and
  TypeScript passed.

### 2026-11-06 — Codex (reporter rewards copy deployed)

- Report sign-in and signup now say “Put litter on the map and earn cash
  rewards from funded cleanups.” Production release `06af10a`, Vercel
  `dpl_2MGE7wywr5y6nXFGUHnv4KwjpTjh`. Verified both live prompts with
  analytics disabled. 21 auth tests passed.

### 2026-11-06 — Codex (fund and report sign-in copy deployed)

- Shortened the fund and report subheadings. Production release `cd9e63b`,
  Vercel `dpl_1gZwp468preQtofcgAGTYc6AS7sy`. Verified both intents in
  sign-in and signup on the live site with analytics disabled. 32 focused
  tests passed.

### 2026-11-06 — Codex (cleanup sign-in copy deployed)

- Shortened the cleanup sign-in and signup subheading to “Make your
  neighborhood cleaner and earn money along the way.”
- Production release `b226330`, Vercel `dpl_BE8emZPrpmywDKSi3pzR3LC68DBY`.
  Verified both prompts on the live site with analytics disabled. 29 focused
  tests passed.

### 2026-11-06 — Codex (report experience and participation analytics deployed)

- Production `litterbugs.app` is release commit `ed5af57` on Vercel deployment
  `dpl_A676pdDE91TnjBBM2ZhjK7uiSnrb`. It includes `17131bd` plus the homepage
  button icons. The release was based on live `2a78638` and applies the
  participation fixes and this pass's web changes. The local Claude homepage
  preview remains in its branch. No GitHub push or database changes.
- The expanded report photo fills its column and details scroll above the
  footer. Mobile sheets support a handle swipe and a visible Back to map
  button. Report CTAs are Fund and Clean with logo characters and two brand
  colors. Shared report actions use the same labels. The homepage action
  buttons and completed cleanup link use logo marks. Web rank badges use
  smooth logo-style art and show the next rank's icon in the progress panel.
- The report, fund, and clean sign-in prompts explain the benefits. The release
  also includes the Rewarded empty result recovery and direct cleanup sign-in.
- 150 focused tests and TypeScript passed. Confirmed the medium-width report
  layout, touch emulation, explicit back button, and direct clean sign-in.
  PostHog project 695338 recorded all nine labeled QA events, one each of
  action_tapped, auth_shown, and auth_closed for report, fund, and clean.
  Test ran at 10:06 ET with referrer `qa-report-release-20261106.invalid`.
  Restored analytics exclusion and closed the test context. Real publication,
  payment, and cleanup claim/evidence outcomes were outside the live smoke test.

### 2026-11-06 — Codex (cleanup continuation and participation tracking)

- Shared public report Clean up this report now goes through direct sign-in,
  preserving report and community. After auth, eligible unclaimed reports open
  the existing safety review once. Explicit site confirmation and claim still
  required. Map sign-in now also preserves selected funding/cleanup intent.
- Added participation_step with allowlisted action, stage and normalized
  page type. Report tracks location/wizard/publication, fund tracks amount/
  payment/observed confirmation, clean tracks safety/claim/evidence submission.
  Tracks relevant entry taps and auth shown/submitted/closed, with bounded
  memory queue for events before PostHog starts. Existing privacy controls
  apply. No contact details, report IDs, or input values in event payloads.
- Local browser verified public cleanup link opens clean-specific sign-in,
  retains report and Boone, and Rewarded empty result CTA preserves severity.
  Screenshot .playwright-mcp/rewarded-empty-results.png. Browser had existing
  favicon.ico 404. 122 focused tests, TypeScript and scoped ESLint passed.
  No real sign-in, claim, payment, live analytics ingestion, or deployment.
- Funnel analysis should use session counts and separate signed-in starts from
  auth paths. External browser handoffs can split sessions. Cleanup evidence
  submitted and payment observed confirmed are distinct from approval/ledger.

### 2026-11-06 — Codex (map activation and participation review)

- Fetched GitHub. Working source matched origin/claude/ui-finish 8349fe3 before
  edits. Production remains 2a78638. Verified PostHog watcher 1kdPlWal tracks
  mobile sessions reaching /map, not specifically homepage entries.
- Directional raw tracked sample over 3 days through Nov. 6 ~9:30 AM ET, with
  no watcher test-account filters: before the 10:39 PM Nov. 5 build, 1/24 mobile
  homepage-entry sessions reached /map, 8/49 mobile sessions reached it from
  anywhere and 15/49 began at /get-app. Eight pageviews in three desktop
  sessions since build start, zero mobile pageviews. No rollout inference yet.
- Clarity: Nov. 5 12:13 Instagram visitor used Continue on the website, opened
  two reports, selected Rewarded at 05:05 and saw no results. 12:59 Instagram
  visitor tapped Clean up this report and saw the repeated report with a second
  sign-in button. 1:23 Google referral read about/policy/support/funding without
  selecting a cleanup. 9:32 PM showed older report login, before new signup.
  PostHog website replay query empty and website SDK has recording disabled.
- Local changes: funded-empty results explain the shortage and offer Include
  volunteer cleanups without losing area/other filters. Restore community action
  intent counting through validated same-origin sign-in next paths. Correct
  stale public funding link test. 53 focused tests, TypeScript, lint passed.
- Outcome events named by web source absent from PostHog taxonomy. Add and
  verify action-stage coverage before interpreting lack of outcome events.
  Recommend continuing watcher, separate /get-app acquisition traffic and
  direct map entries, and carry shared-report cleanup intent through sign-in to
  explicit safety/claim review. No push, deployment or account changes.

### 2026-11-05 — Claude (map-first navigation and report flow deployed)

- Grant authorized release. Deployed 2a78638 on claude/review-fixes-release
  (/tmp/litterbugs-claude-review-release) = live 363dc75 + the 29 web files
  from 39eee49 + Suspense build fix a2db52c. Homepage preview NOT deployed.
- First staging build failed: useSearchParams in MapLoading needed a Suspense
  boundary for prerendering /sign-in (dev server doesn't catch this). Fixed;
  /sign-in is now force-dynamic. Run a production build before releases.
- dpl_HvqxR1Q3txzT5uqWextd9VqyEu42 promoted to litterbugs.app. Rollback:
  dpl_J48BBiaqV9bqDDNpqHVHtzNpfAtj (363dc75).
- Live checks (test browser opted out via saved analytics choices on
  robots.txt first; 0 tracker requests): Report trash → map shell → sign-up
  over the live map; X keeps the same map and switches URL/title to the map;
  phone header shows the gold Map button, no overflow at 402px; main pages 200;
  zero Vercel runtime errors. /report now streams the map shell then
  redirects in-page (HTTP 200) for signed-out visitors.
- Tests 718/719 (stale Codex funding test). Staging can't show Google tiles
  (key is restricted to litterbugs.app) — expected.
- Pending/not done: homepage map preview (Grant deciding; Maps Static API is
  not enabled on the project). Signed-in wizard not visually checked.

### 2026-11-05 — Claude (map-first navigation and report flow polish, local and uncommitted)

- Why: PostHog showed 1 of 28 phone homepage visits reached /map in 7 days;
  phones had no visible map entry and 41% left before 25% scroll (Clarity).
- Homepage: Choose a spot and Find a cleanup now open the map
  (/map?view=map&browse=1&status=available, lib/home-map-link.ts). Report
  litter card is now one "Start a report" link to /report (no homepage photo
  picker). Hero has a "See litter near you" map button under the app badges.
- Phone header (≤520px, non-map pages): the standard gold-outline Map button
  (same as wider screens, per Grant) replaces the search icon; fits at 360px.
  Map pages unchanged (bottom tabs).
- Map loading placeholder now reads the destination view (useSearchParams) so
  it no longer shows the report list before switching to the map (desktop
  jump Grant reported); phone placeholder toolbar matches real height.
- Report flow: purple theme for pin, "Where is the litter?" box (subheading
  removed), wizard and draft dialogs; one heading per wizard step (step name;
  old "New Litter Report" title and step sub-headings removed); "Keep your
  report?" subheading removed. Any leftover homepage photo auto-imports.
- Completed cleanup cards show /reports/{id}/photo/after first ("After
  cleanup" tag), falling back to the original photo.
- PostHog: saved favorited insight "Phone visits that reach the map"
  (1kdPlWal), weekly session funnel; baseline ~15% this week.
- Tests: 718/719 pass (only the stale Codex funding test). Typecheck/lint
  clean. Checked on iPhone simulator + localhost. Signed-in wizard/pin box not
  visually checked (needs a login). Not committed or deployed.
- Follow-up same session: hero "See litter near you" removed at Grant's
  request (hero back to live). /sign-in now renders the live map (forced
  view=map) behind the sign-up form as a pop-up; close/"Keep exploring the
  map" go to /map?view=map (or the community page). Map sign-up pop-ups with a
  report/fund/clean intent also offer "Keep exploring the map".
- Later: "Start a report" renamed "Report trash" (homepage card and header
  Report menu); both link straight to /sign-in?next=%2Freport&view=map
  (REPORT_ENTRY_HREF) to skip the blank /report redirect hop; signed-in users
  are forwarded to /report by the sign-in page. /report and /sign-in now have
  the map loading shell (always map view). "Keep exploring the map" button
  removed. Closing the sign-in pop-up keeps the same map mounted and just
  replaceState()s the URL to /map?view=map (no reload); community entries
  still navigate back to the community page.
- Brand bug icons: cut from the logo into public/brand/bugs/*.png with a
  BrandBug component; used for report-list loading (hovering bee), empty
  (butterfly), error (ladybug), notifications empty, auth email-sent, and the
  keep-exploring button.

### 2026-11-05 — Claude (report sign-up, notifications, phone pills deployed)

- Grant authorized release. Deployed commit 363dc75 on
  claude/review-fixes-release (worktree /tmp/litterbugs-claude-review-release),
  based on live 73ff529 plus only the 10 web files from 40dcbb2 (entry below).
  Homepage preview on claude/ui-finish was NOT deployed.
- Vercel remote production build dpl_J48BBiaqV9bqDDNpqHVHtzNpfAtj staged,
  checked (/sign-in?next=/report shows new sign-up heading), then promoted to
  litterbugs.app. Rollback target: dpl_9YKnaEU5K1aGBs1VvMpfLvMjEdAR (73ff529).
  Live: /, /map, /reports, /get-app, /support return 200; zero runtime errors.
- Tests: 718/720 pass. display-photo-cache timed out only under full-suite load
  (passes alone). FOR CODEX: app/reports/[id]/page.test.tsx still expects
  "Fund this cleanup" to link to /map; since 73ff529 it links to /sign-in.
  Stale test from the funding release, not this change; left untouched.
- No push, database or settings changes. Live check was server-side only, so
  no analytics visits; signed-in notifications page not exercised.

### 2026-11-05 — Claude (Clarity/PostHog review fixes, local and uncommitted)

- From replays: signed-out Report opened a generic login-first box and one
  visitor gave up. Map report prompts now pass the report intent, and report
  sign-in (map dialog and /sign-in?next=/report) opens on account creation:
  "Create a free account to report litter". Fund, clean and header sign-in
  are unchanged.
- Notifications: the whole row now opens the notification (stretched title
  link, chevron, hover/focus state). "Mark read" stays separate. Dead clicks
  on message text were seen in Clarity.
- Files: auth-dialog(+test), public-account-action, map-experience,
  sign-in-form(+test), notification-inbox, globals.css, account-theme.css.
  Built on fb7d785; edited files match live 73ff529. 36 focused tests pass
  (temporary testing-library config in Claude's scratchpad; dependencies
  unchanged). Typecheck/lint clean for these files. Report screen checked on
  localhost at phone width; notifications not checked visually (needs sign-in).
- Not committed, deployed or pushed. Please don't sweep these into an unrelated
  commit. Still recommended: exclude Clarity from /admin and /account, filter
  browserless bot pageviews from PostHog, keep element labels on autocapture.
- Added Refero MCP to Claude user config (OAuth, no key stored); Grant must
  sign in once.
- Grant's request: phones (≤760px) no longer show the All reports/Available/
  Rewarded/Volunteer/In progress/Completed pills on Map or Reports, matching
  the iOS app. CSS only (report-controls.module.css); every choice remains in
  the Filters panel. Desktop unchanged. Checked in iPhone simulator Safari
  against localhost: Map, Reports and Filters panel.

### 2026-11-05 — Codex (GitHub handoff)

- Grant requested GitHub access for Claude. Publish the latest committed
  working branch claude/ui-finish and the exact production commit 73ff529
  on codex/funding-discovery-release to jameslukebdev/litterbugs_app.
- The working branch includes the unpublished homepage preview and handoff
  notes. Uncommitted edits in the shared workspace are outside this push.
  No production deployment or merge to main.

### 2026-11-05 — Codex (funding, map, and store tracking deployed)

- Grant authorized release. Deployed commit 73ff529464211dbd79ff803cf0bbc1563a92338b
  from codex/funding-discovery-release at /tmp/litterbugs-funding-discovery-release.
  Based on production 70633a6 with the 12 scoped web files from f5fcddb.
- Vercel dpl_9YKnaEU5K1aGBs1VvMpfLvMjEdAR passed the production build and
  staged smoke checks, then was promoted to litterbugs.app. Previous production
  deployment was dpl_59fVVvYo3tdMdh2CVBpS7jPawo6N.
- Live mobile-sized browser verified direct funding sign-in from the shared
  report, preserved report destination, existing map sign-in, no browse=1
  on load, and Instagram Play campaign link. Test analytics excluded before
  navigation. Zero tracker requests, browser errors, or deployment error logs.
- Signed-in checkout, physical store handoffs, and live analytics ingestion
  were not exercised. Apple campaign attribution awaits a generated campaign
  link. No database migrations or push.

### 2026-11-05 — Codex (funding, map, and download changes ready locally)

- Public report funding now goes directly through the existing sign-in route,
  preserving the report and community return. Existing members skip the form.
  The eligible report opens its named amount review once after auth and funding
  checks. Changing reports clears the funding intent. No payment attempted.
- Map restores saved browse state without adding browse=1 at load. Explicit
  filter and sort changes still update shareable URLs and preserve map hash.
- Added privacy-filtered app_store_badge_clicked events with platform and
  allowlisted Instagram campaign. Tagged Google Play outbound link on Instagram
  get-app arrivals. Apple App Store campaign attribution needs a real generated
  campaign link/provider token. Store clicks remain distinct from installs.
- Local browser verified direct funding sign-in, map hydration URL, and tagged
  Play destination. 90 focused tests, TypeScript, scoped ESLint passed.
  Physical Instagram/store checks and real signed-in checkout remain untested.
  No app store settings, database changes, push, or deployment.

### 2026-11-05 — Claude (fixed screenshots submitted to Google Play)

- Fixed blank white phone bottoms: each phone frame is now sized to its
  screenshot (commit faa5cb2). Apple zip regenerated.
- Google Play: replaced the 8 phone screenshots (the earlier upload had the
  blank-bottom version) with `*-v2.png` in order 01–08, chose "Don't label
  assets", and submitted. Publishing overview shows only "Change Phone
  screenshots" in review; no countries change was pending.
- Apple: Grant emailed Luke the images himself. If that email predates
  faa5cb2, Luke needs the regenerated `apple-1320x2868/` set.

### 2026-11-05 — Codex (funding, map, and store follow-up recommendations)

- Reproduced signed-out funding locally on the replay's report: Fund this
  cleanup opens the map, then Sign in to fund opens the auth dialog. The
  entry intent currently focuses the detail footer. Recommend starting
  sign-in directly, preserving report/community through auth, then opening
  amount review once after eligibility checks. Signed-in donors can go
  straight to amount review. No payment attempted.
- Confirmed ReportBrowser adds browse=1 when restoring/persisting browse
  state. Avoid writing hydration-only state into the URL and preserve
  explicit filter and legacy link semantics. Use pathname-based PostHog
  page views for counts and Clarity for qualitative review.
- Get-app page points to both expected listings and offers website fallback.
  Recommend a real iOS/Android Instagram store handoff check, one campaign
  per source/store, and separating website badge taps from first downloads
  and device acquisitions. No store redesign justified by this sample.
- Review only. Local browser used without production analytics. No app,
  database, analytics configuration, or deployment changes.

### 2026-11-05 — Codex (sent Luke the Apple screenshots)

- At Grant’s request, sent “New Litterbugs screenshots” to Luke at
  `jameslukeb.evj@gmail.com` with `Litterbugs-AppStore-screenshots-1320x2868.zip`
  attached. Gmail confirmed the send and showed the ZIP in Sent. Apple listing
  upload is with Luke if he wants to use the images. No deployment or push.

### 2026-11-05 — Codex (Clarity funding and download review)

- Refreshed Last 3 days from 22 to 30 recordings. Nov. 5 11:08 AM Instagram
  replay: Fund this cleanup at 00:06 opened the map at 00:07, briefly showed
  a loading shell, then repeated the report with Sign in to fund. No further
  tap before the replay ended. Same Clarity visitor's next clip opened Boone.
  Candidate: carry funding intent directly to sign-in for signed-out visitors.
- Funding and older desktop View on map both recorded an extra page entry
  when the URL gained browse=1. This is separate from map viewport tracking.
- Sampled download replays and timelines: three App Store taps and one Google
  Play tap. External installs are outside the replay. Older reporting replay
  showed a sign-in dialog and no clear repeated failure.
- No application, settings, or deployment changes. Review only.

### 2026-11-05 — Codex (website traffic check)

- PostHog's rolling 24-hour overview showed 39 reported visitors, 41 sessions,
  and 56 pageviews with test-account filtering enabled. No code, database, or
  deployment changes; no follow-up pending.

### 2026-11-05 — Codex (Apple screenshot test stopped)

- Grant signed in. Verified the October PPO test `a046d8a4-36f0-40f2-9be4-b4c3e7f1db45`
  was running since November 2 and its screenshot upload controls were disabled.
  Stopped it as requested and verified the test ended November 5.
- The eight November 5 Apple images are ready for the next app version's main
  listing. No Apple assets submitted and no new version created. App Store
  Connect also displayed an updated developer agreement for the account holder.
- Google screenshots and trader status were sent for review in the prior entry.
  No deployment or push.

### 2026-11-05 — Codex (Google screenshots submitted)

- Grant authorized submitting both existing queued changes. Google confirmed
  “2 changes sent for review”; Publishing overview lists only the ordered 01–08
  phone screenshot replacement and app-level trader declaration under Changes
  in review. Automated checks running. No country expansion included.
- Apple PPO still pending access to a signed-in App Store Connect session.
  No code, deployment, database or push.

### 2026-11-05 — Codex (Google screenshots saved; countries restored)

- Recovered native file picker after Grant dismissed prior dialog. Uploaded all
  eight November 5 Google 1080x1920 files through native picker; removed old set
  and added new library assets individually to guarantee 01–08 filename order.
  Verified ordered review screen and “Change saved” confirmation. No review
  contact sheets uploaded. Listing is saved, not yet submitted.
- Restored Production targeting to United States only and saved. Publishing
  overview confirms both “Add 176 countries / regions” and “Add rest of world”
  are gone; no country change remains pending.
- Publishing overview now has TWO pending changes: phone screenshots and
  Grant's existing app-level trader-status declaration. Menus offer only View
  change, no separate submission control; Send dialog bundles both. Canceled
  dialog without submitting. Asked Grant whether to submit both; awaiting reply.
- App Store Connect still redirects to login authResult=FAILED with blank login
  iframe. Prior listing-copy/status.json independently records expired session
  Nov 1. PPO not accessible, edited, canceled or resubmitted; cannot determine
  current editability. No request for Luke's developer-account credentials.
- No application code, database, deployment or push. Store tabs retained.

### 2026-11-05 — Codex (store upload blocker revalidated)

- Rechecked the same live Chrome handle: system Go to Folder sheet remains
  open; dismiss/raise/cancel attempts had no effect. Requested Grant close the
  sheet and cancel the picker so browser work can resume. No store change saved
  or submitted. All eight Google files are below 8 MB; size is not the blocker.
- Country discard and both screenshot submissions remain pending. No deployment
  or push. Previous upload-attempt log remains accurate.

### 2026-11-05 — Codex (store screenshot upload attempt blocked)

- Read screenshot README; confirmed both ordered 01–08 sets. Google default
  listing editor: removed old eight images in unsaved editor only, attempted
  uploading all eight new Google files. Console reported “Couldn’t upload.
  Try again.” No save or review submission completed; live images unchanged.
- Native picker fallback stalled in Go to Folder and would not accept navigation
  or dismiss through automation. Requested reload to restore saved listing,
  but subsequent browser observation timed out with picker still open; verify
  editor state before continuing. Store tabs retained for continuation.
- Country expansion was NOT discarded yet and MUST be removed before any
  review submission. No Google changes submitted.
- Apple opened App Store Connect but redirected to login with authResult=FAILED;
  login iframe remained blank/loading. PPO not accessed, edited, or canceled.
  No conclusion established about whether PPO is editable or needs a version.
- User informed of upload failure and extension file-URL access setting. No
  application changes, store publication, deployment, database change or push.

### 2026-11-05 — Codex (Google browser handoff deployed)

- Grant authorized production deployment for phone/Instagram testing. Released
  commit 70633a6 on codex/google-browser-release from isolated worktree
  /tmp/litterbugs-google-browser-release, based on live 30e4ad8. Only the eight
  auth implementation/test files from the current branch were added; homepage
  preview and store screenshot work remain excluded. No push/database changes.
- Vercel litterbugs-web production build passed compilation and TypeScript;
  staged, checked, then promoted deployment dpl_59fVVvYo3tdMdh2CVBpS7jPawo6N
  (litterbugs-7lh5z552o-grant-9890s-projects.vercel.app) to litterbugs.app.
  Previous production: dpl_EEUEyUE8M54AXbpcGsbg6NHwCy6j, commit 30e4ad8.
- Staged and live checks: /auth/google returns 303 to Google via Supabase,
  s256 challenge + verifier cookie, no-store, correct same-origin callback;
  embedded Instagram UA gets /sign-in fallback without starting Google.
  Live mobile sign-in renders usable Google/email controls. Test browser
  excluded via existing saved analytics choices before navigation; no Clarity
  script loaded. No real login or credential changes.
- Physical Instagram iOS/Android handoff and completed Google login remain for
  Grant's test; iOS scheme can be blocked by Instagram. Manual fallback retained.

### 2026-11-05 — Claude (store screenshot upload prep)

- Google upload not done: Claude in Chrome wasn't connected, and the built-in
  browser can't upload files. Grant to upload
  `release-assets/store-screenshots-2026-11-05/google-1080x1920/` (Main store
  listing > Phone screenshots). Grant reports trader status is declared. The
  staged all-countries change is still in Publishing overview and would go out
  with any review submission unless discarded.
- Gmail draft to Luke (jameslukeb.evj@gmail.com) with App Store upload steps,
  not sent. Attach `Litterbugs-AppStore-screenshots-1320x2868.zip` (same folder).

### 2026-11-05 — Codex (Google external-browser handoff, local only)

- Replaced the Instagram/Facebook Google warning-only path with a synchronous
  browser-launch attempt: Android Chrome intent (with safe fallback); iPhone/iPad
  x-safari-https scheme. iOS scheme is best effort, not an Apple-documented
  universal guarantee; Instagram can block it. Manual/email fallback remains.
- External browser opens same-origin /auth/google?next=..., then server starts
  Google OAuth and sets PKCE cookie in that browser. Never transport verifier,
  OAuth authorization URL, credentials or session from Instagram. Query/fragment,
  report and intent retained in next; unsafe/looping return paths rejected.
- /auth/google refuses to start OAuth in recognized embedded social UA and
  returns a usable sign-in page; startup errors give retry/email fallback.
  No caching of authorization redirect. Normal-browser Google flow unchanged.
- Validation: 47 focused tests passed, then one extra unsafe-next case added
  (18 handoff/route tests passed); TypeScript and scoped ESLint passed. Prior
  /tmp testing dependency/config workaround retained; no dependencies changed.
  Browser plugin absent; used localhost Playwright. Actual route returned Google
  redirect with s256 + Set-Cookie for verifier; embedded route returned fallback
  without verifier. Mobile fallback rendered with enabled email/Google, no
  runtime errors/warnings or overlay. Screenshot in ignored .playwright-mcp/
  browser-handoff-fallback.png. React component review completed.
- Physical Instagram on iOS/Android app-switch and real Google completion remain
  unverified. No real sign-in, account/settings/database change, push or deploy.
  Existing homepage preview is preserved. Changes committed on claude/ui-finish.

### 2026-11-05 — Codex (Clarity follow-up fixes, local only)

- Investigated funding anchor: homepage Choose a spot and direct loads at
  widths 360/390/1280 land fundable-reports at ~112px below the header, stable
  after loading. No anchor defect reproduced; no funding-layout changes.
- Google docs confirm embedded-user-agent restrictions. AuthDialog now detects
  Instagram/Facebook embedded UA on Google click and explains opening this page
  in Safari/Chrome or using email; no OAuth request is started in those known
  embedded browsers. No cross-browser OAuth URL/PKCE handoff attempted.
- Confirmed code had no recovery if social redirect stalled: added 15-second
  recovery and persisted pageshow recovery, restoring email/retry/close. Also
  retain current URL hash in fallback OAuth return destination.
- 25 focused tests passed (auth dialog/public account), TypeScript and scoped
  ESLint passed. Existing missing local testing-library/react/react-dom types
  supplied via prior /tmp test config; dependencies unchanged. Browser plugin
  not available; used Playwright localhost. Browser confirmed Instagram guidance
  and enabled controls; normal Google redirect intercepted before provider,
  with expected callback and s256 challenge. No real login/account changes.
- Screenshot .playwright-mcp/instagram-auth-guidance.png. No browser errors;
  Next development warning recommends eager loading for an above-fold report
  photo after anchor navigation, unrelated to anchor correctness. Local visits
  do not load production analytics. No Supabase/settings changes, push or deploy.
- Remaining limitation: physical Instagram iOS/Android Google completion is
  unverified; replay ending after two seconds does not establish a failed login.
  Changes are committed locally on claude/ui-finish alongside existing preview.

### 2026-11-05 — Codex (four Instagram replays watched)

- Watched the four recordings identified above through playback, including
  replaying the funding-page start. m7l1l6: account modal renders, Google click
  shows disabled Signing in with Google state; recording ends about two seconds
  later. No visible error; external OAuth is outside this replay, so failure
  is not established. Instagram Google login remains a verification candidate.
- oxilgr: normal homepage scrolling to funding card, Choose a spot click near
  the end; no destination captured. qbnxkg: funding page appears already deep
  in fee/refund prose at the beginning, then shows fee explanation before page
  becomes hidden. Candidate: check anchor landing/scroll restoration on mobile;
  replay reconstruction can affect this, so no confirmed live defect. Source
  puts fundable-reports section after the long explanation and refund sections.
- 4ni8ri: homepage renders, visitor scrolls to completed-cleanup/footer and
  returns to hero; hidden after about 20s through end at 50s. No visible error,
  repeated failed click, clipped dialog or broken layout observed in these
  sampled replay frames. No app changes or deployment; documentation only.

### 2026-11-05 — Claude (store listing review and new screenshots)

- Reviewed live Google Play and App Store listings. Findings: the Play set uses a
  stock photo and website (not app) screens; Apple still shows older plain
  screenshots (new set only in an Oct 31 PPO test); Play is rated 17+ vs Apple
  4+; the Apple privacy label says "Not Linked to You"; listings say "Donate"
  while the terms say contributions are not donations; the support email is
  admin@ rather than support@.
- Built new 8-image sets from real iPhone captures in website colors (lavender,
  no green, no purple): `release-assets/store-screenshots-2026-11-05/` (Apple
  1320x2868, Google 1080x1920), led by paid cleanups captured Nov 5 from the 2.0.1 simulator build. The outside cleaner's name is blurred. Not
  uploaded; Apple upload needs Luke.

### 2026-11-05 — Codex (Clarity recording triage)

- Checked live Clarity Last 3 days: 22 completed results; newest listed Nov. 4
  11:52 PM (dashboard times; timezone not verified), plus one live user.
  Yesterday's reviewed 2:34 recording is still listed at Nov. 4 06:35 AM.
- Four newer Instagram mobile recordings: 23:52 / 50s / no clicks;
  21:20 / 18s / fund-a-cleanup / no clicks; 21:19 / 20s / one click;
  21:05 / 10s / two clicks. Inspected event timelines of both clicking sessions:
  oxilgr clicked Choose a spot at 19s; m7l1l6 clicked Log in / Sign up at 6s,
  then Continue with Google at 8s. Google authentication completion is not
  established; Instagram in-app Google login is the main follow-up candidate.
  No failure confirmed. Separate visitor IDs do not prove separate people.
- Review was recording-list/event-timeline triage, not full playback of all
  sessions. Repeated desktop visitor 7fojoo may be staff; identity unverified.
  No site visit, code, settings, database or deployment changes. Documentation
  only; no push. Pending: follow Google sign-in outcome if investigating further.

### 2026-11-05 — Claude (Stripe cases and Play staging)

- Grant replied to Stripe case sco_VJarfjNbi0QKE3 (Global Payouts / pooled
  model) answering Stacy's four questions factually: Litterbugs is merchant of
  record; no money-transmitter license or exemption opinion. Awaiting Stripe.
  Separate 2026-11-04 Connect pricing email also awaiting reply.
- Play Console: a change adding all countries (176 + rest of world) is saved
  but NOT sent for review; it is blocked until the trader-status declaration is
  done. Grant wants a business address first (no home address public).
  Cleaner payouts remain US-only in code. Goal: South America pilot (Ecuador or
  Peru suggested) pending Stripe and a payments-lawyer consult.

### 2026-11-05 — Codex (authorized reply sent to Stacy)

- Sent Grant’s exact supplied answers to the four review questions in original
  Stripe case `sco_VJarfjNbi0QKE3`. Verified outgoing message addressed to
  support@stripe.com and Stripe confirmation “Your message has been sent!”
  No account settings, financial transactions, or deployments changed.
- Awaiting Stripe’s review; screenshot `/tmp/litterbugs-stripe-stacy-reply-sent.png`.

### 2026-11-05 — Codex (new Stripe pricing reply checked)

- Pricing case `sco_VZJHsoGY2oq3z3`: Zachary replied November 5 at 8:27 AM
  (dashboard time). No small-payout-specific monthly fee waiver/reduction;
  recommends existing Express + Separate Charges and Transfers setup. Custom
  pricing volume question escalated to specialists; case In progress.
- No reply sent, configuration changed, or deployment made.

### 2026-11-05 — Codex (older Stripe support reply checked)

- Read case `sco_VJarfjNbi0QKE3` (created September 23). Latest reply is
  November 3 from Stacy; status Action required. Stripe asks who is merchant
  of record, who legally owns contributions before payout, how unused funds /
  refunds / disputes work, and whether a money-transmission licence or exemption
  applies. Internal classification and supportability review remains pending.
- No reply sent, settings changed, or deployment made.

### 2026-11-04 — Codex (live website source backed up to GitHub)

- At Grant's request pushed the exact live deployment commit
  `30e4ad8d5a878a20a76e8a3b3d5f0102a1618562` to origin branch
  `codex/map-measurement-release`. Verified the remote ref matches. GitHub
  `main` remains `e00973a`; unpublished `claude/ui-finish` homepage polish was
  not pushed. Scanned 685 new Git blobs for common credential patterns;
  no matches, and only example env files are tracked.
- Before pushing verified Vercel project has no Git repository link and
  GitHub Pages builds only `main`. After pushing: zero Actions runs or GitHub
  deployments for the release branch/commit; Vercel's newest deployment and
  production target both remain `dpl_EEUEyUE8M54AXbpcGsbg6NHwCy6j`, READY,
  commit `30e4ad8`. No deployment, application code, database or settings changed.
- This handoff entry is committed locally on `claude/ui-finish`; the remote
  release branch intentionally points at the exact deployed source. No pending
  work for this backup; merging into `main` remains separate work.


### 2026-11-04 — Codex (website source location)

- Confirmed current website source is `apps/web` in this local project on
  `claude/ui-finish`; its only website differences from release `30e4ad8`
  are the two homepage preview files. Latest recorded production source is
  `codex/map-measurement-release`, commit `30e4ad8`, in
  `/private/tmp/litterbugs-map-measurement-release`. No deployment or push.


### 2026-11-04 — Claude (Stripe pricing request)

- Grant emailed Stripe on 2026-11-04 asking about a lower Connect monthly
  active-account fee for small payouts, a better-suited setup, and the volume
  that qualifies for custom pricing. Awaiting reply. Decision so far: keep
  Stripe as the core; consider Venmo/PayPal later for reporter rewards only.

### 2026-11-04 — Codex (traffic sources)

- PostHog's rolling 24-hour breakdown showed 9 direct, 5 Facebook and 1
  Instagram reported visitors. A separate Clarity last-day report showed
  approximate locations for some sessions. No site or deployment changes.

### 2026-11-04 — Codex (website traffic check)

- Queried PostHog's rolling 24-hour website overview: 15 reported visitors,
  16 sessions and 27 pageviews with test-account filtering enabled. No code,
  database or deployment changes; no follow-up pending.

### 2026-11-04 — Codex (support test email)

- At Grant's request sent “Litterbugs support email delivery test” from
  `gegibson@icloud.com` to `support@litterbugs.app`. It appeared in Sent, but
  not in the iCloud inbox or Junk after about 90 seconds and a mail refresh.
  End-to-end forwarding remains unverified; same-account forwarding or delay
  may affect this test. No configuration or deployment changes.

### 2026-11-04 — Codex (support delivery verification attempt)

- Public MX records currently point to Cloudflare. Mail on this Mac can view
  messages addressed to `grant@burrowbase.com`, but a search for the support
  address found only two outgoing Litterbugs password-reset messages from
  August, not evidence of forwarded support mail. Browser access was disabled;
  current Cloudflare rule and end-to-end delivery remain unverified. No email
  sent and no configuration or deployment changes.

### 2026-11-04 — Codex (support email routing check)

- The launch runbook records `support@litterbugs.app` forwarding through
  Cloudflare to `grant@burrowbase.com`; current routing and delivery were not
  independently verified. No configuration or deployment changes.

### 2026-11-04 — Codex (map and support measurement deployed)

- Grant authorized production deployment. Released committed source
  `30e4ad8d5a878a20a76e8a3b3d5f0102a1618562` from
  `codex/map-measurement-release` (worktree `/tmp/litterbugs-map-measurement-release`).
  This contains `ff4eed6` fixes and restores the two homepage preview files to
  their live-site versions. `claude/ui-finish` retains its homepage preview;
  that preview was NOT deployed. No source push or database/Stripe changes.
- Vercel project `litterbugs-web`, deployment
  `dpl_EEUEyUE8M54AXbpcGsbg6NHwCy6j`, built remotely with production settings,
  passed build/TypeScript and HTTP 200 checks for report, map and support,
  then promoted to https://litterbugs.app. Previous deployment for reference:
  `dpl_AzEFiuUnqbwFbuMjZKKWmPLJRL92`.
- Live mobile verification: View on map shows the pin and compact details;
  opening/closing details stays on `/map`; zoom changes only `#map` viewport.
  Live support clicks emitted `support_checkout_clicked` with $5/$10 selected
  amounts. Checkout navigation was prevented; no live payment attempted.
- Test browser excluded through saved Analytics choices before navigation;
  no Clarity/GA scripts loaded and no tracked test click was sent. Genuine
  visitor analytics remain enabled. Event ingestion into dashboards was not
  tested with live tracked traffic; paid-subscription reporting remains Stripe.
- Browser: no errors; only CSS preload warnings. Deployment error log query
  returned no entries. Screenshot `/tmp/litterbugs-live-map-mobile.png`.
  Nothing else pending for this deployment.

### 2026-11-04 — Claude (Stripe payout cost analysis, read-only)

- Stripe docs: a connected account is "monthly active" ($2) in any month it
  receives at least one successful bank payout; each payout also costs
  0.25% + 25c. Transfers into the connected balance alone do not count.
- Cleaner accounts use Stripe's default daily automatic payouts (2-day delay),
  with Litterbugs as controller (Express dashboard), so every reward reaches the
  bank within days and triggers that month's $2. The platform can switch these
  to manual payouts (US holding limit: 2 years).
- Correction to earlier notes: the Greenwood $25 cleaner and today's $5 payout
  went to an outside cleaner, not to Grant or Luke.
- Proposal discussed with Grant (not implemented): a member "cash out" with a
  minimum, plus optionally 20% + 50c on every donation. No changes made.

### 2026-11-04 — Codex (map, photo and measurement follow-up completed locally)

- Implementation commit `ff4eed6` on `claude/ui-finish`. Nothing pushed or
  deployed; no database or Stripe configuration changes. Existing homepage
  preview work remains in place.
- Public View on map links now use `intent=locate&view=map`. The report pin
  takes priority over community bounds, remains visible despite saved filters,
  and has a compact details control above mobile navigation. Opening details
  and dismissing them stays on the map. Fund/clean, receipts, community returns
  and ordinary shared-report dismissal retain their existing behavior.
- Map viewport writes now use `#map=lat,lng,zoom`, with the existing rounded
  coordinates. Legacy query links still load; new fragments take precedence.
  Query identity stays stable while moving/zooming, avoiding Clarity's extra
  page entries. Hash is preserved through other map actions. Production
  Clarity reporting wasn't exercised because local test visits exclude analytics.
- Desktop browser: actual Choose photo file-chooser events, cancel/empty
  selection, real browser image preparation and preview, save with avatar path,
  and canceling profile edits passed. Used a temporary local route rendering
  AccountDialog and intercepted all account/storage/media responses. The route
  and test cookie were removed. No real profile modified; live photo scanning
  and storage were not tested. No photo-control defect reproduced or code fix
  made; photo regression tests added.
- Added `support_checkout_clicked` to GA/PostHog with only allowlisted monthly
  amount, USD and month properties. Exclusion/privacy settings still apply;
  no automatic permission prompt. Browser check prevented checkout navigation.
  This event means intent, never completed payment. No live payment attempted.
- Existing paid-support source is Stripe's Litterbugs subscription/payment
  records. For automated completion reporting, verify support Payment Link or
  price, subscription mode and paid status; handle delayed payment success,
  deduplicate by checkout/subscription for first payment and invoice for renewals,
  and keep these separate from cleanup contributions. Subscription creation or
  thank-you-page visits alone do not prove payment. Such server-side completion
  tracking was recommended, not added to the existing cleanup webhook.
- Validation: 176 tests across 11 relevant suites, scoped ESLint and TypeScript
  passed. Missing local test/react-dom type packages were supplied through
  temporary /tmp configurations, without project dependency changes. Playwright
  at 390×844 and 1280×900: correct pages, meaningful rendering, no framework
  overlays, no console warnings/errors. Verified map detail open/close, stable
  query on zoom, fund/clean entry, community return and ordinary report close.
  Screenshots: `/tmp/litterbugs-map-fixed-{mobile,desktop}.png` and
  `/tmp/litterbugs-photo-preview-desktop.png`. Browser plugin unavailable.
- Grant requested removal of agent editing reservations. Removed the old gate
  and historical references; AGENTS.md now explicitly prohibits adding such
  gates. Continue preserving other edits and recording changes here.

### 2026-11-04 — Claude (follow-up on review findings, read-only)

- Stripe balance: $53.10 charged - $3.64 processing - $4.53 Connect fees
  (Sep: $4 active accounts, $0.50 payout fees, $0.03 volume) - $41.25
  transferred = $3.68. Report `ce154938` still owes $6 principal (+5% reporter
  reward), so a payout there would wait for funds. Small cleanups lose money
  once Connect's monthly active-account fee applies.
- All 12 `payment_pending` contributions are internal or Google Play's review
  account; no outside visitor has started a checkout.
- Open report-safety case (TV-screen test photo, Sep 1) is stale; the report is
  past expiry and ineligible. An admin can dismiss it.
- Supabase is on the Free plan under `jameslukebdev's Org`. Database is 323 MB
  of 500 MB: `net._http_response` is 263 MB of dead space with only ~720 live
  rows; `cron.job_run_details` has 210k rows since Dec 2025. Not changed.

### 2026-11-04 — Claude (read-only business study)

- Grant connected Stripe (live Litterbugs account), PostHog, Expo, and signed in
  to Clarity, Google Analytics and Play Console in Claude's browser. Google Play
  reviews through Expo fail: the Google Play Android Developer API is disabled
  for the linked Google Cloud project (not changed).
- Read-only findings: all 7 live Stripe charges ($53.10) came from Grant's or
  Luke's emails; $41.25 transferred. Stripe available balance $3.68 while report
  `ce154938` still holds $6 of unpaid pooled principal. 12 `payment_pending`
  contributions ($221 principal, Sep 3 to Oct 28). One report-safety case open
  since Sep 1. No code, database, Stripe or deployment changes.

### 2026-11-04 — Codex (Clarity follow-up investigation; investigation completed)

- Grant requested map/photo/analytics/support investigation and fixes. No application
  code, database, Stripe configuration or deployment changes. This entry is a
  documentation-only change.
- Reproduced locally at localhost:3000, 390×844: completed report
  `7b20f1ec-41a8-4eba-be86-f3608250638e` → View on map opens a full-height
  report sheet covering the map. Close explicitly returns to Boone community;
  verified actual navigation. URL settled at zoom 10 with selected report in a
  14-report cluster. Screenshot: `/tmp/litterbugs-mobile-map-before.png`.
- Proposed bounded fix: give public View on map its own location-only entry
  mode, show a small report-details action, prioritize report coordinates/zoom
  after community bounds are applied, and keep closing those details on the
  map. Preserve fund/clean, community receipts, account returns, shared-report
  links, ordinary pin/list clicks and browser Back behavior.
- Map idle writes lat/lng/zoom query parameters via replaceState. Clarity's
  official history implementation restarts page tracking on changed URLs,
  ignoring only the fragment: https://raw.githubusercontent.com/microsoft/clarity/master/packages/clarity-js/src/core/history.ts
  Thus viewport movement inflates Clarity page entries. PostHog manual
  pageviews depend on pathname; query-only movement doesn't increment them.
  GA application tracking is pathname-based too; GA dashboard enhanced-history
  settings weren't checked. Recommend viewport in fragment or session memory,
  preserving legacy query links and share/reload behavior; don't suppress all
  history tracking or disable visitor analytics.
- Photo picker is a native file input inside a label. No confirmed dead-click
  bug. Existing profile edit/save/cancel tests pass, but full desktop OS-picker,
  photo processing/upload/save reproduction remains unverified. Additional
  temporary photo-specific tests couldn't load outside the project; do not
  treat that as an application failure or a passing photo test.
- Support uses 3 live Stripe Payment Links in lib/monthly-support.ts. No
  dedicated support click event; analytics sanitization also removes arbitrary
  autocapture link details. Existing stripe-webhook handles cleanup payments,
  refunds/transfers/disputes, not subscription completions. Stripe dashboard
  for Litterbugs acct_1U2HZe40KMkUKMFW is the existing paid-support source;
  Stripe MCP is documented as connected to another business. No payment was
  attempted and no claim is made that the recorded visitor paid. Recommend
  allowlisted support_checkout_clicked (amount/currency only), then distinct
  server-confirmed first paid subscription and renewal metrics, deduplicated
  and restricted to support prices/links. Checkout completion can still be
  unpaid for delayed methods; use verified paid status/invoice, not a thank-you
  page visit: https://docs.stripe.com/payment-links/post-payment
- Validation: 81 existing tests passed across account-dialog,
  website-analytics, map-publication, community-journey and monthly-support.
  Missing @testing-library/react was supplied temporarily under /tmp, with a
  temporary test config; project dependencies unchanged. Local rendered map
  journey had meaningful content, correct titles, no framework error overlay
  or console warnings/errors. Browser plugin unavailable; used Playwright.
  Local analytics are disabled by hostname, so testing added no visitor traffic.

### 2026-11-04 — Claude (Claude Code desktop on Grant's Mac; local review setup)

- Grant moved Claude work from Cowork to Claude Code running directly in this
  folder. Rules for this session: no pushing and no deploying.
- Committed Codex's four 2026-11-04 log entries on `live-site-2026-11-03`
  (7320793). Then checked out `claude/ui-finish` and merged that branch in
  (c854426) so the handoff log is current. The merge only touched docs:
  `claude/ui-finish` still differs from the live site only in `brand.module.css`
  and `home-cleanup-proof.tsx`.
- Added `.claude/launch.json` ("website" runs `npm run web:dev` on port 3000).
  The site is running at http://localhost:3000 for Grant's review.
  Analytics load only on `litterbugs.app`, so local visits aren't tracked.
- Nothing pushed or deployed. Next: Grant reviews `claude/ui-finish` locally.

### 2026-11-04 — Codex (visitor recording review)

- Reviewed one 2:34 mobile Clarity recording: a completed report, map, Boone
  community and completed results, then the homepage. The replay showed a
  report panel covering the map; whether that reflects the live experience is
  unverified. One session may include testing. No code, database or deployment
  changes.

### 2026-11-04 — Codex (website behavior review)

- Reviewed recent PostHog page and device breakdowns and a Clarity session;
  reporting may include staff visits. No site, database, code or deployment
  changes.

### 2026-11-04 — Codex (app activity check)

- Checked Google Play daily active users: the newest displayed row is October
  29, with one Android user. A rolling 24-hour count was unavailable; the
  connected Supabase account still lacks the Litterbugs project. No code,
  database or deployment changes.

### 2026-11-04 — Codex (website traffic check)

- Read PostHog's rolling 24-hour website overview: 5 visitors, 6 sessions,
  and 10 pageviews, with test-account filtering enabled. No code or deployment
  changes. No follow-up pending.

### 2026-11-03 — Claude (direction correction)

- Grant rejected `claude/ui-polish`, which flattened the playful style; it is
  **shelved**. The live site's direction stays: playful colors, logo stickers,
  raised buttons, stock photos and the current layout.
- Current candidate: `claude/ui-finish` (9b563ce), based on
  `live-site-2026-11-03`. It is a subtle finishing layer at the end of
  `brand.module.css`: hero copy tone and measure, body copy at 19px instead of
  22px, legible report-card metadata, a "Browse all" link with an arrow,
  quieter captions and footer, and the heading "Most recent cleanup". Not
  deployed or pushed.

### 2026-11-03 — Claude (app screens and owner preferences)

- `claude/ui-polish` is now at 3466cbe. The three "Explore" cards show real app
  screens (`public/app-screens/{report,fund,claim}.webp`, cropped from
  `release-assets/apple-app-store/2026-10-30-prepared/source/iphone/01-03`)
  instead of stock photos. Card copy is shorter.
- **Owner preferences to keep everywhere:** no eyebrows, badges or clutter. No
  technical, meta or instructional language on the site. Show the product
  (real app screens) rather than explaining it with step lists. Reporters,
  donors and cleaners are equal audiences.
- Observation for Grant: the app's brand color is green and the website's is
  purple.

### 2026-11-03 — Claude (visual polish; question for Codex)

- Grant's feedback: no eyebrows, badges or clutter; polish the overall UI first
  and add sections later. **`claude/homepage-polish` is shelved** (it added
  FAQ/how-it-works sections, which Grant had already asked to remove on
  10/29).
- New branch `claude/ui-polish` (commit dcbd83b+, based on
  `live-site-2026-11-03`). It is CSS only: a "Refined finish" layer at the end
  of `components/public-website/brand.module.css`, plus the heading
  "Most recent cleanup" in sentence case. It removes the logo stickers,
  hard offset shadows, colored photo underlines, multi-colored headings and
  buttons, the status and rank badges on report cards, and the reward pill
  background. It adds soft elevation, a single accent color, and consistent
  16px/10px radii. No content or layout changes. Not deployed or pushed.
- **Question for Codex:** Grant says the site has three equal audiences:
  reporters, donors and cleaners. Is the hero's reporter-first message
  ("Get paid to report it") intentional? Are there positioning decisions Claude
  should respect beyond what's in docs/reviews? Please answer here.

### 2026-11-03 — Claude (homepage polish, waiting for Grant's approval)

- Branch `claude/homepage-polish` (commit b2738dd), built on `live-site-2026-11-03`.
  Built and tested in a separate copy; this folder's working tree is untouched.
- Homepage additions, keeping the current design: a trust line under the store
  badges, live impact stats (published reports and completed cleanups, both
  read with anonymous access), a "How you get paid" 3-step section with a $10
  example, an FAQ, and a dark closing call-to-action band. New files are
  `components/public-website/home-{impact,how-it-works,faq,closing}.tsx` and
  `home-sections.module.css`; `app/page.tsx` is edited.
- Screenshots: `~/Desktop/Litterbugs Homepage Preview/`.
- Not deployed. Not pushed (no GitHub login in Claude's sandbox).
- Next: image weight (rank PNGs about 1 MB each, avatar resizing).

### 2026-11-03 — Claude (git rescue; Grant asked Claude to take over)

- Did the steps of the request below myself; Codex didn't need to act.
- New branch `live-site-2026-11-03`, commit `5402a672cd1c3287920723fa50dd863941e77c8a`
  ("Save live website and app work as of 2026-11-03"), parent `12a88a8` (old
  local HEAD on `codex/account-contribution-count`). 813 files. `.env*` excluded
  and checked for secret patterns. Working tree is now clean.
- Added to `.gitignore`: `work/`, `output/`, `.playwright-mcp/`,
  `.codex-attachments/`, `.agents/`, `*.swp`, `release-assets/**/*.zip`,
  `/seelitterad*`. Nothing was deleted; those files are still on disk.
- **Not pushed yet:** Claude's sandbox has no GitHub login. Grant needs to run
  `git push -u origin live-site-2026-11-03` from a signed-in Terminal (his
  Codex or Claude Code can do it).
- This branch is based on the local history, not on GitHub `main` (e00973a).
  Merging the two is still to do.
- Production (dpl_AzEFiuUnqbwFbuMjZKKWmPLJRL92) was a `vercel build --prod`
  from this folder, so it should match this commit apart from today's
  uncommitted edits, which are now included.
- Next: homepage polish and performance on a separate branch
  `claude/homepage-polish`, built in a separate copy so this folder and its
  macOS `node_modules` stay untouched.

### 2026-11-03 — REQUEST FOR CODEX (from Claude, approved by Grant)

Please do these in order, then add a log entry above this one with the results:

1. Commit all current website/app work (the 333 uncommitted changes in this
   folder) to a new branch named `live-site-2026-11-03`, based on the current
   HEAD. Respect `.gitignore` (no `.env*` files). Leave the `work/` release
   copies out of the commit; add `work/` to `.gitignore` if it isn't there.
   A local safety snapshot already exists at `refs/backups/live-2026-11-03`.
2. Push that branch to GitHub (`origin`).
3. Record the commit hash, plus the commit/branch the current production
   deployment was built from, in your log entry.
4. Record the results so Claude can continue homepage polish and performance
   fixes on a separate branch.

### 2026-11-03 — Codex (Terminal CLI setup)

Installed official standalone Codex CLI 0.166.0 for regular Terminal use at
`~/.local/bin/codex`; installer updated `~/.zprofile`. Verified a fresh login
shell resolves that CLI and existing ChatGPT authentication is available.
Desktop app unchanged. No project code, deployment, or commit changes.

### 2026-11-03 — Codex (authorized Xcode temporary data cleanup)

Deleted only `~/Library/Developer/Xcode/DerivedData` with Grant’s explicit
authorization, freeing 10.73 GiB; 15.01 GiB available afterward. Xcode,
Archives, and Keychains left untouched. Read-only CLI check: desktop-bundled
Codex runs (0.166.0-alpha.5.1), but a regular login shell does not find `codex`.
No application code, deployment, or commit changes.

### 2026-11-03 — Codex (computer memory cleanup)

At Grant’s request, inspected Mac memory and storage and closed only two
assistant-controlled Chrome testing browsers (Playwright and DevTools), with
explicit approval. Personal Chrome and Claude left open. No application code,
database, deployment, or commit changes. Storage inspection found approximately
4.2 GB free; no files deleted.

### 2026-11-03 — Claude (review only, no code or database changes)

**Context:** Grant asked for a full review of litterbugs.app: GitHub, Supabase
and Vercel, plus a more professional homepage that keeps the same overall look.

**Findings that need action:**

- **Source of truth:** production is deployed with `vercel build --prod` from
  this folder (`~/Desktop/Burrow Base/LItterbugs Partner`) and not from GitHub.
  The local branch is `codex/account-contribution-count`; its last commit is
  "Use singular wording for one remaining contribution" (Oct 3). GitHub `main`
  (`jameslukebdev/litterbugs_app`, e00973a, Oct 23) doesn't contain the current
  homepage. Commit the working tree to a new branch and push it.
- **Deploy risk:** on Oct 29 production crashed for about 3 minutes with
  `Could not load the "sharp" module using the linux-arm64 runtime` because the
  build ran on macOS arm64. Prefer Git-connected Vercel builds, or make sure
  sharp's linux binaries are installed before running `vercel build`.
- **Supabase security:**
  - Leaked-password protection is off. Turn it on in Auth settings.
  - Anonymous sign-ins are on: 177 of 230 auth users are anonymous. Policies and
    RPCs that are granted to `authenticated` also apply to anonymous users.
    Admin RPCs call `private.require_cleanup_admin()` and are fine. User RPCs
    such as `claim_cleanup` and `submit_cleanup` still need a check that they
    reject anonymous users.
  - `pg_net` is installed in the `public` schema.
  - `get_rank_points` (SECURITY DEFINER) can be called by `anon`. Fine if
    intended.
- **Supabase performance:**
  - Three foreign keys have no index: `report_preferences.report_id`,
    `reporter_rewards.report_id` and
    `private.cancelled_customer_draft_submissions.user_id`.
  - Four indexes are never used.
- **Web performance (Lighthouse mobile, homepage): performance 74, LCP 3.5s,
  TBT 670ms, 3 MB page.** Accessibility and SEO scored 100.
  - A Supabase profile avatar is served at about 1 MB, unresized.
  - Before/after photos are about 250 KB each at full size.
  - `public/brand/ranks/*.png` are about 0.8–1.1 MB each.
  - The homepage sends `cache-control: no-store` (force-dynamic), which also
    blocks the back/forward cache.
  - Three analytics scripts load: GA, Clarity and PostHog. Keep them per
    AGENTS.md, but consider deferring them.
- **Content and trust:** the hero promises "Get paid to report it", but every
  homepage and /reports card says "Volunteer cleanup" with no dollar amount.
  Show reward amounts and sort funded reports first. Add a "How you get paid"
  section, an impact counter, a founder/local story and an FAQ.
- **Business numbers (Nov 3):** 66 reports (19 in the last 30 days), 23
  contributions, 37 cleanup attempts, 1 reporter reward.

**Planned next by Claude (after Grant approves):** homepage UI polish in the current style, image and caching fixes,
reward amounts on cards.

**Do not undo:** nothing yet.
