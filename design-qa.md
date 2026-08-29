# Zillow-Sized Responsive Grid and Search Navigation

## Source and implementation

- User-reported cramped grid: `/Users/grantgibson/.codex/visualizations/2026/08/28/01a04933-e1cd-75c2-86c0-1e8b617a5cb5/grid-cramped-source.png`
- User-selected Zillow grid reference: `/Users/grantgibson/.codex/visualizations/2026/08/28/01a04933-e1cd-75c2-86c0-1e8b617a5cb5/grid-zillow-source.png`
- Live Zillow reference URL: `https://www.zillow.com/newland-nc/`
- Browser-rendered 1104px implementation: `/Users/grantgibson/.codex/visualizations/2026/08/28/01a04933-e1cd-75c2-86c0-1e8b617a5cb5/grid-zillow-responsive-1104-top.png`
- Browser-rendered 1440px implementation: `/Users/grantgibson/.codex/visualizations/2026/08/28/01a04933-e1cd-75c2-86c0-1e8b617a5cb5/grid-zillow-responsive-1440.png`
- Browser-rendered 700px implementation: `/Users/grantgibson/.codex/visualizations/2026/08/28/01a04933-e1cd-75c2-86c0-1e8b617a5cb5/grid-zillow-responsive-700.png`
- Browser-rendered 390px implementation: `/Users/grantgibson/.codex/visualizations/2026/08/28/01a04933-e1cd-75c2-86c0-1e8b617a5cb5/grid-zillow-responsive-390.png`
- Equal-state before/after comparison: `/Users/grantgibson/.codex/visualizations/2026/08/28/01a04933-e1cd-75c2-86c0-1e8b617a5cb5/grid-responsive-before-after.png`
- Zillow/implementation wide-panel comparison: `/Users/grantgibson/.codex/visualizations/2026/08/28/01a04933-e1cd-75c2-86c0-1e8b617a5cb5/grid-zillow-wide-comparison.png`
- Local implementation: `http://localhost:3020/`
- CSS viewports: 1440×1000, 1280×850, 1279×850, 1200×850, 1104×850, 1024×850, 900×850, 800×850, 701×850, 700×850, 600×850, and 390×844 at 1x density.
- Source problem-state content was normalized from the supplied 1200×1070 browser screenshot to an unscaled 1104×850 page region. The implementation comparison is an unscaled 1104×850 browser-rendered page. The wide Zillow comparison uses 747×720 and 750×720 result-panel crops at 1x density.
- State: public map, signed out, Available filter, Newest sort; mobile/tablet result sheet open where applicable.

## Live Zillow measurements

- At 1440px and 1280px, Zillow's result panel is 735px wide with two 343.5px tracks, 344px cards, 20px side padding, and an 8px gap.
- At 1200px, 1104px, and 1024px, Zillow switches to one 320px card inside a 360px result panel instead of compressing two cards.
- At 900px and 800px, Zillow gives the list the full viewport and uses two cards measuring about 419px and 369px respectively.
- Zillow cards remained about 304px tall in the measured desktop states. Litterbugs cards are intentionally taller because they preserve a separate reward/volunteer line, workflow status, litter-type attributes, severity, and date.

## Full-view and focused comparison

The equal-state comparison shows the reported 1104px layout and the corrected implementation side by side. The earlier implementation kept two roughly 195px cards inside a narrow panel, truncating task attributes and leaving a conspicuous empty second-column region after the third result. The corrected state follows Zillow's breakpoint and presents one 319px card in a 375px panel, with consecutive cards separated by only 8px.

The wide-panel comparison places the selected Zillow result grid and Litterbugs' 1440px implementation together. Both use a roughly 750px panel, two approximately 343px card tracks, 20px side padding, and an 8px grid gap. This focused comparison is necessary because the requested issue concerns exact card tracks and responsive density rather than the map itself.

## Required fidelity surfaces

- Fonts and typography: the established Litterbugs Inter hierarchy is unchanged. Wider cards prevent reward, title, litter-type, severity, and date text from collapsing into unreadable fragments.
- Spacing and layout rhythm: the desktop grid now uses Zillow's 8px gap and 20px side padding. At 1280px and above, visible cards measure 343px in two columns. From 701–1279px, visible cards measure 319px in one column. The mobile sheet uses an auto-fit 300px minimum, yielding two 323px cards at 700px, one centered 420px card at 600px, and one 343px card at 390px.
- Colors and visual tokens: no color tokens changed. The neutral grid surface, red value hierarchy, black selected filter, and semantic severity colors remain intact.
- Image quality and asset fidelity: report photographs remain real, right-sized assets with the established crop. The responsive change gives them Zillow-like presentation widths without stretching or replacing them.
- Copy and content: `Search` replaces `Map` in desktop and mobile header navigation. The Map label remains only where it describes an actual view toggle, which preserves accurate control semantics.
- Interaction and accessibility: filter scrolling, native sorting, card selection, map-marker synchronization, and the mobile Map/List toggle remain functional. Mobile Search remains available through the Menu. No card becomes narrower than 319px in the measured supported states.

