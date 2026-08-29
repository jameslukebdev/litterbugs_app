# Social sharing report links

Litterbugs shares public report URLs using this stable structure:

```text
https://litterbugs.app/reports/<report-id>
```

Only available reports and completed cleanup impact records receive Share actions.
Pending cleanup states remain unshareable. Shared copy does not contain report
coordinates or non-public profile fields.

## Destination behavior

The website uses a destination-specific composer where the platform provides
one. Every destination requires the person sharing to review and confirm the
post or message; Litterbugs never posts automatically.

- **Facebook:** the official Facebook Share Dialog opens with the existing
  Litterbugs Meta App ID and the public report URL. Facebook builds its preview
  from the report page's Open Graph metadata and branded image.
- **WhatsApp:** `wa.me` opens the contact picker with the report message and URL
  prefilled.
- **X:** X's Web Intent opens a new-post composer with the report message, URL,
  and `#Litterbugs` hashtag prefilled.
- **Email and text message:** the operating system's email or SMS composer opens
  with privacy-safe report copy and the public report URL.
- **Instagram on desktop web:** Instagram does not provide a documented web
  sharing URL that uploads media or prefills a post for an arbitrary visitor.
  Litterbugs opens Instagram Create, downloads a 1080×1350 branded report card,
  and copies the prepared caption so the user can upload and confirm the post.
- **Installed apps / More apps:** when Web Share file support is available,
  Litterbugs includes the branded report card with the report text and URL.
  Otherwise it shares the text and URL.

The native Expo app keeps Luke's React Native share-sheet implementation. Meta's
direct Instagram Stories integration requires native Android implicit intents
or the iOS `instagram-stories` custom URL scheme, a Facebook App ID, and a local
image asset. It cannot be implemented by adding a website URL or JavaScript-only
Expo change. A future targeted native Stories button should be implemented as a
small native sharing module and tested in a new physical-device build.

## App-opening behavior

- iOS Universal Links use `applinks:litterbugs.app` and the website AASA file.
- Android App Links use a verified HTTPS intent filter and the website Digital
  Asset Links file.
- React Navigation maps `/reports/:reportId` to the existing Map screen, which
  fetches and opens that report without changing the navigation architecture.
- The report webpage retains a custom-scheme fallback for same-domain Safari
  navigation and sends iOS or Android users to the relevant store when the app
  cannot be opened.
- The report webpage includes an Apple Smart App Banner with the report URL as
  its app argument.

The interim `development-primary`, `production-internal`, and `production`
profiles set `ENABLE_IOS_ASSOCIATED_DOMAINS=false`. This lets every current
`com.litterbugs.app` build, including the App Store build, use Luke's existing
provisioning profile while its Associated Domains capability is unavailable.
Shared report URLs continue to open the web report, and Android App Links remain
enabled. After the Apple capability is available, remove that override or set it
to `true`, rebuild iOS, and complete the native link-opening check below.

The AASA file lists both the current Apple team `DB39U76V6Q` and the receiving
team `RLXNU225W4` for `com.litterbugs.app` so the website is ready for the
planned App Store transfer. The Android association uses the production EAS
keystore SHA-256 fingerprint recorded on August 28, 2026. If Google Play App
Signing is enabled later, add the Play app-signing certificate fingerprint to
the association file before release.

## Deployment and testing order

1. Deploy the web changes so both `/.well-known/` association endpoints are
   publicly available over HTTPS without redirects.
2. For the current interim release, keep Associated Domains disabled in the iOS
   EAS profile. After the app transfer, enable and verify it for the receiving
   organization's Apple App ID.
3. Create a new `development-primary` or production native build. The existing
   installed development client cannot gain new associated-domain entitlements
   from a JavaScript update.
4. Install the new build, then test a report link from Messages or Notes rather
   than entering it directly in Safari's address bar.

## Remaining deferred-link limitation

This implementation does not preserve the report ID through a first-time App
Store or Google Play installation. After installing, the user must tap the
original report link again to open that exact report. Reliable post-install
continuation would require a separate deferred-deep-link service or a platform
install-referrer flow and is intentionally outside this focused implementation.
