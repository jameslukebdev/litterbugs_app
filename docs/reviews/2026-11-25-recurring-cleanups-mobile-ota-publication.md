# Returned-litter OTA publication — November 25, 2026

**Published and native-verified on iPhone and Android**, under Grant's explicit
instruction. Production group `63bc12bc-4571-4650-8ed2-954de6bee32f`, published
November25 at11:01a.m. Eastern. Runtime/channel **2.1.1 / production**.

| Platform | Published update ID | Successful launches | Failed launches |
| --- | --- | ---: | ---: |
| iOS | `01a21370-92e6-7d80-9e82-20a381a5f128` | 2 | 0 |
| Android | `01a21370-92e6-746c-830f-17d9dd394ee2` | 2 | 0 |

## Frozen source and preservation

App source `279767621a548220c47658efeaf1a13d03bb3f05`; EAS records publication
checkout `8c9a0eb3a0d3c7109abe21185ea6cac902904286`. Their mobile/shared-contract,
lockfile and patch scope is identical; intervening changes are documentation only.
Published the exact previously verified full production Hermes exports with
`--skip-bundler`; no re-bundling or shared dirty checkout was used. Both source
maps uploaded; no new assets needed uploading.

Compared with prior live group `5c8ab976-b063-4497-b5be-d15045622988` / EAS source
`3db81d5e582788635fe7067ea40f4c2e538dddda`:425 inherited scoped files unchanged,
zero removals, all67 previous assets/platform byte-identical. The $35 tutorial,
funder UI, donor privacy, photo hearts and email preferences are retained. Native
configuration/dependencies/runtime and silent update behavior are unchanged.
Source validation remains705 passed/1 existing skip,236-module check and scoped
lint passed. The final separate site-draft storage/account-local cleanup correction
is included; the superseded unpublishedb18dda0 artifact is disabled for publication.

Website `ba1feca`, public site/SEO pages and existing hosted migration remain live
and unchanged. The apps use that same site linkage and history API. No migration,
website deployment, store upload/build/release or provider-setting change occurred.

## Hosted delivery and native activation

- Preflight rechecked the exact old production group, channel mapping, frozen
  source/78 export hashes, and live public history endpoint. Publication wrapper
  repeated its baseline guard immediately before publishing. Final channel
  readback confirms both new IDs and unchanged production branch mapping.
- Downloaded both Expo production protocol manifests and all74 unique hosted
  bundles/assets. Every SHA256 matches; both hosted bundles equal the frozen
  export and the updater-downloaded file inside each native app.
- iPhone17Pro/iOS26.5: original installed native runtime2.1.1 app, actual Expo
  updater. SQLite records the new ID launched twice, zero failed launches.
  Downloaded SHA256 `8081b3ebf045ee4519ad7a11cec1ccc42ed931b25daa77b8727796fdf229a85b`.
- Android16 QA emulator: existing released2.1.1(27) native code, prior local QA
  signature. Actual updater downloaded the new ID; two successful launches,
  zero failures, including force-stop/cold relaunch. Downloaded SHA256
  `78ff687748a733c939c71c999dc7c0788ef2d1cf279b3147cdb2d463ba0d20a4`.
- Real published report detail loads on both. iPhone's Greenway report visibly
  shows the blue dragonfly action below Reported by, one Timeline, original
  elizabeth/Aud attribution and dated $1/$9/$15 donations. Android's real Hobby
  Lobby report shows its original reporter, claim/completion dates and Timeline.
- On both **actual downloaded production apps**, Needs cleaning again opens the
  existing wizard with the source title, no carried-over photos and Next disabled
  until new evidence. No report was submitted and no photos uploaded. Only the
  local test draft was discarded; Android local storage independently confirms
  zero saved site-draft keys afterward. Original sign-in/account data retained.
- Android after cold relaunch still loads the real report. Native error scans
  show no matching fatal JS/runtime/emergency-launch events. Staff simulator/
  emulator analytics remain excluded by the production analytics guard.

## Scope and test-tool limitations

This publication's activation checks use the original native apps and real
published OTA bundles, unlike the earlier bounded local UI harness. No physical
phones are connected; these checks do not remotely inspect customer devices.
Android local QA signing retains the known production Google Maps certificate
restriction; that is not a source change in this release.

The first iPhone simulator boot stalled before app launch; a clean simulator
restart completed boot in14 seconds. Native app launch counters still show zero
failed launches. Automated iPhone scroll gestures did not move the screen. Grant
scrolled to the Timeline and supplied a screenshot; the assistant then independently
observed that screen and opened/cancelled the actual reporting form. No app/source
change was needed. Android control checks were performed through computer use.

**No account was blocked.** A public-profile menu was opened read-only while
checking visibility, then closed. Grant explicitly instructed not to block accounts;
no block/privacy/preference settings were changed. No real report, upload, cleanup
claim, waiver acceptance, account deletion, payment, payout or email send occurred.
Existing provider-testing exclusions remain unchanged.

Owned test devices ran sequentially and were shut down after verification to
manage memory. Original native installations and emulator data remain intact.

## Record and recovery

Evidence: `artifacts/mobile-recurring-cleanups-20261125/`: `release-result.json`,
`published-updates.json`, `publication-verification.json`, `channel-final.json`,
`preservation.json`, `device-activation/activation-verification.json`, downloaded
bundle hashes, actual native screenshots and filtered runtime logs. Frozen source
and final publication documentation have separate Git bundles. Original
`readiness.json` is the historical preparation snapshot; `release-result.json`
is the current publication status.

If a later issue requires recovery, republish prior group
`5c8ab976-b063-4497-b5be-d15045622988`, retaining the earlier OTA improvements.
Never roll back to embedded code or drop the site's existing history/schema/email
suppression data. Recovery was not executed. Current production is the new63bc12bc
group. The former publication hold is superseded for this exact release.

Shared app/location-recovery, website and store screenshot work was preserved.
Start future app releases from this published mobile source or its source bundle;
the shared dirty checkout has other work and is not this release's source.
