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
