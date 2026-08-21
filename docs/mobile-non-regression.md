# Mobile non-regression record

The Expo application was moved mechanically from the repository root to
`apps/mobile`. No mobile feature, screen, callback, map provider, data query, or
runtime flow was redesigned as part of the move.

## Configuration comparison

`npx expo config --json` was captured before and after the move and compared for
the complete iOS, Android, plugin, scheme, owner, version, EAS, update, and
runtime configuration surfaces. The comparison returned
`MOBILE_CONFIG_MATCH`.

Locked values include:

- Expo slug: `litterbugs-partner`
- URL scheme: `litterbugs`
- Owner: `litterbugs-community-cleanup`
- QA iOS bundle: `com.gegibson.litterbugs.qa`
- QA Android package: `com.litterbugs.app.qa`
- EAS project: `df0d0855-71d9-4943-b278-d1f083ab6b06`
- React: `19.1.0`
- React Native: `0.81.5`
- Expo: `~54.0.37`

Expo Doctor passes all 18 checks after the move. The existing Google Sign-In
patch continues to apply from the repository root. The shared test suite also
locks the application identity, EAS project, deep-link scheme, plugins, all
build-profile environment mappings, and critical mobile runtime versions.

The repository root exposes the preserved profiles without duplicating or
changing their configuration:

```sh
npm run mobile:build:android:qa
npm run mobile:build:ios:qa
npm run mobile:build:ios:simulator
npm run mobile:build:ios:primary
npm run mobile:build:android:production
npm run mobile:build:ios:production
```

Production build commands are release tooling only; their presence does not
authorize a production mobile build or App Store submission. The website has a
separate acceptance and cutover gate.

## QA artifacts

The fresh Android `preview` build completed successfully from the moved
workspace on August 21, 2026:

- EAS build: `2f110d70-f1bf-441e-9702-c79eef83dfc6`
- Package: `com.litterbugs.app.qa`
- Distribution: internal APK
- Source workspace: `apps/mobile`
- Source fingerprint: `8b3cf6ca132964f133f82eba666e5b56747bd9ef`

Artifact inspection confirms package `com.litterbugs.app.qa`, version `1.0.0`,
the `litterbugs` deep-link scheme, location/camera permissions, and Google Maps
metadata are present in the compiled manifest. The EAS signing certificate was
added as a second allowed `com.litterbugs.app.qa` identity on the existing
restricted QA Maps key; the original QA signing identity remains allowed and
the production key was not changed.

The final Android acceptance candidate was then rebuilt locally from the
reviewed source and installed on the API 36 emulator:

- Artifact: `/tmp/litterbugs-android-qa-release-candidate-20260821.apk`
- SHA-256: `2ff1942dd8a800c898840757d3bb562c12ab43e0f4e6bb55f09d271d92a808ab`
- Package: `com.litterbugs.app.qa`
- Version: `1.0.0`
- Minimum SDK: 24
- Target SDK: 36

The artifact is an ephemeral local QA output and is not committed to Git or
authorized for Google Play publication.

A fresh physical-device iOS preview build still requires an internal
distribution provisioning profile for the registered QA device. A read-only
EAS audit on August 21, 2026 found that the project can currently select only
James Luke Barber's Apple team `DB39U76V6Q`; that team has one registered
iPhone, but no physical iOS device is connected to this Mac. Grant's receiving
Apple team is not yet available to EAS. The build was
not launched with substituted credentials, and no iOS identifiers, build
profiles, native settings, or App Store records were changed.

The product owner explicitly selected the fresh iPhone simulator and Android
emulator as the mobile non-regression evidence for the website replacement and
asked that the runtimes be used one at a time to manage memory. Physical-device
iOS testing is therefore a later mobile-release follow-up, not a gate for
building or launching the website.

A credential-free fresh iOS simulator build completed successfully from the
unchanged `development-simulator` profile on August 21, 2026:

- EAS build: `6077a484-5166-48f3-a5f1-2e404c6acab9`
- Bundle: `com.gegibson.litterbugs.qa`
- Version: `1.0.0`
- Source fingerprint: `3221e19b300e539e5c6ef991dcadc8a3bb72aafa`

