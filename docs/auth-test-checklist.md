# Authentication Release Checklist

Record only test date, device, result, and non-sensitive evidence. Never record
passwords, tokens, secrets, or private email links.

## Configuration

- [x] App points to Supabase project `mvaygkflcjswtwchflrk`.
- [x] Production identity remains `com.litterbugs.app` with scheme `litterbugs`.
- [x] Apple's live App Store record confirms bundle `com.litterbugs.app`, App Store ID `6757313862`, and seller James Luke Barber (2026-08-17).
- [x] Google and Facebook use new Litterbugs-specific provider records.
- [x] Email confirmation is required.
- [x] Verification and recovery redirects are allowed.
- [x] Custom SMTP sends as `support@litterbugs.app`.
- [x] No provider or SMTP secret is tracked by Git.
- [x] No unrelated project name, identifier, credential, or organization is referenced by tracked files.
- [x] Meta confirms the app is managed by the isolated `Litterbugs Community Cleanup` business portfolio, ID `863596096684215` (2026-08-18).
- [x] Google OAuth is in production, Litterbugs branding is verified, and only non-sensitive OpenID/email/profile scopes are requested (Google Auth Platform audit, 2026-08-17).
- [x] Live Auth settings recheck confirms email signup and anonymous access enabled, email auto-confirm disabled, Google and Facebook enabled, and Apple/phone disabled in `mvaygkflcjswtwchflrk` (rechecked through the public Auth settings endpoint, 2026-08-18).
- [x] Correct Litterbugs business ownership is connected in Meta; the ownership email is confirmed and Grant E Gibson has active full access. Meta business verification remains a release gate (2026-08-18).
- [x] Production Google iOS client `Litterbugs Production iOS` is confirmed for `com.litterbugs.app` and App Store ID `6757313862`, with matching EAS production values (2026-08-18).
- [ ] Apple sign-in is enabled and tested before App Store submission.

## Automated and build checks

- [x] JavaScript syntax checks pass.
- [x] `git diff --check` passes.
- [x] Expo Doctor passes all 18 checks.
- [x] iOS production export succeeds.
- [x] Android export succeeds with the deferred browser fallback.
- [x] Local iOS Release build succeeds with native Google and browser-based Facebook authentication.
- [x] Native QA artifact identifies itself as `Litterbugs`.
- [x] Tracked Expo config resolves production bundle ID `com.litterbugs.app`.
- [x] EAS profiles isolate QA and production environments; the build-worker guard rejects a Google iOS client/bundle mismatch. Production resolves to `com.litterbugs.app`, preview/development resolve to `com.gegibson.litterbugs.qa`, and each environment contains only the authentication values required by the current implementation (rechecked 2026-08-18).
- [x] Current self-contained Release QA artifacts are built and signed for the iOS simulator and physical iPhone (2026-08-17); Metro is not required. The final-source simulator artifact was rebuilt from scratch after the last code change.
- [x] A clean reinstall of the preserved final-source simulator artifact launches directly to the branded Welcome screen without Metro, cached app data, warnings, or technical metadata (2026-08-18).
- [x] The nonce-corrected physical Release QA build is installed and running on Sarah's iPhone 6s (iOS 15.8.2, 2026-08-17).
- [x] The final-source physical Release QA build was rebuilt locally with two compiler jobs, signed with the isolated `com.gegibson.litterbugs.qa` profile, installed over the previous QA build, launched through Xcode, and captured on Sarah's iPhone 6s (iOS 15.8.2, 2026-08-18). The first launch displayed the expected iOS location-permission prompt.
- [x] The combined worktree preserves the newest `origin/main` report-form and report-detail redesigns together with the account sheet and authentication changes (2026-08-18).
- [ ] Record the reviewed `MapScreen.js` reconciliation in branch history after partner approval.
- [x] The combined self-contained simulator app opens the redesigned report wizard, then returns to the shared map/account sheet and completes confirmed guest sign-out (iOS 26.5 simulator, 2026-08-17).

## Email authentication

- [x] New signup sends one verification action.
- [x] Unverified account cannot sign in.
- [x] Valid verification link confirms the account.
- [x] Login succeeds after verification.
- [x] Incorrect password shows friendly guidance.
- [x] Duplicate signup never becomes login or creates another identity.
- [x] Verification resend works after the cooldown.
- [x] Recovery email opens the in-app new-password screen.
- [x] New password saves and signs in successfully.
- [x] Expired or replayed links show recoverable guidance.
- [ ] Verification and recovery handoffs are repeated on the current physical build.