## Findings

- No actionable P0/P1/P2 mismatch remains.
- P3 — Litterbugs retains its map-first bottom sheet below 701px instead of copying Zillow's full-page mobile list. This is intentional because Litterbugs' core task starts with a location and already provides an explicit Map/List toggle.
- P3 — Litterbugs cards are 28–42px taller than Zillow cards at comparable widths because Litterbugs exposes additional task and safety metadata. Removing that information would reduce usability for cleanup decisions.

## Comparison history

- P1 — Two cards were compressed to roughly 195px at the 1104px problem viewport. Fixed by matching Zillow's single-column intermediate breakpoint and maintaining a 319px visible card width.
- P2 — The 14px grid gap and odd two-column layout amplified dead space between a three-card result set. Fixed with Zillow's 8px gap and a one-column intermediate layout.
- P2 — The earlier responsive rules changed from two tiny cards to one large card without a stable minimum. Fixed with measured desktop panel widths and a 300px mobile auto-fit minimum plus a 420px single-card cap.
- P2 — The header still labeled the discovery route `Map`. Fixed by renaming the shared desktop and mobile navigation link to `Search` while preserving actual Map view-toggle copy.
- Post-fix evidence: `grid-responsive-before-after.png`, `grid-zillow-wide-comparison.png`, and the 1440px, 1104px, 700px, and 390px implementation captures.

## Verification

- Measured Litterbugs cards: 343px at 1440/1280; 319px at 1279/1200/1104/1024/900/800/701; 323px at 700; 420px centered at 600; 343px at 390.
- Browser-tested mobile card selection and detail close behavior.
- Browser-tested mobile Menu and Search link visibility.
- Browser console errors and warnings: none.
- Web tests: 18 files, 51 tests passed.
- Lint, TypeScript, and production build passed.

## Result

final result: passed

---

# Cleanup Opportunity Grid, Navigation Labels, and Favicon

## Source and implementation

- Source visual truth — existing Litterbugs grid: `/Users/grantgibson/.codex/visualizations/2026/08/28/01a04933-e1cd-75c2-86c0-1e8b617a5cb5/grid-audit-litterbugs-source.png`
- Source visual truth — selected Zillow grid reference: `/Users/grantgibson/.codex/visualizations/2026/08/28/01a04933-e1cd-75c2-86c0-1e8b617a5cb5/grid-audit-zillow-grid.png`
- Research and implementation specification: `/Users/grantgibson/.codex/visualizations/2026/08/28/01a04933-e1cd-75c2-86c0-1e8b617a5cb5/grid-card-research.md`
- Browser-rendered desktop implementation: `/Users/grantgibson/.codex/visualizations/2026/08/28/01a04933-e1cd-75c2-86c0-1e8b617a5cb5/grid-redesign-desktop-final.png`
- Browser-rendered mobile implementation: `/Users/grantgibson/.codex/visualizations/2026/08/28/01a04933-e1cd-75c2-86c0-1e8b617a5cb5/grid-redesign-mobile.png`
- Normalized focused comparison: `/Users/grantgibson/.codex/visualizations/2026/08/28/01a04933-e1cd-75c2-86c0-1e8b617a5cb5/grid-redesign-qa-comparison.png`
- Transparent favicon check: `/Users/grantgibson/.codex/visualizations/2026/08/28/01a04933-e1cd-75c2-86c0-1e8b617a5cb5/favicon-transparency-check.png`
- Local implementation: `http://localhost:3020/`
- Desktop CSS viewport and implementation pixels: 1440×1000 at 1x density.
- Mobile CSS viewport and implementation pixels: 390×844 at 1x density.
- Supplied Litterbugs source pixels: 556×777. Zillow source pixels: 744×725. The 1836×760 focused comparison normalizes each source and the implementation result panel to 760px high without changing aspect ratio.
- State: public map, signed out, default Available filter, Newest sort; mobile results sheet open.

## Full-view and focused comparison

The full desktop and mobile captures verify the map/results composition, sticky result controls, card hierarchy, responsive sheet, and header labels. The normalized three-panel comparison places the old Litterbugs grid, the selected Zillow reference, and the new implementation in one image. It shows that the new grid preserves Litterbugs content while adopting the reference's fixed media, stronger primary value line, aligned card tracks, restrained elevation, and quick-scanning metadata.

The focused comparison is required because the meaningful differences are inside the result cards: workflow badge placement, reward/title hierarchy, task attributes, metadata contrast, fixed geometry, and filter density. The favicon transparency check composites the final PNG over blue to prove that no white canvas remains.

## Required fidelity surfaces

