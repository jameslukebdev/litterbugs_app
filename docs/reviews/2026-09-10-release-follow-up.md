# Release and device follow-up — September 10, 2026

## Main and verification

Fast-forwarded `codex/confirmed-iphone-audit-fixes` into `main` and pushed `21e1207e4dd8fcc38b423ad111f4217044130644`. The base already included Luke's latest reviewed UI work. No conflicting or newer remote changes were found. This supersedes the earlier audit documents' unmerged-branch status.

Before merge: mobile 380 tests, web 105 tests, shared 10 tests passed; workspace typecheck, web build, lint and 389-file boundary check passed. The subsequent Firebase configuration checks passed (shared suite now 13 tests); mobile remains 380 passing tests and source validation reports 148 modules with zero errors.

## Notification setup

Created `litterbugs-notifications` (project number `768434933892`) under burrowbase.com on the **Spark no-cost plan**, without a billing account or Google Analytics. The existing billed `litterbugs-auth` project was not converted or modified. Registered `com.litterbugs.app` and `com.litterbugs.app.qa`; their public client configuration files are selected by the existing Android build identity. iOS configuration is unchanged. Firebase databases, hosting and analytics were not added to the app; existing Expo Notifications provides the Android FCM integration.

The Pixel's QA notification permission was enabled in Android Settings. After a cold launch, a read-only database check confirmed an enabled Android push registration for the existing test account, updated at 18:03:37 UTC with a token present. No token is recorded here. This verifies device registration, **not notification delivery**.

Created `expo-push@litterbugs-notifications.iam.gserviceaccount.com` with the Firebase Cloud Messaging role in this notification project. Google blocked key creation under `iam.disableServiceAccountKeyCreation`. The user explicitly authorized a notification-project-only exception, but applying it failed because the signed-in account lacks `orgpolicy.policies.create`. No exception took effect and no service-account key was created or uploaded to Expo.

Remaining administrator action: apply a project-level `enforce: false` override for `iam.disableServiceAccountKeyCreation` on project `768434933892` (and inspect the managed equivalent if applicable). Do not change organization-wide enforcement. Then create the sender credential, attach it to the appropriate Expo Android application credentials, and verify actual delivery plus notification-tap navigation on the phone. Leave this pending until an authorized administrator can apply it. No billed service is necessary for FCM.

Apple uses APNs. Its credential/account work remains deferred under the user's instruction. No Apple or Meta account settings changed.

## Builds and links

- Signed Android review AAB from `21e1207`, `com.litterbugs.app`, version 1.0.0/code 11 (local review version only, not reserved in EAS): `artifacts/release-follow-up-2026-09-10/litterbugs-21e1207-v11.aab`. SHA-256 `dffa2f82db7c06a1d5180755ba8040b3d0d51edc0f3f59e3bdcc250504374d70`. All four ABIs present: armeabi-v7a, arm64-v8a, x86, x86_64. Bundle validation and JAR signature verification passed with the existing upload key. No store upload. This artifact predates the final notification configuration and Profile placeholder correction; rebuild before release.
- Installed an APK generated from that AAB on the Android API 36 emulator. Android reported `litterbugs.app: verified` against the expected upload certificate. An unqualified HTTPS report intent opened `com.litterbugs.app/.MainActivity`; the correct report title, three-photo counter and $6 reward rendered. A temporary **System UI** unresponsive dialog occurred under concurrent build load; after choosing Wait, the report was inspected. This is a focused link check, not an emulator performance certification.
- Pixel 5: preserved old `com.litterbugs.app` and its data; updated only `com.litterbugs.app.qa` with the matching QA signing certificate. Play Protect completed its requested security check and installation succeeded. Account session remained intact. The arm64-only local QA build is a device-test artifact, not a production compatibility restriction. Final QA APK: `artifacts/release-follow-up-2026-09-10/litterbugs-qa-notifications.apk`, SHA-256 `b5dead32b1be566b823bd5d9a7c4fa5302dc33d7d53a4a71959d8a250bcc38ac`.
- iPhone 17 Pro/iOS 26.5 simulator Release built successfully from merged main. The first unsigned build could not access the keychain; rebuilding with ad-hoc simulator signing resolved that build-environment failure. Live map, funded report detail, share preview and native image share sheet worked; the sheet was canceled without sending. This does not replace a new physical iPhone check; no physical iPhone was connected. Photo paging was not conclusively reverified in this simulator pass.
- Live web report, support, Android assetlinks and Apple association endpoints returned 200 without redirects. Shared report metadata included the correct $6 reward. On Pixel QA, explicit-package custom-scheme warm and cold links opened the correct report. Those checks are distinct from the production HTTPS association check above.

## Additional confirmed loading correction

On Pixel Profile, the loading rank card placed its points placeholder below the rank title, while the loaded card placed points beside the title. Native bounds showed the following menu move upward by 67 pixels when loading completed. Moved the placeholder into the same sibling position as the loaded points badge. This follows the existing Refero white/green design lock and the user's stable-loading requirement; no new visual direction or user-facing technical copy was introduced. Final Pixel retest captured both loading and loaded states: How points work remained at y=1072, My activity at y=1254, and Payments at y=1430 in both states (previously the loader moved them down 67 pixels). The rebuilt APK was installed successfully and retained the account session. Evidence: ignored `artifacts/release-follow-up-2026-09-10/profile-final-*.xml`.

## Final physical regression

On the final Pixel build, performed two-finger zoom out/in and map drag, then selected the funded marker. Map tiles and the report label remained rendered in the inspected result. Opened the report and paged from photo 1 to photo 2: photo and title/reward bounds stayed fixed and the loaded image had its report description rather than a stale loading label. Opened the general Android share sheet, confirmed the generated image and correct $6 reward text, and canceled without choosing a recipient. This supplements the earlier full Pixel journeys; four live reports still do not establish dense-city clustering performance.

## Remaining acceptance limits

TalkBack was temporarily enabled. Focus on app content was observed, but injected gestures did not establish a reliable full spoken walkthrough; keep that incomplete. TalkBack and touch exploration were restored off. Full VoiceOver, dense-city clustering/performance, real notification delivery and taps, final store signing/provider returns, physical iPhone reinstall and Apple/Meta setup remain explicit release gates. Historical successful payment/transfer/refund checks remain in `docs/funded-cleanup-launch.md`; no new charge was made.

No money spent, social content posted, messages sent, reports published, cleanups claimed/approved/disputed, or profile changes saved in this follow-up. Controlled user testing and store-release acceptance are separate milestones.
