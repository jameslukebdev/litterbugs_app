# Authentication Release Checklist

Use this checklist on the iOS development client before moving PR #2 out of draft. Record the test date, tester, device, result, and useful evidence. Do not record passwords, tokens, provider secrets, or private email links.

## Preconditions

- [x] Test build uses the existing production bundle ID `com.litterbugs.app`.
- [x] App points to Supabase project `mvaygkflcjswtwchflrk`.
- [x] Email confirmation is required.
- [x] `litterbugs://auth/callback` is allowed.
- [x] `litterbugs://auth/reset-password` is allowed.
- [x] Google and Facebook are enabled with new Litterbugs-specific provider records.
- [x] The Apple button remains hidden while Apple configuration is deferred.
- [ ] Before App Store release, Apple is enabled with the production team's existing `com.litterbugs.app` App ID.
- [x] Custom SMTP is configured with the approved `support@litterbugs.app` sender and a Partner-specific Resend credential.
- [x] Google is in Production; the current Meta development tester is authorized for role-based testing.

## Email authentication

- [ ] A new email account receives a verification message and cannot sign in before verification.
- [ ] A valid verification link opens Litterbugs and establishes the correct session.
- [ ] Resend verification sends a fresh usable link.
- [ ] An expired or already-used verification link shows a useful error and recovery action.
- [x] Existing email and correct password signs in.
- [x] Incorrect password shows a mismatch error and the login path never calls signup.
- [x] An explicit duplicate signup does not create a second identity and directs the user toward sign-in or recovery.
- [ ] Forgot password does not disclose whether an account exists.
- [ ] A valid recovery link opens the new-password screen.
- [ ] Mismatched or short replacement passwords are rejected locally.
- [ ] Saving a valid replacement password succeeds and the new password signs in.
- [ ] An expired recovery link shows a useful error and allows requesting another link.
- [x] A signed-in Google session is restored after fully closing and reopening the app.
- [x] A signed-out session stays signed out after fully closing and reopening the app.

## Social authentication on iPhone

Run every provider section with both a new provider account and a returning account.

### Google

- [x] New account succeeds.
- [x] Returning account succeeds.
- [x] User cancellation returns safely to Litterbugs.
- [x] Provider page displays the verified Litterbugs name and logo instead of the Supabase hostname.
- [ ] Permission denial produces a useful error.
- [ ] Matching an existing verified email does not create an unintended duplicate identity.
- [ ] Network interruption fails safely and allows retry.

### Apple

- [x] Deferred Google/Facebook test builds do not display the Apple button.
- [ ] Native Apple sheet opens from the official Apple button.
- [ ] New account succeeds on a physical iPhone.
- [ ] Returning account succeeds.
- [ ] Hide My Email succeeds.
- [ ] User cancellation returns safely to Litterbugs.
- [ ] Permission or credential failure produces a useful error.
- [ ] Matching an existing verified email does not create an unintended duplicate identity.
- [ ] Network interruption fails safely and allows retry.

### Facebook

- [ ] New account succeeds.
- [ ] Returning account succeeds.
- [x] User cancellation returns safely to Litterbugs.
- [ ] Permission denial produces a useful error.
- [ ] Matching an existing verified email does not create an unintended duplicate identity.
- [ ] Network interruption fails safely and allows retry.

## Callback and lifecycle states

Repeat email verification, recovery, and one browser OAuth callback in each state:

- [x] App already open for the Google browser OAuth callback.
- [x] Browser-auth cancellation callback with the app in the background.
- [x] Browser-auth cancellation callback with the app fully closed.
- [ ] Replaying the same callback does not create duplicate work or an extra session.
- [ ] Returning to the foreground resumes token refresh without running it unnecessarily in the background.

## Guest and account behavior

- [x] Continue as Guest remains available as a quiet action.
- [ ] Guest can use the existing report experience.
- [x] Guest reports are not presented as transferable to a permanent account.
- [x] Account sheet shows Guest status and the recovery warning.
- [x] Account sheet shows provider and email for a permanent account.
- [x] Sign out opens the Yes/No confirmation.
- [x] No closes the confirmation and preserves the session.
- [x] Yes signs out and returns to the existing Welcome to Litterbugs screen.

## UI and regression checks

- [x] Welcome screen wording, logo, colors, Get Started, and Support Litterbugs remain intact.
- [x] Authentication layout fits the smallest supported iPhone without clipped actions.
- [x] Software keyboard does not hide the active email or password control on the iPhone 17 Pro simulator.
- [x] Authentication actions have visible loading/disabled states, including session restore, provider/email/guest actions, password update, and confirmed sign-out.
- [x] Buttons and links have useful accessibility labels and at least a 44-point touch target.
- [ ] Existing map, report creation, report editing, photo, and location behavior still works.
- [x] No database, RLS, report, or Storage behavior changed in this branch.
- [x] No provider, SMTP, Apple, or Supabase secret appears in tracked Git content or application logs reviewed during this test.

## Recorded iOS simulator pass

- Date: 2026-08-15
- Build: EAS iOS simulator development build `1371c8b8-4a57-4e73-bfce-10c918b0c4b6`
- Device: iPhone 17 Pro simulator, iOS 26.5
- Runtime: one Litterbugs development client connected to one local Metro server
- Verified: private iOS OAuth session without the technical app/domain prompt, Google new and returning sign-in, Google/Facebook cancellation recovery, open/background/cold-start browser-auth callback routing, session restore, signed-out restore, email login/signup/recovery layouts, software-keyboard layout, Guest warning, Account sheet, and Yes/No sign-out behavior
- Remaining: Facebook credential completion, verification/recovery email delivery, successful provider callbacks from background and cold start, permission/network failure cases, physical-iPhone testing, and Apple before App Store submission
- Accessibility/source audit: auth controls expose useful labels, visible links meet the 44-point minimum, disabled provider/email actions visibly dim, and session restoration displays a loading indicator instead of a blank screen.
- Small-screen pass: the welcome screen, auth buttons, email sheet, and keyboard-open email form fit an iPhone SE (3rd generation) simulator without clipping actions. The temporary simulator was deleted immediately after testing and the single iPhone 17 Pro simulator was restored.
- Provider errors are translated to short retry guidance; native browser and network implementation details are not displayed to users.
- Confirmed sign-out keeps the existing Yes/No alert and displays a disabled `Signing out…` state until Supabase responds.

## Live Supabase audit

- Date: 2026-08-15
- Project read-back: `mvaygkflcjswtwchflrk` is `Litterbugs` and reports `ACTIVE_HEALTHY`.
- Auth logs confirm Google signup/login/logout, successful email-password login, rejected invalid credentials, and rejected repeated signup.
- Live Auth configuration confirms the verified Resend sender `support@litterbugs.app`, SMTP host/port/username, and the presence of the encrypted Partner-specific SMTP password. No secret value is recorded here.
- Project read-back reports zero database migrations, zero Supabase branches, and zero Edge Functions.
- No personal email address, token, provider secret, or callback payload is recorded in this checklist.

## Release decision

- [ ] Apple authentication is enabled and its tests pass before submitting a build that includes Google or Facebook login to App Review.
- [ ] All required iOS checks pass with evidence.
- [ ] Any failures are fixed and retested.
- [ ] PR #2 receives partner review.
- [ ] PR #2 is moved from draft to ready only after the live Auth configuration and physical-iPhone tests pass.

Android provider setup and testing are intentionally deferred.
