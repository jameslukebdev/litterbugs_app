# iPhone notifications and photo-upload verification — September 28, 2026

Grant authorized continued setup and use of the connected iPhone. Luke separately
confirmed that retrying Ridge Road approval worked. This pass uses source
`abfb3fa701a426fd1b014ab3c06af1e0f5c37620`, containing PRs 87 and 88.

## Installed app and retained account

Built a fresh, signed Release QA app and installed it in place on the connected
iPhone 6s, iOS 15.8.2. The existing Grant signing team and QA bundle
`com.gegibson.litterbugs.qa` were reused. No Apple developer configuration,
credentials, account grants, or store settings were changed. App data was not
cleared. Grant Gibson's signed-in profile remained available after installation
and after the temporary measurement harness was replaced with the normal app.

The QA native version labels remain 1.0.0/build 1; provenance is established by
the source revision and bundled JavaScript SHA256:
`b9cc9208abbe8ca8017c5246abf42431c592e660c5becd3386e836b76ac99036`.
The bundle contains both new notification events and the background review code.
Deep/strict code-signature verification passes.

Normal installed artifact, also restored to the original build output:
`/tmp/litterbugs-sep28-device/Litterbugs-current.app`.

## Physical notification results

Clearly labeled test pushes were sent only to the connected QA iPhone's existing
registered device. No fake contributor or admin-case events were inserted into
production history.

- `funded_cleanup_completed`: notification visible in Notification Center; a
  second delivery also showed a system banner over the home screen.
  Tapping it opened Ridge Road's completed-cleanup view, identifying James Luke
  Barber and showing his after-cleanup photos (1/3). This was checked after an
  explicit app restart so the newly installed bundle was running.
- `admin_cleanup_needed`: notification tap opened `litterbugs.app/admin` in Safari,
  displaying Community & cleanup review and the protected Admin sign-in page.
  The web admin session remains separate from mobile sign-in; no MFA bypass or
  account changes were attempted.
- Expo delivery receipts returned `ok` for the completion and admin test pushes.
  These checks establish sandbox APNs delivery on the QA installation. They do
  not establish production APNs delivery on the separate store-signed IPA.

Evidence under `/tmp/litterbugs-sep28-device/`: `notification-center.png`,
`push2.png`, `notification-route-result.png`, `admin-notification-open.png`,
`push-receipts.json`, and `restored-profile.png`.

The first notification screenshot/tap was inconclusive during installation and
UI transitions. The repeat after restarting the app conclusively opened the
completed report. No product change was made based on the inconclusive attempt.

## Measured native photo processing

A temporary test entry used the actual mobile photo preparation, recoverable
report submission, and secure media uploader from the verified source. It reused
three existing Ridge Road report images (1536×2048), downloaded them to the phone,
and uploaded prepared copies through the live quarantine/safety-scan service.
Only a private draft was created; the publish dependency intentionally returned
without publishing. No report was claimed, approved, funded, or paid.

| Measurement | Observed result |
| --- | --- |
| Preparation through all three successful safety checks | 11.441 seconds |
| Upload + safety-check wall time | 10.417 seconds |
| Photo 1 upload/check | 7.551 seconds |
| Photo 2 upload/check | 5.599 seconds |
| Photo 3 upload/check | 4.808 seconds |
| Maximum simultaneous uploads | 2 |
| Third-photo scheduling | Started 10 ms after photo 2 finished, before photo 1 finished |
| Prepared sizes | 1,558,339; 1,053,331; 1,316,502 bytes |

Per-photo progress advanced after each completion. This is one Wi-Fi measurement
on the iPhone 6s with existing report photos, excluding the fixture-download step.
It is not a controlled before/after benchmark against Luke's earlier cellular
submission, nor a timing guarantee for original camera photos. It also does not
measure the separate final cleanup AI review or a real funded-cleanup submission.
The saved-cleanup three-second foreground wait and recovery behavior were covered
by the previously passing automated tests.

The private draft was deleted. Authenticated Storage removal returned no error
but did not remove the service-owned test objects; all three exact test paths were
then removed with the Storage API using scoped administrative cleanup. A final
query confirmed zero retained test reports, report-photo objects, or notices.
This is not a pass for client-side orphan-media deletion. No storage metadata was
deleted directly with SQL.

The temporary entry was removed from the working tree and was never committed or
included in a production build. The normal signed QA app was restored and launched.
The test journal/result files were removed from Documents. Reproduction entry and
raw timings remain outside the repo at `/tmp/litterbugs-sep28-device/DeviceUploadCheck.jsx`
and `result-download/Documents/qa-sep28-result.json`.

## New production IPA for Luke

A fresh EAS build used the exact verified source checkout and
`--freeze-credentials --non-interactive`, with no submission flags.

- Build: `2e5875c5-dec1-4c4f-ab02-00a40e4da63d`, FINISHED.
- App: `com.litterbugs.app`, version **2.0.0 / build 12**, minimum iOS 15.1.
- Existing Apple team: `DB39U76V6Q` (Luke); profile expires August 20, 2027.
- Deep/strict signature verification passes; production push entitlement is
  present and debugging is disabled.
- Bundle contains `funded_cleanup_completed`, `admin_cleanup_needed`, and the
  shortened foreground-review waiting code.
- IPA SHA256: `2548f433f8e8980c1660412e65407215487a0047a69b31ceab5ff0adb19acc91`.
- Bundle SHA256: `4c2559a860396c4f4e1ffce8c64a9f884f3fb5cd05bb2c53e9147cb6556cf937`.
- [Download the signed IPA](https://expo.dev/artifacts/eas/mw5S80KEXrHBRf4IVonyvEsMvrB68f2knhRPuxaOnMI.ipa).
- [EAS build record](https://expo.dev/accounts/litterbugs-community-cleanup/projects/litterbugs-partner/builds/2e5875c5-dec1-4c4f-ab02-00a40e4da63d).

No TestFlight upload, App Review submission, or store publication occurred.
Production Universal Links remain unchanged: this IPA has no Associated Domains
entitlement. The previously tested website Open in Litterbugs handoff remains
available. Android artifacts were not rebuilt in this iPhone-focused pass.

## Luke's remaining release check

Luke can upload build 12 through his existing Apple distribution process, install
it through TestFlight, and repeat notification delivery/tap navigation under the
production signing identity. On the next real funded cleanup, confirm each
contributor receives one completion notice after approval. Ridge Road is already
completed; do not resubmit its evidence or approve it again. No historical
completion notifications are backfilled.
