# Current Mobile Release Candidates

These builds contain the mobile fixes from commit `1add2e0`. They were produced
from `a2aec0e131d3ebff9ca6f10e44280fc7e6cb1c1a`, whose additional changes are
limited to website design and documentation. No App Store or Google Play
submission was made.

## Android production-identity internal build

- EAS build: `d47cd626-9889-48cd-9560-bec5aba735fa`
- Status: finished
- Profile/distribution: `production-internal` / internal
- Package/version: `com.litterbugs.app` / `1.0.0` (`8`)
- Minimum/target SDK: 24 / 36
- APK SHA-256:
  `473205396c0f8010c6d90b778c25142e9e6c6eb723b483db28875fe9faaa86c1`
- Packaged permissions were inspected. Location, camera, photos, notifications,
  network, and required platform permissions are present; `RECORD_AUDIO` and
  `SYSTEM_ALERT_WINDOW` are absent.
- API 36 emulator smoke passed: cold launch, welcome, map-first discovery,
  production Google Map rendering, location permissions, reports list, guest
  profile, provider choices, email sign-in, and email account creation.
- No application crash or fatal React Native error occurred.

## iOS signed internal build

- EAS build: `6875bf03-7f8e-4227-9138-123b5f89974c`
- Status: finished
- Profile/distribution: `production-internal` / internal ad hoc
- Bundle/version: `com.litterbugs.app` / `1.0.0` (`6`)
- Minimum iOS version: 15.1
- IPA SHA-256:
  `ab687aa19a16f41b17dab779defcb00c773a072b1fbd8ea338c724fc472c8e51`
- Signing identity: `iPhone Distribution: James Luke Barber (DB39U76V6Q)`
- Team: `DB39U76V6Q`
- Provisioning profile: active through August 20, 2027
- Registered test device: `00008110-001E1C5C0AF8801E`
- Code signature is valid on disk and satisfies its designated requirement.
- Production push entitlement is present. Apple Pay and associated-domain
  entitlements are absent, matching the currently deferred features.
- Location, camera, and photo-library reasons are packaged; no microphone reason
  is present.

The ad hoc IPA is for the registered physical device and cannot be installed in
the iOS simulator.

## iOS production-environment simulator build

- EAS build: `add15b91-4218-4e56-8ab4-33b3c567eaf5`
- Status: finished
- Profile/distribution: `production-simulator` / internal
- Bundle/version: `com.litterbugs.app` / `1.0.0`
- Archive SHA-256:
  `2d285b953f0d3d43d75886ca105c861934c42a080f8d0d96fa762811c1e389ad`
- Installed and cold-launched successfully on an iPhone 17 Pro simulator.
- The signed-out welcome screen rendered with the current brand, readable text,
  intact safe-area spacing, and both primary actions visible without clipping.
- No application crash, unhandled JavaScript error, or fatal React Native error
  occurred during the smoke check.
- This simulator-only artifact is not a store submission candidate. The signed
  internal IPA above remains the production-identity iOS release candidate.

The current Android candidate received the broader navigation smoke because it
can be exercised completely without a physical Apple device. The iOS simulator
was shut down immediately after the focused check to avoid unnecessary memory
pressure.
