# Mobile Reports Navigation Design QA

## Result

final result: passed

---

# Red Brand and Header Refinement

## Source and implementation

- Nomads color reference: `/var/folders/g1/z5srknk55b52bfd28jykgmj00000gn/T/TemporaryItems/NSIRD_screencaptureui_sz5zUi/Screenshot 2026-08-28 at 10.58.28 AM.png`
- Zillow navigation references: `/var/folders/g1/z5srknk55b52bfd28jykgmj00000gn/T/TemporaryItems/NSIRD_screencaptureui_vhPmJc/Screenshot 2026-08-28 at 10.59.04 AM.png` and `/var/folders/g1/z5srknk55b52bfd28jykgmj00000gn/T/TemporaryItems/NSIRD_screencaptureui_wrc25k/Screenshot 2026-08-28 at 11.00.44 AM.png`
- Live desktop implementation: `/tmp/litterbugs-red-brand-live.png`
- Live mobile implementation: `/tmp/litterbugs-red-brand-mobile.png`
- Normalized header comparison: `/tmp/litterbugs-red-brand-header-comparison.png`
- Desktop CSS viewport: 1280×720 at 1x density
- Mobile CSS viewport: 390×844 at 1x density
- User state: signed out

## Full-view comparison

The live site now uses the Nomads brand red (`#FF4742`) across branded actions, navigation emphasis, selected-card treatment, and interactive hover states. The header follows the supplied Zillow reference with Inter at 16 pixels, regular weight, 28-pixel line height, dark text, approximately 30-pixel item spacing, a centered logo, and balanced left/right navigation groups.

## Focused regions

- Color: the live Sign in and Report litter buttons measure `rgb(255, 71, 66)`, matching `#FF4742`; the Sign in hover measures `rgb(225, 62, 58)` for clear feedback.
- Header: desktop height is 78 pixels with 48-pixel horizontal padding. Navigation measures 16 pixels, weight 400, line height 28 pixels, and uses Inter with the intended fallbacks.
- Responsive state: at 390 pixels the desktop navigation is hidden, the centered logo and red Sign in action remain balanced, the red Report litter action remains visible, and no horizontal overflow is present.
- Semantics: green remains only where it communicates data such as Low severity or a successful state; it no longer functions as the website's brand color.

## Comparison history

- P1 — Brand inconsistency: the site previously used green for primary actions and emphasis. Fixed by introducing one red brand token and applying it consistently to public, legal, and administrator branded surfaces.
- P2 — Header rhythm: navigation was smaller and tighter than the supplied Zillow reference. Fixed with Inter, 16-pixel regular navigation text, 28-pixel line height, 30-pixel gaps, and a 78-pixel header.
- P2 — Incomplete interaction color: primary buttons and secondary controls did not share a coherent hover treatment. Fixed with the red brand token, a darker red primary hover, and light-red secondary hover states.
- P2 — Mobile consistency: the mobile header needed the same brand treatment without crowding. Verified with hidden desktop navigation, centered logo, red Sign in action, and zero horizontal overflow.

## Verification

- Production desktop and mobile views were visually inspected.
- Sign in hover and default primary-action colors were measured in the live page.
- Production console errors and warnings from `litterbugs.app` checked: none.
- Web tests passed: 12 files, 37 tests.
- TypeScript, lint, and the remote Vercel production build passed.

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

---

# Larger Header Logo Refinement

## Source and implementation

- Source visual truth: `/var/folders/g1/z5srknk55b52bfd28jykgmj00000gn/T/TemporaryItems/NSIRD_screencaptureui_kCRhZx/Screenshot 2026-08-28 at 11.28.10 AM.png`
- Live desktop implementation: `/tmp/litterbugs-larger-header-logo-live.png`
- Live mobile implementation: `/tmp/litterbugs-larger-header-logo-mobile.png`
- Focused normalized comparison: `/tmp/litterbugs-larger-logo-comparison.png`
- Source pixels: 1570×100
- Desktop implementation: 1280×720 CSS viewport at 1x density; header comparison normalized to 1570×100
- Mobile implementation: 390×844 CSS viewport at 1x density
- State: signed out on the live implementation; the supplied comparison shows the signed-in Account state

