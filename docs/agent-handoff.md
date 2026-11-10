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
