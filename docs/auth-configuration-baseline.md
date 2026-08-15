# Litterbugs Auth Configuration Baseline

Recorded on 2026-08-14 before any Auth configuration changes.

## Project boundary

- GitHub repository: `jameslukebdev/litterbugs_app`
- Supabase project ref: `mvaygkflcjswtwchflrk`
- Existing production iOS bundle ID: `com.litterbugs.app`
- App Store listing: `Litterbugs: Community Cleanup` (`6757313862`), published by James Luke Barber
- Deferred Android package ID: `com.litterbugs.app` (no existing Google Play listing was identified)
- Deep-link scheme: `litterbugs`
- The retired prototype is not a source for code, credentials, provider records, or EAS configuration.

## Existing Supabase Auth settings

The public Auth settings endpoint reported:

- Email signup enabled
- Email auto-confirm enabled
- Anonymous sign-in enabled
- Google disabled
- Apple disabled
- Facebook disabled
- Phone auto-confirm disabled
- Redirect allow list: `exp://127.0.0.1:19000`, `exp://192.168.1.204:19000`, `exp://*`, and the legacy `litterbugs://auth-callback`

The disabled Apple, Google, and Facebook provider forms contained dormant values. They were not validated as belonging to this app and must not be reused. No provider secret was revealed or copied during the baseline review.

The Supabase dashboard showed a Free project with no backups, migrations, or database branches. This feature does not change database schema, RLS, Storage, reports, or existing user data.

## Intended Auth-only changes

- Disable email auto-confirm so new email/password users must verify their address.
- Add `litterbugs://auth/callback` and `litterbugs://auth/reset-password` to the Auth redirect allow list.
- Configure a new Google OAuth client, Apple app/service records, and Facebook app specifically for this Litterbugs app.
- Configure custom SMTP using `support@litterbugs.app` only after valid SMTP credentials are available.

Provider and SMTP secrets must stay in their provider consoles and the Supabase dashboard. They must never be written to this repository.

## Applied on 2026-08-15

- Enabled **Confirm email**, disabling email auto-confirm for future email/password signups.
- Added `litterbugs://auth/callback` to the redirect allow list.
- Added `litterbugs://auth/reset-password` to the redirect allow list.
- Preserved all four existing redirect URLs for compatibility.
- Verified the saved settings after reloading the Supabase dashboard.

Google and Facebook are now enabled with new Litterbugs-specific provider records. Apple remains disabled while production Apple-team setup is deferred. Custom SMTP is still pending a valid mail-provider login and SMTP credential.

The live SMTP page was read back again on 2026-08-15. Custom SMTP is off and all custom sender/host/username/password fields are empty, so no prior SMTP secret can be reused. A separate root `litterbugs.app` sending-domain entry was created in Resend for the requested `support@litterbugs.app` sender. Its isolated DKIM, `send`-subdomain MX/SPF, and monitoring-only DMARC records were added to Cloudflare without changing website or inbox routing. Resend verification is pending DNS propagation. No unsaved SMTP form changes were left in the dashboard.

## Manual rollback

Because this Free project has no Auth-settings backup, rollback is manual:

1. Disable Google, Apple, and Facebook in Supabase Auth Providers.
2. Re-enable email auto-confirm if the former behavior is required.
3. Remove the two `litterbugs://` redirect URLs if the app no longer uses them.
4. Restore the previous SMTP configuration in the dashboard.

No database rollback is required because this work makes no database changes.
