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
