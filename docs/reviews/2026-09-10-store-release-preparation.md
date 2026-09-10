# Store account checks — September 10, 2026

User instruction: continue checks; do not publish. No store submission, upload,
app transfer, Meta publication, legal certification, or public privacy-label
change was performed. One broken Meta settings link was corrected and saved.
This record supplements device acceptance; it is not store-release approval.

## Apple: authenticated account evidence

- App Store Connect shows Litterbugs: Community Cleanup, app `6757313862`,
  under James Luke Barber; signed-in user Grant Gibson.
- Existing version 1.0 is Ready for Distribution and references build 4 of
  version 1.0.0. This is the existing release, not today's corrected app.
- TestFlight lists builds 1–4, all expired. No current store-processed build is
  available to validate the latest fixes or production notifications.
- The developer portal exposes Grant Gibson team `RLXNU225W4`. Its identifiers
  include `com.burrowbase.litterbugs` and `com.gegibson.litterbugs.qa`, but not
  the existing production identity `com.litterbugs.app`. The visible account
  menu offers no other team. App Store Connect access alone has not established
  production signing access. Do not create a replacement bundle ID.
- The current physical iPhone QA app uses the Grant team, QA bundle identifier,
  development APNs entitlement and development signing. Its device testing
  does not establish production APNs delivery.
- Native social-auth source implements Google; Sign in with Apple is absent.
  Production Apple capabilities and provider configuration remain unresolved.
- Existing support and privacy URLs both point to the old GitHub repository.
  Privacy labels list email, precise location, user ID, and photos/videos, all
  not linked to identity. These labels do not describe the current account-linked
  report, notification and payment workflows. App Store Connect explicitly
  warns that privacy-answer changes become immediately available; none saved.
- Before a later submission, use manual release for the new version. The
  historical released version shows automatic release; it was not changed.

Next prerequisite: the account holder must resolve access to production signing
on the existing owning team, or arrange the intended app transfer. Then prepare
the current production iOS build, Apple login and APNs delivery/tap validation.
No transfer was initiated during these checks.

## Meta: authenticated account evidence

- App `1477683410862512`, portfolio `863596096684215`: unpublished;
  business verification explicitly Unverified. No verification started or
  review submitted.
- Only email and public_profile have been added to Facebook Login; each is
  Ready for testing. Testing page records 29 email and 31 public_profile API
  calls. These are existing results, not a new first-time user test.
- Client and web OAuth enabled; HTTPS and strict redirect matching enabled;
  embedded-browser OAuth and JavaScript SDK login disabled.
- Callback correctly contains
  `https://mvaygkflcjswtwchflrk.supabase.co/auth/v1/callback`.
- iOS platform includes QA and production bundle IDs. No Android platform was
  displayed. Current login uses browser OAuth, so absent native Android SDK
  configuration alone is not proof of a broken login.
- Privacy and terms URLs point to the Litterbugs website. The old deletion URL
  `https://litterbugs.app/account/privacy` returned 404. Replaced it with
  `https://auth.litterbugs.app/delete-account`; Chrome displayed the secure-link
  deletion form, and Meta confirmed Changes saved. No email or deletion sent.
  A command-line request to the working form received 403; browser access passed.
- Current mobile EAS profiles all enable Facebook login. Do not mistake an
  administrator's successful login for general-public availability.

Next prerequisite: account-holder business verification and any required Meta
review, followed by a separate accepted tester's first-time login. Publication
remains explicitly unauthorized.

## Google Play and final Android build

Existing Burrow Base organization account `6493490019570582000` is accessible
as grant@burrowbase.com. Litterbugs creation form was prepared with the correct
name, package, English (US), App and Free selections. The app was not created;
account-holder declarations were left unchecked. No upload or release occurred.

Use only the corrected local version-code 11 candidate from device acceptance:
`artifacts/release-acceptance-2026-09-10/litterbugs-production-maps-corrected-v11.aab`,
SHA-256 `2a0bd26b0408753717f0fa793f343f14c6180d01aaf76aa53f2639b21b4941d0`.
The earlier bundle with the QA Maps key is superseded. Existing validation is
reused; no redundant test suite was run for these documentation changes.
Actual Play-signed installation still requires the Play signing fingerprint to
be registered with the production Maps key after an authorized internal upload.

## Privacy-answer preparation — draft, not submitted

| Current data flow | Apple draft consideration | Google Play draft consideration |
| --- | --- | --- |
| Account email, name/profile and IDs | Account-linked contact information and identifiers | Personal information; account management |
| Reports, photos, cleanup evidence and disputes | User content; linked when associated with account | Photos and other user-generated content; functionality and safety |
| Report/device location | Precise and coarse location as actually used; account linkage for submitted reports | Location; optional permission/submission flows must be distinguished |
| Contributions, refunds and rewards | Purchase history and financial data; include SDK collection assessment | Purchase history; assess direct Stripe payment data separately |
| Push token, installation UUID and preferences | Identifiers linked to account registration | Device/other IDs; notification functionality |
| Runtime and provider diagnostics/interactions | Usage/diagnostic categories based on actual provider collection | App interactions/diagnostics; assess SDK purposes |

