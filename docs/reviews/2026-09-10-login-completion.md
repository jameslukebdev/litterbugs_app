# Login and release completion — September 10

Scope: iPhone Facebook login, separate tester, account consistency, native Apple
sign-in, APNs, final privacy disclosures, and Meta review. Keep unpublished and
push completed work to main. This work is in progress.

## Verified and pending

- Pixel Facebook administrator login passed; see Meta release preparation.
- Physical iPhone 6s, iOS 15.8.2, current QA app: opened Facebook successfully,
  accepted the iOS authentication prompt, selected Grant E Gibson, and reached
  Facebook's password field. Account-holder sign-in is pending. The existing
  phone-control service is usable; no simulator was started.
- A separate tester account has been requested; none has been supplied yet.
- Production Apple signing remains tied to Luke's team DB39U76V6Q and the
  existing com.litterbugs.app. Requested access to Certificates, Identifiers &
  Profiles. Do not replace the bundle ID or transfer the app implicitly.
- APNs delivery and final store disclosures remain incomplete.

## Apple sign-in implementation checkpoint

Added Expo SDK 54-compatible Apple Authentication, native token exchange with
hashed request nonce/raw exchange nonce, cancellation handling, and first-consent
name preservation. iOS-only native Apple button uses the existing sign-in layout.
`EXPO_PUBLIC_APPLE_SIGN_IN_ENABLED=true` enables the button and iOS capability;
it remains off until provider and signing configuration are ready. No EAS profile
has been enabled yet. Native build, enabled-button visual inspection, real Apple
login, and authenticated backend verification remain required.

Validation: seven credential-flow tests and existing provider test pass; mobile
source check passes (152 modules). These do not establish device Apple login.

Design lock: preserve Litterbugs' existing layout, 52-point provider controls,
14-point corners, 11-point vertical gaps and plain user-facing copy. Use Apple's
native Continue button rather than drawing an Apple logo. Refero Sign in / imgs.so
style b7df8424-4714-4bb8-a4e1-48760f76d909 supports restrained contrast and flat
surfaces; its web typography, beta badge and compact controls are not imported.
Native control and availability requirements follow Expo's Apple documentation.

## Account consistency decision (user authorized recommendation)

Recommended product behavior: one account with multiple explicitly connected
sign-in methods. In account settings, authenticate the current account and the
additional provider before linking. Keep one stable user ID, reports, points,
notification settings and financial history. Never infer identity from a name or
avatar, and do not manually merge accounts merely because emails look related.
Use Supabase's existing verified-email linking rules; offer authenticated manual
linking for different-email providers. Explain provider-already-used conflicts
without deleting either account or moving financial records automatically.

The current Facebook iCloud-email and Google Burrow Base-email logins already
belong to separate accounts. Supabase linkIdentity rejects a provider attached
to another account, so linking new sign-in methods is not an existing-account
merge. A duplicate-account migration needs ownership proof for both accounts,
relationship/financial inventory and reconciliation, with no silent deletion or
loss of history. No accounts have been linked or merged in this checkpoint.
Implementation of connected sign-in settings and duplicate handling is pending.

Primary research:
- https://supabase.com/docs/guides/auth/auth-identity-linking
- https://auth0.com/docs/manage-users/user-accounts/user-account-linking
- https://firebase.google.com/docs/auth/web/account-linking
- https://supabase.com/docs/guides/auth/social-login/auth-apple
- https://docs.expo.dev/versions/v54.0.0/sdk/apple-authentication/
