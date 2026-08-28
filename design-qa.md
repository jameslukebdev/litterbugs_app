# Mobile Reports Navigation Design QA

## Result

final result: passed

---

# Report Card Consistency QA

## Source and implementation

- Source visual truth: `/var/folders/g1/z5srknk55b52bfd28jykgmj00000gn/T/TemporaryItems/NSIRD_screencaptureui_HXtLPb/Screenshot 2026-08-28 at 10.42.40 AM.png`
- Production desktop implementation: `/tmp/litterbugs-card-consistency-desktop.png`
- Production mobile implementation: `/tmp/litterbugs-card-consistency-mobile.png`
- Focused comparison: `/tmp/litterbugs-card-consistency-comparison.png`
- Source pixels: 815×660 cropped grid view
- Desktop implementation pixels and CSS viewport: 1596×1020 at 1x density
- Mobile implementation pixels and CSS viewport: 390×844 at 1x density
- State: signed out, 11 active test reports, default desktop grid and open mobile results sheet

## Full-view and focused comparison

The combined comparison places the supplied broken layout and the corrected live grid in one image. The earlier no-photo card spans both columns while photo cards use one column. In production, every report uses the same single-column footprint, 16:9 media region, copy height, border, radius, and vertical spacing. The no-photo state uses the existing image icon and a truthful label rather than fabricated imagery.

The focused card region is sufficient for this scoped change because the map, header, and surrounding results layout were not changed. Desktop measurements confirm the first ten cards are each 285×269 CSS pixels. Mobile measurements confirm the first four cards are each 343×302 CSS pixels.

## Required fidelity surfaces

- Typography: Titles, reward/status text, severity, and dates retain the existing type scale and two-line title allowance.
- Spacing and layout rhythm: Photo and no-photo cards now share identical grid tracks, media proportions, copy height, padding, gaps, borders, radii, and elevation.
- Colors and tokens: The neutral no-photo state uses existing gray surface and text values; status and severity colors are unchanged.
- Image quality: Existing report photographs remain uncropped beyond the established 16:9 card treatment. Missing or failed photos show the existing image-library icon and concise state text.
- Copy and content: Real report content is unchanged. The only added copy is `No photo` or `Photo unavailable` when that state is true.

## Comparison history

- P2 — Inconsistent geometry: no-photo cards used a special full-width compact layout, interrupting the two-column scan pattern. Fixed by removing that exception and rendering the same media/content frame for every report. Post-fix evidence: `/tmp/litterbugs-card-consistency-comparison.png`.
- P2 — Responsive inconsistency: the special card geometry also changed differently at tablet and mobile breakpoints. Fixed by using one card structure at every breakpoint. Post-fix evidence: desktop cards measure 285×269 and mobile cards measure 343×302.

## Verification

- Focused component tests passed: 2 tests.
- Web typecheck and lint passed.
- Production deployment completed successfully.
- Production checked at desktop and mobile CSS viewports.
- Production console errors and warnings checked: none.

## Result

final result: passed

No unresolved P2-or-higher visual or interaction findings remain.

## Comparison inputs

- Approved visual: `design/concepts/mobile-reports-map-sheet.png`
- Native expanded sheet: `design/qa/mobile-map-expanded-ios.png`
- Native collapsed sheet: `design/qa/mobile-map-collapsed-ios.png`
- Native filter sheet: `design/qa/mobile-reports-filters-ios.png`
- Selected labeled dock: `design/concepts/mobile-navigation-labeled-dock.png`
- Native labeled dock: `design/qa/mobile-navigation-labeled-dock-ios.png`
- Zillow bottom-navigation reference: `design/concepts/zillow-bottom-navigation-reference.png`
- Native Zillow-style three-tab adaptation: `design/qa/mobile-navigation-zillow-style-ios.png`
- Native compact Zillow-style adaptation: `design/qa/mobile-navigation-zillow-compact-ios.png`
- Native Android phone: `design/qa/mobile-navigation-android-phone.png`
- Native Android phone, expanded sheet: `design/qa/mobile-navigation-android-phone-expanded.png`
- Native Android tablet-class viewport: `design/qa/mobile-navigation-android-tablet.png`
- Native iPad mini: `design/qa/mobile-navigation-ipad-mini.png`
- Test devices: iPhone 17 Pro and iPad mini simulators on iOS 26.5; Android API 36 emulator at 392×851dp and 800×1280dp

## Mandatory comparison passes

