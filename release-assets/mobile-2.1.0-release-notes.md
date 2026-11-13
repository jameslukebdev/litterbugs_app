# Mobile2.1.0 — local store preparation

Prepared November13,2026. Apple2.1.0 version draft now exists; the release notes
below and updated review instructions are saved there. Google Play copy remains
local. App upload, review submission and release remain withheld.

## What’s new (Apple and Google Play draft)

- A clearer welcome experience, including improved support for larger text.
- Updated contribution totals and photo-upload checks.
- New notification choices for nearby litter and completed cleanups.
- An Analytics choices setting to control app analytics and diagnostics on your device.

## Exact candidates

- iOS2.1.0(27), EAS14f76fb5-40d9-4f3d-8c95-13489935ec7f.
- Android2.1.0(24), EASe6a72070-4f04-4626-afec-29e9956874be.
- Both use frozen source c34f5698b7c880e3392512206d8f588f0b846d8e.
- Original artifacts, hashes, signing and device evidence:
  [readiness record](../docs/reviews/2026-11-13-mobile-release-readiness.md).

## Work independent of Apple’s agreement

- Store copy above is ready for owner review. Compare existing screenshots with
  the final2.1 UI before any upload; existing store graphics are not new2.1 proof.
- The separate owner-dashboard chat has the final event schema, QA exclusions,
  release status and build identifiers. Dedicated live read connections remain
  separate dashboard work, not an app-store release prerequisite. App and combined
  visits must stay unknown until actual2.1 production release.
- Further phone testing was skipped by the owner. No remote push was sent or
  token registered. Real server-push delivery remains unverified, distinct from
  the completed native local-notification taps. Actual identity/bank submission
  is not claimed by the sandbox Connect rendering/payment checks. Any added device
  test must use disposable fixtures and preserve staff analytics exclusions.

## Apple prerequisite and later release sequence

1. **Done:** James Luke Barber accepted the updated Apple Developer Program
   License Agreement; refreshed App Store Connect confirmed the block cleared.
   Request emailed to jameslukeb.evj@gmail.com from gegibson@icloud.com;
   Apple Mail Sent verified November13 at1:40pm ET, subject
   “Apple Developer agreement update.” This is a sent-mail receipt, not proof of
   recipient delivery or acceptance.
2. **Done:**2.1.0 version exists in Prepare for Submission in app6757313862,
   manual release selected, policy URL https://litterbugs.app/privacy saved for
   the next version. Release/review notes and support/marketing URLs saved.
   **Pending release:** publish the reviewed privacy data-type answers from the
   [store handoff](../docs/reviews/2026-09-11-store-privacy-handoff.md#november-13-app-store-connect-admin-access-and-agreement-blocker).
   The present UI only offers per-type Publish; no draft was saved. Public privacy
   answers must describe the currently available version, with2.1-only collection
   coordinated with release.
3. Existing iPhone/iPad screenshot assets are present and release notes saved.
   Before submission, verify reviewer access to account-required features; the
   Apple draft has guest instructions and no demo login. Review final listing copy
   without exposing credentials in documentation. Do not assume historical
   reviewer credentials are proven merely because they are present in a form.
4. Obtain the owner’s explicit instruction before any store upload/submission.
   When authorized, upload the exact verified candidates and check processing,
   review/release controls and final privacy declarations before submission.

No GitHub push, mobile OTA, website deployment, store upload or submission is part
of this packet. Apple grant-revocation and separate-user Facebook checks remain
owner-excluded rather than passed.
