# Auth Provider Setup

Use only Supabase project `mvaygkflcjswtwchflrk` and newly created provider records for bundle/package ID `com.gegibson.litterbugs`.

## Supabase redirect allow list

Add these exact mobile routes under Authentication → URL Configuration:

- `litterbugs://auth/callback`
- `litterbugs://auth/reset-password`

The current allow list contains the older `litterbugs://auth-callback` route. Keep it only while an older build still needs it; it does not replace the two routes above.

## Email

Under Authentication → Providers → Email, require email confirmation. Configure custom SMTP separately so verification and recovery messages come from `support@litterbugs.app`. Keep SMTP credentials only in Supabase.

## Google and Facebook

Create new provider applications. Each provider's OAuth callback is:

`https://mvaygkflcjswtwchflrk.supabase.co/auth/v1/callback`

Copy the new provider IDs and secrets into the matching Supabase Auth provider. Do not place them in `.env`, `app.json`, or source files.

## Apple

Create a new Apple App ID for `com.gegibson.litterbugs` with Sign in with Apple enabled. Native iOS login uses that App ID. For browser-based Apple login on Android, create a separate Services ID and signing key for this app, then configure the Apple provider in Supabase. Apple's browser OAuth secret must be rotated before it expires.

## EAS development client

This repository is linked to the isolated EAS project `@gegibson/litterbugs-partner` (`df0d0855-71d9-4943-b278-d1f083ab6b06`). Do not link the retired prototype's EAS project.

The current rollout is iOS-first. Android setup and Android builds are deferred until a later branch or explicit follow-up; do not start Android Studio, Gradle, or an Android emulator for the current work.

Build the iOS development client after the Apple account and signing credentials are ready:

```sh
npx eas-cli build --profile development --platform ios
```

For the local iOS simulator, run exactly one Metro server with:

```sh
npx expo start --dev-client --localhost --clear
```

After each partner installs the development build on a physical iPhone, use a single tunnel server when they are not on the same network:

```sh
npx expo start --dev-client --tunnel --clear
```

Stop the existing Metro process before changing connection modes. Rebuild only after native dependencies or native configuration changes.

Before moving the authentication PR out of draft, complete and record the iOS checks in [auth-test-checklist.md](./auth-test-checklist.md).