- Typography: The report count, severity, title, metadata, and type summary retain the approved hierarchy. Native system fonts differ from the generated concept's rasterized typography but preserve its scale and scan order.
- Spacing and layout: The expanded sheet begins near the same vertical position as the concept. Rows are full-width, vertically stacked, and large enough to scan without horizontal compression. The collapsed state exposes only the handle and report count above the dock.
- Viewport resilience: Safe-area metrics drive dock placement, sheet clearance, Profile content padding, and map-control offsets. The full-width three-tab surface remains unobstructed at phone and tablet widths.
- Colors and surfaces: White floating surfaces, subtle border/shadow, green selected state, muted metadata, and severity colors remain consistent with the approved direction.
- Imagery: Live report imagery uses the existing report-photo storage path and preserves a large rounded thumbnail crop. Missing photos use the app's neutral image-icon treatment.
- Copy and content: Report copy is real data. The Reports page uses a single Filters entry point, and the sheet labels each severity explicitly.
- Icons: Navigation, filter, map controls, severity, image fallback, and chevrons use Ionicons rather than text glyphs or custom drawings.
- States and interactions: Map sheet swipe-up expansion, swipe-down collapse, tap fallback, tab switching, report detail opening, modal-over-navbar behavior, filter selection, selected-filter badge, and empty-filter results were exercised in the simulator.
- Accessibility: Tab roles and selected states, tab press/long-press events, 44-point minimum targets, labeled map and filter controls, radio semantics, report-card summaries, and collapsed-list accessibility hiding are present.
- Labeled navigation iteration: Reports, Map, and Profile use persistent short labels, stable equal-width targets, and a green Map selected state. The implemented 56-point dock is intentionally compact and low to preserve map and report space while retaining the selected visual hierarchy.
- Zillow-style navigation iteration: The Map screen now uses one full-width white bottom surface with rounded sheet corners, a centered drag handle and report count, three evenly spaced labeled tabs, a wide pale-green active capsule, and native safe-area padding. Zillow's five destinations were intentionally mapped to the existing Reports, Map, and Profile routes only.

## Verification notes

- TypeScript check passed.
- Expo config generation passed.
- Expo Doctor passed 18/18 checks.
- Clean iOS and Android Expo exports passed.
- A fresh Android API 36 development build passed native phone and tablet-class viewport checks. The installed stale QA client was replaced before testing because it predated the current Expo native modules.
- Android swipe-up expansion, swipe-down collapse, Profile navigation, and hardware Back-to-Map passed.
- iPad mini layout, safe-area clearance, guest browsing, tab placement, and report-sheet expansion passed.

---

# Web Map and Header Design QA

## Visual truth

- Airbnb desktop map/results reference: Refero screen `6ed840e9-829f-4eda-919e-cff8cd9713f3`
- Airbnb mobile map/list reference: Refero screen `d3d4812f-67f9-41da-902d-6a7de9ec3a68`
- Trulia desktop map/results reference: Refero screen `dd5001c2-510a-42de-9533-9328b8d96de7`
- Zillow desktop reference capture: `/tmp/litterbugs-design-qa/zillow-desktop.png`
- Production desktop capture: `/tmp/litterbugs-design-qa/litterbugs-production-desktop.png`
- Production selected-report capture: `/tmp/litterbugs-design-qa/litterbugs-production-detail.png`
- Mobile list capture: `/tmp/litterbugs-design-qa/litterbugs-mobile-list.png`
- Desktop comparison composite: `/tmp/litterbugs-design-qa/desktop-comparison.png`

## Test state

- Desktop viewport: 1280×720 at 1x density
- Mobile viewport: 390×844 at 1x density
- User state: signed out
- Data state: 11 active test reports, including photographed, funded, claimed, completed, and unfunded reports
- Interaction state: default map/results view, mobile list sheet, selected report details, and signed-out report action

## Comparison findings and resolutions

- P1 — The previous floating report panel obscured too much of the map. Replaced it with the persistent desktop results/map split used by Zillow, Airbnb, and Trulia.
- P2 — The page carried labels, badges, explanations, and instructions that competed with the reports. Removed the map instruction, legend, eyebrow, subtitle, and status pills.
- P2 — The text-only result list did not scan like a marketplace. Added report photography, compact reward/status text, clear dates, and a two-column desktop result grid.
- P2 — Report pins were generic alert icons. Replaced them with compact reward and availability labels, including a dark selected state.
- P2 — The mobile list could open partway down. Reset the list position when opened and made each row size to its own content.
- P2 — Selecting a report unnecessarily recreated all map markers. Selection now updates the existing marker appearance.
- P2 — Near-midnight report dates differed between server and browser time zones, causing a hydration warning. Public report dates now use one deterministic time zone.

## Required fidelity surfaces

- Typography: Existing Litterbugs typography is retained with marketplace-style scale and hierarchy.
- Spacing: Desktop split, card gutters, map controls, and mobile sheet spacing match the reference patterns without copying another brand.
- Colors: Existing Litterbugs green, white surfaces, muted gray metadata, and subtle borders remain consistent.
- Images: Real report photos are used, including the web-compatible HEIC path; reports without photos use compact text cards rather than fabricated imagery.
- Copy: Visible copy is short and plain. Navigation is Map, Cleanup policy, and Terms; the primary map action is Report litter.
- Header: The Litterbugs logo is visually centered, navigation sits on the left, and account access sits on the right.
- Interactions: Map/list switching, result selection, report details, navigation links, account/sign-in access, and the report action were exercised.
- Console: The production-only hydration mismatch was reproduced and traced to time-zone-dependent date formatting; the deterministic-date fix is covered by a focused test before redeployment.

