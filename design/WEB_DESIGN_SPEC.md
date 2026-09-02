# Litterbugs web design specification

The generated concepts in `design/concepts` establish layout direction only.
The production website uses the approved mobile logo and the mobile app's exact
fields, values, limits, and wording whenever a concept example differs.

## Visual system

- The mobile app is the source of truth for the shared brand system: forest
  green `#2F7D32`, dark green `#245F2A`, pale green `#E3F1E4`, cool gray
  `#F5F6F7`, dark text `#202428`, and muted text `#667078`.
- Native system typography on both platforms, with bold headings and controls
  rather than a separate website-only display typeface.
- White, 80-pixel desktop and 66-pixel mobile headers with the approved
  Litterbugs logo.
- Full-bleed Google map below the header.
- Green, orange, and red report markers for Low, Medium, and High severity.
- Compact floating zoom, map-type, and current-location controls.
- Centered, rounded report detail sheet on desktop; full-width bottom sheet on
  mobile browsers.
- White report/auth surfaces, quiet cool-gray borders, 12–16-pixel control
  radii, Litterbugs green primary actions and focus states, and no gradients.
- Responsive breakpoints at 700 and 410 pixels.

## Concept-to-build fidelity ledger

1. The full-bleed map and slim white navigation bar are preserved.
2. The approved real logo replaces the generated concept's approximate logo.
3. Sign-in remains the only signed-out header action; no extra navigation or
   future-feature controls were added.
4. Location and map-type actions remain circular floating controls at the
   lower right; zoom remains compact at the upper left.
5. Report detail uses the concept's centered bottom-sheet composition, hero
   photo, severity cue, dates, and chips, while retaining the mobile app's
   exact content sections.
6. The report form uses a focused modal with the same six mobile steps rather
   than the concept's illustrative three-step example.
7. Desktop and 390-pixel browser layouts were inspected after implementation.
8. The website uses its own restricted browser Maps key; native Android and
   browser map credentials remain separate.

## Above-the-fold copy difference

The concept contained no browsing instruction. The build adds only platform
guidance: signed-out visitors see “Explore active litter reports” and “Sign in
when you’re ready to submit.” Signed-in users see “Click the map to report
litter” and the existing ten-mile rule. These explain existing actions and do
not introduce a new product capability.
