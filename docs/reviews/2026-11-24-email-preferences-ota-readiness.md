# Email preferences OTA readiness — November 24, 2026

> Published and native-verified later November 24 under explicit owner authorization.
> See [publication record](2026-11-24-email-preferences-ota-publication.md).
> The preparation status and hold below are historical.

Both production iOS and Android OTA payloads are prepared and verified for runtime
2.1.1. **Neither payload has been published.** Website/backend source `00ed676`
is already live; this preparation changed no hosted database, production channel,
store build or email sending configuration.

## Frozen inputs and preservation

- App source: `4cb21619c5cce3bf38bd140eab34df779f7b092f` on
  `codex/email-preference-implementation-20261124` in
  `/tmp/litterbugs-mobile-funders-20261120`.
- Tooling through `d4e06f494480829dfaf487a1cbf0b4e27ffb30e6`; later tooling/docs
  commits have zero changes to the frozen mobile/shared-contract/dependency scope.
- Live baseline: `88555786784d07cc5a1a5bf549bd09e23dd5f429`, production group
  `22df191b-5980-40c9-9a09-ec76a43cb2bb`. It is an ancestor of the prepared source.
- Exactly 12 files differ in the app/shared-contract/dependency scope: the new
  email screen/client/tests, its Settings row/navigation, shared RPC types/helpers,
  and exclusion of this screen from analytics session replay. No source files
  removed; 426 inherited files unchanged.
- $35 tutorial, funder list, donation privacy controls and photo hearts source is
  unchanged. Each platform retains all 67 prior assets byte-for-byte.
- Native configuration, package lockfile, dependency declarations, plugins,
  Firebase configuration and icons unchanged. All 46 installed direct dependencies
  match the lockfile. Compatible with existing iOS 2.1.1(30)/Android 2.1.1(27).
- Full production app exported with the production EAS environment, real backend,
  Hermes, source maps and asset map; no QA app entry, localhost backend or test
  account values. Update application stays silent. Normal analytics stays enabled;
  email preferences is excluded from replay.

Artifacts: `artifacts/mobile-email-preferences-20261124/` in the shared workspace.
The `readiness.json` and `verification.json` identify the source and verify all
78 frozen export file SHA-256 hashes. `preservation.json` records feature Git blob
identity, old asset hashes and unchanged live channel mapping/group. Source maps
and platform debug IDs are present; no source-map upload has happened yet.

## Verification

- Mobile: 683 tests passed, one existing skip; 125 passing test files.
- Source checker: 231 modules, zero errors. Scoped ESLint: zero errors.
- Expo/EAS offline asset collection accepted both payloads. Both Hermes headers,
  real screen inclusion, source maps, assets and absence of QA markers passed.
- Both offline verification helpers passed. Channel readback before/after
  preparation still points both platforms at the live $35 tutorial group above.
- Previously completed local native checks on iOS and Android exercised the actual
  email screen with isolated Auth/PostgREST: save, website unsubscribe then native
  refocus, failed save with no DB change, retry and cold app restart. These were
  local native harness checks, not a download of this unpublished OTA.
- The production website has since passed real-account load/save/public-unsubscribe
  and persistence against the deployed migration. Anonymous protected RPC probes
  during OTA preparation returned permission errors, confirming presence and guards.
- Actual hosted OTA download/activation on either platform remains a post-publication
  check; this unpublished package cannot yet be downloaded from the production feed.

## Publication hold and recovery

Publication is pending a later owner instruction. Preparing these artifacts did
not invoke any update publication, preview publication, native upload or store
submission. Use the frozen `dist/`; do not export from the website branch or dirty
shared checkout. Never include unrelated shared changes.

After authorization, the existing `scripts/prepared-mobile-ota.cjs` is the required
publication path under EAS `env:exec production`. It rechecks the production channel
ID/mapping and exact live group/source/runtime before publishing frozen inputs with
`--skip-bundler`, platform all and source-map upload. A newer OTA or channel change
stops publication for reconciliation. Simulated unchanged/newer-update/changed-map
cases passed with zero real publications (`publication-guard-tests.json`).

Recovery plan (`rollback-plan.json`, not executed): republish previous group
`22df191b-5980-40c9-9a09-ec76a43cb2bb` to production. This retains the prior $35,
funder, privacy and heart improvements. Do not roll back to the embedded app.
Keep email suppression data on any application rollback.

Offline checks (no publication):

```sh
node scripts/verify-email-ota.cjs '/Users/grantgibson/Desktop/Burrow Base/LItterbugs Partner/artifacts/mobile-email-preferences-20261124'
node scripts/prepared-mobile-ota.cjs '/Users/grantgibson/Desktop/Burrow Base/LItterbugs Partner/artifacts/mobile-email-preferences-20261124'
```

Production remains at the prior OTA. No emails sent. Existing provider-testing
exclusions and original device/app data are preserved; simulator/emulator left open.
