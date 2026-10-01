# Website UX compatibility follow-up

October 1, 2026. Source: main `fbdffbd`, following the website release and TestFlight 2.0 build 15. This pass is an analysis, with live browser evidence and source review. It makes no new production deployment or app submission.

## Assessment

The website now has the shared data and most customer capabilities needed to serve as the app's web counterpart. The next work is making complete customer journeys reliable and adapting their presentation to the browser. Feature presence does not establish finished UX parity: this follow-up found navigation, focus, lifecycle and responsive defects that the earlier release verification did not catch.

Preserve the owner's September 24 direction: the website retains its header, footer and web identity. Desktop should use its extra space for browsing, comparing and managing work. Phone browsers should keep the same vocabulary and task sequence as the native app, with simpler layouts. Do not restore the native floating tab bar to desktop.

The highest priorities are account-to-report navigation, lifecycle consistency, focus stability, mobile report hierarchy, and tablet clipping. After those, improve finding drafts, moving work between devices, and the consistency of account routes and report actions.

## What was verified

- Live public website in the Codex browser: desktop 1280×720, phone widths 390 and 320, and tablet 768×1024. Inspected discovery, filters, active/no-photo report details, photo navigation, cleanup sign-in entry, and status badges.
- Existing authenticated Chrome session: read-only account reports/activity navigation, tab selection/reload, keyboard tab behavior and mobile account layout. No report, claim, draft, profile, payment or notification record was changed.
- Live Search Console: sitemap now **Success**, submitted/read October 1, **17 discovered pages**. Page indexing remains **14 indexed / 7 excluded**, with report data last updated **September 20**. That older aggregate cannot measure today's deployment yet.
- Current web, mobile and shared-contract source compared, including the native navigation, report/draft flows and published-report deep links. Build 15 native source is the recorded `8370e5c`; later release commits changed web/backend/docs.
- Refero: three full style references, two full desktop map screens, one full iOS search sheet and the Airbnb listing creation flow. References inform recommendations; they are not evidence that Litterbugs already implements them.
- This is not a fresh physical TestFlight walkthrough, Safari/Firefox/Edge run, screen-reader certification, live payment test, load test or new cross-device production acceptance run. Earlier isolated sync tests remain relevant, with their existing limits.

Evidence screenshots are in `docs/evidence/2026-10-01-web-ux-followup/`.

## Fix first: confirmed defects and inconsistencies

| Priority | Finding and evidence | Required outcome |
| --- | --- | --- |
| P1 | **Account report navigation drops the report.** In the authenticated session, clicking a closed report from `/account/reports` ended at `/`, without the report selection. `account-dialog.tsx:393` calls `onOpenReport(id)` and then `onClose()`. Embedded `account-page.tsx:33` supplies two competing router pushes: selected report, then homepage. The same handler serves current/completed cleanup rows. | One navigation per action. Test account report, cleanup and payment-to-report entry points with the actual embedded wrapper. Back must return to the originating account section. Closed/expired owner records also need a useful authenticated history/detail destination; the public map intentionally excludes them. |
| P1 | **An ongoing cleanup can be presented as closed after the report's original expiry.** Source finding: `report-visibility.ts` preserves claimed, submitted and correction states after `expires_at`; `report-detail.tsx:124` instead treats any non-completed report past that timestamp as closed. Line 329 then omits the entire cleanup action. No affected live record was created to demonstrate this. | Derive status and action eligibility from one lifecycle model. Claim/correction deadlines govern ongoing work. Test claimed, submitted and changes-requested cases on both sides of original report expiry, plus genuinely expired/cancelled cases. |
| P1 | **Background refresh steals report focus.** Live: Next photo focused at 20:44:27 UTC; at 20:44:54 UTC, with no intervening interaction in that tab, focus was Back. Photo 2 remained selected. `report-detail.tsx:130` resets focus in an effect depending on `onClose`; the parent recreates `closeReport` on render. | Opening a dialog sets focus once; routine data updates preserve it. Stabilize callback/lifecycle handling and verify nested cleanup/photo/share dialogs, typing and screen-reader use across multiple refreshes. Stable map pins alone do not resolve this. |
| P2 | **Mobile report information appears in the wrong order.** At 390px, author and directions appear before the title. CSS makes intermediate containers `display: contents`; author/directions retain default order 0, before the title at order 1. Completed-cleanup content is similarly exposed to this ordering rule. | Explicit order: title and state → reward/deadline → photos → details/safety → author → next action. Keep visual and DOM reading orders consistent. See `mobile-report-order.png`. |
| P2 | **Tablet no-photo detail clips horizontally.** At 768px, the dialog's inner width was 718px but content required 740px. The no-photo grid has 320px + 420px minimum tracks. The action button reached the clipped right edge. | Collapse to a single column earlier or use flexible tracks. Make no-photo content compact; it currently consumes a large empty column. Verify 700/701/760/768/820px and increased text sizes. See `tablet-no-photo.png`. |
| P2 | **Account tab state is not represented by its URL.** Selecting Cleanup history leaves `/account/activity`; reload resets it to Current cleanups. On `/account/reports`, local activity tabs can diverge from the selected sidebar destination. | Give each meaningful section/tab a route or query parameter, with reload/Back/Forward preservation and one selected navigation state. Use existing payment detail routes from payment rows too. |
| P2 | **Status styling contradicts itself.** Available and Cleaned card badges both use the same red. Map pins already distinguish completed green from in-progress amber. Live Cleaned badge: 11px white text on `#dc4545`, contrast **4.2166:1**. | Shared status names and semantic colors across cards, map, detail and app. Keep severity, workflow and money visually distinct. Small badge text needs at least 4.5:1 contrast under the [W3C minimum contrast criterion](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). |
| P2 | **Account tabs expose incomplete keyboard behavior.** ArrowRight on Current cleanups left both focus and selection there. Source has tab roles but no arrow navigation/tabpanel linkage. | Either use normal route links or implement the complete [W3C tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/). Preserve visible focus and provide proper page headings; most embedded account pages currently start at h2. |

