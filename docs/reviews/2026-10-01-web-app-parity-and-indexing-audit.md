# Website, TestFlight parity, and indexing audit

Audit date: October 1, 2026, America/New_York. Scope: analysis and recommendations, including the owner's added Google indexing question. No product code, production data, pricing, deployment aliases, account settings, or store releases were changed.

## Assessment

Litterbugs already has a functioning customer web application backed by the same system as the native app. It does not need a separate web database or a ground-up rebuild. Reports, cleanup attempts, evidence, profiles, contributions, payouts, moderation, and rank points have shared server sources. The September 24 parity work implemented much of the customer feature inventory.

It is not yet a fully synchronized, equally dependable web counterpart to TestFlight. The main gaps are release coordination, local-only preferences/drafts, stale open screens, missing customer notifications, incomplete cleanup feedback/recovery, and navigation that still relies heavily on transient dialogs. Several improvements require changes to both clients and the backend; website changes alone cannot make the current app's local favorites or drafts synchronize.

Indexing needs migration cleanup and better discovery. The seven exclusions in the supplied screenshot are not seven missing current public pages. More significantly, eight URLs in Google's older indexed inventory now return 404, and a current public report is unknown to Google despite passing Google's live indexability test.

## Evidence and limits

- Source examined: main `af1582e`; no app/web/shared-contract differences from TestFlight release source `a4d9be14b500a0be14f8c244c7d7a9f73da289a4`.
- TestFlight baseline: documented iOS 2.0.0 build 14, accepted for internal testing September 30. This audit compared its recorded release source; it did not install or run a new physical TestFlight session or independently re-query App Store Connect.
- Live website inspected in the browser at desktop 1440×1000, narrow 320px, and 390×844. Checked report browsing, active/completed details, public member profile, sign-in entry/cancellation, photos and navigation. Account/payment/claim mutations were not exercised on real users.
- Current deployment and candidate independently checked with authenticated Vercel CLI. The Vercel connector was disconnected; CLI access succeeded.
- Read-only production SQL confirmed pricing version 1 and the deployed reservation function's version-mismatch rejection.
- Search Console inspected directly: all exclusion examples, all 14 indexed examples, submitted sitemaps, one current report's URL Inspection and Google live test.
- SEO CLI: sitemap health failed because `/sitemap.xml` returns 404. A subsequent bounded, unrendered link crawl completed: 8 discovered HTML pages, all HTTP 200, no cap reached. This is not an inventory of every valid route and does not emulate Google's JavaScript rendering. No Search Analytics or Analytics traffic data was joined.
- Fresh tests: **199 web, 462 mobile, 14 shared-contract tests passed**. These are unit/component/contract tests, not a fresh full cross-device acceptance run. No new build, typecheck or full five-browser suite was claimed.
- Prior signed-in/device/payment evidence remains historical evidence, particularly September 24 UI parity and September 30 sandbox payments. Owner-excluded Apple revocation and separate-user Facebook testing remain excluded, not passed.

## Release state and the first release gate

| Surface | Verified state | Consequence |
| --- | --- | --- |
| TestFlight | 2.0.0 build 14, release source `a4d9be1` per release records | Latest source includes the single-amount Service fee change |
| Customer domain | `dpl_2ZJZkkjwWQPAtvFc6TumeMPB8hHh`, `litterbugs-ixa9210jx-grant-9890s-projects.vercel.app`, created September 28 | Behind the September 30 pricing/copy candidate; live Terms still show the original 10%/$22 example |
| Prepared web candidate | `dpl_26GrgjNf7r4RKpaqLA9VvTC2P5pw`, `litterbugs-d9rg0h5mz-grant-9890s-projects.vercel.app`, Ready | Prepared but not promoted to `litterbugs.app` |
| Production database | `cleanup_pricing_config.pricing_version = 1` | New v2 requests are intentionally rejected |

**Do not promote the candidate as an isolated parity fix.** Both current web source (`apps/web/lib/funding.ts:87`) and native source (`apps/mobile/lib/funding.js:21`) submit `pricingVersion: 2`. Production's `reserve_cleanup_contribution` rejects a new reservation if its requested version differs from the active version. Existing reservations are recovered before this comparison and retain their stored amounts.

