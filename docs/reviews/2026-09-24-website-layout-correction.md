# Website layout correction and goal extension

The owner clarified and authorized this goal extension on September 24: retain the website identity and platform-appropriate layout, while keeping equivalent app features, content, and workflows. Restore the header/footer, remove the floating app tab bar, verify, and deploy live. This supersedes the visual-navigation direction in the earlier parity audit; its functional fixes remain in scope.

## Research and reference lock

Primary structural reference: Airbnb desktop search, https://refero.design/pages/47f33483-18bd-456b-b534-afb01bd4723a. Refero's Airbnb style `afd145ca-269e-4847-9843-62126a839ccf` provides white header surfaces, restrained accents, photo-led cards without heavy shadows, and a footer. The iOS map reference https://refero.design/screens/ef371a8b-cb56-4f4a-a209-fa7b1552a4fb uses phone-specific map/search/sheet navigation instead.

Secondary reference: Eventbrite style `4aa419e7-b05e-48f7-9dd8-4f65d5fc153f`, restricted to persistent web navigation/search accessibility. Refero did not return a matching Zillow screen; direct research used https://www.zillow.com/homes/for_sale/ and Zillow's official saved-search and iPhone-search help pages. These preserve search/filter/save concepts across devices without establishing identical layouts.

| Decision | Source and role | Implementation direction |
| --- | --- | --- |
| Website header and footer | Owner correction; Airbnb desktop navigation/footer | Restore existing Litterbugs header and use a compact support/policy footer |
| One search area | Desktop search references | Toolbar outside map; remove duplicate floating branded search |
| Desktop map/results | Existing Litterbugs layout and Airbnb split search | Keep map and results side by side; retain list/map toggle on narrow browsers |
| Account and reporting | Existing website header | Visible account action and Report button in header |
| Cards | Airbnb photo-led style; Litterbugs content | Retain actual report photos, status, rewards, authors; reduce oversized app-style rounding/type |
| Colors and typography | Existing Litterbugs brand | Existing system font, green actions, neutral surfaces; no Airbnb coral or Eventbrite blue |

Reject: floating native tab bar on desktop, duplicated logos/search, app-sized controls consuming the desktop viewport, reverting the completed functional fixes.

Verification: all 186 web tests pass; type checking and ESLint pass; production Vercel build is Ready. Browser checks covered desktop, 390px and 320px layouts, filters/Cancel, and header sign-in. A 320px header overlap was fixed and rechecked. Production candidate: `dpl_BYry4Xfqdvkr1jnuCKY2BTwXLr3b`. Google Maps rejects the temporary deployment hostname as expected; its fallback still permits report browsing. Live-domain map verification follows promotion.
