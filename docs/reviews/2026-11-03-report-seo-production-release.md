# Report SEO production release — November 3, 2026

Owner authorized deployment of the reviewed report SEO work and sitemap resubmission. The later local map error report was investigated before promotion.

## Live result

- Site: https://litterbugs.app
- Deployment: `dpl_AzEFiuUnqbwFbuMjZKKWmPLJRL92`, READY, production.
- Previous production: `dpl_9qnmH2K61YZ19Gy5e4CKtNdnRp5U` (also verified by inspecting the actual custom domain immediately before promotion).
- Production was staged without assigning domains, checked, then promoted without rebuilding.
- Google Search Console confirmed **Sitemap submitted successfully** for https://litterbugs.app/sitemap.xml. This is receipt, not confirmation of new indexing. Previous submission was October 1; last read before this submission was November 2, with 39 discovered pages.

## Published scope

Report metadata, natural status/date summaries, original photo descriptions, Before/After ordering, related reports, open and historical report directories, navigation links, completed-directory links, city naming, and sitemap report/photo entries. Community listing and navigation dependencies were included so the reviewed report/community links work together. Community names use Boone; the old search alias remains only for lookup. Public coverage copy still explains postal-code boundaries.

The release was assembled against the exact source files of the current production deployment, rather than deploying the dirty checkout. Unrelated mobile, account, payout, and payment changes were excluded. No mobile application or edge function was deployed. The exact changed source files and SHA-256 hashes are saved in `work/report-seo-release-20261103/release-seo-manifest.json`; release evidence is in `work/report-seo-release-evidence-20261103/`.

## Expired report retention

Applied only migration `20261103125813_retain_expired_public_report_history` to linked project `mvaygkflcjswtwchflrk`, in a transaction with a guard against changes to the reviewed function and a matching migration-history entry. No unrelated pending migration was applied.

The migration preserves expiry provenance while retaining cancellation/refund behavior, permits original photos for visible published historical reports, and recovers historical closure provenance only when its audit timestamp exactly matches cancellation. Three legacy records qualified. Post-application checks confirmed all three retained their original expiry date, the function preserves future expiry provenance, and anonymous users cannot execute the private function. No financial transition function was invoked against live reports during verification.

The filesystem photo fallback remains development-only and loopback-only; it is disabled in production. Live expired-photo checks used ordinary anonymous storage access after the migration.

## Verification

- Isolated optimized production build and its TypeScript checks passed.
- 212 focused tests across 31 files passed on the isolated release, including metadata, public visibility, photo handling, social sharing, directories, sitemap, community navigation, analytics exclusion, and preview-versus-production indexing rules.
- The actual migration passed its disposable PostgreSQL lifecycle/storage contract test, including refund behavior and exclusion of withdrawn, unpublished, sample, moderated, deleted, and unattached content.
- Staged and live HTTP checks each passed all 84 requests: 45 sitemap pages, 32 sitemap photos, and seven supplementary directory, pagination, map, robots, and unavailable-report checks. All 27 report pages were linked; four were expired. No unexpected noindex appeared on indexable pages. Filtered local community listings intentionally retain noindex,follow.
- Live browser checks confirmed completed photos load with Before on the left, the expired original photo loads, mobile content has no horizontal overflow, and community result photos load when scrolled into view. Browser error/warning capture was empty. Staff-browser analytics choices were declined before production visits; no analytics-provider requests were observed in the tested map navigation.
- Deployment error-log scan returned zero entries at completion. This is a bounded release-time scan, not a promise about later traffic.

An initial isolated full-suite attempt overlapped dependency installation and produced module-resolution failures; it is not reported as a pass. The focused release tests were rerun after dependency installation settled and all passed. The earlier full local review is separate evidence from these isolated release checks.

## Local map screenshot

The screenshot showed a recoverable server-rendering/Suspense error at the local map. Fresh direct requests, three homepage-to-map browser navigations, staged map HTML, and live homepage-to-map navigation did not reproduce it. No server-error template appeared in fresh responses and no browser error remained. A stale tab following earlier local server rebuilds is plausible, but the original cause was not established; no speculative map fix was made. Refresh the original local tab if its old overlay persists.

## Rollback

The prior website deployment remains available for rollback using Vercel. The expiry migration is backward compatible with the previous website, which simply omits historical pages; do not erase recovered expiry provenance as part of a routine website rollback. Any database reversal should be separately reviewed against the saved before/after evidence.