The extracted app contains the expected Google callback and Litterbugs URL
schemes, unchanged location wording, and no Sign in with Apple plugin or
capability. An earlier simulator artifact,
`9883050a-36a7-4c33-ae29-bb5cba4a1ee5`, was rejected as evidence because it
did not represent the locked current source and displayed an Apple button that
does not exist in the current app.

## Simulator visual evidence

The installed pre-move build and the fresh moved-workspace build were exercised
on the same iPhone 17 Pro / iOS 26.5 simulator at 1206 x 2622. The current build
was connected to its own Metro bundle after removing a second installed app
that claimed the same development URL.

- `docs/evidence/mobile/before-welcome.png`
- `docs/evidence/mobile/after-welcome.png`
- `docs/evidence/mobile/before-map.png`
- `docs/evidence/mobile/after-map.png`
- `docs/evidence/mobile/before-report-wizard.png`
- `docs/evidence/mobile/after-report-wizard.png`

The welcome/sign-in and first report-wizard screens match apart from the system
clock. The map retains Apple Maps, current location, markers, account control,
and map-type control. Google, Facebook, email, and Guest remain the only mobile
sign-in choices; Apple is intentionally absent. Guest creation, its warning,
location permission, map loading, and opening the same six-step report wizard
were verified. No report was submitted, and the exact disposable anonymous QA
identity was removed afterward with zero report/profile fixtures.

## Android emulator visual and integration evidence

The installed pre-move QA build and the fresh EAS APK were exercised on the
same API 36 emulator. The baseline APK was preserved before installation
because it used a different signing certificate. Package, version, target SDK,
deep-link scheme, Maps metadata, and current EAS signing identity were inspected
directly from the fresh APK.

- `docs/evidence/mobile/android-before-onboarding.png`
- `docs/evidence/mobile/android-after-onboarding.png`
- `docs/evidence/mobile/android-before-sign-in.png`
- `docs/evidence/mobile/android-after-sign-in.png`
- `docs/evidence/mobile/android-before-map.png`
- `docs/evidence/mobile/android-after-map.png`
- `docs/evidence/mobile/android-before-report-wizard.png`
- `docs/evidence/mobile/android-after-report-wizard.png`

The onboarding, sign-in, and first report-wizard screens match apart from the
system clock. Google, Facebook, email, and Guest remain the only Android sign-in
choices; Apple is intentionally absent.

Cross-client testing used the real beta website, current hosted Supabase
project, and the unchanged Android app. Two web-created reports appeared on
Android's next normal load. An Android Guest-created report appeared on the
website's next normal load, an owner edit propagated to the website, and the
mobile owner delete removed it from both clients. Evidence includes:

- `docs/evidence/mobile/cross-client-web-to-android-detail.png`
- `docs/evidence/mobile/cross-client-android-created.png`
- `docs/evidence/mobile/cross-client-android-to-web-detail.png`

Every disposable report, confirmed web user, anonymous mobile user, and Storage
object from that test was removed and independently verified at zero remaining
rows or objects.

After the backend hardening and cleanup migrations were applied, the current
builds were smoke-tested again one runtime at a time. The iPhone 17 Pro / iOS
26.5 simulator completed Guest entry, loaded Apple Maps with live markers, and
opened a shared report detail. No iOS source path, configuration, provider,
appearance, callback, or behavior was changed.

The owner-requested final Android acceptance pass exposed two Android rendering
defects in the pinned Expo SDK 54 stack: a successfully uploaded JPEG rendered
blank in the report detail, and custom map markers were clipped or invisible.
The corrections are deliberately Android-only compatibility changes:

- `expo-image` renders Android report photos from the same existing signed URL;
  iOS retains the original React Native image renderer.
