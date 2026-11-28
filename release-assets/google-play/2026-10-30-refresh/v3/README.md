# Litterbugs Google Play gallery — v3

Review draft, October 30, 2026. Nothing uploaded or published.

Eight opaque 1080 × 1920 PNGs: five real Android build-21 screenshots and three preserved v2 graphics. Open index.html or gallery-review.png to review the sequence. Two existing 1024 × 500 feature graphic options are included unchanged.

## Authentic screenshots

Captured from the installed native Android app, version 2.0.1 (21), via ADB on October 30. Local APK was derived from the release AAB and signed with the debug keystore for the emulator. Original 1080 × 2340 screenshots are saved in source/captures. Only proportional resizing and an outside frame/headline were applied. App UI, public report content, profile, amounts, and colors are unchanged.

Gallery shows the report feed, an existing public cleanup, donation flow before payment, sharing options, and a public reporter profile. The donation amount is the app's default, not a claim of earnings. No payment, cleanup claim, report, or share was submitted. Public activity and balances were not fabricated. The native interface retains its own explanatory text and amounts; added marketing copy is one short headline per panel.

Map tiles failed under local signing, so no blank map capture or older map capture is included. The report form was not captured because it required location access. Reporter earnings were not captured. An additional real filters capture is retained as an alternative, outside the eight-image gallery.

## Video

video-app-preview.mp4 is a 26-second silent review edit at 1920 × 1080: a 4-second illustrated opening, 18 seconds of genuine current app footage navigating from Reports to a cleanup detail, and a 4-second donation-screen ending. The unedited 20-second recording is retained in source/captures/walkthrough-build21.mp4. The ending is a still screenshot, not payment footage. This replaces the entirely static v2 storyboard with a real app segment. No upload to Play or YouTube was performed.

## Resource management

Android Studio and its build daemons were closed before capture. The emulator was run alone with 1536 MB guest memory and two virtual cores, then shut down before rendering. Image rendering uses one worker with caching disabled; video encoding uses one thread. No app code or unrelated running development servers were changed.

## Rebuild

Run node build-assets.cjs and node build-video.cjs in this folder. Both use existing local sources; neither starts an emulator, rebuilds the app, or makes network changes. manifest.json records each panel's source.
