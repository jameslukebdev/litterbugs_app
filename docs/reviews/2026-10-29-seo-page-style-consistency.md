# Draft SEO pages: style consistency

Local only; no deployment or database changes. No map or mobile application files changed in this pass.

## Reviewed routes
- /report-litter
- /fund-a-cleanup
- /cleaner (local SEO guide draft)
- /cleanups, including its not-found page
- /locations
- /locations/us-nc-boone
- /get-app (website download page only)

## Reference and changes
The owner-approved homepage is the visual reference. Reuse its typography hierarchy, green headings, white background, neutral outlined primary actions, generous spacing, real before/after photography, and compact equal-height report cards. Decorative action arrows removed; contextual calculation notation retained. SEO copy, qualification/policy details, canonical metadata and destinations preserved.

Styles are opt-in by public route in Website, and live in seo-pages.module.css. They do not apply to the map or report detail pages. Header component and global CSS are unchanged. The website download page now uses the shared footer and the homepage's app-store badges; shared app-promotion components are unchanged.

Shared cleanup proof reuses the homepage photo layout with the title “See a completed cleanup”; it does not falsely call older guide examples the most recent cleanup.

## Verification
- Seven routes rendered at desktop (~1309 CSS px) and phone (375 CSS px), no horizontal page overflow.
- All primary guide CTAs have white backgrounds and dark readable text.
- Report cards have equal heights at phone width.
- Reporting/funding/download layouts visually inspected.
- TypeScript passed; 19 tests passed across public metadata, archive pagination, community locality and latest cleanup selection.

## Owner-requested About & Help extension
Help, About, Safety and Support now use the same scoped Website shell. This fixes the undersized Help footer and desktop space below it, adds the missing Safety footer, and provides consistent headings/body text and skip links. Monthly-support presentation is scoped to its web page; amounts, recurring-payment disclosures and checkout destinations are unchanged. No transactions attempted.

All four additional pages checked at desktop and phone widths without horizontal overflow. Desktop footer bottoms align with document bottoms. Existing mobile app-promotion strip remains below the footer. TypeScript and header/monthly-support tests pass.
