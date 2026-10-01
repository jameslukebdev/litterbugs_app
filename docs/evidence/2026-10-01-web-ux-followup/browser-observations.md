# Live browser observations

October 1, 2026, production litterbugs.app, audit against main fbdffbd.

- Public browsing: desktop 1280×720, 390×844, 320×740, 768×1024. These are browser viewport checks, not physical mobile devices.
- Authenticated account navigation used an already signed-in Chrome session. Only navigation and local UI state were changed.
- Account report test: `/account/reports` → click first existing “Litter Report Closed · Low severity” row → URL `/`, no selected report. Source inspection establishes two router pushes in the shared embedded account handler. The fixture was a closed report; no active customer cleanup was modified.
- Account history test: `/account/activity` → Cleanup history → URL remains `/account/activity` → reload → Current cleanups selected. ArrowRight on Current cleanups leaves focus and selection unchanged.
- Mobile hierarchy: author and Get directions precede report title. Screenshot `mobile-report-order.png`.
- Mobile discovery first card begins around y=390 at 390×844. Advanced filters scroll separately, with Apply initially below visible header area; activation succeeded. Screenshots `mobile-discovery.png`, `mobile-filters-overlap.png`. The latter captures clipped filter controls, not proof of an unclickable button.
- Tablet no-photo dialog: clientWidth 718, scrollWidth 740; layout bounding width 718, scrollWidth 740; panel width 420. Screenshot `tablet-no-photo.png`.
- Refresh focus: public report ba227d19-b46d-46fa-a02c-7d1f4c5047c3, Next photo clicked. DOM active element at 20:44:27.476 UTC was Next photo; at 20:44:54.477 UTC it was Back, without intervening interaction in this tab. Selected photo remained 2/3. Source focus effect depends on a changing parent callback.
- Completed badge computed styles: text Cleaned; background rgb(220,69,69); white text; font size 11px; weight 850. Relative-luminance contrast calculation yields 4.216603514949621:1.
- Google Sitemaps: Success, submitted October 1, last read October 1, 17 discovered pages, 0 videos. Screenshot `google-sitemap-success.png`.
- Google Page indexing: 14 indexed, 7 not indexed (4 not found, 3 redirects), last update September 20. No resubmission, validation request or indexing request made.

Product code and production data were unchanged. No OAuth sign-in, waiver acceptance, payment, account deletion, photo upload or draft creation was performed. Viewport overrides reset and temporary tabs closed after the audit.
