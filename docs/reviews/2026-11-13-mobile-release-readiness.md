# Mobile 2.1.0 release preparation — November 13, 2026

Owner instruction: finish release preparation; analytics enabled by default; do not submit either store. No GitHub push or mobile OTA publication.

## Candidate changes

- Includes verified analytics e690eb5, per-device staff exclusion, source-map/native symbol upload configuration and existing map/replay privacy guards.
- Finalizes welcome-screen accessibility sizing and confirmed-only contribution totals.
- Adds inline, unchecked photo-processing and Terms approval to report review, cleanup review and selected profile-photo uploads. Approval resets when photos change; no automatic analytics dialog. Profile edits without new photos need no photo approval.
- Pre-publication content gate is separate from malware and Gemini funding review. Existing Cloudmersive NSFW image classifier receives only a reconstructed JPEG. Only high-probability safe classification with score <=0.2 permits promotion. Unsafe/uncertain results are rejected with support contact; malformed, timeout and quota failures keep the photo private. This is a sexual-content classifier, not comprehensive detection of every prohibited category; reporting, blocking and administrator moderation remain necessary.
- Privacy and Terms explain content processing and prohibit sexual, hateful, threatening, graphic and privacy-violating content. Existing owner direction for ordinary litter/funding triage is unchanged.

## Verification in progress

- Initial mobile suite: 617 passed, 1 existing opt-in skip; new photo-choice interaction tests: 2 passed. Mobile lint passes. Media route/helper tests: 27 passed, including no final-bucket write after rejection or service failure.
- Fresh native builds, production-provider acceptance, phone journeys and final symbol/build attribution are pending. Do not treat local code or unit results as device/provider acceptance.
- Pixel 5 connected, Android 14; existing QA package only. USB iPhone 6s detected through libimobiledevice, iOS15.8.8, but Xcode currently lists it unavailable. Preserve all phone data. Do not change Apple developer accounts or request Luke's unavailable access.

## Activation and compatibility

- Publish only committed media/legal source in an isolated website branch based on the exact current live privacy deployment; exclude local owner dashboard and unrelated previews.
- Confirm real provider availability and quota before promoting the website. Cloudmersive documents 20 API calls per basic NSFW classification, in addition to malware scanning; advanced classification requires a managed/private GPU deployment and is intentionally not used.
- Review legacy direct-upload policies before claiming universal enforcement. The compatibility window in docs/MEDIA_SECURITY.md must not be closed blindly while old store clients remain supported.
- Apple privacy answers remain prepared account-holder release work. Google Play analytics disclosures were already reviewed and cover the app additions; retain approximate location because raw-IP discard does not disable GeoIP.
- Store submission is explicitly withheld. Excluded Apple revocation and separate-user Facebook testing remain excluded, not passed.
