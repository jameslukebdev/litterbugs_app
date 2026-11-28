# Website styling and Communities release — October 30, 2026

Owner explicitly approved publishing the accumulated local website changes.

- Live: https://litterbugs.app
- Deployment: dpl_ERZiXNTY95qSXXVkNdMhhQiWvrcY
- Artifact: https://litterbugs-9wjy3gdcy-grant-9890s-projects.vercel.app
- Previous production / rollback: dpl_Pn4u7uniGbKX55xgtJomRw9JPkdE
- Isolated source: work/community-account-release-20261030; SHA256 manifest: work/community-account-release-manifest.json.
- No Git push, mobile binary release, database migration, or backend function deployment. Local server left running.

Includes current homepage/shared navigation, map styling, account styling/copy, notification UI, report pages, Communities and organizations, Inter type, ocean-blue controls, accessible custom menus, single cleanup heading and continuous report-card borders.

Release checks: 515 website tests passed. Fixed missing PublicSiteHeader import on photo-review and refactored blob-photo preview synchronization to the image DOM node; all four photo-handoff tests passed afterward. Lint passed with two existing/nonblocking warnings (unused homepage Link and dynamic blob img). Web boundary check passed. Vercel Linux build and TypeScript passed. All 19 staged and live route/asset HTTP checks passed. Live Communities UI and custom dropdown visually checked. Authenticated account mutations/payment workflows were not exercised on production. Historical missed notifications remain unproven; this release is not evidence of restored delivery.

Staged with --prod --skip-domain and promoted the tested deployment. First staging attempt failed the missing-import check and was never promoted. HTTP results: work/community-account-stage-checks.json and work/community-account-live-checks.json. Runtime error scan performed after promotion; ongoing monitoring was not configured or changed in this release.

## Responsive follow-up and zoom redraw — October 30
- Live follow-up: dpl_BYAMLcNesPehxEWRMbhrp37bXopx, https://litterbugs-ofdttrl93-grant-9890s-projects.vercel.app. Rollback is the previous release above.
- Audited 26 live routes at 390px and 820px; dynamic routes rechecked after their content loaded. No document horizontal overflow found. Inspected mobile navigation, filter dialog, account layout and community menus. This is responsive UI verification, not an exhaustive payment or account-mutation test.
- Corrected leftover green selected toolbar/mobile-tab/report-button/filter-action styling, photo-review font, tablet rank percentage spacing; sorting label now 16px.
- Clustering now compares actual member identities and centers before requesting a redraw. Same-group zooms preserve rendered cluster objects; true splits/merges/movement still redraw. No animation added. Regression test checks stable groups and required geometry updates.
- 18 focused clustering/report-browser/rank tests passed; earlier 45 responsive-related tests passed. Scoped lint and production TypeScript/build passed. Four staged route checks passed, then promoted and checked live map zoom/control colors.
