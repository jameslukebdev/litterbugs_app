# Mobile funders OTA readiness — November 24, 2026

## Native download and execution verified — November 24 follow-up

Both exact published OTAs subsequently passed actual native download and
execution on current2.1.1 test devices. Each first launch downloaded through
expo-updates; after a restart its native update database recorded the exact
published ID with **1 successful launch and0 failed launches**. The downloaded
Hermes files match the frozen/published SHA256s in the table below. This proves
execution of the downloaded update, beyond the earlier HTTP delivery checks.

The iPhone17Pro simulator temporarily used a production request header on the
same simulator-only app, with no JS/assets changes. While running the downloaded
iOS OTA, real map tiles, marker/preview, photos, report details and funder rows
were verified visually. The original production-preview native shell/channel
was restored afterward; its production cached selection/row was removed by the
SDK following that restoration. Android used the existing local2.1.1(27) test
APK from released native code with temporary QA signing. Its exact Android
update launched successfully, with the running app visible and no scanned fatal
JS/native startup errors. The earlier temporary-signing map-tile limitation
still applies. No physical phone was connected; the owner separately reported
their phone appeared to update automatically.

Device analytics was explicitly excluded before each test. Android ran alone
with1GB RAM/two cores, then stopped; the iPhone simulator was reopened with the
original app and real map visible. Evidence:
`artifacts/mobile-funders-20261124/ota-device-activation/activation-verification.json`,
per-platform native DB/hash readbacks and screenshots. No new publication,
build, store, website, backend or financial change was made. This section
supersedes the device-activation-pending statement in the earlier release record.

## Published November 24, 2026 — current status

Both prepared OTA updates are **published to production for runtime2.1.1**.
Grant's explicit publication authorization was used; no further approval was
requested. This status supersedes every historical hold, installation blocker
and NOT PUBLISHED statement below.

The current iPhone17Pro native/runtime2.1.1 passed the remaining visual checks:
funders below Get directions, anonymous checkbox default/toggle, the existing
payment owner's name-control display, and selected/unselected photo hearts on
list cards and map previews. Existing Google sign-in succeeded. No charge was
created or donor visibility changed. A temporary favorite toggle was restored.
Analytics remained disabled in this internal test build. Screenshots and the
precise check scope are saved in `current-iphone-feature-verification.json` and
`ios-simulator-current/` under the artifact directory.

Publication at15:08 EST used committed checkout
`2ab8143363a5ff09d3dabec71a7f906c2d10b11f`, app/export source
`ba39bbeaadeadadb92743e60741a84901056441a`, with all78 prepared files unchanged.
Both EAS source maps uploaded successfully.

| Item | Published value |
| --- | --- |
| Channel / branch | production / production |
| Runtime |2.1.1 |
| Update group |1e72e3f9-55ce-4ef8-8377-a8ca25d0bf4f |
| iOS update |01a20f2c-2b62-7481-93e2-45d21cc61d23 |
| Android update |01a20f2c-2b62-7058-a37d-ef5a7dabd959 |
| iOS Hermes SHA256 |b6db2df03105619025ae8953997257532f50eff332c015d5015e83d17d2abf45 |
| Android Hermes SHA256 |afaab81cf8772d8f15e484c9067d6a8d43b01c7ac6029328f5dd865b3ea83ffb |

Production channel readback and native Expo protocol requests returned the
correct platform update IDs. Both hosted bundles match the frozen files;
all74 unique hosted bundles/assets returned HTTP200 and passed SHA256 checks.
Expo supplies asset authorization in the multipart extensions; bare asset URLs
return403 as designed. Saved public manifests, channel readback and
`publication-verification.json` record delivery verification.

Device activation is not claimed: the internal iPhone build uses
production-preview, while the released store apps use production. Installed
store2.1.1 clients can download on a cold launch and activate on a later full
restart. Older runtimes need store2.1.1 first. Android's earlier temporary QA
signing/map limitation and unexercised live owner-save remain documented; they
were not relabeled as passed. No store, website or backend deployment occurred.
The iPhone simulator remains open. No forced restart or automation was added.
The rollback command below remains available but was not executed.

