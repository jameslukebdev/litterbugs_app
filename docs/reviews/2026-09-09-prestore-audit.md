# Pre-submission audit and user-testing readiness

> Historical audit: the sections below record successive September 9 states, including a temporary rollback. They are not the final merge inventory. See [September 10 merge verification](2026-09-10-merge-verification.md) for the final scope and current evidence. The explicit photo-consent gate described in the original findings was subsequently removed at the owner’s request; automatic photo review remains. App Store readiness is still a separate release decision.

September 9, 2026. Scope: current iOS user journeys, usability, recovery, accessibility, backend boundaries, and App Store preparation. Baseline `eff18cf` plus the September 9 working-tree changes. This is not an App Store submission or certification.

## Decision

The current QA build is suitable for supervised, non-transactional usability testing. **Do not submit to App Review or run unsupervised money/cleanup tests yet.** The live backend has both payments and Gemini review enabled. A QA bundle identifier does not make its backend a sandbox. The older signed artifacts in `docs/current-mobile-release-candidates.md` do not contain these latest changes.

## Research and reference lock

- Primary: existing Litterbugs white surfaces, compact controls, green actions, real report photos, and legible native typography. Preserve the design and fix behavior rather than redesign it.
- [Plain](https://plain.com), Refero style `87497fb6-4a59-46cc-9181-916318b9f28f`: secondary reference for restrained functional accents and lightweight grouping; do not import its technical typography or web display scale.
- [Refero WhatsApp account deletion](https://refero.design/flows/13596): consequences before the destructive action, explicit confirmation, recoverable exit, recognizable completion. No mandatory feedback step added.
- Existing approved [Airbnb filters](https://refero.design/flows/6389), [Pool reporting](https://refero.design/flows/11982), and [SSENSE checkout](https://refero.design/flows/7108) remain the interaction references.
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/): reviewed current sections 1.2, 2.1, 3.1.3, 4.8 and 5.1. [Account deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/) and [App Privacy details](https://developer.apple.com/app-store/app-privacy-details/) inform the release gates.

| Decision | Evidence and purpose |
|---|---|
| Separate help from financial support | Settings offered only a Patreon “Support” link. A clear Get help entry follows the user's request for understandable workflows and Apple's contact requirement. |
| Preserve payment context and expose retry | A first-load error had no retry when `item` was null. Recovery belongs next to the failed action. |
| Explain photo recipients at consent | Current photo upload calls Cloudmersive; report/cleanup review can call Google Gemini. Apple requires disclosure and permission for third-party data sharing. |
| Make paid-cleanup timing conditional | Existing review copy started the 48-hour clock immediately, contradicting the paid-photo review sequence. |
| Show optional funding as Not now | The choice is whether to add money during publication; it does not permanently classify a report as volunteer-only. |
| Keep failure copy actionable | Profile completion, profile edit, report save, and payout setup still exposed internal errors or provider jargon. |

## Changes completed in this audit

1. Added Get help to signed-in Settings and guest Profile, with an email fallback if Mail is unavailable. Patreon is explicitly labeled Support us on Patreon.
2. Added Terms, Privacy, and help access to sign-in; clarified the existing-password placeholder and the screen-reader role of its visibility control. Form errors announce themselves.
3. Added explicit photo-review permission before any secure-media upload. Concurrent photos share one prompt; approval is versioned and account-scoped. Refusal or unreadable permission storage sends no photo bytes. Settings can withdraw permission for future uploads. Existing report drafts go through the same gate. This is mobile consent; it does not retroactively prove consent for older records or other clients.
4. Updated the public privacy page to name Cloudmersive and explain mobile permission withdrawal. Existing Google Gemini disclosure is retained.
5. Made Refresh payment details available after an initial load failure, and guarded missing payment-reference parameters.
6. Fixed sign-out exception recovery so Settings cannot stay stuck busy. Profile completion now handles sign-out failures and maps save errors to friendly messages; profile editing and report saving also avoid raw diagnostics.
7. Changed the optional initial-funding choice to Not now / Post without adding funds and updated its validation copy.
8. Corrected paid-cleanup review timing and the payout-setup error heading.
9. Removed the first-page ceiling from account-deletion photo enumeration. It collects all pages and nested paths before deletion, preserves account boundaries, and fails on listing errors. An unfinished reward now yields a recognizable deletion error and a Get help path instead of a misleading connection error. This does not prove end-to-end deletion of every retained data category.
10. Added native Settings/help/permission coverage, consent behavior tests, a no-upload-on-refusal integration check, and storage pagination/error tests.
11. Marked older signed release candidates as historical, preventing accidental submission of an outdated artifact.

## Journey audit

| Journey | What was checked | Remaining acceptance |
|---|---|---|
| First launch and guest discovery | Current small-iPhone cold launch, map, guest Profile, help, sign-in entry; prior native map/list checks preserved. | Physical-device launch and slower network timing on the signed final artifact. |
| Email sign-in / signup / reset | UI, local validation, recovery screen, keyboard clearance on iPhone 13 mini; code error paths; policy/help links added. | New disposable account, real verification/reset links, expired/reused link and session recovery. No email was sent in this audit. |
| Google / Facebook | Current UI and provider code/config inspected. Both are offered; Apple sign-in is absent. | Public, non-admin account login/return/cancel on physical iOS. Resolve Apple and Meta gates below. |
| Profile and activity | Scoped report/cleanup definitions, retained resources, error copy, sign-out recovery; Settings native test at normal and largest accessibility text. | Separate-account switching, deleted-account local data retention, real completed/awaiting/active records in test backend. |
| Map / Reports | Existing direct-marker selection and shared filtering checks; current largest-text controls native pass; small-device map inspection. | Dense real-world data performance, real-device location, VoiceOver, signed-build regressions. |
| Report litter | Optional map-centered location, 3-stage workflow, draft path, funding wording, server publication and upload path inspected; new consent cannot be bypassed by restoring a draft. | Existing personal draft was preserved. Re-run publication, missing photos, retry, background recovery and edits in an isolated account/environment. |
| Fund cleanup / payment history | Amount/fee context, retry, unconfirmed-payment protection, cache behavior and timing code; financial security tests. | Payment success/decline/cancel/response loss, no duplicate charge, refund reconciliation, return links on final physical-device build. |
| Claim and perform cleanup | Agreement/preflight, age/payout eligibility, deadline/release, directions, after-photo flow inspected. Prior current-day waiver native test passed. | Two-account claim race, release, expiry and submission against isolated backend. |
| Cleanup review / disputes / rewards | Corrected paid timing, draft recovery and stale-state protections inspected; existing reconciliation tests pass. | Replacement-photo rounds, dispute, admin decisions, first-paid review, payout failure/retry, automatic approval with real timing rules. |
| Reporting abuse / blocking | Report and block paths exist; private explanation and discard protections inspected. | A moderation test account, response ownership/turnaround, objectionable-content prevention, blocked-content visibility across all surfaces. No moderation action submitted. |
| Account deletion | Explicit warning/confirmation, server authorization, reward-blocked recovery, storage pagination. Deployed endpoint rejects unauthenticated requests. | Disposable-account end-to-end deletion including reports, cleanup photos, local drafts/caches, social revocation and financial retention. Never test on the owner's account. |
| Sharing / external links / notifications | Custom scheme and report routes, disabled associated domains, push-registration code, support/policy targets inspected. | Physical-device push/return links, production universal links, background notification deep links, share destinations. |

## Release gates — must be resolved before App Review

### 1. Login options

`AuthScreen.js` offers Google and Facebook, while `lib/auth.js` and native configuration contain no Sign in with Apple integration. Apple's section 4.8 requires an equivalent privacy-preserving login for this kind of social-login app unless an exception applies. No applicable exception has been established. Add and configure Sign in with Apple, including deletion/token revocation, and test it with the actual signing team and production bundle. Do not add a nonfunctional Apple button or silently remove existing login choices.

The older Meta preparation document says public Facebook access was gated; current code intentionally always displays Facebook, and every EAS profile has the flag true. This audit did not establish Meta approval. Verify public login with a non-role account and record the current provider approval before submission.

### 2. User-generated content moderation

Report/block controls and a contact route exist. The upload endpoint checks malware and sanitizes images; this is **not** an objectionable-content classifier. Publication can occur before Gemini funding review. Establish and exercise a server-enforced moderation policy for offensive photos and text, with a staffed response process, before public launch. Do not label the existing malware scan as Apple section 1.2 content moderation.

### 3. Complete transactional and account testing

The connected backend is live. Current unit and simulator evidence does not certify the final donation → claim → evidence → approval → reward/refund journey. A separate Supabase project and Stripe sandbox are pending the owner's project details. Prior August sandbox evidence predates the present implementation. Also test deletion on a disposable account; the new pagination and error handling do not by themselves certify all deletion/retention requirements.

### 4. Privacy, services, and App Store metadata

Review App Store Connect's privacy labels against actual data flow: account/contact information, report/cleanup text and photos, selected report location and optional device location, payment/purchase history, identifiers including push installation/token, support communications, and any SDK/device/fraud diagnostics. Card/bank details go to Stripe, not the Litterbugs database. Determine SDK collection from the signed archive and current provider configuration; do not infer “no collection” from the generated manifest's empty `NSPrivacyCollectedDataTypes` array.

The generated manifest includes required-reason API declarations and tracking=false. That does not substitute for App Store privacy answers. Confirm SDK manifests/signatures in the final archive. The new mobile consent and policy update do not certify retrospective consent or equivalent consent on the website.

Verify actual distribution countries and age rating. Funded payout eligibility is U.S./18+; that is distinct from the App Store age-rating questionnaire. Document contributions as funding physical cleanup services, including the 10% fee, refund rules, payout timing, and dispute handling. Separately review the external Patreon destination and its offered benefits; this audit does not establish its storefront policy eligibility.

### 5. Final signed artifact and review packet

Produce a fresh **store-distribution** iOS archive from the final reviewed code, bundle `com.litterbugs.app`, on the chosen Apple team. The QA simulator app and older ad hoc IPA cannot serve as the final submission artifact. Verify Google client/bundle match, permissions, entitlements, push, and return URLs. iOS associated domains are disabled in current production EAS settings: decide whether report links should open the website or enable/test Universal Links before claiming native link support.

Complete App Store Connect review credentials, contact details, support/privacy URLs, screenshots for supported device families, encryption/privacy/age answers, and reviewer instructions. Do not use the owner's personal login. Camera, real GPS, push, card PaymentSheet and hosted payout returns require a physical-device pass.

## Backend review

Read-only checks against `mvaygkflcjswtwchflrk` confirmed all public tables have RLS enabled; payments and Gemini review are enabled. Live report INSERT/UPDATE policies require a permanent user, matching ownership, and an available, unexpired, uncancelled report. Account-deletion preparation is not executable by anon or authenticated roles. Claim/waiver RPCs are member-executable, not anon-executable, with explicit search paths. Public rank lookup is anon-executable intentionally; authorization/body behavior still belongs in the broader security review.

Security advisor returned **36 warnings, no errors**: one `pg_net` extension-placement warning, one public definer RPC, 18 authenticated definer RPCs, 15 anonymous-sign-in policy warnings, and one disabled leaked-password-protection warning. Do not mass-revoke these RPCs or disable anonymous access: some support deliberate guest/member flows. Enable breached-password protection where the project plan supports it, and complete a policy/body review of the flagged entry points. The advisor is evidence, not a penetration test or a security clearance.

## Verification evidence

- Mobile: **338 tests across 78 files passed**. Includes consent refusal proving no upload/network call.
- Web: **104 tests across 28 files passed**; web lint and workspace type checking passed.
- Mobile source: **140 modules, zero errors**.
- Financial boundary tests: **16 passed**. Gemini relay: **7 passed**.
- Storage enumeration: **2 tests passed** (1,105 files, nested folder, failed listing, invalid path).
- All 11 configured Edge Function entry points type-check.
- Current QA iOS Release build succeeded (`/tmp/lb-prestore-final-build.log`).
- Native Settings/help/photo-permission: normal text passed; largest accessibility text passed. Largest-text map controls passed. Result bundles: `/tmp/lb-prestore-settings.xcresult`, `/tmp/lb-prestore-large.xcresult`. These are three executions covering two distinct cases, not a full journey suite.
- Small-iPhone guest discovery, final sign-in help/policy links, and reset-password keyboard clearance visually inspected. iPad (A16) fresh welcome, map, filters, portrait/landscape and landscape keyboard clearance visually inspected; no clipped primary controls in these checked states. [Final small-iPhone sign-in](assets/2026-09-09-prestore/small-iphone-signin.png); [iPad keyboard](assets/2026-09-09-prestore/ipad-landscape-keyboard.png). [Recovery screenshot](assets/2026-09-09-prestore/small-iphone-password-recovery.png); [Settings](assets/2026-09-09-prestore/settings.png).
- Previous current-day smoke: eight passed, three skipped to preserve the personal draft; separate waiver passed. Those skips remain outstanding.
- Account-deletion function deployed narrowly with no schema/payment-state changes. Unauthenticated POST returned HTTP 401. No real deletion, financial transaction, publication, claim, review or profile save performed.
- Privacy deployment `dpl_C3sEjuWxvjxd75FTdXejo8To9tuG` on the isolated production checkout; candidate checked before promotion. Live privacy page contains Cloudmersive/withdrawal text and neither retired company-name spelling. Zero error entries returned in the bounded ten-minute post-promotion log scan. This is not continuous monitoring.

## Supervised user-test script

Give testers goals, not navigation instructions. Ask them to explain what they expect before tapping.

1. Find a cleanup in a named area; explain a dot, an amount, no funds, selected marker, and completed state.
2. Filter reports, cancel a filter change, apply one, and return between list and map without losing context.
3. Start reporting with location denied, position the pin, understand the photo requirement, and save/resume a draft. Stop before publishing on live services.
4. Open a report, explain reward versus fee/total, open funding and return. Stop before checkout on live services.
5. Explain what claiming commits them to, required evidence, review timing and when money can be paid. Stop before consent/claim on live services.
6. Find their reports versus cleanups performed, payment history, help, blocked accounts, photo-review permissions and deletion entry. Stop before destructive or outgoing actions.
7. Repeat key screens with large text and on a small phone. Note unreadable copy, unexpected movement, missing actions and uncertain status.

Record device/OS/build, task completion, where help was needed, exact expected/actual behavior and a screenshot. Run the full transactional version of this script only with isolated test accounts and test funds.

## Simulator handoff

Restored the normal iPhone 17 Pro QA app (`com.gegibson.litterbugs.qa`, version 1.0.0/build 1) with the final Release bundle, standard text size, denied location permission, and cleared synthetic GPS. The small iPhone and iPad audit simulators were shut down. The existing personal account and draft were preserved.

## Later update: automatic photo review

At the owner's request on September 9, the mobile upload permission dialog and stored consent gate were removed. Uploads now proceed directly to the existing quarantine and server safety checks. Settings provides optional “About photo review” information rather than a permission switch. The privacy-page source was updated to describe automatic checks; that source edit has not yet been deployed. Earlier consent test results above describe the audited build before this update.

The explicit third-party AI permission item from Apple section 5.1.2 remains a release consideration; removing the dialog does not resolve that submission requirement. An optional information item is not explicit consent.

Verification of this update: 332 mobile tests passed; source validation checked 140 modules with zero errors. Six tests for the removed consent behavior were removed. Existing upload tests still cover quarantine, processing failures and unsupported media. No report was published to verify this change.

## Local scope after Luke-email rollback

The owner discarded the Luke-email UI iteration, retaining only: smoother All payments/Completed impact loading, location/map-style controls on the right, and a red center pin during report placement. The earlier photo-permission-popup removal remains. All other map-marker, preview-action, report-card and wizard redesign changes were reverted. No changes were pushed to main. The retained version passes 332 mobile tests and source validation, and its simulator Release build succeeded. Normal simulator text size was restored.
