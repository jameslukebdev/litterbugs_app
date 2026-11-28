# Website customer-journey priorities — October 1, 2026

## Assessment and scope

The website now has the main customer surfaces and shared-data foundations. The next priority is consistency across entry points, safe continuation of unfinished work, and clear next actions. This deeper pass found additional gaps beyond the device checks recorded at release. It would be premature to call the entire phone-to-web customer journey verified.

This is a read-only follow-up to [the implementation/release record](2026-10-01-web-ux-implementation.md) and [the broader compatibility audit](2026-10-01-web-ux-compatibility-followup.md). No application changes, deployment, native changes, or TestFlight submission were made in this pass. Recommendations below target the website. TestFlight 2.0.0 build 15 remains the native reference.

Evidence baseline: main `c9c83d5cfa5c85f973b2899eedb4d3b8f489f2e2`, whose application tree matches deployed source `0e53c29b2222ffa71f6b2686c9080f6771108147`. Native location-selection behavior was read from TestFlight source `8370e5cf64346355c8cdd6d82a8e16120044f9b6`. Live observations used signed-in Chrome and guest in-app browser at 390 × 844; browser emulation is not physical-phone testing. Temporary tabs were closed and viewport overrides reset.

Evidence labels below distinguish **live observed**, **source confirmed**, and **recommendation / unverified risk**. No data loss, duplicate charge, or new map-flashing regression was demonstrated in this pass.

## Recommended order

| Order | Work package | Outcome |
| --- | --- | --- |
| 1 | Report entry and location selection | Every entry shows the next required action; choosing a location is deliberate and usable with touch or keyboard. |
| 2 | Notification destinations and task return paths | Customers can reach their existing work after its public map visibility changes. |
| 3 | Draft summaries, comparison readiness, and interruption tests | Customers know which copy they are seeing and when it is safe to switch devices. |
| 4 | Discovery guidance and account next actions | New visitors can find an area; returning customers can find work that needs attention. |
| 5 | Desktop browsing/workspaces and device acceptance | Wider screens improve comparison and long tasks; physical devices establish actual cross-platform readiness. |

Orders 1–3 are the next focused reliability release. Orders 4–5 improve daily usability. Push notifications, a full offline application shell, and another broad visual redesign are lower priority.

## 1. Direct mobile reporting starts on the wrong surface

**Live observed; high priority.** Opening authenticated `/report` without a saved draft enters reporting mode, but leaves Reports selected and the map hidden. The header says Cancel, search is disabled, and the customer sees an empty list instead of location selection. The Map toggle is a workaround, so reporting is not completely inaccessible.

Evidence: [mobile direct-entry screenshot](../evidence/2026-10-01-web-next-priorities/mobile-report-direct-entry.png). The DOM had `map-page website-experience showing-reports`, hidden map visibility, and reporting active. Source: `apps/web/components/map-experience.tsx:126`, `:485–500`, `:829–849`; `apps/web/app/globals.css:639`. The URL/compose effect enables report mode without closing the report list, whereas the header entry closes it.

**Recommendation:** use one task-entry operation for the header, account link, direct URL, authentication return, and reload. When location selection is required, show the map, persistent instructions, and the primary next action. An existing draft should open at its recoverable step instead.

**Acceptance:** exercise all entry paths at phone and desktop widths, with and without an existing draft; include browser Back and return from sign-in. The required location surface must be visible without discovering a separate mode toggle.

## 2. Location selection should follow the app's deliberate confirmation

**Source confirmed; workflow compatibility improvement.** Build 15 uses a center pin, “Choose Report Location,” and “Use this location”; confirmation checks the selected location against fresh GPS before progressing. See native `MapScreen.js:870` and `:2462–2555` at the TestFlight commit. Web `map-experience.tsx:467–483` begins the form immediately on a map click. Web already explains the GPS/50-mile rule; the recommendation concerns selection and timing, not a missing rule.

**Recommendation:** on a phone browser, use a center pin and explicit confirmation like the app. On desktop, support search/click placement plus a visible, keyboard-reachable confirmation. Keep a selected-location summary and an edit action. Surface eligibility failures before customers invest in a long form where possible; retain authoritative validation at submission. Do not relax GPS or distance requirements.

**Acceptance:** accidental map taps cannot advance directly into a report; placement can be corrected; denied/unavailable GPS has clear recovery; location editing preserves form details and photos. Keyboard users must be able to complete the location step without relying on a pixel-specific click.

## 3. Some notification links still lead to public discovery

**Source confirmed and live destination comparison; high priority.** `apps/web/lib/cleanup-notifications.ts:103–108` routes many report events to `/?report=<id>`. The map link loader requires a discoverable record (`map-experience.tsx:282–305`), so historical records can fail to open even when the customer has account access.

In authenticated Chrome, an existing closed report did not open through the old map destination. Its account-history destination opened successfully and explained that it was no longer on discovery. No notification was clicked or marked read during this check. The source contains a temporary “no longer available” toast; that toast was not captured in the live screenshot.

