# Litterbugs — recommended Apple screenshot set

Updated October 30, 2026 after reviewing Apple’s detailed screenshot guidance and the owner’s preferred Google Play artwork. Prepared locally; not uploaded.

## Recommendation and changes

Use the chosen Google Play visual story with five genuine iPhone app screens and three marketing panels. Preserve the purple/lavender colors, headings, uniform phone frames, original photos, and order **1, 2, 3, 4, 6, 8, 5, 7**. Filenames 01–08 are the final upload order.

1. **See Litter? Get paid to report it.** Restored the original high-resolution Canva/homepage photo alone inside the frame. No app-form image and no generated imagery.
2. **Make real money cleaning up.** Actual Greenwood Lot website report card, captured at triple resolution, with its original purple **$25 reward** badge, photograph, title and reporter footer all visible. No separate amount callout. This is a real website capture used as a marketing panel, not a native iPhone interface capture.
3. **Donate to a cleanup.** Genuine iPhone funding screen.
4. **Find litter on the map.** Genuine iPhone map showing the populated Boone area.
5. **See the difference.** Uses the same real Greenwood Lot before/after photos as Google Play, downloaded at their original 810 × 1080 resolution. Two larger, stacked photo panels have clear Before/After labels and 64-pixel side margins inside the phone screen at the larger export size. The title and location have matching margins. This is a marketing story panel, not a native iPhone interface capture.
6. **Track how much litter you’ve collected.** Genuine iPhone public profile and completed reports.
7. **Find your next cleanup.** Genuine iPhone nearby cleanup feed.
8. **Get others involved.** Genuine iPhone sharing options.

## Research correction

The earlier statement that every image must show the app interface was too strict. Apple’s detailed guidance permits marketing materials in the minority of a device’s screenshot set. For eight images, at least five need to show the app in use; this set contains five. This supports the proposed mix, but is not a guarantee of App Review approval.

Source, checked October 30, 2026: https://developer.apple.com/help/app-review/guideline-reference/2-3-3-screenshots

Reusing artwork across stores is different from representing Android or website controls as the native iPhone interface. Apple’s metadata rules also address third-party platform imagery: https://developer.apple.com/app-store/review/guidelines/#accurate-metadata

## Export sizes and checks

Choose one complete set; do not mix folders:

- `screenshots/1320x2868`: eight opaque PNGs for the large Dynamic Island iPhone slot.
- `screenshots/1242x2688`: eight opaque PNGs for the compatible Face ID display slot.

Within each set, all panels have identical dimensions, phone-frame sizes, placement, border thickness and rounded corners. Original photos and screenshots are never enlarged. Headings are freshly rendered at export resolution. Export dimensions, opacity, source uniqueness and contained media pixels are checked. The before/after photos are cropped from their original files without retouching or enlargement. `preview.png` is a small overview; use the full-size PNGs to judge sharpness.

Original native captures remain in `source/iphone/` as reusable alternatives. The revised cleanup story is in `source/marketing/`. The manifest records provenance and the five/three split.

Apple export specifications: https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications

## Upload and computer status

App Store Connect’s screenshot uploader was disabled while 2.0.1 was Waiting for Review. The pending review has not been withdrawn or changed. The updated set is prepared for when the screenshot fields become editable.

The app icon and video remain on hold. Image 2 was recaptured from the live website; no simulator was restarted and no new app build was made. No real report, payment, or share was submitted.

`Litterbugs-Apple-Screenshots.zip` is the current screenshot-only delivery. Older draft folders and superseded archives are historical alternatives. Existing listing-copy and icon files are separate.

## Rebuild

Run `node --max-old-space-size=256 build-impact-story.cjs` first if the cleanup-story layout changes. Then `node --max-old-space-size=256 build-package.cjs` renders sequentially with image caching disabled and concurrency one. It does not publish either store listing or edit the app icon.
