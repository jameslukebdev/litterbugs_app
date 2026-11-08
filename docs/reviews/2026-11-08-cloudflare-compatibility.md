# Cloudflare compatibility test — November 8, 2026

## Decision

Do not move the live site yet. Google login, Maps, report entry, funding quotes, volunteer safety entry, report/cleanup photos, generated share images and authenticated photo uploads now work in the separate preview. Upload safety processing still explicitly relays through the existing Vercel service; the preview is not independent of Vercel. Funded embedded-payout setup remains unavailable. Completed report publication, payment, cleanup evidence submission, approval and payout are **not verified** on Cloudflare.

Preview: https://litterbugs-cloudflare-compat-test.gegibson3113.workers.dev

## Latest source and test-isolation follow-up

- Current isolated source `165d89c`, Worker `9e338877-e3b9-4740-a73c-cd0754f1dbb6`.
  Includes main's factual report-history change `9c52d14`; no other main app
  source commits were missing. 23 focused report/analytics tests and production
  Next/OpenNext build/TypeScript pass. Deployed expired report renders the new
  history and original evidence. Preview remains noindex via X-Robots-Tag and
  analytics disabled by default. Live remains Vercel (HTTP 200).
- Labeled preview analytics delivery and actual entry/failure events were
  verified earlier at source `0cd9bc5`; default exclusion restored at `5b2a435`.
  See the handoff log for the 18 actual workflow events and test limits. This
  does not prove successful payment, publication or cleanup outcomes.
- Existing Litterbugs Stripe sandbox `acct_1U2HaBKUBoEpySr6` is accessible, but
  its enabled test payment webhook points to the live Supabase project. This
  was verified from Stripe's API, not just older notes. No test transactions
  were made and no Stripe configuration changed. Isolate the webhook/backend
  before provider payment tests; test cards alone do not isolate this setup.
- Original Cloudmersive account uses SSO; Microsoft sign-in reached portal
  permission consent, awaiting owner confirmation. Its plan/key remain
  unverified. Preview uploads still depend on the exact-host Vercel relay.

## Photo repair follow-up (supersedes initial photo failures below)

- Final isolated source `6debd25`, Worker version `c75c4687-5b90-4284-8643-de49eb4f7d9d`; preview only. Cloudflare Images binding replaces native image processing in this branch; named internal Cache API storage retains encoded photo bytes, with visibility/ownership checked on every request. Brand/font assets use the asset binding. No Vercel, DNS, plan or main application change.
- JPEG/PNG/WebP authenticated uploads passed through the preview's exact-host-only relay to the existing Vercel safety service. Existing bearer validation, destination ownership, quarantine, scanning and sanitization retained; no privileged service key copied to Workers. A temporary unpublished sample report and disposable internal user were removed, along with uploaded objects and scan audit fixtures. Wrong-destination upload denied 403. Direct cleanup fixture insertion was correctly denied; no real claim/waiver was created or bypassed.
- Found an existing browser HEIC dependency mismatch: workspace `heic-decode` 2.0.0 lacks the `dispose()` method used by the client. Pinning 2.1.0 fixes conversion. Actual browser conversion of the official libheif sample produced a 1280×854 JPEG; its authenticated preview upload passed, with metadata removed and hash verified. This fix is isolated and is a candidate for a separate minimal main-branch backport. Cloudflare's managed decoder still rejects that raw HEIC variant (9516); the website converts it before upload. Current public inventory: 86 photos across 42 reports, no HEIC originals.
- 58 focused tests, scoped ESLint, production Next/OpenNext build and TypeScript passed. Final live API checks pass: report detail WebP, before/after JPEG, share PNG, missing/invalid authentication denied. Temporary diagnostic route, browser test page, public fixtures and QA secret removed. Browser carousel and phone-sized before/after switching render without console errors. File chooser was blocked by extension file-URL permission; tested the real browser conversion with a public fixture instead. Physical camera/file selection remains unverified.
- Small speed comparison: four warm HTTP-body responses per host after one warmup, from one computer. Map median Cloudflare 184 ms vs Vercel 303 ms; detail photo Cloudflare 183 ms vs Vercel 93 ms. Different deployment builds, not browser/phone load times or a general hosting benchmark. Evidence: `/tmp/litterbugs-host-speed-after-photo-cache.json`, `/tmp/litterbugs-cloudflare-final-smoke.json`, `/tmp/litterbugs-cloudflare-heic-upload-result.json`. Repaired screenshots: `/tmp/litterbugs-cloudflare-photos-fixed.png`, `/tmp/litterbugs-cloudflare-phone-photos-fixed.png`.
- No schema migrations, actual report publication, charge, cleanup claim, approval or payout. Live HEAD remains HTTP 200 / Server Vercel. Keep held payout backend and Claude's changes untouched. Standalone upload configuration, isolated transaction/workflow tests and physical phones remain migration gates.