- Fonts and typography: report cards now use the existing Inter stack. Reward/volunteer value is 18px/850, title is 14px with a two-line clamp, filter and metadata text is 12–12.5px, and the result heading is 20px. The prior 11px low-contrast metadata treatment is removed.
- Spacing and layout rhythm: desktop retains two columns above the established tablet breakpoint with 14px gaps and 18px panel padding. Cards use a fixed 16:9 media region, 14px radius, consistent copy height, 7px internal rhythm, and an aligned metadata divider. Mobile uses one column in the existing bottom sheet with scrollable filter chips and no horizontal page overflow.
- Colors and visual tokens: white cards, neutral gray-green tags, near-black selected filters, and the existing accessible red hierarchy match Litterbugs' system. Red remains the selected-card and primary-value accent; severity colors remain semantic. Hover no longer moves or zooms cards.
- Image quality and asset fidelity: real report photographs continue through the right-sized card image route with `object-fit: cover`; missing photos use the existing icon library. Multiple-photo reports show a truthful count rather than fake carousel dots. The browser icon uses a generated brand-consistent red bug asset at 256×256 with alpha transparency and no white background.
- Copy and content: workflow status, reward type, title, litter types, severity, and date are now separate facts. `Field Guide` replaces `How it works`, and `Safety` replaces `Info` in desktop navigation; route destinations remain unchanged.
- Interaction states: Available, Rewarded, Volunteer, In progress, and All reports filters work. Newest, Highest reward, and Highest severity sorting work. Filter changes update both cards and map markers. Cards still open the existing report detail and preserve its close behavior.
- Accessibility: filter buttons expose `aria-pressed`, sorting has an accessible label, selected cards retain `aria-current`, focus-visible styling remains, targets are at least 36–44px depending on context, and small text colors meet the intended contrast improvement.

## Findings

- No actionable P0/P1/P2 mismatch remains.
- P3 — At the 390px viewport, the fifth `All reports` filter sits off-screen until horizontal scrolling. This is intentional progressive disclosure; every control remains keyboard- and touch-reachable without compressing labels.
- P3 — The favicon deliberately uses one enlarged brand bug instead of the complete wordmark because the full logo is illegible at a 16px browser-tab size.

## Comparison history

- P1 — Reward and workflow state were conflated, so a funded open report hid its `Open` state. Fixed by rendering an image-level workflow badge and a separate reward/volunteer value line.
- P1 — Completed and operational preview reports were counted as cleanup opportunities. Fixed by defaulting to genuinely available reports while retaining explicit In progress and All reports views. Filtered card counts and map-marker counts stay synchronized.
- P2 — Title-first hierarchy and 11px metadata made the cards slow to scan. Fixed with reward-first hierarchy, task attributes, darker 12px metadata, and an aligned footer.
- P2 — Hover translation and image zoom destabilized a dense two-column grid. Removed both motion effects while retaining border and elevation feedback.
- P2 — The first favicon used a complete wordmark and then a white-canvas bug, both of which failed at browser-tab size. Replaced with one enlarged 256px bug and post-processed alpha transparency. The page now advertises the new transparent asset through icon, shortcut-icon, and apple-touch-icon metadata.
- Post-fix evidence: `grid-redesign-qa-comparison.png`, `grid-redesign-desktop-final.png`, `grid-redesign-mobile.png`, and `favicon-transparency-check.png`.

## Verification

- Browser-tested filter state: All reports displayed 11 cards and 11 map markers.
- Browser-tested sort state: Highest reward became the selected native sort option.
- Browser-tested report interaction: first card opened its detail sheet and Close report details removed it.
- Browser-tested navigation: Safety opened the Information and policies menu; Field Guide navigated to `/about`.
- Browser-tested favicon metadata: shortcut icon, icon, and apple-touch-icon all resolve to `/brand/litterbugs-favicon-transparent.png`; file metadata reports four channels and alpha transparency.
- Browser console errors and warnings: none.
- Web tests: 18 files, 51 tests passed.
- Lint, TypeScript, and production build passed.

## Result

final result: passed

---

# Mobile Reports Navigation Design QA

## Result

final result: passed

---

# Mobile Menu Typography and Sign-In Color

## Source and implementation

- Source visual truth: `/var/folders/g1/z5srknk55b52bfd28jykgmj00000gn/T/TemporaryItems/NSIRD_screencaptureui_qd5zdj/Screenshot 2026-08-28 at 4.28.12 PM.png`
- Browser-rendered implementation: `/Users/grantgibson/.codex/visualizations/2026/08/28/01a04933-e1cd-75c2-86c0-1e8b617a5cb5/menu-signin-matched-width.png`
- Normalized focused comparison: `/Users/grantgibson/.codex/visualizations/2026/08/28/01a04933-e1cd-75c2-86c0-1e8b617a5cb5/menu-signin-header-comparison.png`
- Local implementation: `http://localhost:3020/`
- CSS viewport: 612×400 pixels; the in-app browser capture excludes its 15-pixel scrollbar gutter and produces a 597×390 image at 1x density.
- Source pixels: 597×137 at 1x density. The source app header was cropped to 597×66 from y=44; the implementation app header was cropped to 597×66 from y=0. The side-by-side comparison uses these equal-size, unscaled crops.
- State: public map route, signed out, report mode inactive, mobile navigation closed.

## Full-view and focused comparison

