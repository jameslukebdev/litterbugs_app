# Store privacy handoff — September 11, 2026

Prepared from the current application and the provider evidence in
[store release preparation](2026-09-10-store-release-preparation.md).
These are reviewable answers, not submitted or published store labels. The
production binary and the unresolved provider questions below must be reconciled
before calling the store forms final. Apple access resolution is deferred at the
account holder's direction; support case 102959897494 does not block debugging.

## November13 final2.1 privacy details published —3:18PM ET

Owner explicitly requested finishing all Apple privacy details now, retaining
manual public release. All19 categories are now completed and published; the
13-category baseline/remaining-six statements below are historical. Added Phone
Number, Physical Address, Other Data Types, Crash Data, Performance Data and
Other Diagnostic Data with the prepared purposes/linkage/no-tracking answers.
Coarse Location now includes Analytics as well as App Functionality. Reload
verified19 collected types, no unfinished Set Up items and published timestamp.
App2.1.0(28) still Waiting for Review; manual release selected, both automatic
options unselected. No binary release or review resubmission occurred.

Apple privacy is complete; no further privacy-label additions are pending for
this candidate. Evidence and exact answers are in the3:18PM section of
[the mobile readiness record](2026-11-13-mobile-release-readiness.md#apple-privacy-completion--318pm-et).

## November13 submission follow-up — current baseline corrected

This section supersedes earlier statements about a four-type public label and
no published answers. Owner authorized store uploads/review, with manual public
release. Apple2.1.0(28) was submitted at2:52PM ET, submission
`2abda04e-5782-41bf-99ed-d2005198cc12`, and visibly shows Waiting for Review.

Apple data-type edits publish immediately. Following Apple's instruction to
answer for the currently available version, corrected the released2.0.1 baseline
to13 completed data types, all linked to identity and none used for tracking:
Name, Email Address, Payment Info, Other Financial Info, Precise Location,
Coarse Location, User ID, Device ID, Purchase History, Photos or Videos,
Other User Content, Product Interaction and Other Usage Data. App Functionality
applies to all except Other Usage Data; Analytics additionally applies to User ID,
Device ID and Product Interaction, and is the sole purpose for Other Usage Data.
Account/SDK collection controls the aggregate linked answer, even when PostHog
alone is anonymous. Existing broader provider collection was not removed.

Before manually releasing2.1, update to19 categories: add Phone Number, Physical
Address and Other Data for embedded Stripe contact/identity/tax verification
(App Functionality, linked, no tracking), plus Crash Data (App Functionality,
unlinked), Performance Data and Other Diagnostic Data (App Functionality and
Analytics, unlinked). Add Analytics to Coarse Location. These are prepared
release-time answers, not a saved Apple privacy-label draft. The private2.1
review notes already disclose all these new flows and link the published policy.
The policy URL https://litterbugs.app/privacy is included in the submitted version.
[Apple's current-version and immediate-publication guidance](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/).

Google Data safety now also includes Address, Phone number and Other info for
embedded Stripe onboarding: collected, optional, non-ephemeral; App functionality,
Fraud prevention/security/compliance and Account management. Not Shared follows
the user-initiated transfer exception for those onboarding details only. Existing
sharing/required answers for all other SDK categories remain unchanged. Saved
at final Preview, then submitted together with production25. Both are visible
under Changes in review; quick checks were still running at2:55PM ET.
Managed publishing is ON to hold approval
until a later explicit public-release instruction.

Evidence: `artifacts/mobile-2.1.0/device-evidence/litterbugs-apple-current-privacy-13.jpg`,
`litterbugs-google-data-safety-210-preview.jpg`, and
`litterbugs-google-managed-publishing-on-20261113.jpg` in that folder.

## Answers supported by the current implementation

| Data flow | Apple categories to include | Play categories to include | Purpose and association |
| --- | --- | --- | --- |
| Sign-in and profile | Name, email address, user ID | Personal information: name, email address, user IDs | Account management/functionality; linked to the account, including private relay email |
| Uploaded report and cleanup photos | Photos or videos | Photos | Report and cleanup functionality, safety review; linked to the submitting account |
| Report descriptions, conditions and disputes | Other user content | Other user-generated content | Functionality and safety; linked to the submitting account |
| Submitted report coordinates | Precise location | Precise location | Map/report functionality; linked to account when submitted. Manual placement also supplies location; it is not exempt merely because GPS permission is denied |
| Contributions, refunds and rewards | Purchase history; assess other financial information for payout records | Purchase history; assess other financial information for payout records | Payment functionality and fraud prevention; account-linked |
| In-app Stripe PaymentSheet | Payment information | Assess the payment-service exception below before selecting User payment information | Payment functionality; Apple and Play have different disclosure definitions |
| Push registration | Device ID and user ID | Device or other IDs | Notification functionality; installation ID and token registered to the signed-in account |
| Stripe SDK interaction events | Product interaction | App interactions | Functionality and analytics/fraud prevention; provider guidance says these may be linked |
| Google Maps SDK on Android | Assess iOS separately; do not copy Android-only collection | App interactions, diagnostics, device or other IDs; assess approximate location from IP | Maps functionality and provider improvement; see the version-specific qualification in the source record |

## Addendum — app analytics (PostHog), November 13, 2026

The release app now sends PostHog analytics, crash reports and masked session replays
(`apps/mobile/lib/analytics.js`, `docs/mobile-analytics.md`). Add these to the forms:

| Data flow | Apple categories | Play categories | Purpose and association |
| --- | --- | --- | --- |
| Screens, steps, search/filter categories, timings | Usage data → Product interaction | App activity → App interactions | Analytics, app functionality. **Not linked** (no account ID; `personProfiles: never`), not tracking |
| JS errors, native crashes | Diagnostics → Crash data | App info and performance → Crash logs | App functionality/troubleshooting. Not linked |
| Launch/report/upload timings, device and app version | Diagnostics → Performance data, Other diagnostic data | App info and performance → Diagnostics | Analytics, troubleshooting. Not linked |
| Masked session replay (all text and images hidden) | Usage data → Product interaction (and Other usage data if the form asks) | App activity → App interactions | Analytics. Not linked |
| Anonymous install analytics ID | Identifiers → Device ID (conservative; it is install-scoped, not an advertising ID) | Device or other IDs | Analytics. Not linked |
| PostHog GeoIP from the request IP | Location → Coarse location | Approximate location | Analytics. Not linked; IP discarding alone does not disable enrichment |

PostHog processes this on Litterbugs' behalf (service provider). The privacy policy's
"App analytics and diagnostics" section was published November 13, 2026.

### November 13 live form review

- PostHog project 695338 already had Discard client IP data enabled; retained. It prevents raw-IP storage,
  but GeoIP can run before discard. Do not remove coarse/approximate location because of that switch.
  [PostHog IP storage behavior](https://posthog.com/docs/privacy/data-storage#discarding-ip-addresses-at-project-level).
- Google Play app `com.litterbugs.app`, app ID `4975441562384229541`, developer `6493490019570582000`:
  existing Data safety answers already select App interactions, Crash logs, Diagnostics, Device or other IDs,
  and Approximate location. Each already includes Analytics and App functionality purposes, non-ephemeral
  collection, and broader existing sharing declarations. No category/purpose changes are needed just to add
  this PostHog processing; no new store review or build was submitted. The existing privacy URL is unchanged.
- The app's new device opt-out controls PostHog. It does not establish optional collection for an entire
  Play category across Maps, Stripe, notification SDKs and older supported app versions; existing Required
  and Shared answers were preserved. Do not label all diagnostic or identifier collection optional on that basis.
- Apple: initial review was prepared only. The later admin-access verification and agreement blocker below supersede the access limitation for store privacy work. No form has been saved or published. Grant's personal developer settings and Apple sign-in account remain untouched.

Source anchors: `apps/mobile/MapScreen.js` (location permission and report
placement), `apps/mobile/FundingContributionScreen.js` (PaymentSheet and
contributor association), `apps/mobile/lib/pushNotifications.js` (installation
and token registration), and `apps/web/app/privacy/page.tsx` (published policy
source). The source record also documents server-side receipt email and Stripe
onboarding name/email transfers.

No advertising tracking was identified in the audited flows. Do not convert
that finding into “no data collected” or “no analytics.” Do not label submitted
account-associated content as unlinked merely because another member sees only
the report. Apple's definitions include third-party SDK collection and distinguish
linked data from tracking. [Apple privacy details](https://developer.apple.com/app-store/app-privacy-details/).

## Form-specific decisions still required before submission

The following narrower questions are resolved from current source:

- **Saved report drafts:** `savedReportDraft.js` writes text/coordinates to
  AsyncStorage and copies photos into the app's Documents directory. That save
  operation itself does not upload them. `MapScreen.js` calls the photo upload
  path when publishing or updating the report. Distinguish local drafts from
  submitted content; this does not establish that map SDK activity is local.
- **Notification registration:** `pushNotifications.js` returns before obtaining
  an Expo token or registering the installation when permission is denied.
  Push-specific token registration is optional. The store's combined Device ID
  category may still be required because other SDKs collect identifiers.
- **Payment configuration:** `paymentConfiguration.js` enables PaymentSheet
  payment information and conditionally Apple Pay/Google Pay, without supplying
  a Stripe Customer ID, customer ephemeral key or default billing details.
  Those omissions do not establish that the payment sheet collects no billing
  information; the provider can request details during payment.
- **Payout onboarding:** `PayoutSetupScreen.js` opens the returned provider URL
  through the system browser/authentication session. Full identity or bank
  documents entered there are not evidence that the app receives those fields.
  The app's returned payout state and identifiers must still be disclosed.

- **Play shared versus collected:** classify each recipient's use. A processor
  may qualify for the service-provider sharing exception; independent provider
  uses need a separate assessment. Neither a blanket Shared Yes nor a blanket
  Shared No is supported. Use the [Play Data Safety guidance](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en).
- **Optional versus required:** photos, contributions and notifications are
  chosen features, but required account/SDK processing must not be described as
  universally optional. Answer per data type and actual available flow.
- **Provider-only fields:** reconcile Google Sign-In and Stripe manifests with
  configured use. A broad manifest alone does not establish that phone numbers,
  home addresses or every identity-onboarding field are collected by this app.
  Account email/name and configured payment collection are already established.
- **Location and diagnostics:** include provider IP-derived coarse location
  where applicable; resolve exact diagnostics, purposes and linkage from the
  versions embedded in the production archive. The tested Android Maps version
  is 18.2.0; newer provider documentation is not proof of every newer field.
- **Hosted Stripe onboarding:** distinguish fields entered in the external
  provider flow from fields returned to Litterbugs. Do not infer storage of full
  bank, tax or identity-document data from an onboarding link.
- **Security/deletion answers:** the policy describes deletion with necessary
  financial/safety retention. Do not promise deletion of every transaction or
  certify every provider's transport/retention behavior from the policy alone.

## Release handoff

### Provider research clarification

Google Play's payment FAQ permits excluding payment-service-only data when the
app never accesses it and the provider collects it directly under its own terms.
Therefore the earlier unconditional Play payment-information selection was too
broad. Confirm that exception for the configured Stripe integration before
submission; retained transaction history remains in scope. Google also requires
optional collection to be optional for every applicable user/version. These are
form definitions, not changes to app behavior.
[Google Play Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469).

Google Maps documents uses to improve Google's services as well as map SDK
operation. The proposed Play answer is **Shared** for applicable identifiers,
diagnostics and camera interactions used for Google's own improvement purposes,
unless the governing terms establish processing solely on Litterbugs' behalf.
This is an interpretation of the documented purpose and Play's service-provider
definition, not an explicit selection supplied by Google for this app. Retain
the installed-version qualification above.
[Maps SDK disclosure guidance](https://developers.google.com/maps/documentation/android-sdk/play-data-disclosure).

Expo documents HTTPS connections to Apple/Google and temporary notification
content retention in memory/queues for delivery. That supports the push-service
transport assessment, but does not prove the app's own stored notification/token
records are ephemeral or establish all-app encryption.
[Expo push FAQ](https://docs.expo.dev/push-notifications/faq/).

### Submission boundaries

Installed dependency evidence, checked September 11:

| Component | Evidence | Disclosure consequence |
| --- | --- | --- |
| iOS Google Sign-In | Podfile.lock: 9.2.0 | Use this native version, not only the React Native wrapper version |
| iOS Stripe | Podfile.lock: 24.19.0 | Matches the provider assessment in the source record |
| Android Stripe | Wrapper 0.50.3 declares native `21.22.+` | Resolve the exact native version from the eventual release dependency graph; this is a range, not an exact installed-version claim |
| Android FCM | Expo Notifications declares firebase-messaging 24.0.1 | Include Firebase Installations dependency collection; notification permission alone is not a whole-SDK collection switch |
| iOS transport | Info.plist: arbitrary loads false, local networking true | Supports restricted remote transport configuration; not proof of every provider endpoint |

Firebase's disclosure guide explicitly includes the transitive Installations
SDK in FCM's assessment. Its optional Analytics/BigQuery features must not be
assumed enabled merely because notifications work. No FCM auto-init override
was found in the inspected app and Expo Notifications manifests; the permission
check documented above proves only that Litterbugs skips its own Expo/account
registration on denial. [Firebase Android disclosure guide](https://firebase.google.com/docs/android/play-data-disclosure).

Use the existing Apple app `6757313862`, bundle `com.litterbugs.app`; do not
create a replacement listing. The tested Grant-team QA binary establishes
native Apple login and sandbox push, not production signing or APNs. Google
Play's Litterbugs entry has not been created, and its account-holder declarations
remain untouched. No current production archive has been accepted by either
store. These are future release steps, not reasons to repeat QA login tests.

Before an authorized store submission, reconcile the final signed archives with
this table, resolve the listed form decisions, and enter the reviewed answers.
Apple privacy updates can be public independently of an app update; none were
saved during this pass. The existing labels remain unchanged.

The separate AI permission and user-content moderation questions documented in
the September 9 pre-store audit also remain release work; this privacy inventory
does not certify those product requirements. No removed consent UI was restored.

## November 13: account-linked area for optional nearby alerts

The unreleased mobile2.1.0 also includes optional new-litter/completed-cleanup
notifications. These are separate from anonymous analytics. When enabled, the
server stores latitude/longitude rounded to two decimal places (roughly1km) and
time zone in a row keyed by the member's auth user ID. Both alerts start off;
turning both off clears the area. Include **Coarse Location, linked to the user,
App Functionality**, with optional collection for this feature, on Apple's forms.
Do not describe all app location as anonymous merely because PostHog is anonymous.
Google Play's aggregate Approximate Location declaration already includes App
Functionality and Analytics, but retain the account-linked functionality purpose
in the release review. This does not change the existing Maps/location disclosures.
The analytics switch does not control requested nearby notifications.

## November 13: App Store Connect admin access and agreement blocker

Grant explicitly authorized applying the prepared store privacy answers and
completed sign-in. Verified account **Grant Gibson**, team **James Luke Barber**,
existing app **6757313862**, bundle **com.litterbugs.app**. The current iOS version
is **2.0.1**, build24, **Ready for Distribution**. No2.1.0 build was uploaded,
version created or review submitted.

Clicking **Add iOS App** produces **Agreement Update**: Apple requires the
**Account Holder** to review and accept the updated Apple Developer Program
License Agreement at developer.apple.com/account before updating existing apps.
Grant's App Store Connect admin role does not satisfy this account-holder step.
No agreement was accepted and no personal developer-account settings were changed.
Local evidence: `artifacts/mobile-2.1.0/apple-agreement-blocker-20261113.jpg`.

The currently published privacy label contains only Email Address, Precise
Location, User ID and Photos or Videos, all App Functionality and shown unlinked.
Its policy URL is `https://github.com/jameslukebdev/litterbugs_app`, with no privacy
choices URL. These omit other current data flows and misclassify account-linked
records. Adding12 missing categories opens per-type setup, whose final action is
**Publish**, with no Save Draft control in this current-version UI. Those temporary
selections were abandoned; a reload verified the original four-type label and URL.
**No privacy draft was saved and no privacy answer was published.**

### Reviewed2.1.0 aggregate Apple answers

These combine app records and every configured SDK, rather than copying anonymous
PostHog linkage onto an entire category. All rows are **not used for tracking**;
no advertising/marketing purpose was identified in the audited implementation.

| Apple data type | Purposes | Linked to identity | Evidence/qualification |
| --- | --- | --- | --- |
| Name; Email Address | App Functionality | Yes | Sign-in and account profiles |
| Payment Info | App Functionality | Yes | Native Stripe PaymentSheet; the outside-app payment exception does not apply to this embedded flow |
| Other Financial Info; Purchases | App Functionality | Yes | Account-associated reward/payout balances, contributions and refunds; not a claim that full bank/tax documents are stored by Litterbugs |
| Precise Location | App Functionality | Yes | Submitted report coordinates associated with the reporter |
| Coarse Location | App Functionality; Analytics | Yes | Optional account-linked rounded nearby area plus anonymous PostHog GeoIP; anonymous analytics does not override linked functional collection |
| Photos or Videos; Other User Content | App Functionality | Yes | Account-associated submitted photos, descriptions and disputes |
| User ID | App Functionality; Analytics | Yes | Account IDs and configured Google Sign-In native disclosure |
| Device ID | App Functionality; Analytics | Yes | Account-linked push installation/token plus anonymous install analytics and SDK identifiers |
| Product Interaction | App Functionality; Analytics | Yes | Stripe's linked native disclosure plus anonymous PostHog interaction data |
| Other Usage Data | Analytics | Yes | Configured Google Sign-In linked native disclosure plus anonymous PostHog replay/use data |
| Crash Data | App Functionality | No | De-identified PostHog/PLCrashReporter crash diagnostics |
| Performance Data; Other Diagnostic Data | App Functionality; Analytics | No | Scrubbed technical diagnostics and timings |

Native privacy-manifest reconciliation used the accepted QA archive at
`/tmp/litterbugs-ios27-qa/LitterbugsReleaseQA.app`, whose native/JS bytes match the
production candidate (test identity/config/signing differ, as documented in the
readiness record). PostHog/PLCrashReporter declare unlinked diagnostics/usage;
Stripe's main/core/PaymentSheet bundles include linked product interaction and
payment information; Google Sign-In declares linked IDs/usage. Broad SDK fields
such as phone numbers are not automatically added without actual configured use.
The app's account-linked records take precedence over unlinked SDK-only examples.
No general contacts, health, audio, browsing history, advertising data or body/
environment tracking was established. This inventory supersedes the older native
version assumptions above for the2.1.0 candidate.

### Remaining steps after the account-holder agreement

1. Account Holder James Luke Barber accepts the Apple Developer agreement in his
   existing developer account. Do not request his password or substitute Grant's
   personal developer account. The owner-excluded revocation/FB tests stay excluded.
2. Create the existing app's **2.1.0** editable version, without a build upload or
   review submission. Update its privacy-policy URL to
   **https://litterbugs.app/privacy**; a new editable version is required by the UI.
3. Enter/review the16 data types above, correct aggregate linked answers and
   reconcile the final preview. Check whether the editable version enables a
   true draft save; do not call unsaved selections a saved draft.
4. Publish answers describing the currently available app. Future-only2.1
   analytics must be coordinated with2.1 release; Apple's guidance explicitly
   requires answers to describe the current available version. Publishing privacy
   answers is separate from submitting the build and may immediately change the
   public listing. Review any final attestation at the action itself.
5. Store upload/submission remains withheld until the owner explicitly authorizes
   it. Existing signed candidates, symbol uploads and phone checks remain valid;
   this account prerequisite does not require rebuilding the app.

Sources: [Apple App Privacy management](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/)
(current-version answers, editable-version policy URL and publication flow),
[Apple App Privacy definitions](https://developer.apple.com/app-store/app-privacy-details/)
(aggregate SDK collection, linkage, tracking and embedded payment rules).

## November 13 follow-up: agreement cleared and2.1.0 version draft saved

This supersedes the agreement-blocked state above. Luke told Grant he accepted
the Apple agreement. The initial cached page still blocked version creation;
refreshing cleared it and allowed creating **2.1.0** on existing app6757313862.
Current state is **Prepare for Submission**, alongside live2.0.1. No build was
uploaded or attached; **Add for Review was not clicked**.

Saved and verified after leaving/reloading the version page:

- What’s New: the four short items in `release-assets/mobile-2.1.0-release-notes.md`.
- Updated review notes for2.1.0/build27: guest access versus account features,
  actual embedded Stripe Connect flow, separate photo-processing acknowledgment,
  optional nearby alerts/rounded area and default-on device-wide analytics choice.
- Support URL https://litterbugs.app/support (HTTP200 checked without browser JS);
  marketing URL https://litterbugs.app.
- Privacy Policy URL https://litterbugs.app/privacy. Apple's edit dialog explicitly
  says this URL change is released with the next version; no claim of immediate
  public-policy-link replacement. Privacy choices URL remains blank.
- **Manually release this version** remains selected. Existing rating retained.
- Screenshot inventory: seven inherited iPhone thumbnails marked Using Existing
  Assets (new-upload count0), and three iPad13-inch screenshots. No new screenshots
  uploaded; October30 alternate artwork remains a local alternative. Existing
  content was retained rather than treated as a fresh2.1 native capture.

Creating the version did **not** enable draft-saving privacy labels. An existing
Email Address wizard was checked with App Functionality / linked Yes / tracking
No; its final action remained **Publish**. It was canceled without publishing.
The original four-type data label remains public; the reviewed16-type2.1 inventory
above remains local. Coordinate publication of2.1-only collection with actual
release, per Apple's current-version guidance; do not call these answers saved.

Review access is carried forward as guest instructions with **Sign-in required
unchecked and no demo credentials entered**. Those instructions distinguish the
account-required features. No reviewer login was tested or certified; verify full
review access before any eventual submission. Do not use Grant's Apple identity
for deletion/revocation or claim that a signup instruction proves a test login.

Local proof: `artifacts/mobile-2.1.0/apple-2.1.0-draft-20261113.jpg` and
`artifacts/mobile-2.1.0/apple-privacy-url-20261113.jpg`.
Further phone testing was explicitly skipped by the owner. The prepared remote-
push harness was not installed, sent no push and registered no token. No app code,
provider/production analytics setting, device data, deployment, GitHub push, OTA,
store build upload or review submission changed during this follow-up.

## November13 reviewer access follow-up

The prior no-demo-login state is superseded. With explicit owner approval, created
standard Litterbugs member `app-review-210@litterbugs.app`, UUID
`3f455759-11f0-4387-bf0f-244e7852038e`, confirmed email, server review_account marker,
and zero admin memberships. Production password sign-in and own-profile read
passed; verification sessions were signed out. Apple2.1 App Review now has Sign-in
required enabled, dedicated credentials saved and instructions identifying their
purpose. Reload confirmed the saved/masked fields; exact password readback is
unavailable because browser tools mask sensitive fields. Local plaintext secret
removed, no credential in source or logs. No personal Apple account used.

This is an Auth/profile and store-save check, not a new full-device workflow test
with this account. No reports, payments, push devices, payout identities or bank
records were created for the reviewer. Dashboard chat received its UUID/marker
for exclusion, without the password.2.1 remains Prepare for Submission with no
build attached/uploaded, manual release selected and no Add for Review action.
Privacy-label data-type publication remains pending actual release as above.