## Google iOS

- [x] Native QA build reaches Google without displaying a Supabase host prompt (iOS 26.5 simulator, repeated 2026-08-18).
- [x] Returning sign-in succeeds through the native Google flow, reaches the map, and records a successful Supabase `/token` exchange (`id_token`, 200; signed iOS 26.5 Release simulator, repeated 2026-08-18).
- [x] The same Google button creates a new Supabase user for a first-time Google identity; a privacy-safe identity audit confirms one Google identity was created together with its user (2026-08-17).
- [x] Cancellation returns to Litterbugs without an error alert (repeated on the installed signed QA app, iOS 26.5 simulator, 2026-08-18).
- [x] Declining access on Google's own consent screen returns to the Litterbugs sign-in screen without an error or technical text (signed iOS 26.5 Release simulator, 2026-08-17).
- [x] Matching email attaches to the intended existing user without duplication (Supabase identity audit, 2026-08-17).
- [x] Native Google returns through the iOS SDK rather than an app URL callback; cancellation returns safely to the foreground, and the resulting Supabase session survives a fully closed relaunch (repeated 2026-08-18).
- [x] Session survives app termination and a cold relaunch (signed iOS 26.5 Release simulator, repeated 2026-08-18).
- [x] Confirmed sign out returns to Welcome, clears the Supabase session, and invokes native Google sign-out (signed iOS 26.5 Release simulator, repeated 2026-08-18).

## Facebook iOS

- [x] Signed QA build reaches Facebook through `auth.litterbugs.app` without displaying a Supabase host prompt (iOS 26.5 Release simulator, 2026-08-18).
- [x] Returning sign-in succeeds through standard Facebook browser OAuth, returns to the Litterbugs map, and records a successful Supabase PKCE `/token` exchange (200; signed iOS 26.5 Release simulator, 2026-08-18).
- [x] Cancellation at the Apple consent prompt returns to Litterbugs without an error alert or stale-token exchange (signed iOS 26.5 Release simulator, 2026-08-18).
- [ ] Cancellation or permission denial on Facebook's provider-owned consent page returns to Litterbugs without a technical alert. The final build recognizes the provider cancellation and denial responses, but the isolated system browser prevented unattended interaction with Facebook's inner Cancel button.
- [x] Matching email attaches to the intended existing email user without duplication (Supabase identity audit, 2026-08-17).
- [x] Facebook returns through the centralized `litterbugs://auth/callback` handler, and the resulting Supabase session survives a fully closed relaunch (signed iOS 26.5 Release simulator, 2026-08-18).
- [x] Session survives app termination and a cold relaunch (signed iOS 26.5 Release simulator, 2026-08-18).
- [x] Sign out clears the Supabase session; a repeat login requires explicit Facebook confirmation and returns successfully (signed iOS 26.5 Release simulator, 2026-08-18).
- [ ] A genuinely new Facebook account completes signup when a test account is available (explicitly deferred for branch review because Meta test-user creation is unavailable and a separate real account was not available).

## App behavior and presentation

- [x] Existing Google, Facebook, email, and guest buttons retain their layout (visual and accessibility-tree pass on the installed signed QA app, iOS 26.5 simulator, 2026-08-18).
- [x] Google uses the official multicolor G on white.
- [x] Facebook uses Meta blue `#1877F2` with a white mark and text.
- [x] Provider buttons retain their icon, label, dimensions, and color while displaying a compact in-button progress state, so the app-controlled portion of the browser handoff does not jump (current signed QA app, iOS 26.5 simulator, 2026-08-18).
- [x] Login, signup, and password recovery remain explicit separate actions (signed iOS 26.5 Release simulator, 2026-08-17).
- [x] Failed login shows friendly guidance and never creates an account (final-source Release UI pass, `/token` 400, and zero-user Supabase audit for the test address, 2026-08-17).
- [x] Account sheet shows simple account status without provider metadata (repeated on the installed signed QA app, iOS 26.5 simulator, 2026-08-18).
- [x] Existing Yes/No sign-out confirmation is preserved; `No` keeps the session and `Yes` returns to Welcome (repeated on the installed signed QA app, iOS 26.5 simulator, 2026-08-18; earlier final-source pass also recorded Supabase `/logout` 204).
- [x] Email sheet remains usable on small screens and with the keyboard open.
- [x] Guest mode creates an anonymous session, shows the non-transfer warning, and remains available without report transfer (repeated on the installed signed QA app, iOS 26.5 simulator, 2026-08-18).
- [x] A guest session survives app termination and a cold relaunch (repeated on the installed signed QA app, iOS 26.5 simulator, 2026-08-18).
- [x] Google and Facebook provider screens display Litterbugs branding and no Supabase metadata; Facebook uses the validated `auth.litterbugs.app` bridge and standard `facebook.com` consent screen (fresh final-source signed iOS 26.5 Release simulator, 2026-08-18).
- [x] The live Facebook bridge health check passes, accepts only the exact Litterbugs Supabase/Facebook/callback combination, and rejects unapproved hosts and providers with HTTP 400 (2026-08-18).
- [x] A denied auth callback cold-launches into friendly retry guidance without raw provider metadata (iOS 26.5 simulator, 2026-08-17).
- [x] An expired recovery callback foregrounds from the background into friendly request-a-new-link guidance (iOS 26.5 simulator, 2026-08-17).
- [ ] Current physical-device pass finds no Supabase host, raw metadata, or technical alert text (both providers pass on the signed simulator build but have not been repeated on the current physical build).

