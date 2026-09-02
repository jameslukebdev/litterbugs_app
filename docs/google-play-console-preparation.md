# Google Play Console Preparation

This packet prepares the Android release without uploading or publishing it.
The Play Console account holder must review every answer against the final app
before saving it in Google Play Console.

## Release identity

| Item | Value |
| --- | --- |
| App name | Litterbugs: Community Cleanup |
| Package | `com.litterbugs.app` |
| Version | `1.0.0` |
| Current build number | `10` |
| Category | Social, with community cleanup and local discovery |
| Company | Burrow Base LLC |
| Privacy policy | `https://litterbugs.app/privacy` |
| Account deletion | `https://auth.litterbugs.app/delete-account` |
| Support email | `support@litterbugs.app` |

Both public policy URLs returned HTTP 200 on September 1, 2026. The final
store listing, website, and developer account should identify the same company
and support contact.

## Ownership decision — required before console setup

Choose the permanent Play developer account before creating the production
app. Prefer a Burrow Base LLC-controlled organization account with at least two
trusted administrators over an individual's personal account. Record the final
choice here:

- Permanent owner: **not chosen**
- Primary administrator: **not chosen**
- Backup administrator: **not chosen**
- Recovery email and phone confirmed: **not confirmed**

Do not create a second production package or reuse the retired prototype.

## Signing and Maps

- Production upload-certificate SHA-1:
  `79:E6:D2:50:03:74:57:40:DE:02:EB:F9:8F:3A:20:1D:58:85:73:4C`
- Play App Signing SHA-1: **not available until Play App Signing is enabled**
- Production Maps package: `com.litterbugs.app`

After the first AAB is uploaded and Play App Signing is enabled, copy the Play
App Signing SHA-1 from Play Console and add it to the production Android Maps
key in Google Cloud. Google signs the APK delivered to users, so registering
only the upload certificate is not sufficient.

Official reference: [Use Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756?hl=en-EN).

## Data Safety draft

This is a conservative draft based on the mobile dependencies, backend schema,
and live privacy policy. In the console, include data handled by service
providers on the app's behalf. Do not mark data as sold or used for third-party
behavioral advertising.

| Play data type | Collected | Shared | Primary purposes |
| --- | --- | --- | --- |
| Name and email address | Yes | Service providers | Account management, authentication, support, safety |
| User IDs | Yes | Service providers | Account management, app operation, fraud prevention |
| Approximate and precise location | Yes, when used or submitted | Google Maps and app service providers | Map discovery, report creation, safety and fraud review |
| Photos | Yes, when selected or captured | Storage and eligible Gemini review providers | Reports, cleanup evidence, profile, safety and fraud review |
| Other user-generated content | Yes | Service providers; selected report content can be public | Reports, disputes, support, app operation |
| Purchase history and transaction information | Yes | Stripe and app service providers | Contributions, refunds, rewards, accounting, fraud prevention |
| Device or other identifiers | Yes | Notification and app service providers | Push notifications, authentication, security, reliability |
| App interactions and diagnostics | Yes | App service providers | App operation, security, troubleshooting, improvement |

Security and control answers supported by the current implementation:

- Data is encrypted in transit.
- Users can request deletion in the app from Profile.
- Users can request deletion on the public deletion page.
- Some de-identified community report facts and required financial, dispute,
  safety, fraud, tax, or legal records may be retained as described in the
  privacy policy.
- The app does not sell personal information and does not use third-party
  behavioral advertising.
- Stripe processes payment, identity, tax, bank, device, and fraud information
  under its own terms; Litterbugs does not store full card or bank numbers.
- Eligible report and cleanup photos may be processed by Google Gemini through
  short-lived private references. Gemini does not release money or make final
  legal, safety, fraud, dispute, refund, or payout decisions.

Official references: [Data Safety requirements](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en) and [account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en).

## Content-rating draft

Use the Social or communication-style questionnaire category that Play Console
presents for the final app. Answer from the actual feature set:

- Users can create and display community reports, descriptions, photos, profile
  information, and cleanup evidence.
- Users can report safety concerns and block other accounts.
- Administrators can review reports, disputes, photos, payment state, and safety
  issues.
- The app includes real-money contributions and conditional cleanup rewards
  processed by Stripe; these are not gambling, contests, or charitable
  donations.
- There is no sexual content, simulated gambling, game wagering, or graphic
  violence built into the app.
- Real-world litter photos can occasionally contain unpleasant waste or unsafe
  objects submitted by users. The app warns cleaners not to handle hazardous
  material and provides reporting and review controls.
- The app is not directed to children under 13; cleanup claims are limited to
  adults age 18 or older.

