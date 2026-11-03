# Boone pilot, items 1–3 — local only

Built October 30, 2026. No deployment, Git push, schema change, backend mutation, organization outreach, or email system.

## Research and content

Reviewed primary sources for program requirements and next steps:

- Town of Boone Adopt-a-Street: https://www.townofboone.net/214/Adopt-a-Street-Program — year-long adoption, three pickups, coordinator age, participant supplies, approved sections, advance arrangement for town collection.
- Town Adopt-a-Stream: https://www.townofboone.net/456/Adopt-a-Stream-Program — town-limit segments, two annual cleanups, paperwork, advance notification, field-sheet debris locations and 72-hour return.
- County facilities: https://wataugacounty.gov/App_Pages/Dept/Sanitation/home.aspx — transfer-station address, residency/fee conditions, office phone.
- County materials: https://wataugacounty.gov/App_Pages/Dept/Sanitation/materials.aspx — household-trash restriction at convenience-center dumpsters, sorting and exclusions. Community cleanup disposal eligibility remains something to confirm with staff; no unrestricted free-disposal promise.
- NCDOT coordinators: https://www.ncdot.gov/initiatives-policies/environmental/adoptahighway/Pages/coordinators.aspx — coordinator vs maintenance-office roles. The embedded county contact table could not be verified through extraction, so no unverified Watauga-specific name/phone was published.
- NCDOT Litter Sweep: https://www.ncdot.gov/initiatives-policies/environmental/litter-management/Pages/litter-sweep.aspx — seasonal program, supplies and pickup coordination. No expired 2026 campaign dates promoted as upcoming events.
- NCDOT roadside questions: https://www.ncdot.gov/contact/Pages/roadside-beautification-questions.aspx — county maintenance office for roadside litter problems.
- NC DEQ dumping: https://www.deq.nc.gov/about/divisions/waste-management/solid-waste-section/compliance-and-monitoring/illegal-dumping — local solid-waste office or law enforcement route; Litterbugs is separate.
- MountainTrue: https://mountaintrue.org/get-involved/volunteer/ — High Country, Clean Waters and Debris filters, individual activity requirements. Habitat work is distinguished from litter pickup; no guaranteed Boone event or equipment availability claimed.

Firecrawl retrieved county and MountainTrue content. Its town extracts contained only loading/navigation content; full town requirements were verified through the web reader fallback. All published details are concise original summaries with source links. Static reviewedAt dates changed only for records actually researched in this pass. Existing current styling was retained.

## Listings

- Removed the 100-candidate ceiling from local public report feeds. Stable ordered candidate batches are filtered by the editorial polygon and hydrated through existing public visibility checks before pagination. Fetches continue until a valid page plus lookahead or exhaustion. Null/withdrawn models do not create pagination gaps. Workflow state is checked again after hydration to reject changed-state reports.
- Added /communities/us/nc/boone/cleanups with available/completed/fundable status and six records per page. Bad and exhausted healthy pages return 404; outages render retry rather than false empty states. Listing variants are noindex/follow and not added to sitemap.
- Hub indicates when six cards are only a selection, always offers Report litter, and links to local listings/results/funding.
- Map handoff restores the exact 28607 polygon as an existing SearchPlace and sets available/completed status. Normal map/report entry defaults are unchanged. Only the optional initialPlace path was added to MapExperience; all existing map workflow code was preserved.

## Verification

- 92 focused tests passed across feed collection, route outage/paging states, URL validation, boundary restoration, visibility, report sharing, archive and map publication/discovery behavior.
- TypeScript and scoped lint passed.
- Browser: available page one contains six reports, page two five, no overlap. All 11 match the scoped map set. Boone-area placeholder and Available filter restored. Disposal filter returns town programs, county disposal, and NCDOT, excluding MountainTrue.
- Mobile: resource and expanded guidance checked without horizontal overflow. Desktop guide inspected; no browser errors observed.
- Local hub, all three listing modes, page two, new resource profiles, normal map and report routes returned 200. Invalid page/status and exhausted page return 404. Scoped listing metadata verified noindex/follow.
- Shared homepage, header, globals, brand styles and community styles match pre-work hashes. Evidence: work/boone-pilot-before/verification.json.

Deferred: broader participation/account/payment journey testing, conversion attribution and Search Console inspection, as described in items 4–6. This pass does not claim those are finished.


## Item 4 — participation paths and duplicate/formatting fixes (local only)

