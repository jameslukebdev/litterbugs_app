# Social sharing report links

Litterbugs shares public report URLs using this stable structure:

```text
https://litterbugs.app/reports/<report-id>
```

Only available reports and completed cleanup impact records receive Share actions.
Pending cleanup states remain unshareable. Shared copy does not contain report
coordinates or non-public profile fields.

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

The AASA file lists both the current Apple team `DB39U76V6Q` and the receiving
team `RLXNU225W4` for `com.litterbugs.app` so the website is ready for the
planned App Store transfer. The Android association uses the production EAS
keystore SHA-256 fingerprint recorded on August 28, 2026. If Google Play App
Signing is enabled later, add the Play app-signing certificate fingerprint to
the association file before release.

## Deployment and testing order

1. Deploy the web changes so both `/.well-known/` association endpoints are
   publicly available over HTTPS without redirects.
2. Enable or verify Associated Domains for the current Apple App ID.
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
