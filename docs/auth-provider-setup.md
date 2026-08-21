# Authentication Provider Setup

This branch belongs only to the Partner Litterbugs app and Supabase project
`mvaygkflcjswtwchflrk`. Use only the provider records, credentials, identifiers,
and build project documented here.

## App identity

- App name: `Litterbugs`
- Production iOS bundle ID: `com.litterbugs.app`
- Production Android package: `com.litterbugs.app`
- Existing App Store ID: `6757313862`
- App scheme: `litterbugs`
- EAS project: `@litterbugs-community-cleanup/litterbugs-partner`

Apple's public App Store lookup was rechecked on 2026-08-17 and reports
`com.litterbugs.app` for App Store ID `6757313862` (seller James Luke Barber).
The production Google client must use that exact pair.

`APP_VARIANT=qa` plus `IOS_BUNDLE_IDENTIFIER` selects the isolated QA identity.
Production profiles set `APP_VARIANT=production` and always use the production
bundle ID from `apps/mobile/app.json`, even if a developer's local environment
contains QA values.

## Local and build environment

Copy `apps/mobile/.env.example` to `apps/mobile/.env` and supply the
Litterbugs-specific values. Never commit environment files or place provider
secrets in source code.

| Variable | Purpose |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Correct Litterbugs Supabase URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Public Supabase client key |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google web client configured in Supabase |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Google iOS client for the build's bundle ID |
| `GOOGLE_IOS_CLIENT_BUNDLE_ID` | Bundle ID that owns the selected Google iOS client |
| `GOOGLE_MAPS_ANDROID_API_KEY` | Restricted native Maps SDK for Android key |
| `APP_VARIANT` | `qa` for local/internal builds or `production` for release builds |
| `IOS_BUNDLE_IDENTIFIER` | Optional local-QA override only |
| `ANDROID_PACKAGE_IDENTIFIER` | `com.litterbugs.app.qa` for QA or `com.litterbugs.app` for production |

The tracked Expo config adds only the native Google plugin when its required
build values are present. Facebook uses the secure system browser and does not
add a Meta SDK, client token, or native Meta build configuration. A development
build is required for the native Google provider; Expo Go cannot load it.

On Android, both Google and Facebook keep the existing secure browser OAuth
flow. Android builds do not require iOS OAuth values. They do require the exact
Android package marker and a restricted Maps SDK for Android key. See
`docs/android-google-play.md` for the two-environment Maps configuration.

EAS profiles are pinned to their matching remote environment. On the EAS build
worker, configuration fails if an auth value is missing or the Google iOS
client's recorded bundle ID does not match the app bundle ID. The worker-only
check is intentional because EAS first evaluates dynamic config before loading
the selected remote environment. This prevents a QA client from being packaged
into a production app without breaking normal EAS config inspection.

## Supabase

Keep these routes under Authentication → URL Configuration:

- `litterbugs://auth/callback`
- `litterbugs://auth/reset-password`
- `https://litterbugs.app/auth/callback`
- `https://litterbugs.app/auth/reset-password`

Email confirmation must remain enabled. Verification and recovery messages use
the monitored sender `support@litterbugs.app` and contain one clear action.
SMTP credentials remain only in Supabase.

Google and Facebook must remain enabled in this exact project. Their web OAuth
callback is:

`https://mvaygkflcjswtwchflrk.supabase.co/auth/v1/callback`

The iOS app uses the native Google SDK and sends its token to
`supabase.auth.signInWithIdToken`. Facebook uses Supabase browser OAuth and
returns to `litterbugs://auth/callback`. The provider callback above remains in
the Google and Meta consoles, while the app-facing handoff uses the Litterbugs
scheme.

## Google

- Google Cloud project: `litterbugs-auth`
- Project number: `895118598665`
- Supabase web client: `Litterbugs Supabase Web Client`

The web client ID and secret belong in the Google console and Supabase provider
settings. Each native bundle ID requires its own iOS OAuth client. The iOS client
ID is public configuration, but it is supplied through the build environment so
QA and production identities cannot be confused.

Google has separate native clients for the isolated QA identity and the live
App Store identity. The production client `Litterbugs Production iOS` was
created on 2026-08-18 for `com.litterbugs.app` and App Store ID `6757313862`.
Its public client ID and matching bundle marker are stored in the EAS
`production` environment. Do not rename or repurpose the QA client.

Google branding must continue to show the Litterbugs name and logo. Keep scopes
limited to OpenID, email, and profile.

Supabase verifies a one-time nonce on native Google ID tokens. The free React
Native Google wrapper does not expose the nonce argument that is available in
GoogleSignIn iOS 9+, so the tracked `patch-package` patch exposes only that
upstream SDK parameter. The app sends a SHA-256 nonce to Google and the original
nonce to `signInWithIdToken`, as required by Supabase. Keep this patch applied by
the `postinstall` script until the wrapper exposes the same parameter upstream.