## Platform compatibility decisions

| Area | Keep consistent with the app | Adapt for the website |
| --- | --- | --- |
| Identity | Same account, linked providers, profile, rank and ownership | Clear account continuation guidance; explicit browser sign-in. Browser and app sessions remain separate. |
| Discovery | Same report eligibility, status meanings, favorites and filtering concepts | Desktop map/results side by side. Phone browser list/map switch. Preserve search, location, filters and selected report in shareable/restorable URL state where appropriate. |
| Report details | Same facts, photos, reward, safety information and available actions | Desktop contextual side panel for quick inspection, with a full route for focused detail. Phone uses a focused single-column page/sheet. Full-size photos remain available. |
| Report creation | Same required information, validation, 1–3 photos and review step | A dedicated task route with visible progress and saved state; keyboard-friendly fields, desktop drag/drop and phone camera/gallery choices. Avoid unnecessary nested dialogs. |
| Cleanup work | Same waiver, ownership, deadlines, evidence, corrections and review decisions | A focused workspace showing status, deadline and next step together. Desktop evidence comparison can use before/after columns; phone uses a vertical sequence. |
| Drafts | Same private draft, photo bytes, conflict rules and submission identity | Prominent Resume entry, identifiable draft summary, timestamps and a clear phone/computer continuation path. |
| Funding/payouts | Same server quote, currency, fee, eligibility and settlement state | Browser return/recovery screens and route-based receipts. Clearly separate contributions paid from cleanup rewards earned. Keep production pricing v1. |
| Notifications | Same events and shared read state | Web inbox plus persistent unread entry. Native push and browser push have different delivery/permission behavior; an inbox is already present, browser push is optional later. |
| Navigation | Familiar labels: Reports, Map, Profile/My activity, Payments, Settings | Desktop header/sidebar and real links. Compact mobile account menu rather than a long horizontal strip plus duplicate tabs. Retain the website identity. |
| Offline/install | Truthful local-save and pending-sync behavior | Finish install assets and offline messaging separately. An installable window does not mean claims, payments or submissions work offline. |

## Next UX work, in order

### 1. Simplify finding and comparing cleanups

At 390px the first report starts around y=390: nearly half the screen is navigation, two location-search actions, filters, view controls, sorting and quick chips. The expanded filter header scrolls independently of the results, putting Apply/Cancel below its visible region. It was possible to activate Apply; this is a discoverability and density issue, not a proven unclickable control.

Use one visible location search and one Filters entry with a count of applied filters. Keep advanced criteria in a dedicated mobile panel with reachable Apply/Clear actions. Preserve the distinction between a town boundary and an address search underneath the simpler interface. Label geographic scope explicitly (chosen town versus current map area); an automatic move-and-search model should communicate when results update. Do not add a redundant “Search this area” button unless changing that interaction intentionally.