The sections below preserve the **initial** compatibility pass and its limitations; the follow-up above records the subsequent repairs.

## Isolation and release

- Main checkout and Claude's localhost:3000 server preserved. Source snapshot `e2da91f`; isolated worktree `/Users/grantgibson/Desktop/Burrow Base/Litterbugs Cloudflare Test`, branch `codex/cloudflare-compatibility`.
- Test-only compatibility commits: `018a0ec`, `9ea86c9`, `0900e6c`. None merged or pushed. Final deployed source `0900e6c`, Worker version `ecb70550-acd0-4dd5-96ed-817bc5b3bc81`.
- New worker only: `litterbugs-cloudflare-compat-test`, account `faccfcc33a9c5b3800416063b6f8bfa5`, workers.dev. No custom routes or DNS changes. Existing auth bridge unchanged. No billing-plan upgrade or purchase made.
- Actual HEAD request to https://litterbugs.app/ after testing: HTTP 200, Server Vercel, x-vercel-id present. No Vercel deployment or alias change made.
- Copied public Supabase/Maps connection values only into ignored test environment. No production service-role, malware-scanner or Stripe secret copied. Build-file inventory found no .env/.dev.vars/private-key files. Analytics disabled in preview; noindex remains on non-live hosts. This preview connects to the real Litterbugs backend: it is not a disposable data/payment sandbox.
- Original untracked `apps/web/app/dev-review-preview/` remains untouched and was not copied to or published in this worktree.

## Compatibility adjustments in the isolated branch

- Next 16.3 / React 19.1 kept. OpenNext Cloudflare 1.19.0 supports the installed Next version; Wrangler 4.125.0. Compatibility date 2026-08-27 matches the installed workerd binary.
- Original Next proxy cannot build in this adapter (Node middleware unsupported). Same validated Supabase session-refresh/noindex logic moved to the older Edge middleware convention, with its tests adjusted. Authentication protection was not removed. This is an adapter-specific branch; do not copy this rename into Vercel without a separate decision.
- Literal social-card asset paths avoid tracing the whole checkout into the server bundle.
- Original eager HEIC imports caused every dynamic page to fail at runtime: WebAssembly code generation disallowed by the Workers embedder. Decoder imports now occur only when processing an image. This permits the rest of the site to run; **it does not fix photo processing**.
- Two Next build workers / 4 GB Node heap used. Existing main dependencies and server left alone. Local workerd test at port 8787 stopped after testing.

## Browser results

Desktop and 393×851 Chrome viewport; this is responsive desktop Chrome testing, not a physical Android/iPhone camera test.

