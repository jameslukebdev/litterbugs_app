# Website account entry — October 31, 2026

## Scope and direction

Improve homepage account discovery and signup using the existing Litterbugs design system. Owner refinement: no instructions, technical explanations or meta language in the account popup. Retain action labels, essential forms/status messages and terms.

Final reference lock: owner-supplied Niche signup and sign-in screenshots. Compact email-first modal, left-aligned heading, rounded primary action, social options below a divider, footer link to switch modes. Preserve Litterbugs typography, white surface and brand colors. Remove logo, tabs and explanatory text. Earlier Airbnb, Fiverr and Contra research informs account-entry behavior only.

| Decision | Evidence / role | Result |
| --- | --- | --- |
| Filled Get started plus secondary Sign in | User brief; marketplace entry references | Signup opens immediately; returning users keep a direct route |
| Email-first signup / sign-in, footer switch | Owner Niche screenshots | Both modes expose email and password immediately |
| No sign-in subheading or signup steps | Owner request and follow-up | Compact action-only entry |
| Profile destination after header signup | Existing /account and profile setup | OAuth/email verification returns to /account; contextual login retains its destination |
| Apple web button gated by verified setup | Live authorize probe and Apple/Supabase docs | App route stays accurately labeled; OAuth action ready when configuration is complete |

References reviewed:
- Airbnb style: https://refero.design/styles/afd145ca-269e-4847-9843-62126a839ccf
- Fiverr style: https://refero.design/styles/23da3eff-886d-48d5-8562-34060a60b12b
- Airbnb auth screen: https://refero.design/pages/42bfe5ee-cdc4-4428-8fb4-cefdbfc5cba2
- Contra profile onboarding: https://refero.design/flows/4811
- https://www.airbnb.com/help/article/221
- https://developer.apple.com/help/account/capabilities/configure-sign-in-with-apple-for-the-web/
- https://supabase.com/docs/guides/auth/social-sign-in/auth-apple

## Apple finding

Read-only public checks of the correct Supabase project, mvaygkflcjswtwchflrk, report apple=true but the Apple OAuth authorize endpoint returns HTTP 400, validation_failed, "Unsupported provider: missing OAuth secret". Provider enablement alone does not establish web support. This supersedes older documentation that described the provider as disabled. No backend setting or Apple account was modified.

Apple requires a web Services ID associated with the correct primary App ID and a signing credential. Supabase web OAuth requires its matching secret, with six-month rotation. Keep NEXT_PUBLIC_APPLE_WEB_LOGIN_ENABLED=false until the correct web configuration and callback are verified. The component supports the real Apple OAuth route when enabled, with the same return-path handling and errors as other providers. Current UI labels the app route explicitly and links to /get-app.

Luke's unavailable account access and Apple revocation remain excluded under AGENTS.md. No request for those resources, no substitute changes to Grant's Apple account, no account deletion, and no separate-user Facebook testing.

## Validation

- 45 focused tests pass: auth dialog, header account entry, public header, existing web flows and standalone sign-in routing.
- TypeScript and focused ESLint pass; production build passes.
- Browser checks on localhost: desktop 1440px, phone 390px and narrow 320px. No horizontal overflow at 320px after reducing the menu trigger width; signup and email/sign-in controls work. No runtime console errors. Existing homepage image eager-loading warning remains unrelated.
- Browser plugin unavailable; used available Playwright tools.
- Screenshots: output/account-entry-desktop.png and output/account-entry-mobile.png.
- Not published. Existing unrelated workspace changes were preserved.

## Owner refinement: all three providers

The owner subsequently requested Facebook and Apple signup buttons, the label Email, and removal of the Apple app-link wording. Both forms now show Google, Facebook and Apple by default. Removed obsolete public provider visibility switches from the example environment. Explicit component overrides remain available for controlled testing. Removed the Apple app-link fallback and its unused styling. The Apple button invokes actual Apple OAuth, but live completion remains unverified and the previously observed missing OAuth secret is still unresolved; no backend configuration or Apple account was changed. Provider errors remain ordinary user-facing failure messages. Also corrected Forgot password to type=button inside the email form so it does not submit login.

## Brand alignment

Applied the existing public website brand class directly to the auth dialog so portal rendering preserves Litterbugs' typography and color tokens. Heading uses the same Playful Nunito font as public page headings. The primary action uses the existing purple and raised lower edge; form borders use the existing lavender, with rounded 14px buttons and 10px inputs. Supporting text keeps the site's body font. The Niche reference informs layout only.

Final brand verification: 23 auth/web-flow tests, focused ESLint and TypeScript pass. Browser computed heading font is Playful Nunito and main action background is #5146ed. All three provider buttons render, Email label is shortened, and no Get the app copy remains. Desktop and 390px phone screenshots inspected; no horizontal overflow or console errors. Apple service credential limitation persists. Local preview runs on port 3000.

## Mobile returning-user access and Apple failure handling

Owner reported mobile login discovery and confirmed the raw Apple 400 error. Mobile header now reads Log in / Sign up; desktop retains Get started plus Sign in. Every mobile menu has a Log in link to /sign-in. On screens up to 360px the brand/search/button spacing contracts without removing search; verified at the current 319px preview width without horizontal overflow.

Added a same-origin read-only Apple readiness endpoint. It calls only the project's authorize endpoint, does not follow redirects, and reports readiness only for a 302 to HTTPS appleid.apple.com. The client checks readiness before starting Apple OAuth. Missing credentials now keep the visitor in the popup with "Apple sign-in is temporarily unavailable." instead of navigating to JSON. It does not configure Apple or prove completed sign-in. The live check returned available=false; popup behavior was exercised against the live service.

