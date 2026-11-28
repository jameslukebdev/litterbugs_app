# Report navigation, map action, and favorite-heart release — October 29, 2026

Owner authorized only the Report menu/map action and subsequently the transparent favorite-heart correction for production. All Communities work explicitly remains local.

Production: dpl_HkNzy292wTLMh9imQkQzoeMZ2WB3
Deployment URL: https://litterbugs-fukw6yuth-grant-9890s-projects.vercel.app
Live: https://litterbugs.app
Previous production / rollback: dpl_6N2gMoSgNFwzDxEhsDnwvGgn2kAy

Reconstructed 983 source files from the current production deployment, checking content hashes against its source manifest. Only three runtime files differ: public-site-header.tsx, map-experience.tsx, and globals.css. Two targeted test files also differ. Communities, organization routes, location redirects, local data, and unrelated dirty-checkout changes were excluded. Existing location pages, footer labels, sitemap, homepage, backend and payment code remain the prior production versions.

The old map-header action rendered both long and short label spans together. Map navigation now uses the standard Report dropdown. A separate upper-right map action uses the native app's white surface, green outline/text, 25px radius, 50px height, and 22px icon. Existing start/cancel/keep-location callbacks and busy states are preserved. Favorite hearts use the exact transparent-background, white-outline local styles, with red fill when selected.

Validation: 44 focused isolated-release tests passed; production build and its TypeScript check passed. Staged authenticated HTTP checks confirmed map 200 and Communities 404, the correct button markup, absence of duplicate header spans, and transparent favorite CSS. Promoted the staged production artifact after checking that the live baseline had not changed. Live browser verified desktop Report menu, upper-right button geometry, loaded map tiles and report photos, transparent white-outline hearts, and the map action on a mobile viewport. No reports, drafts, favorites, or payments were submitted during live QA.

Build configuration: the downloaded production public Supabase publishable-key value was empty. The isolated local build used the existing public key for the identical production project URL. No remote environment settings were changed. Secret-bearing local .vercel files were not exposed or committed.

Local follow-up: 42 navigation/map tests, current checkout TypeScript and targeted lint passed after local dependency restoration. Local/global Communities page work remains separate from this artifact.

## Corrected build and final verification

The first macOS-prebuilt artifact dpl_7ocX7xN8iPS5o1QT8B1ZJfUwYgQp passed map checks but failed production homepage routes because sharp lacked the Linux ARM64 binary. Monitoring caught this after promotion. It was rolled back to the prior production deployment; the restored homepage returned 200. The same isolated source was rebuilt on Vercel Linux and staged as dpl_HkNzy292wTLMh9imQkQzoeMZ2WB3. Before promotion, authenticated requests to homepage, map, reporting guide, get-app, existing locations and a real bounded report photo returned 200; Communities returned 404. The photo was 93,145 bytes, exercising runtime image processing. Only after those checks was the Linux build promoted.

Final live verification repeats the same seven path/status checks, checks the correct deployment ID, and confirms the white transparent heart and map button in the browser. The final deployment's recent error scan returned no entries. The current local TypeScript and targeted lint pass. Use Vercel source builds for releases with native image dependencies; include staged homepage and real image-function checks before promotion.
