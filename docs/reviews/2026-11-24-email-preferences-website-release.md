# Email preferences website release — November24,2026

Grant authorized website/backend deployment in the current chat after the local
verification pass. Native OTA publication remains on hold.

The release starts from the exact live website source ee03802e163b0ce47fe750a2bbbf2dd9938b8eb0,
production deployment dpl_CmFQNjduJ1pyQboeKs1nM7bBdtsS. Only the prepared email
feature is applied: account settings/preferences, public unsubscribe POST,
existing-admin/MFA recipients/export/footer, privacy disclosure and shared types.
The privacy metadata and existing donor types were retained when merging. No
native app source, unrelated shared checkout changes, or sending integration
is included. The shared checkout was not reset or staged.

Checks: all1219 web tests/167 files passed, three shared contract tests passed,
full website TypeScript passed, lint has zero errors and four inherited unused
argument warnings. Test runner required NODE_OPTIONS=--no-experimental-webstorage
with its local Node runtime. Disposable PostgreSQL migration and role-isolation
checks passed. Live preflight confirms the existing admin guard requires MFA and
the email feature/history are absent. The migration is additive and enables RLS
on private tables, fixed-search-path private privileged functions and narrowly
granted public invoker wrappers. No delivery or scheduling is enabled.

Release sequence: stage a production-environment build without moving domains;
apply only20261124211058_weekly_email_preferences.sql and exact migration history
in one guarded transaction; verify backend/role access; promote that staged build;
verify live settings, unsubscribe and access gates. Keep email suppression on any
website rollback. Previous website deployment above is the rollback target.

Release evidence: /tmp/litterbugs-email-web-deploy-20261124/. Post-release IDs,
checks and any limitations will be appended after completion.


## Deploy result

- URL: https://litterbugs.app
- Target/status: production / READY
- Source: 00ed6769e72696d4258b9ed428118d5ca810dd90
- Branch: codex/email-preferences-web-release-20261124
- Deployment: dpl_ChohVa5bmXref91Qze5TH8a8Ewr7
- Staged build: https://litterbugs-67x6qcbfu-grant-9890s-projects.vercel.app
- Framework/build duration: Next.js16.3.0 /21 seconds (42 seconds total deploy).
- Previous website rollback: dpl_CmFQNjduJ1pyQboeKs1nM7bBdtsS.

Applied only20261124211058_weekly_email_preferences.sql to production project
mvaygkflcjswtwchflrk, with exact source/history in the same guarded transaction.
Backfilled93 non-guest email addresses subscribed by default. The final stored
migration SHA256 matches the committed file. All three private tables have RLS;
all public wrappers are invokers. No Edge Functions, schedules or sending changed.

Production role tests verified owner reads, non-admin denial, private-table
protection, service-only unsubscribe, admin without MFA denial and admin with MFA
success. Test writes were rolled back. The real browser staff account then used
Profile → Settings → Email preferences, unsubscribed through the public form,
reloaded to observe off, saved on again and reloaded to verify restoration.
The staff account's final subscribed state is true; no other member preference
was changed by testing. The browser remains excluded through Analytics choices.

Public anonymous preference/list RPCs return401. GET on the unsubscribe API
returns405; foreign-origin POST returns403. Public unsubscribe/preferences/admin
pages return200, and the privacy disclosure/effective date are live. Browser
screenshots and result JSON are in the evidence directory above. Production admin
role/MFA checks were SQL-tested; the recipient dashboard/export behavior was
browser-tested locally. No new MFA credential or admin access was configured.

Post-deploy observability: zero runtime error records for this deployment in the
15-minute scan. Security advisors remain58 before/after with zero new issues.
Existing monitoring/drains were not modified or newly configured. No email was
sent, and no app OTA, native/store build, upload or publication occurred.
Native OTA work must use the prepared mobile implementation checkout, not this
website release branch's unchanged mobile files. Keep suppression/history if
rolling the website back. The previous website/backend hold is superseded only
for this release; the app OTA hold and recorded Gmail sending-policy finding remain.
