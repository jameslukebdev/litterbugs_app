# Email preferences OTA publication — November 24, 2026

Published and verified on both native test platforms under Grant's explicit
instruction. Production group: `5c8ab976-b063-4497-b5be-d15045622988`, published
November 24 at 7:31 p.m. Eastern. Runtime/channel: **2.1.1 / production**.

| Platform | Published update ID | Successful native launches | Failed launches |
| --- | --- | ---: | ---: |
| iOS | `01a2101d-affe-71ae-91a6-3520ab426438` | 2 | 0 |
| Android | `01a2101d-affe-7799-af82-c27f73cba200` | 2 | 0 |

## Exact source and preservation

Frozen app bundle source: `4cb21619c5cce3bf38bd140eab34df779f7b092f`.
EAS records publication checkout commit
`3db81d5e582788635fe7067ea40f4c2e538dddda`; intervening changes are release tooling
and documentation only. Git comparison confirms identical mobile/shared-contract,
lockfile and patch scope between these commits. No export was rebuilt at publication.

Baseline `88555786784d07cc5a1a5bf549bd09e23dd5f429` / group
`22df191b-5980-40c9-9a09-ec76a43cb2bb` is retained in this app source. Only the
12 prepared email-related files differ: screen/client/navigation/Settings row,
shared types/helpers/tests and this screen's analytics replay exclusion. All
426 inherited scoped files and all 67 prior assets per platform are unchanged;
zero source removals. $35 tutorial, funder UI, donation privacy and heart code are
byte-identical to the prior live update. Native configuration/dependencies remain
unchanged. Both published Hermes bundles match the frozen export and each native
downloaded bundle byte-for-byte.

## Actual verification

- Final Expo channel readback shows both new update IDs in the new group; channel
  ID and production branch mapping are unchanged.
- Downloaded both production protocol manifests and all 74 unique hosted
  bundles/assets; SHA-256 checks passed against expected manifest/export hashes.
  EAS uploaded both existing source maps and reported no new assets.
- iPhone17Pro simulator: existing native/runtime2.1.1 app with its previously
  configured local production channel. Native Expo SQLite shows the exact new
  iOS ID successfully launched twice, zero failures. Downloaded bundle SHA-256
  `20524030ca8c064f0bb16d6f82e375b3aee108e0400048e3f531f53d8fa7ca2e`.
- Android16 QA emulator: downloaded released native2.1.1(27) AAB, produced a
  local QA-signed APK without changing its embedded JS, Expo channel/manifest,
  80 native library files or seven DEX files. Only local embedded analytics
  configuration is disabled for staff testing. Its real Expo updater downloaded
  and launched the new Android ID twice, zero failures, including a cold restart.
  Downloaded SHA-256
  `d2a2350c1ae010fba302ddb14dfba1351726732e6f915a98fe35e6d3ae7b5b3e`.
- Both downloaded full production apps passed Profile → Settings → Email
  preferences using the existing dedicated non-admin review account and the
  real deployed backend. iOS saved off, reopening retained off, Android loaded
  that off state, Android saved on, and iOS refocus loaded on. Android cold
  restart retained sign-in and the saved on setting. Original true preference
  restored and independently confirmed by a read-only production database query.
- Both native apps visually retain the $35 tutorial pin/card. iOS shows Pays $35.
  Existing compact Android layout hides some card details, as previously audited;
  the $35 pin and preserved tutorial actions are visible.
- Runtime scans: zero Android fatal exceptions/JS errors/ANRs and zero matched
  iOS fatal JS/emergency-launch events. Both test devices' analytics preferences
  are explicitly false; production analytics default remains true.
- Prepared source checks remain 683 mobile tests passed/one existing skip,
  231 source modules checked without errors and scoped ESLint without errors.

Scope: simulator/emulator native acceptance, not remote instrumentation of physical
store-installed phones (none connected). iOS uses the previously ad-hoc-signed
simulator app, native build counter1/runtime2.1.1. Android QA signing retains the
known production Google Maps key/certificate tile restriction; map source is
unchanged. No physical-phone launch claim is made.

The emulator's asynchronous keyboard/clipboard input initially produced incorrect
review credentials; corrected input signed in successfully. No authentication,
password, review account, store credential or permission changes were made.
Temporary plaintext credential copy removed. No customer preference was changed.

## Release record and recovery

Artifacts: `artifacts/mobile-email-preferences-20261124/`, particularly
`release-result.json`, `publication-verification.json`, `preservation.json`,
`channel-final.json` and `device-activation/activation-verification.json`.
Device evidence includes actual native IDs/launch counters, downloaded bundle
hashes, Settings/preference screenshots, tutorial screenshots and restored
preference database readback. The source bundle and publication-record bundle
retain committed history for reproducibility.

No new store builds, store uploads, website deployment, schema migrations,
payments, email sends or update notifications were introduced in this turn.
Website/backend stays at already-published `00ed676`. Routine OTA application
remains silent. Both test apps are left open on Email preferences with the original
review preference restored to on.

Recovery plan remains republishing previous production group
`22df191b-5980-40c9-9a09-ec76a43cb2bb` (not executed), retaining the earlier $35,
funder, privacy and heart updates. Never roll back to embedded or revert email
suppression data merely to revert app UI. This publication supersedes the earlier
email OTA hold; existing provider-testing exclusions remain in force.