The full browser capture verifies the revised header in the live map experience. The equal-size focused comparison was required because the requested changes concern small UI typography and button color. It places the supplied problem state and the revised implementation in one image, with browser debugging chrome excluded.

## Required fidelity surfaces

- Fonts and typography: Menu now uses the same Inter-stack 16px/600 treatment as Map, How it works, and Info in non-mobile navigation. The visible 44×44px mobile touch target is retained.
- Spacing and layout rhythm: the 66px header, centered logo, 6px action gap, 42px action heights, and 12px radii are unchanged. Menu, Report, and Sign in remain fully visible without collision.
- Colors and visual tokens: Report stays the solid brand-red primary action. Signed-out Sign in now uses the existing brand-red-soft token with red text and a light red border, creating a colored secondary action without competing with Report. Signed-in Account remains neutral.
- Image quality and asset fidelity: the original Litterbugs logo remains centered, proportional, and sharp. No replacement or code-drawn asset was introduced.
- Copy and content: Menu, Report, and Sign in labels are unchanged; no truncation or wrapping was introduced.

## Findings

- No actionable P0/P1/P2 mismatch remains.
- P3 — The soft red Sign in button intentionally has lower contrast and emphasis than Report; this preserves the primary/secondary action hierarchy.

## Comparison history

- P2 — Menu typography did not match the desktop navigation: the supplied state used a smaller 13px/800 control while the desktop navigation used 16px/600. Fixed by applying the desktop size and weight to the mobile Menu trigger.
- P2 — Sign in lacked brand color and read as a generic neutral utility button. Fixed with a signed-out-only soft red class; Account keeps its existing neutral treatment after authentication.
- Post-fix evidence: computed Menu typography is 16px/600. Computed Sign in colors are `rgb(200, 50, 46)` text, `rgb(255, 240, 239)` background, and `rgb(255, 196, 193)` border. The matched-width comparison shows both changes without altering header geometry.

## Verification

- Menu opens the Mobile navigation region and closes successfully.
- Sign in opens the existing authentication dialog.
- Horizontal header controls remain in frame; no browser console warnings or errors were recorded.
- Web tests passed: 18 files, 50 tests.
- Lint, TypeScript, and diff checks passed.

## Result

final result: passed

---

# Account-Aware Public Header

## Source and implementation

- Source visual truth: `/var/folders/g1/z5srknk55b52bfd28jykgmj00000gn/T/TemporaryItems/NSIRD_screencaptureui_duDsBt/Screenshot 2026-08-28 at 3.46.48 PM.png`
- Browser-rendered desktop implementation: `/Users/grantgibson/.codex/visualizations/2026/08/28/01a04933-e1cd-75c2-86c0-1e8b617a5cb5/account-header-desktop.png`
- Focused equal-width comparison: `/Users/grantgibson/.codex/visualizations/2026/08/28/01a04933-e1cd-75c2-86c0-1e8b617a5cb5/account-header-neutral-comparison.png`
- Sign-in dialog state: `/Users/grantgibson/.codex/visualizations/2026/08/28/01a04933-e1cd-75c2-86c0-1e8b617a5cb5/account-header-auth-dialog.png`
- Mobile implementation: `/Users/grantgibson/.codex/visualizations/2026/08/28/01a04933-e1cd-75c2-86c0-1e8b617a5cb5/account-header-mobile.png`
- Source pixels: 290×107 at 1x density. Desktop implementation pixels and CSS viewport: 1265×712 at 1x density. Focused comparison uses two 290-pixel-wide crops without horizontal scaling. Mobile CSS viewport: 390×844 at 1x density.
- State: public How it works route, signed out; sign-in dialog open for the provider interaction check; mobile navigation closed for the responsive header check.

## Full-view and focused comparison

The full desktop capture confirms that the account action sits inside the established centered-logo header without changing its navigation rhythm. The focused comparison places the reported red `Back to map` state and the revised neutral `Sign in` control in one normalized image. The revised control preserves the same compact scale and rounded geometry while removing the unrelated high-emphasis red treatment.

A focused comparison was required because the control color, border, weight, and spacing are too small to judge reliably in the full page. Separate desktop, dialog, and mobile captures verify the interaction and responsive states.

## Required fidelity surfaces

- Fonts and typography: the action uses the existing Inter stack at 14px with a strong but not oversized weight; the label remains one line at desktop and mobile widths.
- Spacing and layout rhythm: the 42px control height provides a practical target without crowding the 80px desktop or 66px mobile header. The Info-to-account gap and centered logo remain unchanged.
- Colors and visual tokens: the former solid red action is replaced with a neutral near-white surface, gray-green border, and near-black text. Red remains reserved for active navigation and primary product actions.
- Image quality and asset fidelity: the original high-resolution Litterbugs logo remains centered, proportional, and uncropped. Signed-in profile photos use the existing Supabase avatar asset rather than generated or code-drawn art.
- Copy and content: `Back to map` is removed. The control now says `Sign in` for guests and `Account` for authenticated members. The sign-in dialog exposes Google, Facebook, and email authentication.
- Responsive behavior: the 390px implementation keeps Menu, logo, and Sign in visible with no overlap or horizontal overflow; the mobile menu still opens independently.

