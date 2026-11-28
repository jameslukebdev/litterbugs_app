# Public-site branding release — October 30, 2026

Owner approved production rollout of the playful homepage brand to public/support pages, with shared headers/footers and explicit exclusion of map features.

## Release
- Live: https://litterbugs.app
- Deployment: dpl_Pn4u7uniGbKX55xgtJomRw9JPkdE
- Artifact: https://litterbugs-bphpniw7i-grant-9890s-projects.vercel.app
- Rollback: dpl_CeyqQPRwpRmJVBdzYaWDhJZGNkja
- Built on Vercel Linux, staged with `--prod --skip-domain`, checked, then promoted.
- Source reconstructed from the actual current production file manifest (983 files), with content hashes checked. Unrelated local mobile, account/payment, Communities and backend work excluded.

## Implementation
The approved mock CSS is now the opt-in `components/public-website/brand.module.css`, applied by Website. All public pages share its header, footer, fonts, focus/hover states and colors. Legal pages and the photo-review information page now use Website too. Homepage-specific artwork selectors target only its explicit hero label; header rules do not affect article headings. Legacy guide CTA specificity corrected to prevent old neutral buttons overriding the new styling.

Public routes: /, /about, /help, /support, /report-litter, /fund-a-cleanup, /cleaner, /cleanups, /get-app, /locations, /locations/us-nc-boone, /privacy, /terms, /cleanup-policy, /cleanup-safety, /cleanup-safety/acknowledgment, /photo-review.

Map, reporting, report detail, authentication, members/account/payment interfaces retain existing styling. Report detail explicitly opts out of the shared theme. Map source, shared global CSS, header component and its CSS are hash-identical to previous production. No map workflow logic, API, database, payment configuration or user data changed. No report or payment was submitted in QA.

## Verification
- 44 focused tests passed in the isolated release (navigation, homepage photo handoff, support controls, account entry, map publication, metadata).
- Vercel build and TypeScript passed.
- Every public/support page checked at desktop/mobile widths; no horizontal overflow, shared header/footer present, theme limited to intended routes. Overview and individual screenshots retained.
- Directory search → selected result → map; support amount changes checkout label/destination; desktop dropdown and mobile menu open/close passed.
- Desktop/mobile map header, report action, account button and report-card presentation match live baseline. Dynamic report loading required waiting for records and using the same browse query; early timing mismatches were test setup issues, not source changes.
- 22 staged and 22 live route/image HTTP checks passed, including native image processing. Production HTML confirms branding is present on 17 intended routes and absent from map/report/sign-in/report detail.
- Live deployment identity confirmed. Post-release error scan returned no entries.

Evidence: output/branding-release/ (pages.json, stage-checks.json, live-checks.json, map-checks.json, screenshots, source-changes.json). Isolated source: work/branding-release. No Git push was used; release is tracked by deployment and source manifest.
