# Physical iPhone and share-link verification

The owner explicitly added completion of share-link testing to the active goal on September 24. This extends the website/mobile parity record and the existing sharing item in the goal; international payouts remain a separate Stripe dependency.

## Acceptance scope

- Install a fresh native Release build from current main, preserve app data, and record its source revision and installed artifact.
- Verify general iOS sharing includes the report card and the correct report URL in a receiving composer; cancel without sending.
- Open that exact URL in Safari and verify the matching public report and website navigation.
- Check available app handoff separately from browser fallback. A QA bundle must not be represented as a verified production Universal Link build.
- Verify Instagram Stories handoff and state precisely whether a clickable link is present; passing a link parameter alone is not proof.
- Exercise cancellation and return to the report. No social publication, messages to others, real payments, or store submission.

## Initial evidence

The iPhone 6s runs iOS 15.8.2 and already has a valid pairing. The older Xcode device listing reports it unavailable, but libimobiledevice/tidevice can launch apps and capture screenshots. WebDriverAgent became ready after the device's UI Automation authentication.

The pre-existing `com.gegibson.litterbugs.qa` installation reports version 1.0.0/build 1; those labels do not establish its source revision. No tests on that installation count as current-version verification. A fresh Release build was built and installed successfully from verified local/remote main `d96e974e4fe6857875037664fd011beef0810f11`, using the existing QA signing identity and profile without altering Apple account configuration.

## Verified on the current build

- Artifact: `/tmp/litterbugs-iphone-current-build/Build/Products/Release-iphoneos/Litterbugs.app`; JavaScript bundle SHA256 `9e6bf873b861baa278a5f7493b16353f4039fe1ab9d6beb3b04258a343519451`. Native source remains current through the subsequent web-only PRs 79 and 80. Version/build labels remain 1.0.0/1; the source and bundle hash establish provenance.
- Boone, NC location search returned the three expected reports. Ridge Road opened with current volunteer wording and funding/share actions.
- General sharing opened the native sheet with the report message in its preview. Notes received the report-card image, but its composer did not show the URL. Cancel returned to the report. Messages/Mail were not present among the visible share targets. This is not a pass for image-plus-clickable-link delivery.
- Instagram Stories opened a draft containing the correct report card. No clickable link/sticker was visible. The draft was discarded without publishing and Litterbugs resumed. The SDK link parameter is insufficient evidence of a clickable destination.
- Safari opened the exact Howard’s Creek public report (`ce154938-f7c9-40d9-99bc-4a5d43710aa0`). Its incorrect volunteer copy was fixed and deployed in PR 80.
- The old JavaScript-only Open in Litterbugs button did not respond on Safari 15.8.2. The follow-up replaces it with a real server-rendered deep link, retaining the existing store fallback when JavaScript is available. A regression test proves the anchor exists in server HTML. Browser candidate verification shows the correct custom-scheme report URL.

## Remaining acceptance

PR 81 was merged and `dpl_9NL6REUrMAMGDLTsmYXpQoGEQ2MS` promoted. On the physical iPhone, the live link presented Safari’s Open in Litterbugs confirmation and opened the exact Howard’s Creek report with its $6.00 reward. Provide and verify a reliable link-sharing path for receivers that drop image captions, and make Instagram's manual link-sticker requirement clear. Production Universal Links remain a separate signing/build verification requirement; this QA build has no associated-domain entitlement. No store submission or Apple-account changes were performed.
