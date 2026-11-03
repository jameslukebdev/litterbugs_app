# Map status text release — October 29, 2026

User authorized production removal of the searching-area message and visible report-count/current-area subtitle. Communities remains local only.

## Scope

Reconstructed production deployment dpl_HkNzy292wTLMh9imQkQzoeMZ2WB3 into work/loading-release and verified source hashes. Only components/report-browser.tsx and its test changed. The count remains screen-reader-only with no layout space. Loading no longer renders status text; aria-busy remains. Errors and truncation warnings remain.

## Verification and release

- All 13 report-browser tests passed, including loading rerender with existing cards retained and no searching text.
- Vercel Linux source build and TypeScript passed; staged homepage, map, reporting, get-app, locations and photo-processing routes returned 200. Communities returned 404.
- Promoted dpl_CeyqQPRwpRmJVBdzYaWDhJZGNkja, https://litterbugs-ff3bs8f9x-grant-9890s-projects.vercel.app.
- Confirmed litterbugs.app resolves to that deployment with READY state.
- Live homepage, map and image-processing routes returned 200; Communities remains 404.
- Live screenshot confirms only Litter reports heading, no visible subtitle or searching message, Report nav/button and outline hearts preserved.
- Runtime error log query returned no errors in the observation window.

Rollback: https://litterbugs-fukw6yuth-grant-9890s-projects.vercel.app.