## Latest iPhone installation evidence

The owner ran the prepared helper in normal Terminal. The actual installed
com.litterbugs.app is now native2.1.1/runtime2.1.1, internal analytics disabled,
and its Hermes bundle matches the prepared simulator artifact. Saved evidence:
`ios-simulator-current/installed-native-verification.json` and
`ios-simulator-current/current-iphone-installed.png`. Screenshot review confirms
app startup, real map tiles/markers, search and normal navigation without an
error overlay. Funder/privacy/heart feature UI checks are still pending.
The older installation-blocked text below is historical and superseded.


## Owner publication instruction — November 24 follow-up

Grant explicitly authorized the listed remaining checks and publication of both
prepared OTA updates: “Okay, do these things now.” No further publication
confirmation is needed for this exact release. Older approval-hold text below
records the earlier state and is superseded by this instruction.

All78 frozen export files and source consistency were reverified successfully.
Execution is blocked by the current session: CoreSimulator access fails, the
installed main iPhone simulator app remains2.0.1, and DNS cannot resolve
api.expo.dev or registry.npmjs.org. Latest-native2.1.1 UI acceptance remains
pending; it was not waived or recorded as passed. No publication command ran.
Continue the final checks and approved release from a session with working
simulator and Expo access; preserve the frozen artifacts and unrelated work.


## Current simulator build completed; installation pending

Grant explicitly approved the private-source upload to Expo and cleanup of
unneeded old local builds. The earlier cloud-upload rejection is resolved.
Simulator-only build `13bf4e5c-2f44-4e08-8883-6a234d489f46` finished successfully
from committed `71d1d1c`. Downloaded via Expo's official helper, extracted and
deep/strict codesign verified. Its actual native Info.plist version and Expo
runtime are both **2.1.1**, target **iPhoneSimulator**, analytics disabled/internal.
The simulator build counter is1; the released iPhone build remains30. This is
a separate simulator build from the same current native/feature source.

Saved app: `artifacts/mobile-funders-20261124/ios-simulator-current/unpacked/Litterbugs.app`.
Saved archive SHA256: `b2b8e1e685d2d919557836f7900f39661cbfe28f757c76c578424967fc24d9f7`.
The archived app is~40MB compressed/~132MB extracted. Its verification record
is in the same folder. Production OTA exports remain unchanged and reverified.

**Native installation/UI acceptance remains pending.** The existing iPhone17Pro
simulator is shutdown and still has the older installed2.0.1 shell. Session
simctl cannot connect to CoreSimulator, and native UI control cannot target
Simulator without an open device window. Asked Grant to reopen the iPhone17Pro
window; Finder is prepared at the current app. The next step is installation,
verification of the installed native/runtime2.1.1, and the final UI checks.
Do not publish or claim that latest-native iPhone acceptance passed yet.

Owner-authorized cleanup removed28 untracked superseded local mobile build
files, freeing1.74GiB, while retaining current2.1.1 originals, current OTA/source
bundles and all evidence. Exact deletion paths, sizes and hashes are in
`old-build-cleanup.json`. No local native compilation or multiple simulator
guests ran. Extra Android/Xcode/monitor tools were closed; the last system-wide
free-memory report was63%, with a green Activity Monitor pressure graph.

This simulator build/upload approval does not approve OTA publication. Nothing
was sent to production/preview OTA channels or either store.

## Latest-version simulator follow-up

The owner requested emulator/simulator testing and explicitly required current
versions. A fresh Expo build-history/public Apple listing check confirms the
latest production sources remain iOS2.1.1(30) and Android2.1.1(27), both4835975.
The saved production OTA exports still pass all78 checksum checks.