Evidence: [legacy destination](../evidence/2026-10-01-web-next-priorities/legacy-closed-report-link.png) and [working account destination](../evidence/2026-10-01-web-next-priorities/account-closed-report.png). This historical record also showed an unavailable-photo fallback. That is a bounded observation of an old record, not evidence of a widespread media failure; check the media lifecycle separately if it affects real customer records.

**Recommendation:** route account notifications to participation-aware task/history destinations. A reviewer, cleaner, contributor, and report owner may need different next actions. Preserve a Notifications return destination. For old notices, show current task state and explain why an earlier action is no longer available. Do not expose private records to unrelated accounts.

**Acceptance:** cover every notification event and recipient role across active, completed, expired, and cancelled records. Include stale notices, sign-in return, and access denial. Refunds must still reach the relevant receipt; reward notices must preserve accurate payout state.

## 4. Draft continuity needs more trustworthy presentation

**Source confirmed; no data-loss finding.** Account drafts and local device drafts are already implemented. In `components/resume-drafts.tsx:20–34`, remote summaries are loaded first and then replaced by any local summary with the same key. This can display an older local title/photo count even when the account copy is newer. The copy does say sync is checked when resumed; the issue is the expectation created by the first summary, not proof that an old payload overwrites newer data.

The same loader can lose the whole initial summary list if an unexpected thrown error or invalid remote payload aborts processing. Normal returned remote errors are already handled. Local recovery rows should survive failures in individual remote records.

In `components/draft-comparison.tsx:7–15`, summaries load asynchronously; `components/cloud-draft-status.tsx:21–24` leaves version-choice buttons enabled unless an action is busy. Choices can therefore be offered before comparison completes or while the comparison says to reconnect. Existing cloud concurrency checks remain separate protections.

**Recommendation:** identify account/device versions clearly on resume; show both when they differ, without silently deciding that timestamp alone makes one authoritative. Isolate loading errors per source/record. Disable replacement choices until the comparison is ready, or provide an explicit, justified recovery flow when a preview cannot be obtained. Expand comparisons to meaningful changed fields: notes, litter types/severity, cleanup quantities, and photo differences. Keep whole-version replacement language explicit.

**Acceptance:** newer account/older device, newer device/older account, equal timestamps with different content, deleted or expired account draft, unavailable network, invalid remote record, failed photo sync, and two open editors. A failure must not hide otherwise readable local drafts. “Synced” must mean photos as well as form fields are ready on the other device.

## 5. Browser interruption and offline recovery need end-to-end evidence

**Unverified risk / acceptance gap.** Explicit save-for-later and local autosave already exist. The inspected report/evidence flows do not establish that a just-added photo survives every rapid Back, reload, tab-close, quota, or session-expiry case. No loss was reproduced. An editor's own Close confirmation does not by itself cover browser navigation.

**Recommendation:** make pending local save distinguishable from pending account sync. Add navigation protection only while work is genuinely unsaved or a save has failed. Verify recovery before promising that a customer can close the page. Test interrupted uploads, retry after reconnection, and simultaneous phone/browser editing against the existing concurrency rules.

