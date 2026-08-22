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
