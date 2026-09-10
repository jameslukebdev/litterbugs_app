# Meta and Facebook Login Release Preparation

This packet records the exact account-holder work needed before Facebook Login
can be offered to the public. It does not publish the Meta app or impersonate
an account holder.

## Current configuration

| Item | Value |
| --- | --- |
| Meta app | Litterbugs Community Cleanup |
| App ID | `1477683410862512` |
| Business portfolio | Burrow Base (verified August 15, 2026) |
| Portfolio ID | `4302410929978959` |
| Current full-access administrator | Grant E Gibson |
| Production iOS bundle | `com.litterbugs.app` |
| Production Android package | `com.litterbugs.app` |
| App Store ID | `6757313862` |
| OAuth callback | `https://mvaygkflcjswtwchflrk.supabase.co/auth/v1/callback` |
| App-facing bridge | `https://auth.litterbugs.app/start` |
| Requested permissions | `public_profile`, `email` |

Facebook uses Supabase's secure browser OAuth flow. No Meta client token or App
Secret is packaged in the mobile app. The App Secret remains in Meta and the
Supabase provider settings.

## Production transport check

On September 1, 2026, the production bridge returned its no-store, framed-deny
handoff page for an allowlisted Supabase authorization target. The Supabase
authorization endpoint then returned a 302 to Facebook with:

- Meta application ID `1477683410862512`;
- callback `https://mvaygkflcjswtwchflrk.supabase.co/auth/v1/callback`;
- app return target `litterbugs://auth/callback`;
- requested `email` scope (Facebook includes the public profile baseline).

This proves that the live bridge and provider handoff are wired to the intended
production identifiers. It does not replace a first-time login by an invited
tester or Meta's business/provider review.

September 10 source check: **all current mobile EAS profiles enable Facebook
login**, including production. The older statement that public mobile builds
hide the button was incorrect. Meta remains unpublished. Its existing app is now connected to the verified
Burrow Base portfolio; the Developer Verification page confirms Verified.
An administrator login does not establish public-user access. Do not publish the Meta app during the current checks.

The callback matches the configured Supabase endpoint. Meta records 29 email
and 31 public_profile API test calls, with both permissions “Ready for testing.”
Its old deletion-instructions URL returned HTTP 404. On September 10 it was
changed to `https://auth.litterbugs.app/delete-account`, verified in Chrome;
Meta confirmed “Changes saved.” No deletion request was sent. Full account findings are in the
[September 10 record](reviews/2026-09-10-store-release-preparation.md).

## Account-holder checklist

- [x] Locate the existing verified Burrow Base business portfolio.
- [ ] Confirm Burrow Base LLC's legal name, address, phone, domain, and business
  documents are accurate and controlled by the company.
- [x] Confirm the app inherits the existing verified Burrow Base business association.
- [ ] Confirm at least two trusted people have appropriate business access and
  strong two-factor authentication.
- [x] Connect the existing Meta app to verified portfolio `4302410929978959`,
  replacing the unverified duplicate portfolio `863596096684215`.
- [ ] Confirm the production iOS bundle, Android package, App Store ID, website
  domain, privacy URL, deletion instructions, app icon, and category all match
  the public Litterbugs product.
- [ ] Confirm the only requested login permissions are `public_profile` and
  `email`.
- [ ] Confirm the exact Supabase OAuth callback remains allowlisted.
- [ ] Verify the app-facing bridge opens and returns to
  `litterbugs://auth/callback` without proxying credentials or tokens.
- [ ] Use a separate invited tester account to test a first-time Facebook login
  while the app is unpublished.
- [ ] Complete any provider or app review Meta requests for public Facebook
  Login.
- [ ] Review the final settings and publish the Meta app only after login passes
  on a release candidate.

While the Meta app is unpublished, real accounts must have an accepted role or
tester invitation. A successful login by an administrator does not prove that
public users can log in.

## September 10 physical Android login check

On the connected Pixel 5, the QA app was signed out, then Profile → Sign in or
create account → Continue with Facebook opened Facebook for app ID
`1477683410862512`, using the expected Supabase callback and app return URL.
Facebook recognized Grant E Gibson and, after Continue, requested the account
password. The account holder must finish this directly on the phone. No password
was entered by the agent. Return to Litterbugs and authenticated profile loading
remain unverified; reaching Facebook alone is not a passing login test.

## Verification evidence to retain

- Screenshot of the business verification status.
- Screenshot of app roles and tester invitation acceptance, without secrets.
- Screenshot of iOS and Android platform identifiers.
- Screenshot of valid OAuth redirect URIs and website domains.
- Date, app build ID, tester account type, and result of the first-time login.
- Date and result of Meta's provider/app review.

Never capture or commit the App Secret, access tokens, identity documents, or
recovery codes.