Installation diagnostics passed in the previous release, but actual installation and cold offline reopening did not. Installability does not establish offline capability; a service worker is not universally required for installation. [MDN installability guidance](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable) and [web.dev service workers](https://web.dev/learn/pwa/service-workers?hl=en).

Keep offline wording scoped to what has been verified: a local copy being retained is different from the entire authenticated route being available after an offline cold start. Publishing, claiming, and payment actions still require connectivity. A full offline shell can follow after the core continuation journey is proven.

## 6. Empty discovery should help customers choose a useful next step

**Live observed; usability improvement.** Guest mobile discovery showed the fallback central-US map area with zero results and “Try another filter or check this map again later.” The exact reason GPS had not supplied a location was not established. This is not evidence that the platform has no reports; the prior live Boone search returned reports.

Evidence: [empty discovery screenshot](../evidence/2026-10-01-web-next-priorities/mobile-empty-discovery.png); empty copy in `components/report-browser.tsx:394`.

**Recommendation:** distinguish no chosen area, no matches under current filters, no reports in the chosen area, and a load failure. Give each a concrete action: choose a city, optionally use location, clear filters, widen the area, retry, or report litter. Make the selected area and active filters easy to see. On small screens, condense settled search/filter controls so results arrive sooner without hiding essential state.

**Acceptance:** first visit without GPS, GPS denial, chosen city with no results, restrictive filters, offline/error, and returning browser with saved area. An empty screen should never imply that waiting is the only useful action.

## 7. Put urgent work at the top of the account

**Product recommendation.** The website already has activity sections, statuses, current-cleanup deadlines, payments, and draft resume links. The opportunity is to collect their next actions in one predictable place.

Add a “Needs your attention” area above general statistics: claim deadline, evidence awaiting review, requested corrections, renewal, payout setup/problem, and a draft that has not synced. Each item needs a task name, reason, deadline when relevant, and one primary next action. Derive this from current authoritative task state; a read notification is not proof that its task is complete.

Maintain a separate recent-activity history. For longer cleanup journeys, present an understandable progression from claim through evidence and review to completion. Keep financial status distinct: approval or cleanup completion must not imply that money has already arrived. Existing financial labels should be retained and connected, not replaced with an ambiguous single “Done” badge.

## 8. Use desktop space to make browsing and reviewing easier

**Source confirmed current behavior; optional improvement.** Compact report detail preserves visible map/list context, but the normal discovery detail is still modal (`components/report-detail.tsx:219–224`). It is not yet a fully interactive side-by-side browser.

For desktop discovery, consider an inline details pane that lets customers select another card or pin without closing the current detail first. Keep selection in the URL and preserve map position, filters, list scroll, and keyboard focus. Short commitment steps can stay modal. Longer evidence and review tasks benefit from a stable task page with a clear return destination, a persistent summary, and before/after comparison. The previous release already improved evidence columns and scrolling; build on that.

For mobile, preserve focused task views, touch targets, camera/gallery choice, and the app's action sequence. Compatibility means the same account data, business rules, status meanings, and outcomes; each screen should still fit its input device and available space.

## Refero pattern research

The existing Litterbugs visual direction remains: native brand artwork, neutral surfaces, green primary actions, real report photos, and consistent status colors. This pass researched interaction patterns, not a new aesthetic.

| Reference | Observed pattern | Appropriate adaptation |
| --- | --- | --- |
| [Twist inbox](https://refero.design/pages/c9117dcf-bf1d-4278-bf51-c7b89fa5f8c1) | Active/Done filters; item context and timestamps; separate mark-read and mark-done actions | Separate “unread update” from “task needs action”; provide a direct next action. Do not copy chat semantics or its palette. |
| [Resend create/edit broadcast flow](https://refero.design/flows/10604) | Saving feedback in the editor; an identifiable Draft entry when returning to the list | Make save progress and the destination for resuming obvious. Do not import email-composer complexity. |
| [Apple Maps desktop reference from prior audit](https://refero.design/pages/ded12204-531a-45b7-b1fe-32e89e6df2ff) | Location inspection within persistent map context | Explore a true desktop browsing pane while keeping the Litterbugs report workflow. |

These references support design choices; they do not prove that the proposed Litterbugs changes will improve conversion. Measure the resulting journeys.

## Readiness and verification plan

The prior release's 235 passing tests, stable-marker checks, responsive checks, and production build remain useful evidence. They did not cover the direct-entry issue above. No application test suite was rerun for this documentation-only audit.

The next release should verify these complete journeys, rather than relying only on individual screens:

1. Find a place → filter reports → inspect → return with the same search, selection, and scroll.
2. Start a report through each entry → confirm location → add photos → save → resume on the other device → publish once.
3. Claim → begin evidence → save → continue elsewhere → submit → respond to corrections, preserving the same task and photos.
4. Open an old notification → see current state → complete the valid action or understand why it is closed → return to notifications.
5. Contribute → leave/return through the payment provider → see the correct receipt and task status; cover cancellation and retry with isolated test transactions.

Run browser regression tests for the concrete route/state faults first. Then physical iPhone Safari and Android Chrome for GPS/camera/file choice, actual home-screen installation, and same-account app/browser continuation. Include desktop Safari/Firefox, keyboard and screen-reader task completion, and text enlargement. Check forms and controls at 320 CSS pixels / equivalent zoom; a map's two-dimensional exception does not exempt the surrounding interface. [W3C Reflow guidance](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html).

The prior 1,000-result fixture bounded rendered list cards; it was not a production map performance benchmark. Before adding clustering or further map architecture, measure pan/zoom, refresh, filter changes, and report switching with a realistic dense dataset, including CPU/network and whether focus/photo state remains stable. The earlier flashing fix should be retained and regression-checked.

Consider coarse funnel events for search-to-detail, report start-to-save/publish, location failures, sync failures, and cleanup/review continuation. Do not include precise coordinates, photo contents, free-text notes, or account identifiers in a UX analytics payload by default. Instrumentation absence was not exhaustively established across infrastructure in this pass.

## Indexing remains a separate public-content concern

No fresh Search Console inspection or submission was performed during this follow-up. The prior verified sitemap result was Success with 17 discovered URLs; the supplied aggregate 14 indexed / 7 excluded report was dated September 20. That does not establish today's coverage or that all seven excluded URLs should be indexed.

Continue reviewing exclusions by canonical public URL and reason. Customer drafts, account pages, authenticated histories, redirects, malformed links, and intentionally noindexed member pages are not targets for blanket indexing. The next SEO acceptance check should inspect the intended public landing/help/content routes individually and compare Google-selected canonical and last crawl with the live page. Do not promise that a sitemap submission forces indexing.

Owner exclusions remain unchanged: automatic Apple grant revocation is unconfigured; separate-user Facebook testing is unverified and excluded. Luke's Apple account and a separate Facebook login are unavailable resources, not new owner tasks. No store publication or new TestFlight submission is part of these website recommendations.
