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
- EAS project: `@gegibson/litterbugs-partner`

Apple's public App Store lookup was rechecked on 2026-08-17 and reports
`com.litterbugs.app` for App Store ID `6757313862` (seller James Luke Barber).
The production Google client must use that exact pair.

`APP_VARIANT=qa` plus `IOS_BUNDLE_IDENTIFIER` selects the isolated QA identity.
Production profiles set `APP_VARIANT=production` and always use the production
bundle ID from `app.json`, even if a developer's local `.env` contains QA values.

## Local and build environment

Copy `.env.example` to `.env` and supply the Litterbugs-specific values. Never
commit `.env` or place provider secrets in source code.

| Variable | Purpose |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Correct Litterbugs Supabase URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Public Supabase client key |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google web client configured in Supabase |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Google iOS client for the build's bundle ID |
| `GOOGLE_IOS_CLIENT_BUNDLE_ID` | Bundle ID that owns the selected Google iOS client |
| `APP_VARIANT` | `qa` for local/internal builds or `production` for release builds |
| `IOS_BUNDLE_IDENTIFIER` | Optional local-QA override only |

The tracked Expo config adds only the native Google plugin when its required
build values are present. Facebook uses the secure system browser and does not
add a Meta SDK, client token, or native Meta build configuration. A development
build is required for the native Google provider; Expo Go cannot load it.

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
the Apple consent prompt branded as Litterbugs without proxying credentials or
tokens. The bridge is not an authentication provider and stores no user data.

The Meta app is managed by the isolated `Litterbugs Community Cleanup` business
portfolio, ID `863596096684215`. Grant E Gibson has active full access. Complete
Meta business verification and any required provider review before public
release. Do not move the app to an unrelated portfolio.

While the Meta app is unpublished, real test accounts must have the Tester or
consumer-tester role and accept the invitation before signing in. Meta simulated
test-user creation is currently unavailable, so first-time Facebook-user testing
requires a separate tester account that has not authorized Litterbugs.

## Apple

Apple sign-in is not implemented on this branch. Apple code and native packages
are intentionally absent while the partner's Apple Developer team setup is
deferred. Do not create or transfer a replacement production App ID.

Before submitting an App Store build that contains third-party social login,
enable Sign in with Apple on the existing production App ID
`com.litterbugs.app`, implement it as a separate reviewed change, and test new,
returning, cancelled, background, and cold-start sign-in paths.

## Build and run

After installing or changing a native package, regenerate the ignored native
project and rebuild the development client:

```sh
npx expo prebuild --platform ios
npx pod-install ios
```

Run one Metro server at a time:

```sh
npx expo start --dev-client --clear
```

Use `--tunnel` only when the test device cannot reach the computer over the local
network. Rebuild only after native dependencies or native configuration change.

No authentication change is ready for merge until the current checklist in
`docs/auth-test-checklist.md` passes and the partner approves the branch.