## Findings

- No actionable P0/P1/P2 visual or interaction mismatch remains in the supplied signed-out header state.
- P3 residual test gap: the signed-in avatar/account header state could not be browser-captured without using a real member session. Its conditional UI and persistent profile callback are covered by automated component tests.

## Comparison history

- P1 — Wrong action and emphasis: the source used a bright red `Back to map` button on a page whose header already included Map navigation. Fixed by replacing it with an authentication-aware `Sign in`/`Account` control.
- P2 — Color mismatch: the solid red fill gave the utility account action the same emphasis as a primary conversion button. Fixed with a neutral surface, restrained border, and neutral hover treatment. Post-fix evidence: `account-header-neutral-comparison.png`.
- P2 — Cross-page inconsistency: the map owned separate sign-in/account buttons while public pages owned a back button. Fixed with one shared account component used by both surfaces.

## Verification

- Primary interaction tested: Sign in opens the authentication dialog.
- Authentication choices verified in the rendered dialog: Google, Facebook, and email/password.
- Mobile Menu opens and exposes Map, How it works, and all policy links.
- Browser console errors and warnings checked in desktop, dialog, and mobile states: none.
- Web tests passed: 18 files, 50 tests.
- Lint, TypeScript, production build, and diff check passed.
- Latest fetched `origin/main` and this branch base both resolve to `517a660`; no newer Luke/main commit is missing from this work.

## Follow-up polish

- P3 — After the owner signs in locally, capture the real avatar/account state once to confirm the longest expected display name does not materially widen the header action.

## Result

final result: passed

---

# How Litterbugs Works — Refero-Led Landing Page

## Source and implementation

- User-reported problem state: `/var/folders/g1/z5srknk55b52bfd28jykgmj00000gn/T/TemporaryItems/NSIRD_screencaptureui_62BYYT/Screenshot 2026-08-28 at 3.25.11 PM.png`
- Normalized local problem-state capture: `/Users/grantgibson/.codex/visualizations/2026/08/28/01a04933-e1cd-75c2-86c0-1e8b617a5cb5/about-before.png`
- Refero Instacart process-page reference: `https://refero.design/pages/56e3d771-b7b0-479a-8e07-70ad59c01ba7`
- Refero Faire marketplace explainer reference: `https://refero.design/pages/f1b7f74c-a7c3-4f51-abb7-83c1fed06709`
- Refero Care safety-center reference: `https://refero.design/pages/9d4ca336-8f84-4b4c-b717-edb1de263465`
- Refero Discord community landing reference: `https://refero.design/pages/8f6f0115-d3a3-489c-82a6-9aa5aa79d66e`
- Browser-rendered desktop implementation: `/Users/grantgibson/.codex/visualizations/2026/08/28/01a04933-e1cd-75c2-86c0-1e8b617a5cb5/about-after-desktop-final.png`
- Browser-rendered mobile implementation: `/Users/grantgibson/.codex/visualizations/2026/08/28/01a04933-e1cd-75c2-86c0-1e8b617a5cb5/about-after-mobile.png`
- Normalized problem-state/final comparison: `/Users/grantgibson/.codex/visualizations/2026/08/28/01a04933-e1cd-75c2-86c0-1e8b617a5cb5/about-before-after.png`
- Local implementation URL: `http://localhost:3020/about`
- Desktop QA viewport: 1280×900 CSS pixels at 1x density. The browser content captures were 1265 pixels wide because the vertical scrollbar occupies 15 CSS pixels. The comparison uses equal 1264×888 top-viewport crops with no scaling.
- Full desktop implementation: 1265×3005 pixels from a 1280-pixel CSS viewport. Mobile implementation: 375×4120 pixels from a 390×844 CSS viewport, with the same 15-pixel scrollbar exclusion and no density scaling.
- State: public, signed out, How it works active; mobile navigation was additionally tested expanded.

## Full-view and focused comparison

The normalized side-by-side comparison places the reported alert-like page and the rebuilt hero/process layout in one input. The original concentrates all content in one elevated 720-pixel card, while the final viewport establishes a full-width purpose-led hero and immediately introduces the next process section. The full-page desktop and mobile captures verify the complete section sequence, alternating surfaces, policy links, role cards, and closing map action.

The 1264×888 normalized comparison also serves as the focused hero-region review. A second micro-crop was unnecessary because the headline, navigation, button sizing, typography hierarchy, section boundary, and removal of the modal-like surface are all readable at that scale.

## Required fidelity surfaces