This means build 14/new web code cannot start a fresh production v2 contribution under the current v1 configuration. That conclusion follows from live configuration plus verified client/server code, not a real-money checkout attempt. The current production website continues to present v1 fees, so it is incorrect to call its existing checkout broken merely because it is older.

Choose a coordinated rollout before shipping: either retain v1 behavior in the web release while pricing remains deferred, or release compatible clients with matching pricing activation, disclosures and old-client handling. A server-negotiated quote/version flow is a possible future improvement but is not implemented today. Preserve existing pending payments and their original amounts. Public app publication and pricing activation are separate owner decisions, not implied by this analysis.

References: `docs/current-mobile-release-candidates.md`; `docs/reviews/2026-09-30-combined-service-fee.md`; `supabase/migrations/20260930202000_fix_cleanup_pricing_lock_permissions.sql:30`.

## Feature and synchronization inventory

Legend: **Present** means code or live evidence establishes the feature exists; it does not mean every state was retested today. **Partial** identifies a specific remaining gap.

| Customer capability | Website state | Remaining work |
| --- | --- | --- |
| Guest map/list, place search, filters, sorting | Present; live map and cards render | Preserve search context when opening/closing reports; clarify area searching and reduce duplicated filter entry |
| Active report details, photo gallery, directions | Present; live inspected | Stable report URL and browser Back behavior; maintain desktop list context |
| Completed cleanup story, cleaner, weight/items, after photos | Present; real Ridge Road completion inspected | Refresh automatically; correct funded completion cards currently labeled volunteer |
| Public member profile, reports, ranks | Present; live inspected | Route-based profiles if bookmark/share is intended; stale rank refresh |
| Report creation/editing, three photos, GPS requirement | Present in source/tests | Clear desktop location-denied path; upload progress and source-photo handling |
| Report drafts and interrupted publication | Local recovery present | Drafts cannot move from browser to phone; distinguish local save from cloud save |
| Cleanup claim, waiver, release, evidence submission | Present in source/tests | Submission recovery and review state need parity with native robustness |
| Reviewer approval/change request/dispute | Present but partial | Structured change reasons, reviewer draft recovery and automatic pending-status refresh |
| Cleaner feedback after changes requested | Partial | Web offers “Update cleanup photos” but does not load/display the native feedback context/reasons/note |
| Contribution checkout/history/detail | Present | Release/pricing gate; automatic reconciliation and direct confirmation after browser checkout |
| Payout setup and reward history | Present | Better onboarding return/status refresh; retain existing approved country limits |
| Profile editing, activity, reports, payments, settings | Present | Dedicated web destinations and refresh on return; current account dialog loads its dashboard once |
| Sign-in, email signup/recovery | Present for configured methods | Live web shows Google and Email; Apple-only users need a supported account continuation path |
| Connect additional sign-in methods | Native has connect actions; web only lists connected methods | Add supported identity linking without creating duplicate accounts |
| Favorites | Local on both clients | Persist under authenticated user in backend and migrate existing local values |
| Hidden reports | Browser-local | Explicit product policy; sync if retained as an account preference |
| Blocking/moderation | Shared server records and web controls present | Verify a block made on one device invalidates the other client's visible data |
| Customer notifications | Native push/foreground checks exist; web customer inbox absent | In-site notification center, unread status, direct destinations; optional browser push later |
| Account deletion | Implemented with existing financial protections | Preserve current exclusions and test only disposable accounts in an authorized test environment |
| Help, policies, about, sharing and admin | Present | Public route/SEO cleanup; private utility pages should carry explicit noindex |
| Installable/offline web experience | No manifest or service worker found | Optional enhancement; do not claim offline claims/payments/submission support |

The correct model is one account and one server record for each published report, cleanup, payment and profile. Each device has its own login session and cache. A browser does not inherit the phone's login session, even when both resolve to the same account.

## Concrete parity gaps

### 1. Preferences and drafts are not cross-device

