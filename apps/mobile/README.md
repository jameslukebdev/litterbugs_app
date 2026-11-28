# 🐞 Litterbugs

Litterbugs is a community-driven mobile app that allows users to report, view, and help clean up litter in their local area.

## Features
- 📍 Map-based litter reporting
- 📸 Photo uploads
- ⏱️ Auto-expiring reports
- 🔐 Email, Google, and Facebook authentication with persistent profiles
- 👤 Public profiles, report attribution, blocking, and user reporting
- 🧹 Community cleanup workflow with funded contributions and cleaner payouts
- 🏅 Profile levels and impact ranking

## Tech Stack
- React Native (Expo)
- Supabase (Auth, DB, Storage)
- React Navigation
- Expo Maps

## Status
🚀 Version 2 — release candidate

## Over-the-air fixes (starting with 2.0.1)

The next store build includes `expo-updates` and the payout setup guidance fix.
Existing 2.0.0 installations cannot receive OTA updates. Ship and install the
2.0.1 native build once before testing or relying on OTA delivery.

Updates download in the background at launch and apply on a later app restart.
There is no forced reload during a cleanup, payment, or payout setup.
The embedded bundle remains available offline and for update recovery.

`runtimeVersion` uses Expo's `appVersion` policy. Only updates for the same app
version and platform are eligible. **Increase `expo.version` and ship a new native
build whenever native dependencies, Expo SDK, config plugins, permissions,
entitlements, or other native configuration change.** Do not send those changes
as an OTA update. JavaScript, wording, styling, and compatible asset fixes can
use OTA within the existing runtime version.

Channels:

| Build profile | Update channel | EAS environment |
| --- | --- | --- |
| `production` | `production` | `production` |
| `production-internal`, `production-simulator` | `production-preview` | `production` |
| `preview` (QA app identity) | `preview` | `preview` |
| Development clients | `development` | Profile's existing environment |

Production-test profiles use the same native feature settings as the store
profile. The generated `ios/` and `android/` folders are ignored; EAS builds
regenerate them from app config. For local native builds, regenerate with
`npx expo prebuild` and install pods before building; old generated projects do
not gain the updates library merely from installing the npm dependency.

From the repository root, preview the publish command without uploading:

```sh
npm run mobile:update:preview -- --message "Describe the fix" --dry-run
```

After a 2.0.1 production-preview native build is installed, publish an authorized
fix to that testing channel:

```sh
npm run mobile:update:preview -- --message "Describe the fix"
```

The wrapper uses the production build profile's feature flags, the production
EAS environment, and disables local `.env` overrides. Confirm payout setup,
sign-in, cleanup navigation, and offline startup still work. Close and reopen
the release test app up to twice to download and apply the update. Verify the
update in EAS; a development server preview is not proof of OTA delivery.

After testing and authorization to publish to users, use the same reviewed
source and start with a limited rollout:

```sh
npm run mobile:update:production -- --message "Describe the fix" --rollout-percentage 10
```

Use `--platform ios` or `--platform android` to target one platform. For an
incident, use EAS Update's rollback flow (`npx eas-cli@27.1.0 update:rollback`),
selecting the correct channel/runtime and the known working or embedded update.
Publishing an update is a production deployment; preparing this configuration
does not publish a bundle or submit an app to either store.

## Litterbugs Privacy Policy

Litterbugs respects your privacy.

The app may collect limited information only to provide core functionality, including:

Account information if you choose to sign in

Photos and location data related to litter reports you submit

This information is used solely to operate the app and improve community cleanup efforts. Litterbugs does not sell personal data or use it for advertising.

You may browse public reports and profiles without signing in. A permanent account is required to submit reports. You can delete your account or request data removal at any time.

If you have questions about privacy, please contact:
admin@litterbugs.app

### Production-signed Android acceptance APK

The `production-acceptance-android` EAS profile inherits production settings and
uses the current remote Android version without incrementing it. It produces an
APK signed with the existing production credentials and uses the production
update channel. Use it for full signed-APK checks after creating a release
candidate. An APK generated locally from an AAB can exercise the exact release
payload, but its local test certificate can cause Google Maps authorization
failures. Verify the package, Maps key and certificate when investigating that
difference; keep the exact-payload and signing-identity checks distinct.