- Fonts and typography: the existing Inter family is preserved. The 52–84px responsive hero scale creates a clear marketing-page hierarchy; 36–68px section headings, 18–23px explanatory text, and 12–13px uppercase labels remain legible and wrap cleanly on desktop and mobile.
- Spacing and layout rhythm: the page now uses 560px hero depth, 92–108px desktop section padding, a 1120px content frame, two-column section intros, and three-column process/role grids. Mobile collapses to one column with 64–72px section rhythm, full-width 48px actions, and no overlap or horizontal overflow.
- Colors and visual tokens: the existing white, soft green, near-black, and Litterbugs red roles are preserved. A dark green trust band adds contrast without introducing a competing brand color; white and muted green foregrounds remain readable.
- Image quality and asset fidelity: the existing header keeps the original sharp Litterbugs logo. The page does not substitute product imagery with fake screenshots, handcrafted SVGs, emoji, or CSS drawings. The first-pass decorative CSS circles were removed before final capture.
- Copy and content: the page now explains the actual Report → Rally support → Clean and verify journey, describes the reporter/contributor/cleaner roles, states that contributions are not charitable donations, and retains direct links to cleanup policy, safety and waiver, terms, and support.
- States and interactions: the desktop and mobile header states render correctly; the mobile Menu expands to the complete navigation; the “See the three steps” control scrolls to `#process`; map CTAs and policy links resolve to their intended routes.
- Accessibility: semantic regions and heading levels are ordered, the process is an ordered list, policy links have a navigation label, controls have 44–48px minimum targets, focus-visible styling is present, and motion is disabled under `prefers-reduced-motion`.

## Comparison history

- P1 — Alert/modal composition: the original page looked like a dismissible system notice because every idea, support link, and CTA lived in one floating rounded card. Fixed by replacing the card shell with a full-width editorial hero, sectioned process narrative, transparency band, role grid, and closing CTA. Post-fix evidence: the normalized `about-before-after.png` comparison and full-page desktop capture.
- P2 — First-pass decorative hero circles: the initial implementation used two radial CSS circles in the hero, which were not supported by a source asset and distracted from the purpose-led typography. Removed the gradients and retained a clean solid soft-green band. Post-fix evidence: `about-after-desktop-final.png`.
- P2 — Mobile density risk: three-column process, policy, and role content could have become cramped below 700px. Fixed with single-column stacking, reduced section padding, full-width CTA buttons, shorter policy rows, and border-based process separation. Post-fix evidence: `about-after-mobile.png`.
- No actionable P0/P1/P2 finding remains.

## Verification

- Primary interactions tested: mobile Menu open/close and in-page “See the three steps” jump. The anchor reached `#process` with the section at the top of the viewport.
- Browser logs checked: no errors or warnings; only normal React development and hot-reload informational messages were present.
- Web tests passed: 17 files, 47 tests.
- Lint, TypeScript, production build, web-boundary check, and `git diff --check` passed.
- Branch `codex/website-ui-ux-next` and latest fetched `origin/main` both resolve to `517a660`, so no newer main-branch work was omitted.

## Follow-up polish

- P3 — Once real cleanup activity is plentiful, one authentic before/after cleanup photograph or live map product capture could add emotional proof between the process and trust sections. It should be added only as a real, correctly licensed product asset.

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

---

# Public Navigation Density

## Source and implementation

- Source visual truth: `/var/folders/g1/z5srknk55b52bfd28jykgmj00000gn/T/TemporaryItems/NSIRD_screencaptureui_inKxVI/Screenshot 2026-08-28 at 3.00.47 PM.png`
- Local implementation: `http://localhost:3020/`
- Desktop implementation: `/Users/grantgibson/.codex/visualizations/2026/08/28/01a04933-e1cd-75c2-86c0-1e8b617a5cb5/nav-page-desktop.png`
- Focused implementation crop: `/Users/grantgibson/.codex/visualizations/2026/08/28/01a04933-e1cd-75c2-86c0-1e8b617a5cb5/nav-header-desktop.png`
- Normalized side-by-side comparison: `/Users/grantgibson/.codex/visualizations/2026/08/28/01a04933-e1cd-75c2-86c0-1e8b617a5cb5/nav-header-comparison.png`
- Mobile menu state: `/Users/grantgibson/.codex/visualizations/2026/08/28/01a04933-e1cd-75c2-86c0-1e8b617a5cb5/nav-header-mobile-menu.png`
- Desktop viewport: 989×600 CSS pixels. Mobile viewport: 390×844 CSS pixels.
- Source and focused implementation pixels: 989×83 at 1x density; the comparison uses equal-size crops with no scaling.
- State: signed out, Map active; mobile menu expanded for the responsive interaction check.

## Full-view and focused comparison

The full desktop capture verifies the header inside the live map/results experience. A focused comparison was also required because typography weight, logo balance, label spacing, and action placement are too small to judge reliably at full-page scale. The supplied screenshot documents the reported problem state; the equal-size implementation crop shows the corrected layout.

## Required fidelity surfaces