## Known QA limits

- The physical test phone is an iPhone 6s on iOS 15.8.2. The current Xcode can install, launch, and capture the signed Litterbugs build, but its UI-test runner rejects this older OS as an unsupported logic-test destination. Physical interaction results above therefore come from direct device testing, Xcode screenshots, app relaunches, and Supabase Auth logs rather than unattended XCTest.
- Meta's simulated test-user service is currently unavailable. A genuinely new Facebook-user signup remains unverified until Meta restores test users or a separate real tester account is available.

## Branch merge gates

- [ ] The implemented Google, Facebook, email, recovery, guest, session, and sign-out scope is accepted with any remaining provider-owned manual QA limits documented above.
- [ ] The branch is reconciled with the latest `origin/main` and the combined result passes the final smoke checks.
- [ ] Partner reviews and approves the branch.
- [ ] Only after approval is the branch pushed or merged.

## Deferred App Store gates

- [ ] Complete Meta business verification and any required public provider review before public Facebook login release.
- [ ] Implement and test Apple login before submitting an App Store build that contains third-party social login.
- [ ] Repeat the full release checklist on the final App Store candidate.

## Android Google Play

- [x] QA configuration resolves to `Litterbugs QA` and `com.litterbugs.app.qa`.
- [x] Production configuration resolves to `Litterbugs` and `com.litterbugs.app`.
- [x] Android configuration does not require iOS OAuth values.
- [x] Missing Android Maps configuration fails a configured build early.
- [x] Expo Doctor passes all 18 checks.
- [x] API 36 debug compilation succeeds.
- [x] QA APK identifies package `com.litterbugs.app.qa`, version `1.0.0`, min SDK 24, and target SDK 36.
- [x] QA signing SHA-1 is recorded in `docs/android-google-play.md`.
- [x] Official multicolor Google asset remains tracked and used by the shared auth screen.
- [x] Live account deletion integration test removes the Auth user, session, and uploaded photo; anonymizes only that user's report; retains community fields; and leaves an unrelated user's report unchanged (2026-08-19).
- [x] An unconfirmed deletion request is rejected without deleting the account; the same temporary account can then be deleted only after explicit confirmation (2026-08-19).
- [x] External deletion, neutral email-request, confirmation, privacy, logo, and Worker health routes respond successfully.
- [x] Live migration and authenticated `delete-account` Edge Function are present in Supabase project `mvaygkflcjswtwchflrk`.
- [x] Create restricted QA and production Maps keys in the `litterbugs-auth` Google Cloud project.
- [x] Store the QA and production Maps keys in their matching EAS environments.
- [ ] Install a fresh QA APK on the Pixel and verify Maps, location allow/deny, markers, offline recovery, auth callbacks, Guest, account sheet, and sign-out confirmation.
- [ ] Repeat the device flow on an API 36 emulator.
- [x] Build and inspect the signed production AAB (`1.0.0`, version code 3, target SDK 36, production package/signing identity, Maps metadata present, no QA/prototype references, and no overlay or microphone permission).
- [ ] Run focused iOS regression checks for the shared Account-sheet deletion action.
- [ ] Choose the permanent Play Console owner before creating the public app record.

Full instructions and Play release gates are in `docs/android-google-play.md`.
