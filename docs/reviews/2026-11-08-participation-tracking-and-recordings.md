# Participation tracking and new phone recordings — November 8, 2026

## Release boundary and recording evidence

- Reviewed Clarity's latest recordings on November 8 around 2:20 p.m. EST.
  Compared against the last recorded production release, `f08518c`, created
  November 7 at 9:54:03 p.m. EST. Creation time is a conservative release cutoff,
  not an independently verified promotion timestamp.
- Two available phone recordings started after that cutoff: Mobile Safari at
  midnight (38 seconds) and 9:44 a.m. (5 minutes 58 seconds). Both remained on the
  homepage, recorded zero taps, and showed Page hidden at 00:01. The first also
  showed Page hidden at 00:37. Reviewed playback and event timelines; hidden-page
  time is not active engagement. The newer visit carried Instagram bio tags.
- Their captured homepage includes the branded layout, but neither exercises
  the map, report form, funding flow or cleanup flow. No new blocker established;
  these clips cannot demonstrate improved participation or validate map fixes.
- PostHog mobile event inspection from the release cutoff through this check
  also found a newer Chrome session visiting home, About, Support, Communities,
  then home. No map pageview or participation event appeared in this window.
  That session was not available in the Clarity list at review time. Its staff
  status is unknown; do not treat these observations as a conversion rate.
- Sources: [Clarity recordings](https://clarity.microsoft.com/projects/view/z60itnrbpn/impressions?date=Last%203%20days)
  and [PostHog project](https://us.posthog.com/project/695338).
  No production test visits, project-setting changes or recording labels added.

## Five local tracking additions

| Addition | Observable signals |
| --- | --- |
| Map discovery | Search submission, selected location, empty/error search; settled map results, empty/error loads; closest-report request/result/view; map report openings |
| Payout setup | Open, loader start, first form step, exit, close/back, hosted recovery, failures, and readiness confirmed by the server |
| Workflow version | Fixed `web-participation-2026-11-07-v2` on PostHog events and Google event calls |
| Entry source | Fixed categories such as homepage, map pin, report list, report link and account; retained in memory for subsequent participation steps |
| Explicit decisions | Cancel, save for later, draft resume/discard and start new; explicit save is counted only after storage succeeds |

Pending/stale map responses and aborted requests do not masquerade as empty
results. Payout form exit is not completion: `ready` requires a server-observed
transition to enabled; an already-enabled account is `already_ready`.
`onLoaderStart` is distinct from the first form-step event because Stripe's
loader callback may represent loading UI. No provider step names are recorded.

New payloads use allowlisted stages/categories and coarse count/distance buckets.
They exclude search text, report/member/account identifiers, coordinates, draft
contents, raw errors and financial/identity details. Entry context is in memory,
so a full reload/external-browser return may lose it. Existing exclusions,
privacy signals and recording settings remain in force. Page hiding is not
labelled abandonment. Standalone report pages retain their existing pageviews;
the new `report_opened` event covers openings inside the map.

## Verification and hold

- Current shared local tree: 12 focused test files, 165 tests passed with one
  worker and a capped heap. TypeScript passed. Scoped ESLint: zero errors, one
  unused image-rule suppression warning from the concurrent payout heading
  refactor. Diff whitespace checks passed.
- Includes safe-payload/consent checks, pre-SDK buffering, source propagation,
  settled-result/error distinctions, closest recovery, explicit draft-save
  decisions and server-confirmed payout readiness. The earlier broad suite was
  interrupted by the computer restart; no full-suite pass is claimed.
- Only tracking hunks are committed from shared files. Concurrent payout
  prewarming/reuse/layout, deletion confirmation, auth, profile, sharing and
  support changes remain preserved separately in the working tree.
- Local only: no push, deployment, migration, payment, report/cleanup submission,
  identity/bank entry or agreement acceptance. Production ingestion of the new
  event families remains a post-release check. New local-only screens cannot
  appear in visitor recordings until deployed.
