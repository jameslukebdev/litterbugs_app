# Mobile review implementation

Branch: `codex/refero-mobile-improvements`. No main push or production deployment.

## Approved reference direction

Keep Litterbugs' logo and green foundation. Use komoot's compact map controls and clear cleanup action hierarchy as the dominant product pattern, adapted to the user's requested Zillow-like top filters. Preserve real report photography. Borrow only payment-ledger clarity from Copilot and persistent waiting states from District. Strava, Ecosia and Open Collective inform restrained color roles, not marketing layouts.

| Decision | Evidence | Adaptation |
| --- | --- | --- |
| Shared map/list filters | [komoot map](https://refero.design/screens/d911c309-bd51-454b-ad5b-410ae4a92ab6), [filter flow](https://refero.design/flows/8349), user request | Search reports, status chips, filter sheet, optional area search. Logo integrated into header. |
| Photo-led report details and primary cleanup action | [komoot detail](https://refero.design/screens/49441620-05c7-4afd-9476-3675382e4f64), user approval | Actual photo first, persistent green “Help clean this up,” directions. |
| Payment activity and separate completed impact | [Copilot transactions](https://refero.design/screens/85a7e19f-6f09-46d3-b4f8-ed234a1ad3d8) | Include pending, failed and refunded contributions without implying a charge succeeded. |
| Recoverable payment and payout states | [District waiting screen](https://refero.design/screens/cbe76f68-584b-4fa7-a5e6-0183ca97c490), [flow](https://refero.design/flows/12837) | Persistent account-scoped payment identity; read server state before retry; payout unknown/error distinct from not-started. |
| Minimal reporting improvements | User constraint and [Julienne flow](https://refero.design/flows/6497) | Keep wizard sequence, save/resume details and copied local photos, volunteer default and fewer reward choices. |

## Verification scope

Public simulator flows and automated recovery tests are exercised without creating production reports, charges or payout accounts. Live read-only report pagination and photo signing were checked. Actual payment/payout completion needs an authenticated Stripe test environment; this review does not represent a live charge as verified.

## Results

- Mobile suite: 238 tests passed across 54 files.
- iPhone 17 Pro / iOS 26.5 Release simulator build: succeeded, zero errors. Five native dependency/build warnings remain.
- Simulator: launch, shared funded filter and result count, list reward accessibility, photo-first report details, visible primary cleanup action, guest authentication gate, and city search exercised.
- Payments: automated tests cover saved attempt identity across navigation/restart, account isolation, processing/webhook delays, confirmed receipts, refund states, offline recovery, and late responses from older attempts.
- Drafts: tests cover persisted photo copies, interrupted-copy preservation, account isolation, and autosave/discard ordering.
- No production records, payment transactions, payout accounts, or backend configuration changed.

- Final simulator QA found and fixed a gallery null-report crash on dismissal. A rendered-component regression test now covers stale photo URLs during dismissal and subsequent report rendering.

## Map header follow-up

The user’s screenshot exposed a clipped “Completed” control. Replace the horizontally scrolling status row with two fully visible controls: the current cleanup status and Filters. Status choices open as full-width rows in a sheet. The current selection stays visible on both map and list.

Reference lock: [komoot map controls](https://refero.design/screens/54d589c5-8a5f-4da4-adf7-71d299e4dc24) owns the compact floating search/selectors; [komoot radius selector](https://refero.design/screens/4d71d38a-44de-4ffc-a666-a1b0e653aafd) informs moving complete option labels into a selection surface. Airbnb’s filter sheet informs keeping detailed refinements off the map. Retain the existing Litterbugs logo, native typography and green selected states. Remove the edge-to-edge white header background; preserve map visibility between and around controls. Control labels may wrap rather than being clipped at larger text sizes.

## Proposed report markers (research only)

Reference lock: [Airbnb compact price labels](https://refero.design/screens/f0984781-7046-4e76-97e4-391f3c043cf3) and [selected label plus preview card](https://refero.design/screens/ee5fc001-54eb-44fd-b24b-39011aca4f0d) inform compact reward labels, clear selection, and retaining map context. [komoot map results](https://refero.design/screens/c39bb0ed-838c-49e6-a723-280102732ac8) supports a photo-led bottom preview.

Recommend white reward pills with dark green amounts, an equally discoverable leaf marker for volunteer reports, icon-plus-color status cues, and a stronger green selected state. Replace the oversized bottle and detached tiny reward badge. Keep severity in report content rather than making all available reports red. Use simple count clusters that expand on tap. A compact bottom preview should show a photo, title, distance, cleanup status, and clearly labeled cleaner reward; opening full details remains an explicit action. Retain at least 44-point touch targets even when marker visuals shrink. Marker and preview changes are not implemented in this follow-up.

Header verification: Release simulator build succeeded (0 errors, 5 existing warnings); 238 tests passed across 54 files. On iPhone 17 Pro, confirmed full Completed label, complete status sheet, selection shared with Reports, full filter panel, Reset restoring the available report, and return to map. No unhandled JS exception or TypeError appeared in the inspected simulator log window. This is scoped header verification, not complete authenticated/payment regression coverage.

## Compact map implementation

The user rejected numbered clusters and approved the Airbnb-derived compact pin / mini-pin direction. [Refero Airbnb map](https://refero.design/screens/be872974-0b1b-4ad8-beca-e01069ab80b5) owns the white compact labels and smaller unlabelled markers; the previously researched Airbnb selected preview owns the photo card. [Airbnb's published research](https://arxiv.org/html/2407.00091v1) documents regular and mini-pin tiers; Litterbugs uses stable geographic spacing rather than reward-based ranking.

Implemented native map projection with screen-space label collision checks. Every loaded matching report remains reachable as a pin or dot; ambiguous overlapping touch targets open a Reports here chooser. Stable ID ordering gives volunteer and funded reports equal label priority, with the selected report promoted. No numbered clusters, detached reward badges or bright status fills. Compact reward pills use dark green text on white, selected pins use dark green fill, and status icons identify completed/in-progress reports. A photo preview shows title, status, cleaner reward (only for unfinished reports), location distance when available and View report. Map utilities move above the measured preview height. Detail and authentication workflows remain accessible through View report.

Verification: 248 tests passed across 56 files, including dense/identical-coordinate layouts, stable allocation, larger text, selected pins, chooser discovery and preview empty/completed states. Release build succeeded with 0 errors and 5 existing native warnings. Simulator exercised launch, one-line $6 pin, selection/photo preview/distance, View report and dismissal, and wider Boone area with separate available/completed markers. Dense and identical-location cases were checked in automated tests; production data here only supplies two public reports. Latest simulator log window contained no TypeError or unhandled JS exceptions.

During QA a preview-distance call hit an older same-named helper without null guards. Fixed by explicitly importing the guarded shared helper under an unambiguous name, verified the corrected bundled call and relaunched successfully. Removed the older com.litterbugs.app simulator installation; retained com.gegibson.litterbugs.qa as the single review build. No production write, deployment or push.

## Shared location search and map/list geography

Approved direction: Zillow-style shared geography and selection, Refero Airbnb compact marker/preview patterns, and komoot compact controls. Keep the existing brand and two top controls. No suggested destinations or recommendation sections.

The user clarified that discovery should cover the relevant surrounding town area rather than exact annexation limits. City search uses state-qualified Census place names, then uses the postal tabulation area containing the town's internal point when that area is broader than the town extent. Boone resolves to the broader 28607 area. Larger town extents remain available when the central postal area is smaller. This is a practical discovery approximation, not Zillow's proprietary region definition or a guaranteed complete postal catchment for every city. The boundary service generalizes geometry before both drawing and filtering, using the identical polygon for both. Thin green outlines retain holes and disconnected pieces without the original municipal detail overload.

Sources:
- https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Places_CouSub_ConCity_SubMCD/MapServer
- https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/PUMA_TAD_TAZ_UGA_ZCTA/MapServer

Address search uses native geocoding and explicitly labels its result as a center without a boundary. Boundary fetch errors leave the previous search intact. US boundary data requires connectivity; successfully resolved places are cached for the session.

Map and Reports use the same viewport/boundary intersection on top of the existing shared status, reward, radius, severity and keyword filters. The larger fetch buffer no longer leaks into the visible list. Location and report selection live in the shared provider. List selection is highlighted and a newly selected report is brought into view. Opening list details preserves the map region, and Show on map explicitly centers its report. Search retains its area across map movement until cleared; Re-center restores the full place extent. Center on your location explicitly exits the selected area search. Existing compact markers and overlapping-report chooser remain.

Report text search moved into Filters as Report keywords. Location search appears on both tabs. No backend schema, credentials, production records, payments or deployments changed.

Verification so far: 257 tests passed across 58 files, including polygon holes, disconnected parts, viewport half-spans, date-line handling, boundary/viewport intersection, city disambiguation, service errors and broader postal-area selection. The first Release build succeeded with zero errors and five existing native warnings. Its simulator checks confirmed Boone search, boundary rendering, matching empty result count, nearby report selection, selected list highlight and report details. Final broader-area build and checks follow below. Authenticated/payment end-to-end flows are outside this geographic change's verification scope.

Final broader-area verification: Release rebuild succeeded (0 errors, 5 existing native warnings). Simulator city search returned Boone, NC / Town and surrounding area, rendered the simplified broader 28607 outline, and displayed both existing reports. Reports showed the same two reports with Boone search retained. Verified opening list details, Show on map returning to the selected reward preview without clearing Boone, and Re-center restoring the complete area and dismissing the preview. No TypeError, ReferenceError, unhandled exception or fatal message appeared in the final inspected application log window. Simulator left on the broader Boone map. This does not claim every possible city or authenticated transaction was tested.