Do not guess the final rating. Submit complete answers and review the calculated
IARC ratings before release. Official reference: [Content rating requirements](https://support.google.com/googleplay/android-developer/answer/9859655?hl=en).

## Store-listing assets

The minimum safe listing set is now prepared in
`release-assets/google-play/`: one 1024 by 500 feature graphic and four 1080 by
2340 portrait screenshots captured from the current Android internal release
candidate. The accompanying README records alt text, source build, and privacy
constraints. Nothing has been uploaded to Play Console.

Capture assets from the final Android release candidate, with no sample or
private user data visible.

- App icon: final production icon from `apps/mobile/assets/icon.png`.
- Feature graphic: 1024 by 500, JPEG or 24-bit PNG without alpha.
- Phone screenshots: capture at least four portrait screenshots at 1080 by
  1920 or higher, even though Play's publishing minimum is two.
- Recommended screenshot sequence:
  1. Main map discovery screen with current nearby reports.
  2. Reports list with real report photos and distance context.
  3. Report detail with reward and safe sharing controls.
  4. New-report flow showing location, details, and required photo.
  5. Cleanup claim/evidence flow and safety acknowledgment.
  6. Contribution amount, fee, and total before Stripe payment.
  7. Profile, rank, and cleanup impact.
  8. Account controls, privacy, and account deletion.
- Remove notifications, personal emails, exact private coordinates, payment
  details, debug banners, and seeded preview cases before capture.
- Add concise alt text to each graphic.

Official reference: [Google Play preview asset requirements](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en).

## Console checklist

- [ ] Permanent Play owner and backup administrator chosen.
- [ ] Production app created once with `com.litterbugs.app`.
- [ ] Developer identity, contact details, and recovery methods verified.
- [x] Current signed production AAB inspected; no store upload made.
- [ ] Play App Signing enabled after upload.
- [ ] Play signing SHA-1 added to the production Maps key.
- [ ] Privacy and deletion URLs saved and rechecked.
- [ ] Data Safety form reviewed against final app and all service providers.
- [ ] Content-rating questionnaire completed accurately.
- [ ] Target audience set to 13+; cleanup eligibility still enforced at 18+.
- [ ] App-access review credentials prepared if Google cannot review public
  functionality without signing in.
- [ ] Store description and support contact match the live website.
- [x] Final Android minimum screenshot set and feature graphic captured locally.
- [ ] Internal testing track configured only when the owner authorizes a Play
  Console upload.
- [ ] Internal-track install verifies Maps, Google/Facebook/email sign-in,
  report photos, contributions, deletion, and notifications.

No box requiring a Play Console mutation is complete until the authorized
account holder performs and verifies it in the console.

## Current internal Android candidate

The fresh production-identity internal APK finished and passed a simulator
smoke check on September 1, 2026. It was not uploaded to Play Console.

- EAS build: `d47cd626-9889-48cd-9560-bec5aba735fa`
- Source commit: `a2aec0e131d3ebff9ca6f10e44280fc7e6cb1c1a`
- Package/version: `com.litterbugs.app` / `1.0.0` (`8`)
- Minimum/target SDK: 24 / 36
- APK SHA-256:
  `473205396c0f8010c6d90b778c25142e9e6c6eb723b483db28875fe9faaa86c1`
- `RECORD_AUDIO` and `SYSTEM_ALERT_WINDOW` are absent from the packaged
  manifest.
- Verified on the API 36 emulator: cold launch, welcome screen, map-first guest
  discovery, production Google Map rendering, location permission flow,
  reports list, guest profile, provider choices, email sign-in sheet, and email
  account-creation sheet.
- No application crash or fatal React Native error occurred during the pass.

The only public report visible during this clean-device pass was the August 18
`Litter Report`. Its database row has no photo paths, so the list correctly
showed the neutral no-photo state. The report remains untouched until its owner
confirms whether it was test data.

## Current signed Android bundle

The production AAB finished on September 2, 2026. It is locally inspected and
ready for the future first Play upload, but it was not uploaded or submitted.

- EAS build: `fff735c5-7a15-4854-962f-ee0b6e7e0a4a`
- Source commit: `9cc1440d944d06cde16f035f3423338f5921198f`
- Package/version: `com.litterbugs.app` / `1.0.0` (`10`)
- Minimum/target SDK: 24 / 36
- AAB SHA-256:
  `b7a50a8c92156a9e6f28785053c50c43295a395786b53f0dd7172d8ccad7dbf5`
- Upload-certificate SHA-1:
  `79:E6:D2:50:03:74:57:40:DE:02:EB:F9:8F:3A:20:1D:58:85:73:4C`
- `bundletool validate` passed; `jarsigner` verified the signed bundle entries.
- The bundle is not debuggable, and its packaged manifest excludes
  `RECORD_AUDIO` and `SYSTEM_ALERT_WINDOW`.
- Facebook sign-in is excluded from this public bundle until Meta provider
  review is complete; Google and email remain available. Invited Facebook
  testing continues through the signed internal profiles.

The Play App Signing certificate remains unavailable until the authorized
account holder makes the first Play upload and enables Play App Signing. That
certificate is different from the upload certificate recorded above.
