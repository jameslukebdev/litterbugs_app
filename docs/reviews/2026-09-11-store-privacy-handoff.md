# Store privacy handoff — September 11, 2026

Prepared from the current application and the provider evidence in
[store release preparation](2026-09-10-store-release-preparation.md).
These are reviewable answers, not submitted or published store labels. The
production binary and the unresolved provider questions below must be reconciled
before calling the store forms final. Apple access resolution is deferred at the
account holder's direction; support case 102959897494 does not block debugging.

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