When location is unavailable, the current fallback fits all initial reports. With geographically distant reports it produces a continent-scale view, as seen live. Offer a clear city choice/last chosen area instead of making users interpret a mostly ocean map. Keep the ability to browse without granting location.

Desktop detail currently occupies nearly the whole viewport and dims map/list context. A compact preview panel should show enough to choose a cleanup without losing the list, with an explicit full-detail destination. This is a proposed improvement; it is not a claim that dialogs are inherently wrong.

### 2. Make accounts a coherent customer workspace

The new routes exist, but the embedded account component retains phone/modal-era navigation. “My reports” appears both in the sidebar and inside “My activity”; a Back-to-profile control duplicates the sidebar. At phone width, later sidebar destinations require horizontal scrolling, above another tab row.

Use one route hierarchy: profile overview, current cleanups, cleanup history, my reports, payments, updates, settings. Decide whether My reports lives under My activity or alongside it and implement that choice consistently. Empty states should offer useful next actions, such as Browse cleanups or Report litter, instead of only explaining where future data will appear. Add a visible report action to account/task pages so returning customers need not navigate back to the map to start.

Public member profiles still open transient dialogs. Add a stable route if public profiles are intended to be shared/bookmarked, with privacy rules matching current public fields. This can follow the core customer workflow repairs.

### 3. Make cross-device drafts understandable

Cloud drafts, local recovery, photo preparation and conflict controls already exist. The next gap is discoverability and confidence. The account's report Resume button is only shown inside My reports; cleanup drafts are found through their cleanup attempt. Add a Resume area with report title/location, photo count, last saved time, sync state, and a direct return to the relevant task. Preserve the existing one-report-draft model unless deliberately changing that product rule.

Conflict controls currently say “Use account draft” and “Keep this device’s draft” without showing what differs. Show saved times and safe previews/counts, and explain that the choice replaces one whole version. Consolidate local/cloud save copy: cleanup currently renders a local-saved message alongside the separate cloud status, which can look contradictory. Distinguish a failed discard from a failed save in recovery errors.

A “Continue on phone” link/QR should open the same authenticated draft or cleanup, never contain private photos or grant access by possession of the link. Published-report deep links already exist; draft-specific native routing does not. That enhancement may need a small coordinated app change. Do not promise it is purely a website task.

### 4. Improve creation and cleanup workflows for desktop

The five-step report wizard and review edits are present. Keep the same field meanings and safety rules; add a proper task URL, a persistent summary/progress area on desktop, and a compact step header on phone. Desktop upload should support drag/drop as well as the file chooser. Phone browser camera/gallery behavior must be checked on actual iOS Safari and Android Chrome. Report/cleanup files are already resized and HEIC-compatible; profile-photo upload still advertises its separate 5 MB limit and deserves a consistent preparation experience.

Location verification currently happens at submission and requires a fresh position within 50 miles of the report. Explain that early, before someone completes the form on a desktop without usable location. Provide permission recovery and a synced-draft continuation route to phone, while preserving the rule. Do not substitute a typed address for required presence verification.

For cleanup submission/corrections, keep the claim deadline, reviewer reasons and next action together. Consolidate stacked report → waiver → evidence/review dialogs into a focused workflow where appropriate. Display before/after evidence clearly; keep payment/review/submission states separate so “submitted,” “approved” and “paid” cannot be mistaken for one another. Final financial and waiver actions retain their existing confirmation behavior.

### 5. Close account-continuation and status gaps

The live guest sign-in offers Google and Email; it does not offer Apple. Native supports Apple, and an Apple-only customer may not understand how to access that existing account on the web. Add contextual guidance to connect an available provider from the signed-in app. Do not direct them to create another account or assume identical email addresses safely merge accounts. Native web Apple setup remains dependent on unavailable owner resources and is not a blocker to website improvements. Separate-user Facebook testing remains excluded, not passed.

The web inbox is working, but can better distinguish unread updates and action-needed items. Notification opening/read behavior should be a deliberate shared product rule. General screen refresh is roughly 30 seconds while visible, with focus/reconnect refresh; some pending screens use faster checks. Describe this as automatic updating, not guaranteed instantaneous synchronization. Avoid disruptive refresh banners or focus changes during editing.

### 6. Finish accessibility, resilience and installation