## Full-view and focused comparison

The supplied side-by-side header showed the stacked Litterbugs logo at roughly 70 pixels wide, while the Zillow wordmark occupied roughly 107 pixels and read more confidently. The updated live header renders the Litterbugs logo at 91×62 CSS pixels. Because the Litterbugs mark is stacked rather than horizontal, its letter height now has similar visual weight to the Zillow wordmark without increasing the 78-pixel header height.

The focused comparison confirms the logo remains centered independently of the unequal navigation and account controls. Navigation typography, spacing, red brand color, button sizing, and the header divider remain unchanged.

## Required fidelity surfaces

- Fonts and typography: existing Inter navigation treatment is unchanged; the larger raster logo makes its embedded lettering more readable.
- Spacing and layout rhythm: desktop logo height increased from 48 to 62 pixels within the existing 78-pixel header; tablet uses 58 pixels and mobile retains the compact 48-pixel size.
- Colors and tokens: no color changes; the exact red brand treatment remains intact.
- Image quality: the supplied high-resolution Litterbugs logo asset is used directly, with its aspect ratio preserved and no stretching or replacement art.
- Copy and content: no navigation or account copy changed.

## Comparison history

- P2 — Logo readability: the first live version was noticeably smaller and less legible than the Zillow reference. Fixed by increasing the desktop logo from 48 to 62 pixels high and the intermediate tablet size to 58 pixels. Post-fix evidence: `/tmp/litterbugs-larger-logo-comparison.png`.
- P2 — Responsive risk: applying the full desktop increase at phone widths could crowd the header. Prevented by retaining the established 48-pixel mobile logo. The 390-pixel live view has no horizontal overflow.

## Verification

- Production desktop and mobile views were visually inspected.
- Desktop logo measured 91×62 CSS pixels; mobile logo measured 70.5×48 CSS pixels.
- Production console errors and warnings from `litterbugs.app` checked: none.
- TypeScript, lint, CSS diff check, and the remote Vercel production build passed.

## Result

final result: passed

---

# Neutral Medium-Weight Navigation

## Source and implementation

- Earlier Litterbugs navigation: `/var/folders/g1/z5srknk55b52bfd28jykgmj00000gn/T/TemporaryItems/NSIRD_screencaptureui_03gemm/Screenshot 2026-08-28 at 11.52.31 AM.png`
- Zillow visual reference: `/var/folders/g1/z5srknk55b52bfd28jykgmj00000gn/T/TemporaryItems/NSIRD_screencaptureui_jSsTdf/Screenshot 2026-08-28 at 11.52.38 AM.png`
- Live implementation: `/tmp/litterbugs-neutral-medium-nav-live.png`
- Focused normalized comparison: `/tmp/litterbugs-neutral-medium-nav-comparison.png`
- Earlier Litterbugs source pixels: 349×90; Zillow source pixels: 327×78
- Implementation viewport: 1280×720 CSS pixels at 1x density; navigation region normalized to 349×90 for comparison
- State: signed out, Map route selected, default navigation state plus Cleanup policy hover

## Full-view and focused comparison

The live navigation now uses medium-weight Inter text that more closely matches the visual density of the Zillow reference. Map, Cleanup policy, and Terms all render in the same dark color even though Map remains correctly identified as the current page for accessibility. The red selected-page styling is gone.

The focused comparison includes the earlier Litterbugs navigation, the supplied Zillow reference, and the revised live navigation in one image. Spacing, 16-pixel size, and 28-pixel line height remain unchanged, so this refinement improves weight and neutrality without changing the established header rhythm.

## Required fidelity surfaces

