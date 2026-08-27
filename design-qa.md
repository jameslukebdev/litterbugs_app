# Mobile Reports Navigation Design QA

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
