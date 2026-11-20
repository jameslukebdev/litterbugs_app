# Donor privacy website release

Grant authorized the GitHub push and live deployment on November 19, superseding
the earlier local-only hold for this feature.

## Preservation

- Release starts at Claude's live favicon commit `4325be7`, based on the previous
  combined website release `2a5dbec`. Claude's seven favicon/layout files are
  byte-identical to that release; the live favicon was also compared directly.
- No reset, rebase, checkout replacement or force-push of the shared workspace.
  All 2,085 non-ignored source files, status and tracked binary diff were backed
  up before assembly. Unrelated mobile, notification and payout changes remain
  in the shared workspace and were not added to this release.
- The release adds donor names and anonymity, synchronized report details and
  timelines, visible empty-state measurement, and the reviewed checkbox/menu
  improvements. Local preview/mockup pages were excluded.

## Checks before deployment

- 1,210 website tests passed across 164 files after setting up the isolated
  checkout's workspace dependencies. Typecheck and production build passed.
- The real checkout handler with isolated PostgreSQL, public credit, owner
  mutations, funder rankings and financial integrity passed integration checks.
  Eleven checkout-handler tests passed as well.
- ESLint reports zero errors and four inherited unused-argument warnings.
- The inherited web-boundary script flags the existing embedded-payout local
  bridge and Stripe Connect dependencies. Those files are byte-identical to
  the base release and this release adds no new boundary violations.
- Credential scan is clean. Only the new nullable visibility field and three
  scoped APIs plus the funder filter are changed in the production migration.
  The existing reservation API, prices, financial ledger amounts, payout rules,
  app clients, other Edge Functions and schedules remain unchanged.

## Deployment sequence

1. Commit and push this release branch.
2. Stage a production-environment website build without assigning the domain.
3. Apply `20261120010000_cleanup_contributor_visibility.sql` and record its
   exact version/name/statements in migration history in the same transaction.
   Verify financial fields remain identical inside the migration transaction.
4. Deploy only `create-cleanup-contribution`, retaining its existing JWT setting
   and in-function account validation. The exact pre-release bundle was saved.
5. Verify the staged website and sanitized public donor reader, then promote
   that tested build. Confirm Claude's favicon and the reviewed feature live.

Production rollback target captured before release:
`dpl_7oderqZgmmcZYfxRRK8VpZGvuqHC`.

Final source, deployment IDs and post-release checks are recorded in the handoff
after promotion. No live payment is used as a deployment test.

## Live outcome

- Deployed source: `ee03802e163b0ce47fe750a2bbbf2dd9938b8eb0`.
- Branch: `codex/donor-privacy-release-20261119` (pushed to GitHub).
- Production build: `dpl_CmFQNjduJ1pyQboeKs1nM7bBdtsS`, Ready and promoted
  without a rebuild to https://litterbugs.app.
- Supabase migration `20261120010000_cleanup_contributor_visibility.sql` applied,
  history recorded, payment amounts/statuses unchanged inside the transaction.
- Only `create-cleanup-contribution` updated: ACTIVE version30, existing JWT
  configuration retained, downloaded handler and shared sources match the commit.
- Owner Hide/Show and nonowner denial verified against production inside a
  rolled-back transaction. No lasting donor setting change and no real payment.
- Live browser: two real $25 Lynne Daughtridge entries below About this report;
  timeline shows 16:43 and16:47 UTC confirmations separately; no page errors.
  Card menu has See full report and Hide, identical 306×386.75px card geometry
  before and after opening. Visitor analytics excluded in the checking browser.
- Claude's live SVG/ICO match source bytes. Preview page returns404, both local
  API POSTs return404 in production (unsupported GETs return405).
- Security advisor comparison by stable cache_key: three expected new warnings
  for deliberately granted SECURITY DEFINER functions. Public credit function
  exposes sanitized donation fields only; visibility function enforces owner,
  permanent account, completed/nonrefunded payment. Anonymous ledger access and
  owner mutation denied. Existing warnings are unchanged.
- CLI50.43 authenticated as grant-9890 using existing project/team. Followed the
  official get-started guide; global Codex MCP setup could not write read-only
  ~/.codex/config.toml. No Vercel MCP session was established. CLI release works.
- Inherited boundary warnings documented above remain; local signed-in browser
  checkout/receipt flows and exact handler integration passed before release.
  No authenticated live browser checkout or new charge was performed.