`apps/web/lib/report-preferences.ts:19` stores favorites and hidden IDs in browser localStorage. `apps/mobile/lib/reportFavorites.js` uses AsyncStorage. Neither writes favorites to a shared table. The account prefix prevents accidental local account mixing; it does not synchronize devices.

Web report/cleanup drafts use IndexedDB (`apps/web/lib/saved-report-draft.ts`, `saved-cleanup-draft.ts`). Native drafts use local storage/files (`apps/mobile/lib/savedReportDraft.js`, `savedCleanupDraft.js`). Publishing/submitting writes shared server data, but an unfinished draft stays on its original device.

Recommendation: sync signed-in favorites first, including removal semantics and an explicit migration of local values. Keep guest preferences local. If “start on phone, finish on computer” is required, add private cloud drafts with private photo references, owner access, version/conflict checks, retention, and clear saved/syncing/offline states. Do not silently overwrite a newer draft or imply an offline local save is already shared. Map zoom and temporary filter state can remain device-specific; they need URL/back persistence more than account sync.

### 2. Shared records can remain stale on an open webpage

The web map refreshes on area/filter changes and selected callbacks, not on database events or returning to a browser tab (`apps/web/components/map-experience.tsx:131`). An open account dashboard loads once (`account-dialog.tsx:141`). Cleanup claim/review effects depend on identity/report ID; changes to a report's status on another client do not necessarily reload those attempts (`cleanup-action.tsx:103`, `cleanup-review-action.tsx:53`). Selected reports missing from refreshed discovery are retained as the old object (`map-experience.tsx:144`), which also deserves handling for closed/unavailable reports.

Native has focused-resource refresh, foreground notification checks, and a five-second loop for an open queued paid review (`apps/mobile/CleanupReviewScreen.js:130`). Neither client should be described as a comprehensive realtime replica today.

Recommendation: centralize client data invalidation. Refresh on focus/reconnect, after local mutations, and on relevant authorized server events. Use bounded polling for pending review/payment states where necessary. Re-fetch the selected report by ID rather than relying solely on the current map's discovery list. Keep server checks authoritative for claims, approval and payment. Define a measurable freshness target and retain a visible retry path.

### 3. Web cleanup submission recovery lags behind native

Web generates a fresh submission UUID on each submit and uploads photos serially. It awaits financial maintenance without the native three-second foreground limit. Its broad catch attempts photo removal and displays failure even if a response was lost after the server committed or a later refresh failed (`apps/web/components/cleanup-action.tsx:275–321`).

Native persists a submission UUID in the draft, queries for the existing submission before retrying, reconciles after an uncertain RPC response, and preserves evidence when commit outcome is unknown (`apps/mobile/lib/cleanupSubmission.js:131–240`). Native also uses bounded concurrent uploads and visible progress.

Recommendation: port these guarantees to web: durable submission ID, reconcile-before-retry, distinguish pre-save upload failure from unknown/post-save outcomes, preserve potentially committed evidence, and bound foreground review work. Add a fault-injection test where the server saves successfully but the response is lost. Actual evidence deletion was not reproduced in production; storage policy can also restrict removal. The confirmed finding is the client recovery gap, not an observed loss of customer photos.

### 4. Review and correction are incomplete customer journeys

Web reviewers send only `['other']` for a change request and keep notes in component state (`cleanup-review-action.tsx:141`). Native provides structured reasons and persisted review drafts. Native's cleaner feedback screen reads the review reasons/note and correction deadline; the web cleanup form exposes resubmission without that feedback context.

Recommendation: show “What needs changing,” the reporter's note, deadline, and previous evidence before editing. Add a clear review timeline: submitted → photo review → reporter/dispute window → completed/reward status. Keep volunteer and funded review rules distinct. Refresh after a review decision from another client.

### 5. Web-only customers miss notification-driven work

Native handles claim, correction, completion, refund, renewal and funding notices; contributors receive completion updates. The web customer app has no equivalent notification inbox/read-state UI. The admin surface's phone alert preferences are not a customer notification center.