Android was exercised in a dedicated Android16/API36 arm64 emulator,720x1280,
1GB RAM/two CPU cores. A local test APK embeds the exact prepared Android
Hermes bundle (SHA256`afaab81cf8772d8f15e484c9067d6a8d43b01c7ac6029328f5dd865b3ea83ffb`)
in the released27 native components: all80 native libraries and7 DEX files are
byte-identical. Only the embedded JS, test-only disabled analytics config and
temporary local signing differ. App startup, onboarding, report list, real
report deep link/photos/details and both funder rows under Get directions
passed. No JavaScript/native app startup error was found. Android map tiles
remain **unverified**: Google explicitly rejected the temporary test signing
certificate; production key/configuration/signatures were not changed.
Signed-in Android checkout/owner privacy controls were not exercised.

The existing iPhone simulator passed funder placement and anonymous checkbox
checks using current feature JS, but reading its installed Info.plist/Expo.plist
revealed **native2.0.1(1), runtime2.0.1**, on production-preview. Its displayed
JS2.1.1 version did not establish a current native shell. **Do not claim the
current2.1.1 native iPhone simulator check is complete.** No current simulator
build exists in local products or Expo history; a fresh2.1.1 simulator build is
the remaining owner-requested verification step.

Automatic approval review rejected submitting the production-simulator cloud
build because uploading private project source to Expo was not explicitly
authorized by the simulator-testing request. No build ID was returned and no
replacement build was created. Do not retry or route around this rejection.
The cloud build requires explicit owner approval for that source upload. A
local native build was not started with only about2.7GB free disk space.
The exact simulator-only build plan is saved with the evidence. This is
separate from permission to publish any OTA or store release.

Android emulator and Android Studio were stopped after testing. The original
Litterbugs_API_36 AVD was preserved. The dedicated QA device remains stopped
as Small_Phone.avd (display name Litterbugs OTA QA); Studio's generated APK
project remains under ~/ApkProjects/universal. Evidence:
`android-funders.png`, `android-local-test-repack.json`,
`simulator-follow-up.json`, and `ios-simulator-build-plan.json` in the saved
artifact directory. No real payment, donor-setting or favorite mutation was
made. Earlier package readiness below remains valid, but the newly requested
latest-native iPhone verification is pending. **Nothing is published.**

**Ready locally for iOS and Android runtime 2.1.1. NOT PUBLISHED.**
Grant must explicitly approve publication. This hold covers production and
preview channels. This preparation did not submit anything to either store.

## Prepared scope

- Report funders directly below Get directions: individual public names or
  Anonymous, contribution amounts, relative dates, and an expandable list.
- Optional, unchecked Donate anonymously choice at checkout; the reserved
  choice survives retries and recovery.
- Payment activity donation details let the owner Hide/Show their name.
- Filled red favorite hearts directly on photos, without white circles.

App source remains the reviewed `a34d464` + `bf053f6`, based on the approved
icon-only store source `4835975`. No additional app UI, map, artwork, native
configuration, dependencies, permissions, payment amounts or backend changes.
The added scripts prepare and verify artifacts; their default behavior does
not publish anything. Shared Claude/web work was not included.

## Compatibility and checks

| Check | Result |
| --- | --- |
| Mobile tests | 677 passed, 1 existing skip, 123 files passed |
| Source check | 229 modules, zero errors |
| Changed app source lint | Zero errors; test files ignored by existing config |
| Native surface against approved source | Unchanged |
| Installed direct dependencies vs frozen lockfile | All 46 match |
| Production Hermes export | iOS and Android passed, one Metro worker, 3 GB heap cap |
| EAS offline artifact reader | Both accepted, 67 referenced assets each, no missing files |
| Frozen export verification | All 78 files SHA-256 checked |
| Source maps | Both exported with PostHog debug IDs |
| Production public credit API | HTTP 200; sampled expired report IDs returned an empty list |
| Production channel after preparation | Same production branch, no update groups |

