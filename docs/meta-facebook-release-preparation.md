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

The physical Pixel 5 completed Facebook login after the account holder entered
credentials directly on the phone. The first callback opened an older installed
Expo development client (`com.litterbugs.app`) instead of the QA candidate
(`com.litterbugs.app.qa`): both register `litterbugs://`. Android activity state
confirmed the old app's DevLauncherActivity was foreground.

Temporarily disabled the older package with Android's disable-user setting;
its installation and data remain intact. Retried the current QA app's Facebook
button, selected Continue as Grant, and observed the callback return to the QA
app, account loading, and authenticated Profile → Settings. The profile showed
Grant Gibson and the signed-in email was `gegibson@icloud.com`, distinct from
the previously tested Google account `grant@burrowbase.com`. No accounts were
merged. This proves existing administrator-account Facebook login on physical
Android. It does not prove first-time non-role access or an iOS Facebook run.

Keep the old development copy disabled while testing this candidate. To restore
it later, use `adb shell pm enable com.litterbugs.app`; ensure only the intended
build handles the shared callback before repeating OAuth. No app code change
was required for this device installation conflict. The Meta app remains
unpublished; public release review and separate tester coverage remain pending.

## Verification evidence to retain

- Screenshot of the business verification status.
- Screenshot of app roles and tester invitation acceptance, without secrets.
- Screenshot of iOS and Android platform identifiers.
- Screenshot of valid OAuth redirect URIs and website domains.
- Date, app build ID, tester account type, and result of the first-time login.
- Date and result of Meta's provider/app review.

Never capture or commit the App Secret, access tokens, identity documents, or
recovery codes.

## Unpublished review draft — September 10 evening

Submission `1477683437529176` is **Not submitted**, requesting only `email`
and `public_profile`. Meta offers a simulator build upload instead of reviewing
the older App Store app. Selected that option and saved reviewer instructions
for Profile → Sign in or create account → Continue with Facebook → Profile /
account settings. The draft explicitly identifies browser OAuth through Supabase
and says no payment is needed for login testing. Facebook Login is marked Yes.
The draft remains incomplete and no submission or publication was triggered.

A current universal simulator Release build (arm64 and x86_64) is being prepared
locally with two build workers, without booting a simulator. This provides a
review-artifact route independent of Luke's Apple signing. Artifact compilation,
launch verification, packaging and upload remain pending.

The pre-filled data-handling page lists Supabase, Inc. as processor, Grant Gibson
as responsible controller, United States, no national-security disclosures in
the previous 12 months, and none of the listed government-request policies.
These are **historical answers, not newly verified facts**. Do not submit them
as current truth or infer company history from code. Reconcile the controller
with Burrow Base and inventory any other processors receiving Meta-derived
account data before submission; obtain account-holder confirmation for the
historical disclosure/policy questions. No pre-filled answer was changed during
this inspection.

Meta's Test User Accounts screen offered creation of one simulated Facebook
account. Requested one adult English-US account without automatic app
authorization to preserve first-time consent coverage. The dialog returned no
success or error, and the account list remained empty after returning to it.
No simulated account or usable credentials were obtained. Do not claim separate
tester coverage; use a real accepted tester or resolve Meta's test-account
creation before that check can pass. The request was not repeatedly submitted.

### Additional processor evidence from current source

The Supabase-only pre-filled processor list is incomplete for accounts that
use financial features: `create-cleanup-contribution/index.ts:84` sends
`user.email` to Stripe as receipt email, and
`create-cleaner-onboarding-link/index.ts:86` sends account email and profile name
to Stripe Connect. For Facebook-created accounts these fields may be derived
from Meta. Include Stripe in the processor assessment rather than declaring
that Supabase is the only recipient. These findings came from source inspection;
no contribution, payment, or cleaner account was created to test them.
