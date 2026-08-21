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

The current EAS internal-preview QA certificate SHA-1 is:

`57:4F:3D:D6:42:74:C8:C7:C0:1F:C1:12:5D:B4:85:10:71:4D:B6:68`

Both QA fingerprints are allowed only for `com.litterbugs.app.qa` on the
existing QA Maps key. The EAS fingerprint was added and verified against build
`2f110d70-f1bf-441e-9702-c79eef83dfc6` on August 21, 2026; the production Maps
key and production package restrictions were not changed.

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
npm run mobile:doctor
cd apps/mobile
npx eas-cli build --platform android --profile preview --local \
  --non-interactive --output ../../artifacts/litterbugs-qa.apk
```

Before judging the UI on a device, uninstall the stale APK and verify that the
installed package is `com.litterbugs.app.qa`. A black Google mark indicates an
old artifact; the current source uses the official multicolor Google asset.

## Final Android QA verification

The final local acceptance candidate built and installed successfully on the
API 36 emulator on August 21, 2026:

- Artifact: `/tmp/litterbugs-android-qa-release-candidate-20260821.apk`
- SHA-256: `2ff1942dd8a800c898840757d3bb562c12ab43e0f4e6bb55f09d271d92a808ab`
- Package/version: `com.litterbugs.app.qa` / `1.0.0`
- SDK range: minimum 24, target 36

The final pass used Android's real system photo picker and the live correct
Supabase project. It verified a valid JPEG upload, signed photo rendering in
report detail, persistence after a force-stop and cold restart, full custom
marker rendering and selection, report edit, report delete, Storage cleanup,
and confirmed Guest-account deletion. Exact cleanup checks found no remaining
QA report, photo object, or Auth identity.

Two Android-only rendering corrections were required by the pinned native
stack. Android report details use the Expo-compatible `expo-image` renderer for
the existing signed URLs. The pinned `react-native-maps` `1.20.1` dependency
uses the Android bitmap-sizing change from
[upstream PR #5913](https://github.com/react-native-maps/react-native-maps/pull/5913),
plus a one-second marker-tracking warm-up. Neither correction changes iOS,
authentication, the report flow, the database contract, the map provider, or
product functionality.

The QA APK is an ephemeral test artifact. This verification does not authorize
a production build, Play Console upload, or publication.

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