- Fonts and typography: Inter remains at 16 pixels and 28-pixel line height; weight increased from 400 to 500.
- Spacing and layout rhythm: navigation gaps and header alignment are unchanged.
- Colors and tokens: every resting navigation label measures `rgb(17, 17, 22)`; red remains only as a temporary hover color.
- Image quality: no image assets changed; the existing logo remains sharp and correctly scaled.
- Copy and content: navigation labels are unchanged.

## Comparison history

- P2 — Selected-page indicator: Map previously rendered red while the reference kept all resting navigation labels neutral. Fixed by removing the current-page color rule. Post-fix evidence: `/tmp/litterbugs-neutral-medium-nav-comparison.png`.
- P2 — Navigation weight: the earlier 400 weight appeared lighter than the supplied reference. Fixed by moving the navigation to 500. Post-fix evidence: the live computed weight is 500 for all three links.

## Verification

- Production navigation was visually inspected at 1280×720.
- All three resting labels measured the same dark color and 500 weight.
- The existing red hover response remains functional.
- Production console errors and warnings from `litterbugs.app` checked: none.
- TypeScript, lint, CSS diff check, and the remote Vercel production build passed.

## Result

final result: passed

---

# Prominent Header Logo

## Source and implementation

- Source visual truth: `/var/folders/g1/z5srknk55b52bfd28jykgmj00000gn/T/TemporaryItems/NSIRD_screencaptureui_mSIJGE/Screenshot 2026-08-28 at 12.03.04 PM.png`
- Live reference-width implementation: `/tmp/litterbugs-prominent-header-logo-830.png`
- Live desktop implementation: `/tmp/litterbugs-prominent-header-logo-live.png`
- Live mobile implementation: `/tmp/litterbugs-prominent-header-logo-mobile.png`
- Focused normalized comparison: `/tmp/litterbugs-prominent-logo-comparison.png`
- Source pixels: 1067×133, including a 238-pixel Zillow reference region and an approximately 830-pixel Litterbugs browser region
- Implementation viewports: 830×720 and 1280×720 desktop/tablet; 390×844 mobile; all at 1x density
- State: signed out, Map route selected

## Full-view and focused comparison

The supplied comparison showed the horizontal Zillow wordmark at roughly 160 pixels wide and the earlier stacked Litterbugs mark at roughly 90 pixels wide. The revised live Litterbugs mark now measures 132×90 CSS pixels, giving its embedded lettering comparable prominence while preserving the stacked artwork's original aspect ratio.

The 830-pixel comparison matches the visible width of the user's Litterbugs browser region. The logo is now unmistakably larger than the earlier version, remains exactly centered, and has a dedicated 96-pixel header so none of the artwork is cropped or allowed to overlap the map.

## Required fidelity surfaces

- Fonts and typography: navigation typography remains unchanged; the larger brand raster materially improves the legibility of its embedded lettering.
- Spacing and layout rhythm: desktop and tablet header height is 96 pixels with a 90-pixel logo; navigation and account controls remain vertically centered. Mobile retains the 66-pixel header.
- Colors and tokens: no color changes were introduced.
- Image quality: the original high-resolution Litterbugs artwork remains proportional, sharp, and uncropped.
- Copy and content: no text changed.

## Comparison history

- P2 — Insufficient logo presence: the earlier 91×62 desktop mark and 100×68 tablet mark remained visibly smaller than the supplied Zillow reference. Fixed by increasing the desktop and tablet mark to 132×90 and providing a 96-pixel header. Post-fix evidence: `/tmp/litterbugs-prominent-logo-comparison.png`.
- P2 — Mobile crowding risk: applying the new 90-pixel mark on phones would displace the account action. Prevented by retaining the existing 70.5×48 mobile logo and 66-pixel mobile header; the 390-pixel view has no horizontal overflow.

## Verification

- Production was visually inspected at the reference width, full desktop width, and mobile width.
- The 830- and 1280-pixel views both measure the logo at 132×90 CSS pixels.
- The mobile view remains 70.5×48 with zero horizontal overflow.
- Production console errors and warnings from `litterbugs.app` checked: none.
- TypeScript, lint, CSS diff check, and the remote Vercel production build passed.

## Result

final result: passed
