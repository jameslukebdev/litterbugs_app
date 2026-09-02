# Meta and Facebook Login Release Preparation

This packet records the exact account-holder work needed before Facebook Login
can be offered to the public. It does not publish the Meta app or impersonate
an account holder.

## Current configuration

| Item | Value |
| --- | --- |
| Meta app | Litterbugs Community Cleanup |
| App ID | `1477683410862512` |
| Business portfolio | Litterbugs Community Cleanup |
| Portfolio ID | `863596096684215` |
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

## Account-holder checklist

- [ ] Sign in to the Litterbugs-owned Meta business portfolio.
- [ ] Confirm Burrow Base LLC's legal name, address, phone, domain, and business
  documents are accurate and controlled by the company.
- [ ] Complete any business-verification request shown by Meta.
- [ ] Confirm at least two trusted people have appropriate business access and
  strong two-factor authentication.
- [ ] Confirm the Meta app remains in portfolio `863596096684215` and is not
  attached to an unrelated business.
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

## Verification evidence to retain

- Screenshot of the business verification status.
- Screenshot of app roles and tester invitation acceptance, without secrets.
- Screenshot of iOS and Android platform identifiers.
- Screenshot of valid OAuth redirect URIs and website domains.
- Date, app build ID, tester account type, and result of the first-time login.
- Date and result of Meta's provider/app review.

Never capture or commit the App Secret, access tokens, identity documents, or
recovery codes.