Signed iOS 2.1.1(30) and Android 2.1.1(27) artifacts both contain runtime
`2.1.1`, the production channel, the correct Expo project URL, and enabled
startup update checks with zero startup wait. Apple's public US listing
currently reports 2.1.1, released November 16. Android27's published status
was recorded November15; this pass verified its signed artifact and update
configuration, without changing Google Play.

The update targets installed **2.1.1** apps. Older 2.1.0/2.0.1 runtimes do not
receive this bundle; they must first install 2.1.1 from their store. App-version
runtime matching is retained.

The November20 iPhone simulator checks cover the real funder panel placement,
two separate real contributions, the anonymous checkbox, and the selected
heart appearance. This pass regenerated production bundles and reran tests.
No Android emulator or fresh native build was started. No real payment or
lasting donor-visibility mutation was made, and no hosted OTA install is
claimed while publication is held.

## Saved release package

Workspace-relative directory: `artifacts/mobile-funders-20261124/`.

- `dist/`: final bundles, all image/font assets, asset map, metadata and maps.
- `readiness.json`: production target, source, full file checksums and API check.
- `eas-input-validation.json`: offline EAS parser and Hermes/map validation.
- `tests.log`, `export.log`, `production-channel-after.txt`: check evidence.
- `source.bundle`: restorable committed candidate source, including these notes.

Export source: `ba39bbeaadeadadb92743e60741a84901056441a`. Later documentation
commits do not alter app source. `scripts/prepared-mobile-ota.cjs` validates
both the saved files and app-source consistency before any later publication.
The isolated checkout has local app dependencies and a local report-contract
workspace link, resolving the symlink lookup failures seen in the first exports.
The shared checkout and lockfiles were preserved.

## Release procedure — ONLY AFTER EXPLICIT APPROVAL

1. Use the saved isolated candidate, never the shared web/Claude working tree.
2. Run the verifier without `--publish`, then recheck production channel state
   for concurrent releases and confirm installed target runtime 2.1.1.
3. Use EAS production environment and the saved bundles with the prepared
   helper. From `apps/mobile`, the approved execution would be:

```sh
npx --yes eas-cli@27.1.0 env:exec production 'node ../../scripts/prepared-mobile-ota.cjs "/Users/grantgibson/Desktop/Burrow Base/LItterbugs Partner/artifacts/mobile-funders-20261124" --publish' --non-interactive
```

The helper publishes both platforms from the checksum-verified export using
`--skip-bundler`, production channel/environment and `--upload-source-maps`.
**The command above has not been executed.** A store upload is unnecessary for
this JavaScript/assets-only update.

PostHog CLI upload credentials are EAS SECRET variables, unavailable to local
`env:exec`. The release helper therefore uses EAS source-map upload and retains
the matching PostHog-ID maps locally. A separate PostHog map upload may be done
from an authorized environment that can access those secrets; this does not
block delivery or change the existing production analytics behavior. Do not
use the older generic mobile:update wrapper for these frozen artifacts, since
it requires local PostHog secrets and rebuilds rather than publishing this export.

After approval/publication, record the update group IDs, verify platform/runtime
and bundle hashes, and check cold-launch/download/restart on available devices.
No forced restart or announcement notification is added.

## Rollback plan — not executed

The current production branch has no OTA update group. If the approved release
requires rollback, use the existing embedded 2.1.1 store bundle on both platforms:

```sh
npx --yes eas-cli@27.1.0 update:roll-back-to-embedded --channel production --runtime-version 2.1.1 --platform all --message 'Restore embedded 2.1.1 app' --non-interactive
```

Recheck branch history before selecting a rollback target if another update is
published in the meantime. Nothing is scheduled to publish automatically.

References: Expo [runtime compatibility](https://docs.expo.dev/eas-update/runtime-versions/)
and [deployment](https://docs.expo.dev/eas-update/deployment/) documentation.
