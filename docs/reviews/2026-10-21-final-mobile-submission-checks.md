# Final mobile submission checks — October 21, 2026

## Release candidates

Source: `db318492e5d4fd39cb23fc447068037bdf322b07`, version 2.0.0.
- iOS build 20, EAS `cf133a55-3a25-485e-83ca-6327ba195f99`: finished; downloaded IPA identifies `com.litterbugs.app`, 2.0.0 (20), minimum iOS 15.1; strict code-signature verification passed.
- Android code 18, EAS `4de588ce-fdec-49d7-b97c-8e6f3eea8389`: finished at 19:41:23 UTC; downloaded AAB verified as version 2.0.0 (18), target SDK 36. Emulator smoke checks completed with limitations below.
- Neither candidate was submitted to a store in this pass.

## iPhone simulator

The build-20 JavaScript and assets were copied into an existing simulator-compatible QA native shell. This is functional JavaScript verification, not execution of the distribution IPA or certification of production signing, push, or provider authentication.
- Launch and live map passed.
- Reports list and report detail/photos/reward display passed.
- Help attempts the admin mailto destination; simulator without a mail handler displays the correct admin@litterbugs.app fallback.
- Native Support Litterbugs screen is community participation guidance, with no monthly subscription checkout/link.
- Owner signed in on the simulator. Profile → Payments displayed Reporter earnings, 5% explanation and truthful empty state. Payout setup loaded U.S./18+ requirements with the acknowledgment unchecked; no identity/banking details were submitted. Existing Play reviewer credentials remain authentication-unverified because browser tools mask them.

## Android emulator

Build 18 AAB was converted with bundletool to a universal APK and signed with the local debug test certificate for installation. This tests the built native code and JavaScript, but not Play signing, Play-specific OAuth, or distribution delivery.
- Fresh AVD `Litterbugs_Final_Release_Check`, Android API 36. Existing Play emulator data was preserved.
- Launch/onboarding, reports list (six live reports), report details/photos and $5 cleanup reward display passed.
- Native Support Litterbugs screen contains only participation guidance; no monthly payment link.
- Get help opened Gmail's first-use screen; no email sent. Extracted release bundle contains admin@litterbugs.app and Reporter earnings, and does not contain support@litterbugs.app.
- Map tiles fail authorization under the local debug signing certificate (explicit Google Maps authorization error in log). This is a test-signing limitation, not a verified production regression; map rendering still needs a Play-installed build check.
- No app crash entries observed. Android System UI stalled at 1 GB/one core before installing Litterbugs; restarting the emulator at 2 GB/two cores restored normal behavior.
- Owner signed in as Grant Gibson. Profile → Payments shows Reporter earnings, 5% explanation, accurate empty state, shared payout settings and U.S./18+ requirements. Payout setup opens with acknowledgment unchecked. No banking/identity data or financial transaction submitted.

## Store preparation

Google Play account Burrow Base, app `4975441562384229541`, package `com.litterbugs.app`:
- Existing production release is code 16 / 2.0.0 (October 7); older September draft documents are not current console state.
- No pending app-content declarations and no current policy issues displayed.
- Store listing is live with name, short/full description, icon, feature graphic, and two phone screenshots. Existing description does not promise digital purchases or subscriptions.
- Existing reviewer instructions and credential entry present; credentials masked, not authentication-tested.
- Data Safety includes purchase history and other financial info, plus location, personal info, photos, app activity, diagnostics/device IDs. No declaration edits were made.
- External deletion URL matches https://auth.litterbugs.app/delete-account and opens correctly in browser. Bare HTTP client received 403; browser succeeds.
- Updated public store contact from support@litterbugs.app to admin@litterbugs.app; contact-only publication confirmed. No app release submitted.
- Existing code-16 DEX optimization warning has February 2027 deadline; not shown as a current policy blocker.
- App Store Connect browser session is signed out; live Apple metadata/privacy/review fields remain unverified. Existing owner access exclusions remain in effect.
- Website /privacy, /help and /terms returned HTTP 200.