## Facebook

- Meta app: `Litterbugs Community Cleanup`
- App ID: `1477683410862512`

The Meta iOS platform supports multiple bundle IDs. Keep both the isolated QA
bundle and the production bundle on that platform, and keep permissions limited
to `public_profile` and `email`. The App Secret stays only in Meta and Supabase;
no Meta client token is packaged in the app.

As of 2026-08-18, the Meta iOS platform contains both
`com.gegibson.litterbugs.qa` and `com.litterbugs.app`, with App Store ID
`6757313862` recorded for the production app.

Facebook sign-in uses Supabase's browser OAuth flow. The app first opens the
Litterbugs-owned `https://auth.litterbugs.app/start` bridge, which validates the
exact Supabase authorization target and then hands off to Facebook. This keeps
the iOS browser consent prompt branded as Litterbugs without proxying
credentials or tokens. The bridge is not an authentication provider and stores
no user data.

The Meta app is managed by the isolated `Litterbugs Community Cleanup` business
portfolio, ID `863596096684215`. Grant E Gibson has active full access. Complete
Meta business verification and any required provider review before public
release. Do not move the app to an unrelated portfolio.

While the Meta app is unpublished, real test accounts must have the Tester or
consumer-tester role and accept the invitation before signing in. Meta simulated
test-user creation is currently unavailable, so first-time Facebook-user testing
requires a separate tester account that has not authorized Litterbugs.

## Account deletion

The Account sheet invokes the authenticated `delete-account` Edge Function.
The public request and privacy pages live under `auth.litterbugs.app`; they are
small compliance helpers and do not require a separate Litterbugs website. The
Supabase service-role credential remains available only inside the Edge
Function runtime.

## Apple

Apple sign-in is not currently present in the mobile app and is not exposed on
the website. Do not add it to either client as part of the monorepo move.

The production App Store record and App ID currently belong to James Luke
Barber's Apple team `DB39U76V6Q`. Grant Gibson's receiving Apple team is
`RLXNU225W4`. Transfer the existing App Store app; do not register a second
`com.litterbugs.app` identifier. Apple transfers the associated App ID when the
App Store transfer is accepted, preserving the bundle ID and App Store record.

Do not create the web Service ID on the receiving team before the production
App ID arrives. After transfer acceptance, enable or verify Sign in with Apple
on the transferred App ID, make it the primary identifier, and associate the
new web Service ID with it. Use `litterbugs.app` as the web domain and the
correct project's callback:

`https://mvaygkflcjswtwchflrk.supabase.co/auth/v1/callback`

A read-only audit on 2026-08-21 found zero `apple` rows in
`mvaygkflcjswtwchflrk.auth.identities`. Recheck immediately before the App
Store transfer. If it remains zero, there are no existing Supabase Apple users
to migrate between Apple teams. If any Apple identity exists at that point,
stop and complete Apple's Sign in with Apple transfer-identifier procedure
within its transfer window before enabling the receiving-team configuration.

Current web verification: Google and Facebook return provider redirects from
project `mvaygkflcjswtwchflrk`. Apple web OAuth is intentionally not presented
because its Service ID and OAuth secret do not exist yet. Configure and test the
new Service ID and rotating OAuth secret before adding the provider to either
client.

For the later Apple-auth project, enable Sign in with Apple on the transferred
production App ID `com.litterbugs.app`; do not create a replacement production
App ID. Supabase will then need the appropriate native and separate web Service
ID client identifiers. Test the mobile change separately under the user's
explicit authorization.

## Build and run

The shared primary development client uses the production app identity and EAS
environment while remaining an internal development build:

```sh
npx eas-cli@latest build --platform ios --profile development-primary
```

This profile builds `com.litterbugs.app` from the shared Expo organization. A
developer must belong to that Expo organization to start the build. Installing
an ad hoc iOS build also requires the test phone to be registered in the Apple
team and included in the provisioning profile used by EAS.

Because this development client uses the production bundle identifier and EAS
environment, it connects to live production services and test actions may
modify production data. Installing it can also replace the App Store version
on the test phone; reinstall the App Store version after development testing if
needed.

After installing or changing a native package, regenerate the ignored native
project and rebuild the development client:

```sh
cd apps/mobile
npx expo prebuild --platform ios
npx pod-install ios
```

Run one Metro server at a time:

```sh
cd apps/mobile
npx expo start --dev-client --clear
```

Use `--tunnel` only when the test device cannot reach the computer over the local
network. Rebuild only after native dependencies or native configuration change.

No authentication change is ready for merge until the current checklist in
`docs/auth-test-checklist.md` passes and the partner approves the branch.