The physical QA archive's embedded Google Sign-In manifest declares contact,
identifier, coarse-location and usage categories, including phone and other-data
categories broader than the app's explicit login configuration. Stripe manifests
declare payment information and product interactions, including analytics
purposes. These require final-archive/provider assessment; neither “no analytics”
nor “we do not store card numbers” is a sufficient blanket disclosure answer.
SDK manifests alone also do not prove every possible category is collected in
this app's configured runtime.

Play service-provider processing can qualify for a sharing exception; the
recipients column in the older packet must not be copied as an automatic Yes
to Shared. Independent provider uses must be assessed separately. See
[Google's Data Safety guidance](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)
and [Apple privacy details](https://developer.apple.com/app-store/app-privacy-details/).

A fresh direct HTTP request to the live privacy page returned 200 and contained
the September 9 date and Cloudmersive disclosure; the web search cache still
showed the older August page. Use the deployed page and final binary together
when preparing declarations. No policy deployment occurred during this check.

The prior pre-store audit's explicit third-party AI permission and offensive
content moderation questions remain open. The user removed the consent dialog;
it was not reintroduced here. Optional information and malware scanning should
not be represented as proof those separate release requirements are satisfied.
See the [prior audit](2026-09-09-prestore-audit.md) and
[Apple review guidelines](https://developer.apple.com/app-store/review/guidelines/),
sections 1.2, 4.8 and 5.1.2. These are release gates, not a reason to repeat the
completed map, loading, sharing and financial UI regression pass.


## Corrected Meta business association and device test

The user correctly reported prior verification. **Burrow Base** portfolio
`4302410929978959` shows **Verified, August 15, 2026**. Retirement Lists is a
separate product under that business and was not modified. The Litterbugs
portfolio `863596096684215` was an unverified duplicate association.

The existing Litterbugs app `1477683410862512` was removed from that duplicate
portfolio and connected to verified Burrow Base. Meta automatically approved
because the signed-in user administers the app. The app's Developer Verification
page explicitly shows **Burrow Base — Verified**. This supersedes the earlier
business-verification prerequisite. The app remains unpublished. No app was
deleted, no app identifiers were changed, and no identity submission was
completed by the agent.

Physical Pixel Facebook login **passed** after resolving a conflicting older
installation. The account holder completed Facebook authentication, but the
shared `litterbugs://` callback initially opened the old `com.litterbugs.app`
Expo development launcher. Temporarily disabled that package without deleting
its data. Retried Facebook from `com.litterbugs.app.qa`, continued as Grant,
and verified return to the app plus authenticated Profile → Settings showing
Grant Gibson / `gegibson@icloud.com`. The earlier Google account used
`grant@burrowbase.com`; no accounts were merged. Existing administrator-account
Android login is verified; first-time separate tester and iOS Facebook coverage
are not implied. Meta remains unpublished. See the Meta preparation packet for
the device restoration command and remaining public-release coverage.

Chrome's gray overlay was cleared by restarting Chrome with tabs restored;
a subsequent screenshot confirmed normal colors and no debugging banner.
The unused Android emulator was shut down; ADB confirmed only the Pixel.
iOS Simulator received a targeted shutdown after a device reappeared booted.
Memory pressure reported 47% free at that check. Use additional simulators only
as needed and close unused ones, per the user's updated instruction.

## Provider disclosure clarification — September 10 evening

Native Apple sign-in now exists in the code and the independent QA build opens
Apple's consent sheet; the earlier absence is superseded by the
[login completion record](2026-09-10-login-completion.md). Neither completed
Apple authentication nor production signing is established yet.

Google's current [iOS disclosure guidance](https://developers.google.com/identity/sign-in/ios/app-privacy)
identifies user identifiers and IP addresses used to estimate general location
for fraud prevention. Its [profile documentation](https://developers.google.com/identity/sign-in/ios/people)
covers name, email and profile picture. Include those configured flows in the
account-linked disclosure assessment; do not copy every possible Google
manifest category (such as phone number) without evidence of collection.

The installed Stripe SDK README and [Stripe's source documentation](https://github.com/stripe/stripe-ios)
confirm SDK collection for product improvement and fraud prevention, and state
it is not used for advertising. Therefore a blanket “no analytics collection”
answer would be inaccurate even though no separate mobile analytics dependency
was found in the mobile manifest or app libraries. Payment details go directly
to Stripe; that does not mean they are outside the app's disclosure assessment.
The linked Stripe privacy-details support page was unavailable to the web reader;
its detailed category mapping remains to be reconciled with the final archive.
No live privacy answers were saved or published.

Installed Stripe version is 24.19.0. Its `STPAnalyticsClient.swift` and
`AnalyticsClientV2.swift` target Stripe analytics endpoints and suppress analytics
in simulator/test environments. Consequently, simulator-only traffic cannot
establish the absence of production SDK analytics. Use the physical-device
configuration and provider disclosures for final answers. Current server source
explicitly sends receipt email on contribution creation and account email/name
on Stripe cleaner onboarding; both can originate from social sign-in. Include
that recipient flow in both store and Meta disclosure preparation.
