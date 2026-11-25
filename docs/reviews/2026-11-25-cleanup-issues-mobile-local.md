# Cleanup issues: mobile implementation and local verification

Status: local work only; not ready for publication. Source `a06bcdc` on
`codex/cleanup-issues-mobile-20261125`, isolated checkout
`/private/tmp/litterbugs-cleanup-issues-mobile-20261125`.

## Preservation and implementation

Coordinated with the Investigate app crash chat. Started from its frozen
`aa836cc7e7ce4658ed898fe13aa17136950cc456` baseline, including previous OTA
features and native map fixes. Both native patches, app configuration, EAS
configuration, dependencies, lockfile and artwork remain unchanged from that
baseline. The independently submitted iOS2.1.2(31) candidate is untouched.

Added native cleanup issue requests, private participant conversations, reporter
replies, versioned public report corrections, explicit cleaner resume/follow-up,
and inbox/push routing to the exact issue. Existing report details host the
account actions. There is no duplicate report page. Safety/moved/missing issues
retain the existing backend team-review requirement. Claim clocks remain paused
until authorized resumption. Private media uses authenticated signed URLs and
the existing checked upload pipeline; claimed photo revisions remain preserved.

Owner-requested spacing fixes group title, report subtitle and privacy label,
and tighten the gap between reason options and cleanup-retention options.
Cleanup options is a compact labeled branded flag utility before report photos.

## Passed checks

- Mobile suite: 727 passed, one existing skipped test; 130 passed files, one
  skipped file. Final log: `/private/tmp/litterbugs-cleanup-issues-mobile-final-tests.log`.
- Source check: 244 modules, zero errors. Scoped source lint: zero errors
  (test file is ignored by the repository's ESLint configuration).
- `git diff --check` passed. No native/config/dependency changes from baseline.
- Serial production-mode local-backend exports completed for iOS and Android.
  These are test artifacts, not EAS updates or releases.
- iOS native flow on earlier integrated source `b68ac79`: actual cleaner login,
  issue request/private photo upload, exact reporter inbox destination, funded
  description/information/photo correction, private reply, cleaner follow-up
  composer, same-claim resume into cleanup submission, full-size private photo,
  cold session restoration, and corrected heading/option spacing.
- Local backend iOS assertions: outsider/guest private-photo isolation, signed
  participant photo fetch, original evidence retained, same claim, fund3500
  unchanged, report revision2/claim revision1, and exact paused-duration restoration.
- Android native flow: actual dedicated cleaner/reporter logins, issue utility,
  unsafe request, paused workspace, exact reporter inbox issue, funded report
  correction to revision2 with fund3500 and original evidence preserved, and
  corrected heading/option spacing.
- Visual Android check caught public-URL use against the private report photo
  bucket. Fixed with the existing signed-photo resolver in `a06bcdc`; final
  Android bundle installed and updated conversation photo visibly loaded.
  Regression tests also verify unauthorized editors cannot mint photo previews.

## Incomplete acceptance and testing limitations

Android reporter attachment/reply, local staff decision, subsequent cleaner
resume, final editor-photo visual check, and final iOS signed-photo retest remain
pending. Do not treat the Android end-to-end flow or final iOS bundle as passed.
Earlier iOS functional acceptance is recorded at its actual tested source.

Android Maps tiles are unauthorized for the disposable emulator signing
certificate. Production Google Maps keys/settings were not changed. Android map
rendering is unverified; workflows were reached through profile/activity and
existing report details. Native libraries and DEX match the existing QA shell;
the iOS shell retains the crash-fixed native executable's text hash. Native
preservation manifests and source APK backup remain in the private QA directory.

No physical-device push delivery, physical phones, provider SSO, real payments,
store delivery, or OTA downloading/publication was tested in this pass. No
hosted backend, website, store candidate, or production OTA was changed.

## Shared desktop interference

The shared host was also running another app's build/UI work. Native CUA input
occasionally lost focus or was interrupted; clipboard paste into an Android
test reply picked up unrelated Resell Higher text. It was never submitted.
The composer was visibly empty afterward; local backend snapshot
`state-desktop-interference-audit.json` confirms the safety issue still has only
its original cleaner message. No unrelated app source was found in mobile or
shared package code. Treat this as desktop input interference, not a passed
product regression check or evidence of source contamination.

Keyboard-driven testing stopped and our Android emulator was shut down. Do not
resume clipboard/keyboard automation while another assistant/user is operating
the shared desktop. Do not overwrite or clear the user's clipboard. Preserve
other apps/processes and the other chat's simulator containers.

## Artifacts and resources

Private QA directory: `/private/tmp/litterbugs-cleanup-issues-mobile-qa-20261125`.
Credentials are local-only files with restrictive permissions; never copy them
into documentation or commits. Evidence includes `ios-heading-spacing-fixed.png`,
`android-heading-spacing-fixed.jpg`, `android-cleanup-paused.jpg`,
`android-signed-report-photo.jpg`, `privacy-clock-verification.json`, and native
preservation manifests. Some earlier `.png` screenshots contain JPEG bytes.

Only one test device was booted at a time; Metro used one worker and a1GB heap,
and the local backend kept its prior resource caps. Final memory observation was
34% free before shutting down Android. Android is stopped. Our iOS QA session
had been shut down before Android testing; the shared iPhone simulator was
subsequently booted by the other project's work and has been left untouched.

Next: finish the pending native checks in a desktop session without competing
UI input, then prepare a separate release assessment. Publication still requires
the owner's later authorization; runtime2.1.2 native crash fixes cannot be OTA'd
to runtime2.1.1 binaries.
