# Litterbugs gallery v12 — consistent phone presentation

All eight exports are opaque 1080 × 1920 PNGs. All eight share a 680 × 1380 dark rounded phone frame at x=200, y=440, with a 16px border and 648 × 1348 screen area. Headings share 96px type and a 100px line interval. Purple/lavender backgrounds and approved wording are retained.

All seven real screenshot sources fit proportionally inside the screen without stretching or clipping content. Shorter website screenshots have white space within the phone to accommodate their original aspect ratios. This is presentation padding, not reconstructed app UI. The approved illustrative reporting photo fills the same phone frame by proportional crop; it remains a marketing photo, not an app screenshot.

Verified all eight output sizes, matching frame geometry, opaque exports and exact rendered media inside each frame. Details are in size-audit.json. Visual review completed on gallery-review.png.

Video remains on hold and unchanged. Listing submitted for Google Play review on October 30, 2026; Console shows Changes in review with quick checks running. Approval/publication is not yet confirmed. No emulator or video rendering used. Build is sequential with Sharp concurrency 1 and cache disabled.

Rebuild: node --max-old-space-size=256 build-assets.cjs

Open gallery-review.png or index.html. Earlier versions remain available.

Submission order: 1, 2, 3, 4, 6, 8, 5, 7. App icon and feature graphic use the original wordmark on white backgrounds. Owner requested no AI labels; saved declaration is “Don’t label assets.” Source provenance above and in manifest.json is retained unchanged. Proof: submission-confirmation.jpg.