## Prepared release copy

What's new (both stores):
View reporter earnings in Payments, track reward status, and use shared payout settings for reporting and cleanup rewards. Updated help contact information.

Review notes:
Reporter earnings are under Profile → Payments. Eligible reporters receive 5% of eligible cleanup contributions after approval; the reward comes from the service fee. Cleanup payments fund real-world cleanup work and do not unlock digital features. Monthly platform support is website-only and is not offered for purchase in the apps. Use the existing reviewer account; no new reviewer credentials are included in this document.

Support contact: admin@litterbugs.app
Support URL: https://litterbugs.app/help
Privacy URL: https://litterbugs.app/privacy
Account deletion URL: https://auth.litterbugs.app/delete-account

## Memory handling

Only one virtual device runs at a time. iPhone simulator was stopped before Android started, then Android was stopped to reopen iPhone sign-in for the user. Sampled available memory ranged from 28% to 53%; no memory pressure crash observed. No local native compilation was run.

Both build artifacts are complete. No source change or rebuild is needed from these checks. Store submission remains pending: Apple live metadata/reviewer fields are unverified due the signed-out console; Android map/provider behavior needs the Play-signed distribution check. Neither app was submitted.

Evidence files are under /tmp/litterbugs-final-release-check/ (temporary, not committed).


## Google Play internal release and production authorization

October 21, 2026: owner explicitly authorized internal upload, then public production submission once ready. No repeat approval is needed after the outstanding check passes.
- Build 18 (2.0.0) uploaded and published to internal testing at 3:51 PM ET; track 4699848593201023059 is Active.
- Replaced unused internal draft's code 16 bundle; production code 16 unchanged.
- Only approved tester is gegibson3113@gmail.com, in Litterbugs internal testers list. Other app's tester list remains unselected.
- Opt-in URL: https://play.google.com/apps/internaltest/4699848593201023059
- Validation had no blocking errors; missing ReTrace mapping file warning remains. Native debug symbols included; Play reports 16 KB support.
- Downloaded Google's signed universal APK from console to /Users/grantgibson/Downloads/18.apk. Signature SHA-1 833c9935800ae53e5ca7feeeb7a187ff2005b9ff. Installed successfully over existing app in Litterbugs_Play_Release emulator, preserving data.
- Signed build refuses to launch on that emulator: “Check that Google Play is enabled on your device and that you're using an up-to-date version…” No protections bypassed. Phone install through internal Play testing remains needed to verify Maps, sign-in, Payments.
- Emulator stopped afterward. Public promotion not performed pending that check. Owner said Luke will handle Apple submission; notify Luke to submit iOS build 20 after his store metadata/reviewer checks.


## Final alternate verification and production submission

October 21, 2026: owner requested straightforward alternate Android verification and authorized public release.
- No automated pre-launch report is available yet. Did not represent it as passed.
- Read-only Google Cloud verification: build 18 manifest contains the exact existing production Android Maps key; key restrictions allow com.litterbugs.app with Google Play signing SHA-1 833c9935800ae53e5ca7feeeb7a187ff2005b9ff; maps-android-backend.googleapis.com is enabled. No key or security settings changed. Raw key comparison temporary file deleted; no key value recorded here.
- This resolves the identified certificate authorization concern by configuration verification, not runtime map rendering under Play signing. Prior authenticated emulator functional checks remain valid with their recorded limits. A phone check is useful follow-up, not retained as a mandatory submission blocker.
- Promoted exact build 18 from internal testing to production, with existing countries and 100% rollout. Play validation: zero blocked devices relative to previous release; only nonblocking missing ReTrace mapping-file warning.
- Sent the sole pending change (Production 18, Start full rollout) for review. Console confirms Changes in review, with quick checks running before review dispatch. Managed publishing is OFF, so approved production release is configured to publish automatically.
- Public availability is not yet confirmed; Google review remains pending. No iOS submission performed; Luke handles iOS 2.0.0 build 20.
- Evidence: /tmp/litterbugs-final-release-check/play-build18-production-review.png
