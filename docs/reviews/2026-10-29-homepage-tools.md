# Homepage tools: local implementation research and verification

Scope: preserve hero, report card carousel, and before/after imagery. Replace repeated education with report starter and contextual location search. No deployment.

## Report starter
Reference: https://support.gofundme.com/hc/en-us/articles/360001992627-Creating-a-GoFundMe-from-start-to-finish
Adapt the staged creation pattern: media selection precedes publication, with review remaining explicit. Litterbugs uses the existing photo preparation and report editor. A separate, tab-referenced IndexedDB record holds a homepage photo for 24 hours without replacing any account draft. The editor offers explicit import, preserving existing work and photo limits. Existing Litterbugs typography, white surface, and green action style are the visual target.

## Area discovery
Reference: https://support.redfin.com/hc/en-us/articles/360001432632-Searching-for-Homes
Location selection leads into map results. Reuse the header's PlaceSearch suggestion behavior, not the older submit-only search. Homepage cards are not relabeled as nearby. Keep the carousel styling, with the search entry next to its heading.

## Proof and supporting navigation
References: https://www.airbnb.com/ and https://www.gofundme.com/
Keep proof adjacent to a direct action and route supporting help through navigation. Preserve the real before/after report, attach completed-cleanup browsing there, and move communities and reward policy into the footer. Remove repetitive homepage FAQ and educational strip; retain full guide pages.

## Verification completed
- Real browser: selected a local photo, preview rendered, reloaded, continued to sign-in with next=/report, returned to homepage with photo intact, and removed the selection. No publication or account draft write performed.
- Editor integration tests: import preserves existing draft fields/photos, returns to photo review, enforces the three-photo cap, and never calls publication. Storage failure remains recoverable. Live signed-in account writes deliberately avoided.
- Search: typed London UK, saw suggestions without submitting, selected by keyboard, and reached /map with London coordinates and place ID.
- Desktop and mobile (~355 CSS px): verified new plain CTAs, larger type, search panel containment, no horizontal overflow. Existing hero and report cards preserved. Removed education and format-note text per owner feedback.
- Footer/proof destinations /locations, /cleanup-policy, and /cleanups returned HTTP 200.
- 40 targeted tests passed across homepage handoff, web flows, resumable wizard, place search, and header. TypeScript and diff whitespace checks passed.
- Browser console showed no captured error/warning entries on inspected local flows.
- Empty report feeds retain area search and a report-creation entry point.

Evidence: /tmp/litterbugs-home-tools-desktop.png and /tmp/litterbugs-home-tools-mobile.png.
Nothing deployed. No payments or reports submitted. Testing covers local UI and mocked editor persistence, not a new live sign-in/publication cycle.
