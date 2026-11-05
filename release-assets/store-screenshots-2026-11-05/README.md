# Store screenshots — November 5, 2026

Eight screenshots for each store, built from real iPhone app captures in
`release-assets/apple-app-store/2026-10-30-prepared/source/iphone/`.

- `apple-1320x2868/` — App Store, 6.9" iPhone size; Apple scales it to smaller iPhones.
- `google-1080x1920/` — Google Play phone screenshots.
- `review-*.png` — contact sheets for review. These are not for upload.

Style: soft lavender background (the website's #f8f7fc to #e3dff0) with Nunito
Black headlines, ink #292932 text and an indigo #5146ed keyword. The device frame
is plain and the status bar is cropped, so the set suits both stores.

Order: get paid, see trash picked up, report litter, find paid cleanups, fund a
cleanup, local reports, share, track impact.

Privacy: an outside cleaner's name and avatar letter are blurred on slides 1 and 2.

Rebuild: `node render.cjs config.json`, run from this folder. It uses the repo's
`sharp`, `playwright` and system Chrome.