| Area | Observed result | Limit |
| --- | --- | --- |
| Static photos/branding | Homepage marketing images, logo and bug assets render | No IMAGES binding; Next image handler returns originals with a missing-binding warning locally, so optimization is not configured |
| Report photos | Failed: cards/detail show Photo unavailable; public before/after endpoints return missing photo | Local Workers API for a known public JPEG returns 500 conversion error; temporary generated-bundle diagnostic identifies a sharp-related runtime error. Diagnostic removed afterwards; deployed code unchanged |
| Google sign-in | Real existing owner login returns to preview /account and persists after refresh | Email/password and password-reset delivery not tested; separate-user Facebook remains owner-excluded/unverified |
| Map/location | Google Maps renders with markers; location selection opens report authentication as guest | Real location freshness check timed out in this desktop environment; existing Continue as draft fallback opens the photo step |
| Reporting | Signed-in phone layout reaches Add photos, step 1 of 5 | No photo selected, draft content entered or report submitted. Upload handler returns 503 MEDIA_PROCESSOR_UNAVAILABLE in local production-mode Workers test with a deliberately invalid dummy bearer, because privileged configuration is absent; this does not verify authenticated upload |
| Funding | $5 selection fetches a real quote: $5 to cleaner + $1 fee = $6 total; Continue enabled | Stopped before Continue, which creates a live contribution/payment attempt. No Stripe PaymentElement completion, charge, return, webhook or refund test |
| Funded cleaning | Reads payout status; owner without completed payouts enters setup first | Embedded setup reports that secure form could not load. Existing handoff records backend session support is held; localhost works through a development-only bridge. This is not proven to be Cloudflare-specific. Hosted fallback not followed; no identity/bank entry or account-completion action |
| Volunteer cleaning | Quick safety check renders, unchecked consent and disabled Claim this cleanup | No consent accepted, claim made, evidence uploaded, approval or payout performed |

78 existing focused tests passed across middleware, media safety, social photos, photo route, Google/callback, funding and cleanup components. They are application regression checks, not proof of completed provider flows under Workers.

## Narrow test configuration changes

1. Existing development Maps key `litterbugs-web-local` received exactly two extra referrers: `http://localhost:8787/*` and `https://litterbugs-cloudflare-compat-test.gegibson3113.workers.dev/*`. Both existing localhost:3000 entries and all three API targets retained. Production/native keys unchanged. Initial RefererNotAllowedMapError resolved after propagation.
2. Owner explicitly approved allowing preview sign-in. Added the exact preview `/auth/callback` and its `/auth/callback?next=**` return-parameter pattern to Supabase redirects. Existing 13 entries and production Site URL retained. First exact-path-only tests fell back to the live homepage because Supabase matches the full redirect including its query; approved callback with return parameters fixed login. No broad workers.dev wildcard.
3. Two failed redirect tests landed on the live homepage around 4:48–4:49 p.m. EST. Treat these as assistant testing if recorded. Browser analytics turned off through the existing Analytics choices UI afterwards; normal visitor defaults unchanged. Preview never loads visitor analytics.

## Before a migration decision

1. Replace native sharp/image conversion with a Workers-compatible implementation or a separate narrowly authenticated image service. Preserve authorization, malware scanning, metadata stripping, MIME/size/pixel limits, rotation and HEIC handling. Do not bypass those controls to get uploads passing.
2. Configure the private upload/scanner secrets only after validating the compatible processor and reviewing the preview security boundary. Re-test fresh (uncached) report and cleanup photos, including HEIC, and generated share cards. Configure/price image optimization and persistent cache separately.
3. Preserve the held Stripe rollout. When authorized, validate its deployed session endpoint and supported return origin, then verify unfinished payouts resume the same cleanup. Do not deploy backend work as a hosting-test shortcut.
4. Use an isolated Supabase/Stripe test environment and disposable accounts for report creation through publication, payment success/decline/return/webhook, cleanup claim/evidence/approval and payout. Current production project guard needs an explicit test-safe strategy; do not simply weaken it globally.
5. Test on physical Android Chrome and iPhone Safari before replacing Vercel. Supabase dashboard also displays a prior-cycle quota warning with potential restrictions starting Dec 1; hosting migration does not resolve backend quota usage.

Screenshots (local temporary evidence): `/tmp/litterbugs-cloudflare-preview-result.png`, `/tmp/litterbugs-cloudflare-phone-report-ready.png`, `/tmp/litterbugs-cloudflare-phone-funding.png`, `/tmp/litterbugs-cloudflare-phone-payout.png`, `/tmp/litterbugs-cloudflare-phone-safety.png`.

Official references: [Cloudflare OpenNext guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/), [OpenNext setup](https://opennext.js.org/cloudflare/get-started), [image binding](https://opennext.js.org/cloudflare/howtos/image), [Supabase redirects](https://supabase.com/docs/guides/auth/redirect-urls), [Supabase redirect matcher](https://github.com/supabase/auth/blob/master/internal/utilities/request.go).