Recommendation: expose the existing authorized notification records in a web inbox with unread counts and durable links to the report, review, payment or renewal action. Shared read state should be intentional. Browser push is optional and permission-based; the inbox must work without it. Email fallback is a separate product decision, not a verified existing feature.

### 6. Account continuity needs a supported provider path

Live website sign-in presents Google and Email. Source gates Facebook by configuration and does not implement Apple web OAuth. Native settings can connect providers; web settings only report which providers are connected (`account-dialog.tsx:649`). An Apple-only app customer cannot simply assume the same button is available on the website.

Recommendation: make account continuation explicit and support safe linking of available methods to the existing identity. Until Apple web support is available, describe the supported path honestly. Do not create a second profile based on a different email or treat Apple relay addresses as proof of a match. Luke's developer access and a separate Facebook login remain unavailable/excluded; no request to obtain them or change Grant's Apple settings is part of this plan.

### 7. Browser navigation needs real destinations

Reports, profile, activity, payments and settings mostly use local state and dialogs. Opening a card does not establish a durable URL. Incoming `?report=` is consumed with `replaceState`; there is no route-driven account section. Live desktop testing opened a report from seven results; opening it recentered/zoomed the map and Back returned to four area results. That is understandable from the implementation but loses the customer's original browsing context.

Recommendation: build on existing `/reports/[id]` URLs as durable customer destinations, with a desktop detail panel/intercepted route if useful and a full page on narrow screens. Add `/account`, `/account/activity`, `/account/reports`, `/account/payments`, and `/account/settings`; authenticate them and mark private views noindex. Preserve map area, filters, sort, selected report and list scroll across Back/Forward. Keep lightweight dialogs for confirmations and short edits.

### 8. Tests prove many components, not synchronized customer journeys

The fresh suites pass. Shared parity checks compare wizard stages, constants, source/config details and limits; they do not demonstrate an app mutation updating an already-open browser.

The legacy live browser spec (`apps/web/e2e/live-beta.spec.ts`) still expects Facebook and inline email fields on the initial sign-in screen, a “Back to search” detail button, and direct detail opening from the first marker. Current UI uses configured providers, a Continue with Email step, Back, and marker preview. This source drift prevents treating old five-browser evidence as current complete acceptance. The suite was not rerun or represented as passing in this audit.

### 9. A completed funded cleanup is mislabeled as volunteer

Live report cards label “Litter along Ridge Road on other side of guardrail” as **Volunteer cleanup completed**. A focused read-only production query confirmed the report is completed with a current pool of zero, while its completed cleanup attempt has `is_paid = true` and `reward_amount_cents = 500`.

`apps/web/components/report-browser.tsx:54` classifies completed cleanups from `reports.funded_amount_cents`. That is the remaining pool, not the historical reward. Use the completed attempt's frozen reward for completion history/cards. Distinguish a funded completion from actual payout delivery; the inspected fields establish a $5 reward, not a new verification of bank receipt. Add a regression case with a zero remaining pool and a positive completed reward.

### 10. Public report links disappear during in-progress states

`apps/web/lib/public-report-share-model.ts:25` permits public share pages only for available or completed reports. A claimed report or submitted cleanup therefore fails the share-page eligibility check and reaches `notFound()` at its existing `/reports/[id]` URL. This is source-confirmed behavior; no real report was claimed to reproduce it.

For durable report links, introduce a safe public in-progress presentation with current availability and no inappropriate claim action. Decide the treatment of closed/removed reports separately; private, moderated or deleted material must not be exposed to preserve a URL. Sitemap eligibility must stay consistent with whichever public states are deliberately supported. This lifecycle fix matters for customer sharing as well as indexing.

## Web UI/UX direction grounded in Refero

Research: three style searches, three full styles (Airbnb, Strava, Plain), two detailed screen references, one complete seven-step filtering flow. A broad outdoor-map query returned komoot; it is correctly attributed below, not claimed as an AllTrails result.

Primary authority is the existing Litterbugs brand and the owner's September 24 correction: retain website navigation and adapt layouts to the platform. Reference lock: white/soft-gray surfaces, existing green actions, semantic severity/status colors, real report photos, rank artwork, clear system typography, desktop header/footer, and simultaneous desktop map/results. Do not copy unrelated brand colors, fonts or decorative hero treatments.