- Fonts and typography: desktop navigation is 17px/700 above 1100px and 16px/700 at the 989-pixel reference width. The existing Inter stack, one-line labels, and hierarchy are preserved.
- Spacing and layout rhythm: the two desktop groups are aligned inward around the centered brand, with a 24-pixel link gap, mirrored logo-side spacing, an 80-pixel header, and a constrained 1180-pixel content frame.
- Colors and tokens: the existing white, near-black, and Litterbugs red system is unchanged; active, hover, focus, and primary-action colors retain their semantic roles.
- Image quality and asset fidelity: the original Litterbugs logo asset remains centered, proportional, and sharp; no substitute asset or code-drawn approximation was introduced.
- Copy and content: Map, How it works, Info, and Sign in remain unchanged, preserving routes and information architecture.
- Responsive behavior: at 390 pixels the mobile header fits, the Menu control remains available, and the Mobile navigation region opens successfully.

## Comparison history

- P1 — Typography and density: the reference showed small labels pushed toward opposing viewport edges, making the header feel weak and disconnected. Fixed by increasing desktop size and weight, reducing intra-zone gaps, constraining the header frame, and aligning both navigation groups toward the centered brand.
- Post-fix evidence: the 989×83 comparison shows a visibly larger, tighter group with the full Sign in action in frame. No actionable P0/P1/P2 mismatch remains.
- P3 — Exact compactness is preference-level only. The mirrored desktop offsets can be adjusted by 8–12 pixels after user review if an even tighter group is preferred.

## Verification

- Mobile Menu interaction passed; the Mobile navigation region rendered.
- Browser console warnings and errors checked: none.
- Web tests passed: 17 files, 47 tests.
- Lint, TypeScript, production build, and diff check passed.
- Branch base and `origin/main` both resolve to `517a660`.

## Result

final result: passed

---

# Refero-Calibrated Navigation Middle Ground

## Source and implementation

- Refero Airbnb map header: `https://refero.design/pages/281b08a2-7dc1-4997-b0b9-efe27f7fdabd`
- Refero Airbnb destination header: `https://refero.design/pages/cd9af1be-a756-4190-9517-be75171261c1`
- Refero District discovery header: `https://refero.design/pages/18c25912-245c-43a4-90e4-1ebaf95d669b`
- Refero Faire marketplace header: `https://refero.design/pages/52baabbf-b429-4341-a187-2cc39635cd9f`
- Research comparison board: `/Users/grantgibson/.codex/visualizations/2026/08/28/01a04933-e1cd-75c2-86c0-1e8b617a5cb5/refero-header-comparison-board.png`
- Wide/tight/middle-ground comparison: `/Users/grantgibson/.codex/visualizations/2026/08/28/01a04933-e1cd-75c2-86c0-1e8b617a5cb5/nav-header-three-way.png`
- Browser-rendered implementation: `/Users/grantgibson/.codex/visualizations/2026/08/28/01a04933-e1cd-75c2-86c0-1e8b617a5cb5/nav-page-middle-ground-989.png`
- Mobile menu state: `/Users/grantgibson/.codex/visualizations/2026/08/28/01a04933-e1cd-75c2-86c0-1e8b617a5cb5/nav-middle-ground-mobile.png`
- Desktop comparison viewport: 989×600 CSS pixels at 1x density; focused header crops are 989×83 pixels with no scaling. Mobile viewport: 390×844 CSS pixels at 1x density.
- State: public map route, signed out, Map active; mobile menu expanded for interaction verification.

## Full-view and focused comparison

The research board places four current Refero consumer/marketplace headers and the revised Litterbugs implementation in one comparison input. The references consistently use 14–16px medium or semibold navigation, clear but restrained gaps inside a group, and larger visual separation between functional groups. The implementation adapts those patterns to Litterbugs' centered stacked logo rather than copying any one brand.

The three-way focused comparison shows the original edge-pinned layout, the over-tight first revision, and the middle-ground revision at the same 989×83 crop. The final layout sits visibly between both extremes and keeps every persistent control fully in frame.

## Required fidelity surfaces

- Fonts and typography: Inter remains the product font. Desktop navigation is now 16px/600 with one-line labels and a 2px active underline, matching the Refero range without returning to the earlier 15px/light appearance.
- Spacing and layout rhythm: link gaps are 26px on desktop and 22px at tablet widths. Responsive logo-side spacing is 88–104px on desktop and 76–96px on tablet, producing a clear center brand zone without pushing navigation to the viewport edges.
- Colors and visual tokens: the white, near-black, and red Litterbugs system is unchanged; no Refero brand colors were copied.
- Image quality and asset fidelity: the existing Litterbugs logo remains centered, proportional, and sharp. No source asset was replaced.
- Copy and content: Map, How it works, Info, and Sign in are unchanged; routes and navigation behavior remain stable.
- Responsive behavior: mobile retains its compact Menu/logo/action composition, opens the Mobile navigation region, and has zero horizontal overflow.

## Comparison history

- P1 — Original layout too spread out: persistent items were pushed toward the edges and read as disconnected. The first revision corrected this but over-compressed both groups around the logo.
- P2 — First revision too tight/heavy: 16–17px bold labels and 34–56px logo-side gaps made the controls feel crowded. Fixed with 16px semibold labels, a lighter 2px active rule, slightly wider within-group rhythm, and responsive 76–104px logo-side spacing.
- Post-fix evidence: at 989px the left navigation spans x=195–351, the centered logo spans x=440–549, and the right actions span x=638–776. This preserves 89px of air on both sides of the logo while keeping the complete header cluster balanced.
- No actionable P0/P1/P2 finding remains.

