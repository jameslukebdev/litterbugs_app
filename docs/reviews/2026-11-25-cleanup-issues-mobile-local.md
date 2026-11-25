# Cleanup issues: mobile implementation and local verification

Status: requested local implementation/flow checks complete; publication held.
Code source `a06bcdc` on
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
- Final iOS bundle `a06bcdc` installed on a separately named Litterbugs Issues QA
  simulator (`A88A56B4-F6E9-49D8-ADBB-B315EEBB6ADB`). Actual local reporter sign-in,
  existing inbox destination, updated conversation photo/full-size viewer, and
  funded editor photo all passed. The prior iPhone full-flow results remain
  applicable; the final signed-photo correction has now been visually retested.
- Final Android bundle: funded editor photo, native photo picker, checked private
  attachment upload, exactly one reporter reply, full-size private photo, cleaner
  inbox destination, and readable response/public correction passed. A reply
  leaves the safety hold intact and exposes no Resume action. The authenticated
  cleaner RPC also rejects premature resume with `issue_not_ready_to_resume`.
- A simulated local AAL2 staff decision called the existing `decide_cleanup_issue`
  RPC with decision `ready` and a reason. This is backend staff-decision testing,
  not native admin UI or fresh admin MFA testing. The cleaner's visible screen
  refreshed to Response ready with the team message, Resume cleanup and Still an
  issue. Follow-up composer/cancel worked. Explicit Resume cleanup opened the
  original claim's actual cleanup submission form.
- Final Android backend assertions passed: same claim; hold cleared only on
  explicit resume; exact paused-clock extension1736364ms; report fund3500 and
  contribution3850 unchanged; payout status unchanged; report revision2 and
  original claim evidence revision1 retained; private photo available to the
  participant, denied to outsider/guest; outsider cannot read the conversation.
  Private result: `android-final-verification.json`.

## Acceptance boundaries and testing limitations

The previously pending Android request/reply/review/resume acceptance and final
photo checks are complete. Earlier iOS functional acceptance is recorded at its
actual tested source; final iOS photo/spacing/editor checks passed on `a06bcdc`.
No additional production release acceptance is implied by local testing.

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

Keyboard-driven testing stopped and our Android emulator was shut down. After
Grant explicitly resumed testing, the original shared iPhone still switched to
the other app, so a separately named device was created for Litterbugs. The final
iOS checks used that device; Android used its own existing QA wrapper. No further
clipboard paste was used; text was entered through focused native controls and
verified before submission. The exact stored reporter body was also asserted.
No other app's data/container/settings or user's clipboard was cleared. Avoid
simultaneous desktop keyboard/clipboard automation in future passes.

## Artifacts and resources

Private QA directory: `/private/tmp/litterbugs-cleanup-issues-mobile-qa-20261125`.
Credentials are local-only files with restrictive permissions; never copy them
into documentation or commits. Evidence includes `ios-heading-spacing-fixed.png`,
`android-heading-spacing-fixed.jpg`, `android-cleanup-paused.jpg`,
`android-signed-report-photo.jpg`, `privacy-clock-verification.json`, and native
preservation manifests. Some earlier `.png` screenshots contain JPEG bytes.
Final evidence also includes `ios-final-signed-photo.jpg`,
`ios-final-editor-photo.jpg`, `android-final-editor-photo.jpg`,
`android-reporter-photo-reply.jpg`, `android-held-after-reply.jpg`, and
`android-response-ready.jpg`.

Only one of our QA devices ran at a time; the other project's pre-existing iPhone
remained booted and was left untouched. Metro used one worker and a1GB heap, and
the local backend kept its prior resource caps. Memory was monitored throughout;
the final observation was43% free. Our dedicated iPhone was shut down before
Android started, and Android was shut down after successful resume verification.

Next: owner local review, then a separate release assessment. Publication requires
the owner's later authorization; runtime2.1.2 native crash fixes cannot be OTA'd
to runtime2.1.1 binaries.
