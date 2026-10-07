# Google Play first release — October 6, 2026

## Authorization and status

Grant explicitly requested publication of the latest Litterbugs version to his
Google Play account and approved the developer-policy/export declarations.
This authorizes the release work excluded from the earlier debugging pass.
The existing Apple-revocation and separate-user Facebook testing exclusions
remain excluded, not passed. Grant's Apple credentials were not changed.

**Not submitted or live yet.** The listing is ready to send for review; the
production release 16 is saved in Publishing overview. IARC agreement approval and a dedicated
reviewer login remain pending. Reviewer access unlocks target-audience setup,
which is required to finalize the Data Safety draft. Do not submit placeholder
credentials or Grant's personal account.

## Account and source

- Owner: Burrow Base organization, Play developer ID `6493490019570582000`.
- Signed-in owner: `grant@burrowbase.com`.
- App ID: `4975441562384229541`; package `com.litterbugs.app`.
- Name: **Litterbugs: Community Cleanup**; free; English (United States).
- Production availability: United States, including Google's associated territories.
- Initial source: main `53472580894647bd291df587e52493727cec6956`.
- Mobile, shared-contract, patch and dependency trees matched Apple build 18
  source `15f4d9c6a66ab9313ac2f7dd550620fd8756a465`.
- Release 16 source: `3ce7256b26e7571ffb1cff2074d91f2305c7d5cf`.
  Only the Android adaptive launcher image changed in mobile: the Expo
  placeholder was replaced with the existing brand maskable ladybug artwork.
  PR: https://github.com/jameslukebdev/litterbugs_app/pull/128
- Original checkout and its uncommitted edits were preserved.

## Builds and verification

Final candidate: **2.0.0 (16)**, production EAS build
`ab0e437e-0148-4568-98a4-1e2eced9bfd8` (finished).

- AAB SHA-256: `46e6ac57aeb1b4464fc1da99ca505ebf38e312e8038af2909129d27bc1457f89`.
- Bundletool validation passed; JAR signature verified.
- Manifest: package `com.litterbugs.app`, min SDK 24, target SDK 36, version 16.
- No `RECORD_AUDIO` or `SYSTEM_ALERT_WINDOW` permission; not debuggable.
- Extracted compiled launcher foreground inspected: correct ladybug artwork.
- Version 15 is superseded and must not be released.

Earlier same-source release 15:

- Production AAB EAS build `d1f7a49d-f3a2-4f88-a3e0-81ad04506c86`.
  SHA-256 `f02a08d2c9dcad1bc65d4cb4514101b5f08f1c6c60b573d64642d97f73881650`.
- EAS installable APK build `7867255e-c597-402e-ae0b-39c2abddf818`.
  SHA-256 `3d23a8b634be0c91b942a5e391101fef520277c34dbeb0e37a23c77feb7f5d34`.
  Installed as a data-preserving update on API 36 emulator. Guest browsing,
  production Google map tiles, report feed and funded-cleanup details opened.
- Play-generated APK signature matches Play legacy certificate.
  SHA-256 `b12095fb09ead2e24b5013daed4407a3a56d58d48475c8e48f12e460049cfe6b`.
  Installation succeeded on isolated `Litterbugs_Play_Release` emulator;
  Play installer protection prevented launch because its Google APIs image has
  no Play Store. Protection was preserved. No Play-delivered runtime pass claimed.
- Play bundle explorer reports **Supports 16 KB** for version 15; this is the
  platform assessment, not a completed 16 KB runtime test.
- Clean locked dependency install passed. 483 mobile tests passed, one opt-in
  integration test skipped; 34 shared-contract tests and shared typecheck passed.
- No physical-device acceptance or separate-user Facebook test is claimed.

## Listing

Apple lookup confirms version 2.0.0 released October 6, 2026 at 14:21:34 UTC,
https://apps.apple.com/us/app/id6757313862 . Apple's age rating is 4+; the Google
rating must come from its own factual questionnaire.

The default listing is saved and marked **Ready to send for review**:

- Exact Apple full description, saved locally in `full-description.txt`.
- Short description: “Report litter, join local cleanups, and make a lasting community impact.”
- Existing ladybug icon and exact-brand feature graphic.
- Two current Android screenshots: community report feed and funded cleanup
  detail, using the same report featured by Apple. Captured via Android Studio
  from production-equivalent release 15; release 16 only changes the launcher.
  Original screenshot pixels are placed on 1440×2560 pale-green backgrounds.
  No simulated UI or generative imagery; no AI asset label selected.
- Tools category; `support@litterbugs.app`; https://litterbugs.app .
- Privacy URL https://litterbugs.app/privacy .
- No ads; not government; no health features. Financial features: rewards and
  crowdfunding for pooled real-world cleanup rewards.

Artifacts, provenance, Apple references, validation and UI evidence are retained
in the ignored local directory `artifacts/google-play-2026-10-06/`.

## Signing, maps and app links

All three Play SHA-1 signing fingerprints were registered on the production
Android Maps key, retaining the upload fingerprint and Maps SDK-only API limit.
No key value is recorded here. Cloud project: `litterbugs-auth`.

All three Play SHA-256 fingerprints were added to Digital Asset Links, retaining
the existing upload certificate. PR #127 merged at
`1f755687b18f5c995311816830e19e413a68e220`:
https://github.com/jameslukebdev/litterbugs_app/pull/127 .

Both association tests passed. Vercel deployment
`dpl_EqRQVjwxGPwth2RB1sHKsVvqLKxk` was staged, inspected and promoted.
Live https://litterbugs.app/.well-known/assetlinks.json returns four certificate
fingerprints for the package. Android's domain verification reports verified.
Android Google/Facebook uses browser OAuth, so no additional native Android
OAuth client was needed.

## Disclosures and remaining owner input

Data Safety is complete **as a draft**, pending target-audience completion.
It covers account data, precise/coarse location, photos, transaction/payout
records, report content, app/search interactions, crash/diagnostic data and
device identifiers, including cloud drafts. Hosted payment-provider-only
information is excluded under Google's payment-service exception; transaction
and payout records remain included. Search queries leave the device through
Census TIGERweb and platform geocoding.

- In-transit encryption: yes.
- Account creation: username/password and OAuth.
- Account deletion: https://auth.litterbugs.app/delete-account .
- Data deletion request information: https://litterbugs.app/privacy .
- Target audience planned: 13–15, 16–17, 18+. Not directed to under-13s;
  cleanup claims require adults.
- IARC category prepared: All Other App Types (cleanup utility).
  Terms checkbox remains untouched pending owner action-time confirmation.
- Owner asked whether to use an existing Apple reviewer email or create a
  dedicated Google reviewer account. No password requested in chat.

Release notes:

> Welcome to Litterbugs on Android. Explore litter reports, join volunteer or
> funded cleanups, share before-and-after photos, and track your community impact.
>
> Version 2.0.0 includes improved maps, account-synced drafts, photo recovery,
> notifications, and clearer activity and payment information. Guests can browse
> public reports and completed cleanups without an account.

Release 16 replaced version 15 in both saved drafts. Production validation has
no blocking bundle errors and one missing R8/ProGuard mapping warning; no mapping
was fabricated. The Advertising ID declaration was saved as No after inspecting
the compiled manifest and mobile source/dependencies. Google publishing checks
still require content ratings, target audience and final Data Safety completion.
The Submit changes button remains disabled. No submission or rollout occurred.