Apple setup could not be completed: the web OAuth secret is absent, matching Apple developer access was previously confirmed unavailable, and the available Supabase dashboard browser is signed out. No Apple developer settings, native client identifiers, sessions, grants or backend provider configuration were modified. No further request for Luke's access was made. Apple documentation rechecked: https://developer.apple.com/help/account/capabilities/configure-sign-in-with-apple-for-the-web/ .

Validation: 41 focused tests pass, including readiness destination checks, missing-provider handling, and homepage menu login. TypeScript and focused ESLint pass. Browser verified mobile label, menu login destination, and friendly Apple failure without leaving localhost. Changes remain local.

## Final owner decision: no website Apple sign-in

Owner explicitly removed Apple sign-in from the website. Removed the provider button, Apple-only readiness endpoint, related client check and unused styling. Website login and signup retain email, Google and Facebook. Added coverage for absence of Apple and app-workaround copy in both modes. Native Apple login and backend provider settings remain untouched. This decision supersedes the earlier website Apple setup and readiness plans above.

## Pre-release menu reconciliation and narrow map toolbar

Owner paused publication, then requested consistent burger menus and removal of Updates, duplicate Profile / sign in and Get the app entries. The shared NavigationMenu no longer accepts map-specific accountLinks or reportId. Every page now renders Map, Report, Donate, Earn and Support from the same source, with Log in only when the shared header profile cache has no signed-in member. Compact header styling does not change menu content. Desktop app links and the map dock/notification bell are preserved. Unused drawer-only styles removed.

Owner screenshots also showed search touching the first row of status pills. The mobile map toolbar now uses two grid columns for search/actions and a full-width filter row, with a 12px row gap. Wrapped status pills have 8px gaps. Existing brand colors, typography and pill designs are retained.

Verification: 38 focused header/account/report-browser tests pass; TypeScript and scoped ESLint pass. Added coverage comparing home, about and map menu contents, all category destinations, signed-in login suppression and removal of unwanted drawer links. Browser on the signed-in local site at 500px: 12px search-to-pill separation; 8px pill spacing; no horizontal overflow. Map and homepage menus match. Report submenu expands; selecting Reporter reward details navigates to /report-litter and closes the drawer. Escape closes the drawer, restores trigger focus and releases scroll lock. A browser-back cached development-version hydration warning cleared after a fresh reload. Browser returned to the original local map.

Evidence: output/map-toolbar-spacing.png, output/map-toolbar-spacing-detail.png, output/map-menu-reconciled.png and output/home-menu-reconciled.png. These changes have not been copied into the earlier isolated release snapshot, staged, or published. Production remains untouched pending the owner's next release instruction.

## Owner refinements: Open map and app banner

Retained burger menu entry points and the Reports / Map / Profile dock. Restored the drawer's Open map label, map outline icon and gold border on every route, preserving the current-page highlight. Signed-out menu access now reads Log in / Sign up so the same destination communicates both options. Header regression coverage passes: 27 tests with account-action checks.

The MobileAppStrip shared by bottom page promotions now receives the existing public-site brand class. Its background/borders are lavender, its heading uses Playful Nunito, and its purple Get the app button matches the raised rounded brand controls. The page promotion routes and app destinations are unchanged. Browser checked the same shared strip on /about at 500px: no horizontal overflow, button #5146ed and heading Playful Nunito. TypeScript and scoped ESLint pass. Screenshots: output/map-menu-open-map.png and output/mobile-app-banner-branded.png. Publication remains on hold; no deployment was started.

## Published release — October 31, 2026

Owner resumed publication after requesting more space between logo and map button. At 760–899px, the logo now has 12px extra right margin, producing a measured 16px gap at 816px. On compact tablet layouts through 1239px, signed-out account entry uses one Log in / Sign up control to preserve space for navigation.

- Production: https://litterbugs.app
- Deployment: dpl_FWAF46Jw51nPUag8xWZm2SxCLoH1
- Artifact: https://litterbugs-p3c3e0nmg-grant-9890s-projects.vercel.app
- Rollback: dpl_BZ7pFTqAMAGXiEJzBbTib8pxQ1n3
- Source: work/account-entry-release-20261031; SHA256 manifest: work/account-entry-release-manifest.json. Exactly 12 scoped source/test files differ from the 1,024-file production baseline. No Git push, mobile deployment, database migration, provider configuration or backend function release.

Staged with production settings and --skip-domain, then promoted the tested final artifact. Vercel Linux build/TypeScript pass. The protected artifact was checked through authenticated vercel curl; Deployment Protection was not disabled. Eight staged HTTP/asset checks passed; staged HTML confirms Email, Google and Facebook, no Apple, blank fields and logo bee. Staged CSS confirms tablet logo margin, responsive account labels and branded app banner. An exact isolated source build passed locally; browser measured the logo gap at 816px.

Tests: 71 focused auth/header/account tests passed on the final isolated source. The full release suite had 534 passing and six failing tests: four shared-report page tests lack a router fixture and also fail on unchanged production source; two tests failed under concurrent test load and passed in the focused rerun. No unrelated application code was changed to address test fixtures. Local Node's global web-storage incompatibility was avoided using --no-experimental-webstorage.

Post-promotion: confirmed the custom domain points to the intended deployment. Six live route checks passed; anonymous sign-in HTML confirms expected providers and no Apple. Browser on live site: 816px logo gap 16px, 390px search-to-pill gap 12px, no horizontal overflow at those widths, consistent menu with Open map/icon/border and no duplicate account/download entries. Runtime error-log scan returned zero entries. No account creation, live payment or report submission was performed. Temporary viewport override reset; root local preview remains running.

Evidence: work/account-entry-stage-http.json, work/account-entry-stage-content-checks.json, work/account-entry-live-http.json, work/account-entry-live-errors.jsonl, output/account-release-live-header.png and output/account-release-live-menu.png.