| Decision | Reference and bounded role | Litterbugs application |
| --- | --- | --- |
| Simultaneous desktop results and map | [Airbnb desktop search](https://refero.design/pages/6ed840e9-829f-4eda-919e-cff8cd9713f3), spatial hierarchy | Preserve both while browsing; selected detail must not destroy search context |
| One coherent filter workflow | [Airbnb filter flow](https://refero.design/flows/5982), draft/apply/result feedback | One Filters entry, visible applied chips and count, Apply/Cancel/Clear; keep the map and list in agreement |
| Compact controls on phones | [komoot iOS map](https://refero.design/screens/d911c309-bd51-454b-ad5b-410ae4a92ab6), touch layout only | Map/list toggle or sheet; ample touch targets; preserve identical actions and states |
| Photo-led cards, restrained elevation | Airbnb style `afd145ca-269e-4847-9843-62126a839ccf` | Real litter/cleanup evidence; consistent image proportions; no decorative card shadows |
| Readable functional hierarchy | [Plain](https://plain.com), style `87497fb6-4a59-46cc-9181-916318b9f28f` | Quiet secondary text, clear primary action, restrained green use; no imported typography/brand palette |
| Visible personal progress | [Strava](https://strava.com), style `94a3b2a6-2f79-4721-a2f5-6c5baaff8db9` plus existing Litterbugs rank UI | Keep activity, actual cleanup results and rank legible; do not transplant Strava's orange or signup hero |

Recommended desktop shell: existing header with Explore/Map, My activity, Notifications, Account, and the green Report action. Map/results occupy the working area. Account pages get persistent side navigation; payment/history lists can use more horizontal space. On phones, retain touch-friendly stacked views and the existing web identity. Photo capture/file upload, browser payment controls and device permissions can differ while producing the same server outcome.

Specific polish: simplify the two search modes and multiple filter entry points; explain “Map area”; show upload progress; make pending review and payment states actionable; offer a clear desktop-to-phone continuation for GPS-dependent reporting without relaxing the 50-mile publication rule. Cloud draft handoff would be a new feature, not something currently supported.

## Indexing diagnosis

### What the seven exclusions actually are

Search Console viewed October 1 still reports **last update September 20**, with **14 indexed / 7 not indexed**. All seven examples were inspected, and current HTTP behavior was checked independently.

| Excluded URL | Google reason | Current behavior and action |
| --- | --- | --- |
| `http://litterbugs.app/` | Page with redirect | Resolves to HTTPS apex, 200; expected, retain |
| `http://www.litterbugs.app/` | Page with redirect | Resolves to HTTPS apex, 200; expected, retain |
| `https://www.litterbugs.app/` | Page with redirect | Resolves to HTTPS apex, 200; expected, retain |
| `/account/reports` | Not found (404) | Still 404; restore a real authenticated destination or route to its meaningful replacement |
| `/manifest.webmanifest` | Not found (404) | Still 404; create only as a legitimate web-app manifest, not an indexable content page |
| `/&` | Not found (404) | Malformed path; retain 404 unless a real internal source needs correction |
| `/$` | Not found (404) | Malformed path; retain 404 unless a real internal source needs correction |

The goal should not be zero excluded URLs. Redirect variants and nonexistent junk paths should not become separate indexed pages. Google recommends meaningful redirects for moved content and 404/410 for content without a replacement. [Google crawling guidance](https://developers.google.com/search/docs/crawling-indexing/troubleshoot-crawling-errors).

### The older indexed inventory hides migration problems

All fourteen indexed examples were reviewed. Six are still valid public routes: `/`, `/cleanup-policy`, `/about`, `/support`, `/terms`, `/privacy`. The other eight now return **404**:

| Older indexed route | Recommended disposition |
| --- | --- |
| `/how-it-works` | Permanent redirect to `/about` |
| `/safety` | Permanent redirect to `/cleanup-safety` |
| `/account/privacy` | Permanent redirect to `/privacy` if the old page was the privacy policy; verify historical intent |
| `/account/legal` | Restore a legal-links landing or map to the matching policy destination after checking old content |
| `/sign-in` | Real sign-in route with safe return path; noindex |
| `/account/connect` | Real authenticated payout setup destination; noindex |
| `/report` | Report entry route preserving auth/location workflow; noindex if it is only the transactional form |
| `/cleaner` | Check the prior page's intent, then restore the useful landing or redirect to the relevant cleanup discovery destination |

These eight are not counted in the screenshot's four 404s yet. Their displayed Google crawl dates are August 13. The headline “14 indexed” is therefore not evidence that fourteen current pages are healthy. Avoid bulk redirecting all old URLs to the homepage; match user intent.

### Current reports are hard to discover

For [Ridge Road cleanup part 2](https://litterbugs.app/reports/ba227d19-b46d-46fa-a02c-7d1f4c5047c3):

- HTTP response: 200, public report content and self-canonical present.
- Google URL Inspection: **“URL is unknown to Google”**, no referring sitemap or referring page detected, no previous crawl reported.
- Google live test on October 1 at 1:32 PM: **“URL is available to Google” / “Page can be indexed.”** This confirms fetch/indexability eligibility, not indexing or a guaranteed future result.
- Search Console Sitemaps: **zero submitted sitemaps**.
- Live `/sitemap.xml`: 404. Live `/robots.txt`: 404. An absent robots file does not itself block crawling.
- The bounded HTML link crawl discovered eight informational routes and **no `/reports/[id]` route**. Report cards use `<button onClick>` rather than crawlable anchors (`apps/web/components/report-browser.tsx:312`). A JavaScript-disabled crawl is not proof of Google's rendered result; the link/source and URL Inspection evidence establish the discovery concern.

Recommendation: provide a generated sitemap of canonical public pages and eligible published report stories; expose ordinary `<a href="/reports/...">` links in discoverable public content. Keep samples, unpublished/removed/private reports and transactional/account URLs out. Retain safe, useful completed stories according to product retention rules. Reuse the existing public-sharing eligibility rules instead of creating a less restrictive sitemap query. Google explicitly recommends real anchors with hrefs for reliable discovery. [Google link guidance](https://developers.google.com/search/docs/crawling-indexing/links-crawlable), [sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).

### Additional technical SEO work

- Eight crawled informational pages have no explicit canonical. Add page-specific canonicals to the HTTPS apex; do not inherit one homepage canonical across all routes.
- Homepage and Help reuse the same description. Give Help a useful specific description. This is a quality issue, not proof of indexing exclusion.
- `/admin` and `/payment-return` currently return public HTML shells without explicit noindex. Add noindex to private/transactional utility surfaces and reset/callback flows as appropriate, while retaining authorization. Noindex is not an access-control mechanism.
- Add robots.txt with the sitemap location and deliberate crawler rules. Do not use robots blocking as a substitute for noindex where Google needs to see that directive.
- Keep public report pages server-rendered and directly useful. Current public report metadata/canonical/social images are a good starting point.
- Confirm preview/beta indexing controls separately before new releases; their current indexability was not verified in this pass.
- No evidence in this audit establishes a penalty, manual action, or ranking algorithm cause. No traffic forecasts or guarantee of indexing are made.

## Recommended implementation sequence

| Priority / work package | Scope | Completion evidence |
| --- | --- | --- |
| **P0: release compatibility** | Explicit fee-version strategy; web candidate, active config and supported mobile versions agree | Sandbox new checkout succeeds; original pending payment retains original amounts; old-client behavior is explicit; no pricing flip hidden inside a UI deploy |
| **P1: restore discoverability** | Meaningful legacy-route handling, canonical URLs, sitemap, crawlable report links, private-page noindex | Legacy mapping checked; sitemap 200 with only public canonical URLs; crawl follows report links; Google live test passes; submit sitemap after shipping |
| **P1: cleanup reliability** | Persist submission IDs, reconcile uncertain saves, show correction reasons and deadlines, bound review waits; correct funded completion labels | Lost-response test produces one saved submission, evidence intact, retry recovers; phone reviewer → browser cleaner correction succeeds; zero pool does not erase historical reward |
| **P1: data freshness and notices** | Shared invalidation behavior, focus/reconnect refresh, review/payment polling, customer inbox | Open browser reflects phone claim/review/contribution without reload; notices open the right work item; duplicate notices handled |
| **P1: account favorites sync** | Backend-owned favorites, client migration, deletion semantics, both client implementations | Phone favorite appears on browser; browser removal survives restart/reconnect; separate accounts remain isolated |
| **P2: web navigation and account UX** | Durable account/report routes across available/in-progress/completed states, browser history, saved search context, configured-provider linking | Back/Forward, refresh, new tab and sign-in return all preserve destination; desktop map/list remain usable |
| **P2: uploads and draft continuity** | Progress, bounded uploads, compatible previews; cloud drafts if required | Local recovery survives reload; cloud drafts, if built, resume across clients without exposing photos or overwriting newer work |
| **P2: regression and release discipline** | Update stale browser tests; shared business-state fixtures; version/deployment record | Current Chrome/Firefox/WebKit desktop and phone flows pass; app↔web acceptance evidence saved per release |
| **P3: optional install/push polish** | Manifest, install UX, explicit offline behavior, permission-based web push | No false offline success for claims/payments; inbox remains usable without push |

This sequence preserves the work already done. Much of the UI is reusable; the highest-value changes are shared state, reliable workflows, URLs and release control.

## Cross-client acceptance matrix for the next implementation pass

Use isolated/disposable test identities and a sandbox payment environment for writes. Keep excluded Apple/Facebook scenarios excluded. A desktop/web-only pass cannot establish these outcomes by itself.

1. Create a report in the app → see it, photos and author in the website; edit on web → refresh correctly in app.
2. Claim on web → app shows unavailable to a second cleaner; simultaneous claim attempts yield one owner.
3. Submit evidence on app → website reporter receives a notice and can review; request changes on web → app shows exact reasons/note/deadline; reverse the clients.
4. Lose the submission response after server commit → retry returns the saved submission, no extra evidence set, no false “nothing changed” message.
5. Fund in sandbox from web → app reward increases by principal only; app contribution → web payment history; original retry/refund amounts retained across pricing versions.
6. Leave browser review/payment/account open while another client changes state → status updates within the defined freshness target; background/reconnect recovery works.
7. Favorite on app, remove on web, reopen both → final shared preference agrees; no guest/account leakage.
8. Change profile and block a test account on one client → other client refreshes appropriately.
9. Start a draft and reload its original client → recovery works; moving devices only promises continuation once cloud draft support exists.
10. Google/email auth return to the exact selected report/action; linked-provider login resolves to the same account; excluded provider cases remain labeled unverified.
11. Browser Back/Forward, copied URL and new-tab opening retain report/account destination and search context at desktop, 390px and 320px.
12. Post-release crawl follows public report links; submitted sitemap reads successfully; inspect representative public URLs later. Google discovery/indexing remains Google's decision.

## Evidence pointers

- Prior parity inventory and shipped coverage: `docs/reviews/2026-09-24-website-mobile-ui-parity.md` (its initial “missing” list is historical, not today's backlog).
- Owner's web-layout correction: `docs/reviews/2026-09-24-website-layout-correction.md`.
- Native release and pricing state: `docs/current-mobile-release-candidates.md`, `docs/reviews/2026-09-30-combined-service-fee.md`.
- Notifications/photo latency: `docs/reviews/2026-09-28-ridge-road-investigation.md`, `docs/reviews/2026-09-28-iphone-notifications-photo-verification.md`.
- Current SEO crawl ID: `crawl_e17c4f81e5ed42448848499de92149f8`; sitemap health attempt: `crawl_a4b7c840602c440cbe5100d5772fb7b1`.
- Companion audit evidence: `docs/evidence/2026-10-01-web-audit/crawl-summary.json`, `http-checks.json`, `search-console-observations.json`, `release-and-reward-observations.json`.
