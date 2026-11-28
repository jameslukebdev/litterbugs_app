# Mobile analytics verification — November 13, 2026

Latest unreleased app: `apps/mobile`. Grant initially requested local-only work, then explicitly authorized
PostHog settings, production EAS diagnostics credentials, the privacy-policy deploy and store disclosure work.
GitHub push, store builds and app submission remain outside this pass. No mobile OTA update was published.

## Completed

- Replay starts paused until navigation establishes a safe screen. The exposed map and personal screens stay
  excluded; coverage also includes Updates, ExpiredReports and cleanup feedback/submission. The prior map-mask
  freeze fix is preserved. A superseded report fetch cannot fail the newer link's analytics outcome.
- Constructor-time install/open events now receive environment/update attribution. Person updates are stripped
  both at the event root and within SDK properties. Existing bounded event/timing schemas remain unchanged.
- Profile/Settings → Analytics choices persists a device-wide opt-out, available while signed out. Startup reads
  the saved preference before constructing the SDK and fails closed if it cannot read it. Early events are bounded
  at 50 while reading. SDK opt-out stops events, exceptions and native replay. Previously sent/queued native data
  is not promised to be deleted. No account, push-registration or application database setting was changed.
- PostHog project 695338: enabled `session_recording_opt_in` and `autocapture_exceptions_opt_in`, then read both
  back. `anonymize_ips` was already true and remains true. Console/network capture, sampling and all other project
  settings preserved. Website explicitly sets `disable_session_recording:true` and `capture_exceptions:false`;
  its behavior and Clarity configuration are preserved.
- EAS project `df0d0855-71d9-4943-b278-d1f083ab6b06`,
  `@litterbugs-community-cleanup/litterbugs-partner`: created production secrets `POSTHOG_CLI_API_KEY` and
  `POSTHOG_CLI_PROJECT_ID`. Key **Litterbugs mobile symbols** has only project 695338 access and
  `error_tracking:write`; no organization-wide permissions. Grant explicitly confirmed creation at action time.
  Production profile enables `POSTHOG_UPLOAD_SYMBOLS=true`; Android acceptance overrides false.
- Actual CLI 0.19.0 upload succeeded using this narrower key and explicit project ID. PostHog returned both
  symbol sets with `has_uploaded_file:true`, no failure reason: iOS `2f155177-a105-473b-9d2e-3e2db796ce0b`,
  Android `71f7c2d2-57fc-4f5c-9439-f412c6dc2194`. These are local verification artifacts, not store releases.
  CLI reports release-independent event mode; no production release/build association is claimed. The one-time
  temporary local credential file was removed, and no key value is in source, logs or this document.

## Website and stores

- Privacy-only source commit `4d4e2e8`, based on the exact prior live website `30adc6c`. Its diff changes only
  `apps/web/app/privacy/page.tsx`. Production build, TypeScript and scoped lint passed. Existing social-card
  tracing warnings remain. Staged disclosure/date checked over authenticated HTTP and local rendered layout.
- Promoted production deployment `dpl_2A2dd4XGKrLZ2kEyK1wSSn3eWd2d`
  (`litterbugs-8shd5383y-grant-9890s-projects.vercel.app`). Live alias and privacy HTTP200 verified. Effective date
  November 13, 2026. Rollback: `dpl_7sr5ycQSEebuddcoSr7pg22oiwo5`. No dashboard or mobile changes included.
- IP discarding does **not** disable GeoIP before discard. Coarse-location disclosures retained.
  [PostHog IP behavior](https://posthog.com/docs/privacy/data-storage#discarding-ip-addresses-at-project-level).
- Google Play app `4975441562384229541` (`com.litterbugs.app`): reviewed existing App interactions, Crash logs,
  Diagnostics, Device or other IDs and Approximate location answers. All already include Analytics and app
  functionality. Existing broader Required/Shared answers remain appropriate for other SDKs/older versions;
  PostHog's opt-out does not establish optional collection across each entire category. No form changes were
  needed for these additions, and no store review/release was submitted.
- Apple form answers are prepared in `2026-09-11-store-privacy-handoff.md`; no Apple form saved. Luke's access
  remains unavailable; Grant's Apple settings and only Apple sign-in account were untouched.

## Verification and limits

- Real installed JS SDK with mocked OS/native bridge and in-process HTTP collector: constructor attribution,
  launch-link/person-property/error scrubbing, replay controls, synthetic notification destinations, offline
  redelivery, durable opt-out and excluded relaunch. OTA child-process stubs verify publish-failure handling,
  upload ordering and upload-failure reporting without executing EAS.
- Full mobile tests, lint and source checks pass. iOS and Android Hermes exports with composed source maps
  pass, with debug IDs matching their bundles. Export ran locally with dotenv disabled and test analytics config.
- Running local development app: Settings → Analytics choices renders; switching off succeeds and remains off
  after leaving/reopening the screen. This simulator remains excluded. Screenshot:
  `/tmp/litterbugs-mobile-analytics-choice.png`.
- Native release replay masking/crashes remain backed by Claude's November 12 isolated iOS/Android tests, not a
  new native release build this pass. The workspace's generated iOS project still has old replay Pods; any fresh
  native build must prebuild/install the new plugin rather than treating that stale project as current evidence.
- Real-phone push delivery/taps, Android NDK crash and physical-device performance remain unverified. Native
  crashes bypass JS release properties; production crash totals need a verified namespace/build allowlist.
- Coordinated directly with **Finish bug animation preview**. Its separate local dashboard commit `452c394`
  uses production app filters, distinguishes installs/sessions from people/revenue and marks unreleased or
  unclassified native-crash coverage explicitly. Its read credential must stay separate from the upload key.