- Boone Report litter links retain community and area through sign-in. Authenticated entry receives the existing area picker; it does not preselect a report pin. Abandoning a recognized community report flow returns to the community.
- Boone public report stories offer Fund this cleanup only when eligible and Clean up this report only when available. Both open that selected report on the existing web map, focus its participation controls, and preserve the canonical community destination. Completed/in-progress reports retain View on map.
- Selected report Back returns to Boone. Existing account destinations remain valid and ordinary map behavior remains unchanged.
- Funding confirmation carries only a whitelisted community return destination alongside receipt/report IDs. Expired-session sign-in and both receipt report links preserve it. A receipt also links back to the community. No payment API, amount, fee, auth provider configuration, backend, claim logic, or database schema was changed.
- Funding eligibility is rechecked after public model hydration for the local funding filter. Frozen, locked, inactive-renewal, withdrawn, and changed-state reports cannot remain advertised as local funding opportunities merely because their candidate query was earlier.
- Removed the duplicate funding report grid from the hub. Support points to the funding filter on the full collection. A completed before/after feature no longer repeats as a card immediately below itself.
- Added scoped 28px spacing above report-list actions, removed negative action-row left margins, and added 24px below the help filter. Public report participation buttons wrap with a 16px gap. Empty pagination controls are omitted.

Verification: 145 tests passed in 16 focused files; TypeScript and scoped ESLint passed. Coverage includes report-entry authentication context, invalid/repeated destinations, OAuth next paths, payment confirmation return URL, expired-session receipt navigation, funding eligibility, publication/discovery behavior, report detail focus, and duplicate hub content. Payment/authentication tests use mocks; no actual OAuth, report publication, cleanup claim, or financial transaction was performed.

Browser: local funding filter → report → existing map controls → Sign in to fund and Sign in to clean both show the correct intent. Closing the selected report returns to Boone. Report litter redirects to sign-in with the full Boone entry preserved. Desktop width 1309 CSS px and phone width 355 CSS px have no horizontal overflow; measured gaps are about 28px (cards/actions) and 24px (filter/divider). Phone disposal filter works (four resources). No framework overlay or runtime errors observed; Next.js issued an existing report-photo LCP eager-loading advisory, left for the photo/performance work rather than changing image behavior here.

Pre-change snapshots and scoped diff: work/boone-journey-before. Shared homepage, header, globals, brand, community theme, community base CSS, and select CSS match the start-of-turn hashes. Browser plugin absent; rendered checks used the available CUA Playwright interface in the existing in-app browser. No deployment or push.

Evidence screenshots: outputs/boone-help-spacing-desktop.png and outputs/boone-help-spacing-mobile.png in this task’s local output folder. Items 5–6 (measurement and further launch review) remain separate work.


## Items 5–6 and final scope refinement — local foundation finished

The owner clarified that the community pages must not repeat general homepage material. Removed the global directory's participation, organization, FAQ, and network blocks. Removed Boone's platform-support/organizational pitches, generic planning FAQ, and unscoped nearby-map section. Funding is a filter on local opportunities. Kept the existing public styling and shared shell.

Added a community-specific completed-evidence component using existing public models: real completion dates, public attribution, quantities labeled cleaner-reported, source report links, graceful missing-evidence handling, and no duplicate featured card. The local completed collection uses the same evidence display; completed report pages connect directly to further Boone opportunities/results. Dates are consistent in UTC. No new story URLs or invented aggregate totals.

Added bounded, consented community discovery/action/resource/bookmark observations and recognized entry context on existing publication/receipt observations. Added approval observation only after the existing review RPC returns a completed state. Clicks, saves, and referrals remain distinct from confirmed outcomes. Providers stay disabled on localhost/preview; privacy signals, fixed properties, receipt recency, and deduplication are tested. No financial or approval logic was changed. See docs/community-foundation.md for exact event definitions and attribution limits.

Final validation: 218 tests in 27 files passed; TypeScript, scoped lint, and diff checks passed. The new read-only scripts/check-community-foundation.mjs passed 64 checks on the running local server, including initial HTML and local navigation/indexability contracts. Desktop 1309 CSS px and phone 355 CSS px show no overflow; five result photos loaded; four completion dates are visible. Directory search resolves Boone; completed evidence leads to the local available collection. No browser runtime errors or framework overlays observed. Existing Next Image LCP loading advisories are unrelated to these changes.

Google URL Inspection (read-only, October 30): community directory and Boone hub are unknown to Google; Greenwood Lot report is indexed with the expected canonical (last crawl 13:28:53 UTC). This reports Google's stored snapshots; it does not diagnose a crawl defect or guarantee future indexing. Live Boone page audit reported zero issues on the deployed baseline. No indexing/submission action was taken.

Artifacts are in this task's output folder: community-discovery-baseline.json, community-local-checks.json, community-results-desktop.png, community-results-mobile.png. Temporary before snapshots and scoped diff are in /tmp/litterbugs-community-foundation-finish. Shared homepage, header, global/brand/community styles, shared homepage proof component, and clustering match their pre-work hashes. No deployment/push, provider activation, database migration, outreach, real transaction, or review submission occurred. Provider receipt and updated Google crawl/index evidence remain release-dependent; they are not claimed passed by local verification.
