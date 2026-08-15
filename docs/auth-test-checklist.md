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
- [ ] Verification and recovery email uses the approved `support@litterbugs.app` sender.
- [ ] Testers are authorized in provider test/development modes.

## Email authentication

- [ ] A new email account receives a verification message and cannot sign in before verification.
- [ ] A valid verification link opens Litterbugs and establishes the correct session.
- [ ] Resend verification sends a fresh usable link.
- [ ] An expired or already-used verification link shows a useful error and recovery action.
- [ ] Existing email and correct password signs in.
- [ ] Incorrect password shows an error and never creates an account.
- [ ] An explicit duplicate signup does not create a second identity and directs the user toward sign-in or recovery.
- [ ] Forgot password does not disclose whether an account exists.
- [ ] A valid recovery link opens the new-password screen.
- [ ] Mismatched or short replacement passwords are rejected locally.
- [ ] Saving a valid replacement password succeeds and the new password signs in.
- [ ] An expired recovery link shows a useful error and allows requesting another link.
- [ ] A signed-in session is restored after fully closing and reopening the app.
- [ ] A signed-out session stays signed out after fully closing and reopening the app.

## Social authentication on iPhone

Run every provider section with both a new provider account and a returning account.

### Google

- [ ] New account succeeds.
- [ ] Returning account succeeds.
- [ ] User cancellation returns safely to Litterbugs.
- [ ] Permission denial produces a useful error.
- [ ] Matching an existing verified email does not create an unintended duplicate identity.
- [ ] Network interruption fails safely and allows retry.

### Apple

- [ ] Deferred Google/Facebook test builds do not display the Apple button.
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
- [ ] User cancellation returns safely to Litterbugs.
- [ ] Permission denial produces a useful error.
- [ ] Matching an existing verified email does not create an unintended duplicate identity.
- [ ] Network interruption fails safely and allows retry.

## Callback and lifecycle states

Repeat email verification, recovery, and one browser OAuth callback in each state:

- [ ] App already open.
- [ ] App in the background.
- [ ] App fully closed.
- [ ] Replaying the same callback does not create duplicate work or an extra session.
- [ ] Returning to the foreground resumes token refresh without running it unnecessarily in the background.

## Guest and account behavior

- [ ] Continue as Guest remains available as a quiet action.
- [ ] Guest can use the existing report experience.
- [ ] Guest reports are not presented as transferable to a permanent account.
- [ ] Account sheet shows Guest status and the recovery warning.
- [ ] Account sheet shows provider and email for a permanent account.
- [ ] Sign out opens the Yes/No confirmation.
- [ ] No closes the confirmation and preserves the session.
- [ ] Yes signs out and returns to the existing Welcome to Litterbugs screen.

## UI and regression checks

- [ ] Welcome screen wording, logo, colors, Get Started, and Support Litterbugs remain intact.
- [ ] Authentication layout fits the smallest supported iPhone without clipped actions.
- [ ] Keyboard does not hide the active email or password control.
- [ ] Every asynchronous action has a visible loading/disabled state.
- [ ] Buttons and links have useful accessibility labels and at least a 44-point touch target.
- [ ] Existing map, report creation, report editing, photo, and location behavior still works.
- [ ] No database, RLS, report, or Storage behavior changed.
- [ ] No provider, SMTP, Apple, or Supabase secret appears in Git or application logs.

## Release decision

- [ ] Apple authentication is enabled and its tests pass before submitting a build that includes Google or Facebook login to App Review.
- [ ] All required iOS checks pass with evidence.
- [ ] Any failures are fixed and retested.
- [ ] PR #2 receives partner review.
- [ ] PR #2 is moved from draft to ready only after the live Auth configuration and physical-iPhone tests pass.

Android provider setup and testing are intentionally deferred.
