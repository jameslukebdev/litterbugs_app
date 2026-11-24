# Mobile funders OTA readiness — November 24, 2026

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