Address the verified focus, ordering, keyboard and contrast defects first. Then validate 320px reflow, 200% text enlargement, keyboard-only journeys, screen readers, reduced motion, touch targets and virtual-keyboard visibility. Use [W3C reflow guidance](https://www.w3.org/WAI/WCAG21/Understanding/reflow) as a test target, not a claim of current conformance.

The manifest now exists but lists only a 256px icon. Add appropriate 192/512px icons and maskable assets, then verify actual browser install behavior against [manifest guidance](https://web.dev/learn/pwa/web-app-manifest). Add an intentional offline/reconnect state before advertising an app-like offline experience. Browser push and full offline support are later enhancements, not prerequisites for a usable synced website.

Measure performance with representative larger result sets. Current live data is small; rendering up to 1,000 cards/pins plus per-member rank refreshes should be profiled before claiming scalability. Consider clustering, windowing and shared refresh/cache work only when measurement justifies them. Preserve the newly stable marker identities.

## Research synthesis and decision ledger

Primary direction: the existing Litterbugs website and owner-approved September 24 layout. Preserve system typography, white/neutral surfaces, green primary actions, actual litter/cleanup photos, restrained card borders, and the header/footer. No palette or branding redesign is needed.

| Reference | Bounded lesson to use |
| --- | --- |
| [Apple Maps desktop search](https://refero.design/pages/ded12204-531a-45b7-b1fe-32e89e6df2ff) | Persistent map plus a bounded search/result pane; selected items retain geographic context. |
| [Trulia desktop discovery](https://refero.design/pages/fd8431e2-1689-4ffb-9f0d-517683da33c3) | Scannable image cards, geographic boundaries and consolidated filtering across map/list. |
| [Clime iOS location search](https://refero.design/screens/545a50aa-df11-41d4-b2de-7ce2d593fcdb) | Focused narrow-screen search, obvious cancel/clear, room for the onscreen keyboard. This does not justify copying native navigation onto desktop. |
| [Airbnb host listing flow](https://refero.design/flows/6005) | Visible steps, clear back/next, reviewable amounts and a meaningful completion destination. Borrow sequence clarity, not the number of Airbnb steps. |
| Eventbrite style `4aa419e7-b05e-48f7-9dd8-4f65d5fc153f` | Photo-led discovery and restrained interface chrome. Keep Litterbugs green rather than adopting its blue. |
| Strava style `94a3b2a6-2f79-4721-a2f5-6c5baaff8db9` | Legible utility UI and real community photography. No orange palette or sports-specific controls. |
| Open Collective/Raise style `f72e18d0-98f4-4e88-9754-5426589564ea` | Clear grouping of financial facts. Do not bring marketing illustrations into cleanup evidence. |

Decision boundaries: real evidence photographs remain factual imagery; workflow colors represent workflow, severity colors represent severity, and green primary actions retain their brand role. Use one dominant existing design direction rather than combining every reference's colors, fonts and corner radii.

## Delivery order and acceptance

1. **Correctness patch, website first:** account report links/history destinations; shared lifecycle rules; refresh focus; mobile ordering; tablet clipping; status contrast and keyboard tabs. Regression tests should cross component boundaries and include lifecycle/date edge cases, not only isolated controls.
2. **Navigation and responsive workflow pass:** one account hierarchy; URL-backed tab/filter/task state; compact mobile filters; desktop contextual details; useful empty states. Most of this is web-only.
3. **Draft and device-continuation pass:** prominent resume summaries, conflict comparisons, consolidated saved-state messaging, early location guidance and deliberate phone continuation. Native draft deep links require separate implementation/release coordination.
4. **Acceptance pass:** perform the same customer scenarios in desktop browser, phone browser and TestFlight 15: find → sign in → report/draft → resume elsewhere → claim → evidence → corrections → approval → payment status. Include connection loss, session expiry, conflicting drafts, browser Back/reload and returning from payment setup. Test public and owner-only historical reports separately.
5. **Optional enhancements:** install polish, browser push, measured large-map/list performance, richer public profiles. No new app build is necessary for ordinary website layout fixes.

For validation, use controlled accounts and payment test environments. This analysis did not test unavailable Apple revocation credentials or separate-user Facebook login and does not reopen those exclusions.

## Indexing follow-up

The sitemap fetch issue has cleared: Search Console now reports Success and 17 discovered pages. Screenshot: `google-sitemap-success.png`. The Page indexing report still reflects September 20 data (14 indexed, 7 excluded); no claim is made that all eligible pages are indexed today. Previously identified protocol/host redirects, private account destinations and malformed URLs should not be forced into the index. Evaluate the eligible public URLs when Google's reporting catches up. No additional sitemap submission was made in this pass.
