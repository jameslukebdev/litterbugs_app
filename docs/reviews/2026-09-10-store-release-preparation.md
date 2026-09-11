# Store account checks — September 10, 2026

## Current checkpoint — September 11

The dated sections below are historical evidence, not the current release state.
Native Apple sign-in and sandbox push delivery/tap navigation passed on the
physical iPhone QA build. Administrator Facebook login passed on both physical
phones. Accounts remain separate unless a signed-in user explicitly links a
provider; no account merge was performed.

Meta app 1477683410862512 is now **Published**, following the account holder's
explicit September 11 authorization. It belongs to verified Burrow Base; the
review draft's responsible entity is Burrow Base LLC. Meta confirmed the app is
available to the public. Separate non-administrator login remains unverified.
See [the login completion record](2026-09-10-login-completion.md) for evidence.

Apple App Store and Google Play publication remain unauthorized. The remaining
store gates are production Apple signing/APNs access, a current production
archive and provider disclosure assessment, and the uncreated Play app's
account-holder declarations/signing setup. The version-code 11 bundle mentioned
below predates September 11 fixes and must not be treated as the latest release
candidate. Current device builds are QA artifacts, not store-ready proof.

The privacy mappings below remain prepared answers rather than published store
disclosures. Do not mark the release goal complete from QA authentication or
Meta publication alone.

The [September 11 privacy handoff](2026-09-11-store-privacy-handoff.md)
consolidates supported answers and identifies the remaining form decisions.
The user has deferred production Apple access resolution and accepted separate
Facebook tester coverage as unverified but nonblocking for debugging. The Apple
inquiry was sent as case 102959897494; do not wait for it to continue other work.

## Historical September 10 checkpoint

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
The original Stripe support URL redirects to the mobile SDK privacy-details page; the browser verification and mapping below supersede the earlier web-reader failure.
No live privacy answers were saved or published.

Installed Stripe version is 24.19.0. Its `STPAnalyticsClient.swift` and
`AnalyticsClientV2.swift` target Stripe analytics endpoints and suppress analytics
in simulator/test environments. Consequently, simulator-only traffic cannot
establish the absence of production SDK analytics. Use the physical-device
configuration and provider disclosures for final answers. Current server source
explicitly sends receipt email on contribution creation and account email/name
on Stripe cleaner onboarding; both can originate from social sign-in. Include
that recipient flow in both store and Meta disclosure preparation.

## Stripe disclosure answers resolved against official guidance

Opened [Stripe Mobile SDK Privacy Details](https://support.stripe.com/questions/stripe-mobile-sdk-privacy-details)
in the browser. For the current PaymentSheet integration, prepare these Apple
answers:

| Data type | Collected / use | Linked to identity | Tracking |
| --- | --- | --- | --- |
| Payment information | Yes; app functionality through the in-app payment sheet | Yes for Litterbugs' account-associated contributions; the PaymentIntent includes contributor ID and receipt email | No advertising tracking identified in this flow |
| Contact information: email/name | Yes; account and payment/onboarding functionality | Yes; source passes account email/name to Stripe | No advertising tracking identified in this flow |
| User ID | Yes; account functionality and contributor/recipient references | Yes | No advertising tracking identified in this flow |
| Product interaction | Yes; app functionality and analytics, including fraud prevention | Yes; Stripe states these events may be linked | No; Stripe explicitly rules out tracking for these events |

Stripe's current article covers device/OS analytics, default fraud-prevention
collection and possible card-issuer data transfer during 3DS2. Do not treat a
simulator traffic sample as a substitute for these disclosures. The app does
not currently supply a Stripe Customer ID or customer ephemeral key to
PaymentSheet; the account linkage above comes from the actual server-side
contribution/recipient association, not an invented Customer integration.

These answers describe configured SDK use and are prepared for the final
store form, not saved to the live label. They do not imply optional wallet,
bank or identity features are all exercised on every payment.

## Android map disclosure clarification

[Google's Maps SDK guidance](https://developers.google.com/maps/documentation/android-sdk/play-data-disclosure)
identifies SDK/device metadata, crash information, IP addresses, pseudonymous
SDK identifiers, and map camera interaction events. The app uses camera APIs for
panning/zooming and region animation, so the Play draft includes app interactions,
diagnostics and device identifiers as well as user-submitted location. Provider
improvement purposes must be included; these categories are not limited to push
notifications. The dependency defaults to Maps SDK 18.2.0; Google's page describes
the latest SDK, so do not use it as evidence that the installed version has every
newer field. Current and older published guidance agree on the categories above.