## Result

final result: passed

---

# Web Results Grid Refinement

## Source and implementation

- Source visual truth: `/var/folders/g1/z5srknk55b52bfd28jykgmj00000gn/T/TemporaryItems/NSIRD_screencaptureui_GcoFbv/Screenshot 2026-08-27 at 6.34.24 PM.png`
- Supporting Refero references: Trulia `b1954998-526a-4a0f-9f76-92163295d0ec`; Airbnb `6ed840e9-829f-4eda-919e-cff8cd9713f3`
- Production desktop implementation: `/tmp/litterbugs-grid-production-final.png`
- Production mobile implementation: `/tmp/litterbugs-grid-production-mobile-full.png`
- Normalized desktop comparison: `/tmp/litterbugs-grid-zillow-comparison-final.png`
- Source pixels: 1542×1085, cropped to the 1430×795 website region and normalized to 1280×720
- Implementation pixels and CSS viewport: 1280×720 at 1x density
- Mobile CSS viewport: 390×844 at 1x density
- State: signed out, 11 active test reports, default desktop map/results view and open mobile results sheet

## Full-view comparison

The normalized comparison places the supplied Zillow result screen and the live Litterbugs implementation in one image. Both now use a centered brand header, a dominant left map, a scrollable right results grid, compact marker labels, white image-led cards, subtle gray page framing, rounded corners, and restrained borders/shadows. Litterbugs intentionally gives the map a larger 60/40 share and omits Zillow's search/filter chrome because the product has no equivalent search task and the user requested less instructional clutter.

## Focused regions

- Header: the Litterbugs header is 72 CSS pixels high, uses 15-pixel navigation, a smaller centered logo, and a 40-pixel account action. This matches the density and spacing of the supplied Zillow header while retaining Litterbugs branding.
- Cards: production cards use 16:9 images, 12-pixel radii, visible borders, white surfaces, subtle elevation, two-line titles, aligned reward/status rows, and a distinct light-gray results background.
- Responsive state: at 1280 CSS pixels the map is 768 pixels and the list is 512 pixels. At 390×844 the experience remains map-first and opens the results as a full-width bottom sheet.
- Images: report-card sources are converted to cached 720×405 WebP thumbnails. A sampled HEIC card fell from 1,853,515 bytes to 18,326 bytes; a sampled JPEG card was 23,100 bytes. Three visible production images completed in 894 ms on the verified cached load.

## Comparison history

- P1 — Map hierarchy: the previous implementation placed the results on the left and made them visually equal to the map. Fixed by moving the map left and assigning it the dominant 60% desktop share. Post-fix evidence: `/tmp/litterbugs-grid-production-final.png`.
- P2 — Card separation: cards previously blended into the white page because their borders were transparent and their surface was transparent. Fixed with a gray results surface, white card surfaces, visible borders, radius, and subtle elevation. Post-fix evidence: `/tmp/litterbugs-grid-zillow-comparison-final.png`.
- P2 — Card density: 4:3 images made each card too tall and reduced scan speed. Fixed with 16:9 imagery, tighter gutters, consistent copy height, and responsive one-column behavior below 1100 pixels. Post-fix evidence: `/tmp/litterbugs-grid-production-final.png`.
- P2 — Information loss: single-line titles truncated useful report context. Fixed with a two-line title region and aligned status/reward rows. Post-fix evidence: `/tmp/litterbugs-grid-production-final.png`.
- P1 — Image delivery: cards requested full-resolution phone photos and some browser-compatible photos waited for client-side signing. Fixed by using one verified, cached thumbnail endpoint for HEIC, JPEG, PNG, and WebP card photos. Post-fix evidence: measured 18–23 KB card assets and a sub-second cached visible-image load.
- P2 — Header scale: the earlier logo and header typography were oversized relative to the supplied Zillow reference. Fixed with a 72-pixel header, 48-pixel logo box, 15-pixel navigation, and tighter horizontal rhythm. Post-fix evidence: `/tmp/litterbugs-grid-zillow-comparison-final.png`.

## Verification

- Main navigation, report selection, map/list behavior, and the mobile results sheet were exercised.
- Production was checked at desktop and mobile CSS viewports.
- Production console errors and warnings checked: none.
- Web tests passed: 12 files, 37 tests.
- TypeScript, lint, build, and web boundary checks passed.

## Follow-up polish

- P3 — Real user-created titles may benefit from future content guidance, but no additional UI instruction should be added to this results screen.

## Result

final result: passed