## Verification

- Refero reference images and the browser-rendered implementation were inspected together.
- Mobile menu interaction passed; horizontal overflow measured 0px.
- Browser console warnings and errors checked: none.
- Web tests passed: 17 files, 47 tests.
- Lint, TypeScript, production build, and diff check passed.

## Follow-up polish

- P3 — The 89px tablet reference gap can move by roughly 8px after preference feedback without changing the established hierarchy.

## Result

final result: passed

---

# First-Paint Account Styling and Header Report Action

## Source and implementation

- Broken first-paint source: `/var/folders/g1/z5srknk55b52bfd28jykgmj00000gn/T/TemporaryItems/NSIRD_screencaptureui_Qi6bWi/Screenshot 2026-08-28 at 4.15.07 PM.png`
- Settled source state: `/var/folders/g1/z5srknk55b52bfd28jykgmj00000gn/T/TemporaryItems/NSIRD_screencaptureui_aGJ7Ii/Screenshot 2026-08-28 at 4.15.22 PM.png`
- Browser-rendered desktop implementation: `/Users/grantgibson/.codex/visualizations/2026/08/28/01a04933-e1cd-75c2-86c0-1e8b617a5cb5/report-header-desktop.png`
- Browser-rendered mobile implementation: `/Users/grantgibson/.codex/visualizations/2026/08/28/01a04933-e1cd-75c2-86c0-1e8b617a5cb5/report-header-mobile.png`
- Focused three-state comparison: `/Users/grantgibson/.codex/visualizations/2026/08/28/01a04933-e1cd-75c2-86c0-1e8b617a5cb5/report-header-render-comparison.png`
- Source pixels: 176×70 and 202×76 at 1x density. Desktop implementation: 1280×720 CSS pixels at 1x density. Mobile implementation: 390×844 CSS pixels at 1x density. The focused current header region is a 320×80 unscaled crop; the comparison places each natural-size capture in one 738×100 canvas without density conversion.
- State: public map route, signed out, report mode inactive; desktop first meaningful render and ready mobile render.

## Full-view and focused comparison

The full desktop implementation verifies the action inside the complete map/results layout. The full mobile implementation verifies that Menu, centered brand, Report, and Sign in remain visible without overlap or horizontal overflow.

The focused comparison places the broken browser-default button, the later styled account button, and the revised first-painted header together. It confirms that the neutral account treatment is present immediately and that the new reporting action is integrated as a distinct primary control.

## Required fidelity surfaces

- Fonts and typography: the existing Inter header treatment remains. Report litter and Sign in use 14px desktop text; mobile uses 13px and shortens only the visible reporting label to Report while retaining the accessible name Report litter.
- Spacing and layout rhythm: both actions are 42px high with 12px radii and a 10px desktop gap. At 390px, the action group spans x=239–376, leaving 9px between the centered logo and the reporting button with zero horizontal overflow.
- Colors and visual tokens: Report litter uses the established Litterbugs red primary token. Sign in remains a neutral near-white utility control with a gray-green border and near-black text.
- Image quality and asset fidelity: the supplied Litterbugs logo remains the original raster asset, proportional, centered, sharp, and uncropped. No replacement imagery or code-drawn asset was introduced.
- Copy and content: desktop displays Report litter and Sign in. Mobile displays Report and Sign in; Report retains `aria-label="Report litter"`.
- Interaction states: clicking Report litter while signed out opens the existing authentication dialog. The dialog visibly includes Google, Facebook, and email sign-in choices.

## Findings

- No actionable P0/P1/P2 mismatch remains.
- P3 — The mobile logo-to-report gap is intentionally compact at the 390px breakpoint. It remains visually separated and can gain a few pixels only by reducing action padding or the logo size, neither of which is currently warranted.

## Comparison history

- P1 — Unstyled first paint: the supplied capture showed a browser-default Sign in button before route-specific component CSS settled. Fixed by moving the critical account-control rules into the root stylesheet loaded with the application shell. Post-fix computed first-paint values are 42px height, 12px radius, `rgb(247, 248, 247)` background, and flex layout.
- P1 — Reporting action separated from navigation: Report litter previously floated over the map canvas. Fixed by moving the same functional control into the map header beside Account/Sign in and removing the duplicate map overlay control.
- P2 — Mobile crowding risk: two full desktop labels would collide with the centered logo. Fixed with a visible Report label at phone widths while preserving the full accessible name and 42px touch target.

## Verification

- Page identity: `http://localhost:3020/`, title `Litterbugs`.
- First meaningful render contained the map header and results; no framework overlay was present.
- Browser console errors and warnings checked in desktop and mobile states: none.
- Primary interaction verified: Report litter → Sign in dialog.
- Web tests passed: 18 files, 50 tests.
- Lint, TypeScript, production build, and diff check passed.

## Result

final result: passed
