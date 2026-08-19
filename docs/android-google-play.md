# Android Google Play Release

This project uses the same repository, Expo project, Supabase project, and app
code for iOS and Android. Android does not have a separate repository.

## App identities

| Use | App name | Android package |
| --- | --- | --- |
| Development and internal preview | Litterbugs QA | `com.litterbugs.app.qa` |
| Google Play production | Litterbugs | `com.litterbugs.app` |

The production Play app must be created only after Grant and Luke choose the
Play developer account that will permanently own it. Do not reuse or modify the
retired prototype package, credentials, or Maps configuration.

## Google Maps

Android uses the existing `react-native-maps` implementation with Google Maps.
The API key is native build configuration, not application source code.

Create two keys in the Litterbugs-owned `litterbugs-auth` Google Cloud project:

- QA: restrict to Maps SDK for Android, package `com.litterbugs.app.qa`, and the
  QA signing SHA-1.
- Production: restrict to Maps SDK for Android, package `com.litterbugs.app`,
  and the production signing SHA-1. Add the Play App Signing SHA-1 after the
  first AAB is uploaded.

Store both keys as sensitive EAS environment variables named
`GOOGLE_MAPS_ANDROID_API_KEY`: QA in `development` and `preview`, production in
`production`. Never put a key value in Git. Keep billing and budget alerts on,
and do not enable Places, Street View, or unrelated APIs for this release.

The current local QA certificate SHA-1 is:

`5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`

The current production upload certificate SHA-1 is:

`79:E6:D2:50:03:74:57:40:DE:02:EB:F9:8F:3A:20:1D:58:85:73:4C`

## Authentication

Android keeps the existing Supabase browser OAuth flow for Google and Facebook.
Email login, signup, verification, recovery, Guest, account status, and the
Yes/No sign-out confirmation are shared with iOS. Apple Sign-In remains a
separate deferred change.

The shared Account sheet also exposes Delete account. Deletion removes the Auth
user, sessions, profile, and uploaded photos. Reports remain only as anonymous
community data: location, category, severity, status, and date are retained;
ownership, photo paths, and potentially identifying free text are cleared.

External deletion and privacy pages are intentionally small service pages, not
a Litterbugs website:

- `https://auth.litterbugs.app/delete-account`
- `https://auth.litterbugs.app/privacy`

## Local verification

Use Java 17 and the installed Android SDK. Keep only one emulator and one Metro
server running at a time. An EAS local build loads the selected remote
environment but compiles on the Mac, so it does not consume a cloud-build
credit.

```sh
npx expo-doctor
npx eas-cli build --platform android --profile preview --local \
  --non-interactive --output artifacts/litterbugs-qa.apk
```

Before judging the UI on a device, uninstall the stale APK and verify that the
installed package is `com.litterbugs.app.qa`. A black Google mark indicates an
old artifact; the current source uses the official multicolor Google asset.

## Production release gates

1. Choose the permanent Play Console owner.
2. Create `Litterbugs: Community Cleanup` with `com.litterbugs.app`.
3. Build and inspect a signed production AAB.
4. Upload it manually and enable Play App Signing.
5. Add Play's signing SHA-1 to the production Maps key.
6. Verify the internal-track installation, Maps, authentication, deletion, and
   disclosures.
7. Complete Privacy Policy, Data Safety, location/photo disclosures, content
   rating, screenshots, deletion URL, and any required closed testing.

Do not merge this branch or publish to Google Play without explicit approval.

The verified local production candidate is
`artifacts/litterbugs-production-v1.0.0-3.aab`. The directory is Git-ignored;
the bundle must never be committed to the repository.