- The pinned `react-native-maps` `1.20.1` dependency keeps its version and uses
  the upstream Android bitmap-sizing correction from
  [react-native-maps PR #5913](https://github.com/react-native-maps/react-native-maps/pull/5913).
- Android tracks each marker view for one second after marker data loads so the
  corrected bitmap is captured, then disables tracking to avoid ongoing map
  rendering cost. iOS retains its original marker path.

These corrections do not add a feature, screen, field, permission, provider,
callback, query, or backend change. They make the existing Android photo and
marker behavior render as intended.

The final candidate passed a real Android lifecycle test: Guest creation,
Google Maps, a complete six-step report, system photo picker, JPEG upload,
signed detail-photo display, force-stop/cold-restart photo display, full custom
marker display and selection, owner edit, owner report deletion, asynchronous
Storage-object cleanup, and confirmed account deletion. Read-only backend
verification found zero remaining reports, photo objects, or disposable Auth
identities after cleanup.

The later full-project reconciliation found four unrelated anonymous QA
identities left by older acceptance runs. Those exact identities, their five
reports, and three matching photo objects were removed. The final hosted query
confirmed zero remaining target users, identities, sessions, profiles,
reports, Storage objects, or `QA`/`test`-titled reports.

Final Android evidence:

- `docs/evidence/mobile/android-final-marker.png`
- `docs/evidence/mobile/android-final-report-photo.png`
- `docs/evidence/mobile/android-final-report-photo-cold-restart.png`
- `docs/evidence/mobile/android-final-delete-confirm.png`
- `docs/evidence/mobile/android-final-account-deleted.png`

## Optional later physical-device mobile-release follow-up

The matching simulator screenshots satisfy the moved-workspace visual
comparison and the owner-approved website replacement gate. When the Apple team
transfer and provisioning are later available, build a freshly provisioned
physical-device iOS preview and run the remaining device-only checks, including
camera/photo selection and provider callbacks. This checklist is deliberately
preserved for a future mobile release and does not block the website cutover.

Run this checklist only against a fresh artifact built from the moved workspace.
Do not substitute the older physical IPA or change a bundle identifier, plugin,
provider, map implementation, or build environment to make the test possible.

### Artifact and appearance

- [ ] Record the EAS build ID, source fingerprint, bundle identifier, profile,
      device model, iOS version, and test date.
- [ ] Confirm the bundle identifier, `litterbugs` scheme, EAS project ID,
      permissions, plugins, Google callback scheme, and Apple Maps provider
      match the locked configuration.
- [ ] Compare Welcome, sign-in, map, report-wizard, detail, and account surfaces
      with the preserved before screenshots; reject unexplained differences.
- [ ] Confirm Google, Facebook, email, and Guest remain the only sign-in choices
      and Apple remains absent.

### Authentication and session behavior

- [ ] Create a disposable Guest, confirm the non-transfer warning, cold relaunch,
      and verify the Guest session survives.
- [ ] Complete email signup/verification, sign-in, incorrect-password handling,
      recovery callback, password reset, cold relaunch, and confirmed sign-out.
- [ ] Complete Google sign-in, cancellation, callback, cold relaunch, and
      confirmed sign-out without Supabase host or raw metadata appearing.
- [ ] Complete Facebook sign-in, cancellation, callback, cold relaunch, and
      confirmed sign-out without Supabase host or raw metadata appearing.

### Map and reports

- [ ] Test location permission allowed, denied, and unavailable states while
      preserving Apple Maps, current-location, marker, and map-type behavior.
- [ ] Open an existing report and verify photos, litter types, severity, notes,
      reported date, expiration date, and exact-coordinate marker behavior.
- [ ] Create a report through the unchanged six steps using camera/photo
      selection, all current field limits, and a location within ten miles.
- [ ] Verify the existing outside-ten-mile rejection without submitting a row.
- [ ] Confirm the created report appears on beta's next normal load, then edit it
      on mobile and confirm the edit appears on beta.
- [ ] Delete the report on mobile and confirm it disappears from both clients
      without changing the mobile-facing delete result.

### Account and cleanup

- [ ] Verify account status, the existing Yes/No sign-out confirmation, and
      return-to-Welcome behavior.
- [ ] Complete confirmed account deletion and verify the Auth identity and
      Storage folder are removed while reports retain the current anonymized
      community fields.
- [ ] Remove every disposable identity, report, and photo fixture and verify
      zero exact-test fixtures remain before approving the gate.
