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
  existing com.litterbugs.app. The user says to assume Luke will not assist. Do not rely on a new invitation
  from him, replace the bundle ID, or initiate a transfer implicitly.
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
Connected sign-in settings and duplicate handling are implemented below. A successful fresh-provider link and any existing-account migration remain unverified.

Primary research:
- https://supabase.com/docs/guides/auth/auth-identity-linking
- https://auth0.com/docs/manage-users/user-accounts/user-account-linking
- https://firebase.google.com/docs/auth/web/account-linking
- https://supabase.com/docs/guides/auth/social-login/auth-apple
- https://docs.expo.dev/versions/v54.0.0/sdk/apple-authentication/

## Ownership constraint — no dependence on Luke

User explicitly instructs us to assume Luke will not help. Continue native
implementation and testing under Grant's existing team. Inventory existing
production signing access/credentials available to Grant before declaring the
old listing maintainable. Apple requires the transferring Account Holder to
initiate its normal app transfer; App Store Connect access alone is insufficient.
If current access cannot maintain the existing listing, prepare an Apple Support
ownership-resolution request and a separate-app fallback for review. Do not send
messages, assert legal ownership, publish a replacement, or promise existing
users can update to a different bundle identity. Any fallback must explain user
migration, listing/review continuity, Apple identities, and notification changes.

Source: https://developer.apple.com/help/app-store-connect/transfer-an-app/initiate-an-app-transfer

## Connected sign-in implementation checkpoint

Added Settings → Sign-in methods. Existing providers are shown as Connected;
Google and Facebook can be attached through authenticated provider flows, and
Apple uses the gated native control. A successful link must retain the original
user ID and return the selected provider in the refreshed identity list.
Cancellation is quiet. Already-used identities explain that the accounts remain
separate and offer the existing support route; no automatic data migration or
account deletion is implemented.

Enabled `security_manual_linking_enabled` in the existing Supabase project with
a single-field configuration update (HTTP 200); a fresh read confirmed true.
At that checkpoint Apple was disabled; the native Apple setup below supersedes that state. No provider secret was changed. Focused validation now
passes 14 tests across credential exchange, account invariants and provider
presence. Source validation passed at 154 modules before the final provider
presence guard; native visual/provider conflict validation is pending.

Local signing inventory: only Grant's Apple Development identity is available.
The existing QA provisioning profile for `com.gegibson.litterbugs.qa`, team
RLXNU225W4, includes `aps-environment=development` and Apple sign-in `Default`,
and expires August 30, 2027. This enables an independent QA path under Grant's
team; it does not grant production signing for Luke's existing App Store app.

### Physical Pixel verification

Built and installed QA version-code 12 without clearing app data. Inspected
Settings → Sign-in methods on the phone: Email and Facebook connected, Google
available to connect. Selected the already-used grant@burrowbase.com Google
identity from the iCloud-email account. Supabase rejected the conflict; no
identity or data was moved.

The first device run exposed duplicate error handling: the screen displayed a
generic error and the global callback listener then displayed an expired-link
message. Fixed active browser callback ownership and retained provider error
codes. Rebuilt and reinstalled; the same conflict now produces one clear
already-used-account message and returns to the unchanged provider list after
OK. A fresh successful new-provider link remains unverified.

Reserved provider-list space during loading. On the final Pixel build, the
account-help paragraph remained at y=1400 and its button at y=1566 in both
loading and loaded states. Initial screen screenshot was inspected for readable
spacing and hierarchy. Focused tests: 16 pass in four files; source check: 154
modules, zero errors. No broad completed regression suites were repeated.

Prepared `docs/apple-account-support-draft.md` for a possible Apple inquiry;
it has not been sent. No Apple transfer, store publication, account merge,
financial transaction, or social post occurred.

## Native iPhone and independent notification setup — 17:58 checkpoint

The Release build succeeded and was installed on the physical iPhone 6s without
clearing app data. Bundle `com.gegibson.litterbugs.qa` is signed by Grant team
`RLXNU225W4`. The Apple-enabled sign-in page displays all three provider buttons
at 52 points high, with 11-point gaps. Continue with Apple opens the native
Apple ID consent sheet. It uses the Apple ID already on the phone (Sarah's),
and requires the account holder's Touch ID. No Apple account was created or
linked by the agent. The account holder has been asked to complete the prompt.
Facebook remains pending its password step; the unfinished Facebook sheet was
cancelled before installing this build.

A fresh Supabase management read confirms Apple enabled, with audiences
`com.litterbugs.app,com.gegibson.litterbugs.qa`, and manual linking enabled.
The production audience is preserved. Native token exchange still requires
completion on the phone; opening the Apple consent sheet does not prove login.

Created APNs key `DM8K47R2TZ`, Litterbugs Notifications, under Grant's team.
It is **Sandbox, Topic Specific, com.gegibson.litterbugs.qa only**. Its private
file is stored outside the repository with owner-only permissions. EAS confirmed
assignment to `@litterbugs-community-cleanup/litterbugs-partner` /
`com.gegibson.litterbugs.qa`. Luke's existing key was neither selected nor changed.
This key supports the currently development-signed device build. It does **not**
cover production/Ad Hoc APNs: a production-scoped credential must be configured
for a later distribution build. End-to-end delivery and notification-tap routing
are pending authenticated registration on the iPhone. No push was sent at this
checkpoint, and no store or Meta publication occurred.

Build log: `/tmp/lb-apple-login-iphone-build.log` (`BUILD SUCCEEDED`).
Install log: `/tmp/lb-apple-iphone-install.log` (100% Installed package).
No simulator is booted; memory pressure reports 65% free. Build and credential
CLI processes have completed; no repeated regression suites were run.
