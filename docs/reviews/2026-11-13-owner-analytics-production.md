# Owner analytics production verification — November 13, 2026

Owner authorized the website dashboard deployment and GitHub push, excluding
unreleased app work. The live dashboard is https://litterbugs.app/admin/analytics.

- Production source: `388c9303e8ed30c2287b7901d9bbacbf32112510`.
- Release branch: `codex/website-analytics-20261113`, based on prior live `5c32ab8`.
- Deployment: `dpl_8MYNXYQc8CDo2aHCUTCgy3ATLFQT`.
- Immutable URL: https://litterbugs-inisg26me-grant-9890s-projects.vercel.app.
- Previous production/rollback: `dpl_6HFe4Af232YP6LiQjUPDw3pWKkhg`,
  https://litterbugs-cp5ftn8up-grant-9890s-projects.vercel.app.
- Migration applied and history recorded: `20261113191709_owner_analytics_hosted_connections.sql`.
  No other pending migration was applied.

## Verified against the hosted dashboard

The existing real admin/MFA browser session rendered these values from hosted
connections, without local files, CLI authentication or snapshots:

| Metric | Complete 7 days, Nov 6–12 | Complete 28 days, Oct 16–Nov 12 |
| --- | ---: | ---: |
| PostHog website visits | 108 | 222 |
| Completed cleanups | 4 | 9 |
| Cleanup funding principal | $37 | $77 |
| New litter reports | 6 | 26 |
| Active contributor accounts | 5 | 7 |
| Current available backlog | 14 | 14 |

Website view returned Google acquisition channels and GSC final search data:
7-day GSC window Nov 4–10 had 5 clicks/26 impressions; 28-day Oct 14–Nov 10
had 11 clicks/72 impressions. A direct refresh of the same read-only OAuth
credential also successfully queried both APIs. GA sessions (86 for Nov 6–12)
are intentionally not substituted for PostHog website sessions.

Clarity returned a real rolling observation at 19:30:53Z: 30 sessions, 0% rage,
6.67% dead clicks, 16.67% quick returns and 0% script errors. After switching
periods and overview/website/app views, its shared database ledger still showed
exactly one completed attempt and the same six-hour next-attempt time. This
verifies hosted credentials, the admin-session RPC, successful persistence and
shared quota reuse. No recording or visitor identity is stored in the cache.

The App tab correctly says activity will appear after the app update is live.
No app release flag was enabled. Production app queries keep their production/
test/emulator exclusions; no mobile source diff, lockfile update, native build,
mobile update or store submission was part of the release.

Automatic page refresh is five minutes while visible; successful Google/PostHog
reads refresh at 15-minute cache intervals. Business totals reload with the page;
Clarity refreshes at most every six hours. Providers retain their own reporting
latency. Timer visibility, focus, cleanup and selected-period preservation are
covered by the passing auto-refresh tests; this audit did not wait six hours to
observe a second real Clarity export.

## Access, build and regression checks

- 86 focused tests passed across owner providers/cache/business/model, dashboard,
  access gates, automatic refresh and analytics exclusions.
- Website typecheck and scoped ESLint passed; Vercel production build compiled,
  typechecked and generated routes successfully on Linux.
- Read-only business SQL fixture passed for both periods: NY/DST date boundaries,
  store-review exclusions, real refunds, final submissions and reconciliation.
- Before migration application, SQL admin/MFA, private grants, aggregate periods,
  one-use leases, payload allowlist, shared cooldown and daily quota checks passed
  in BEGIN/ROLLBACK. They passed again against the applied migration, also rolled
  back. No production report/user/payment fixtures were created or changed.
- Staged production used Vercel's authenticated CLI access to check the signed-out
  gate before promotion. After promotion the public domain returned the sign-in
  gate with no totals, private/no-store caching and HTML noindex/nofollow metadata.
- Website admin routes suppress visitor analytics. The existing excluded staff
  browser was used; no extra tracked visitor session was required.
- Release diff against prior production has no `apps/mobile`, package-lock or
  website dependency changes. Only website/dashboard, two RPC type declarations,
  analytics SQL/scripts and supporting documentation were added.

Known unchanged checks: `check-web-boundaries.mjs` fails on the existing local
payout Stripe secret variable and existing Stripe Connect dependencies. All four
flagged files are byte-identical to prior production; they were not changed for
this dashboard. Vercel also repeats the pre-existing social-card dynamic file
tracing warnings; that source is unchanged. Neither was represented as passed.
