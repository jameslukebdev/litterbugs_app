# Homepage hero revision

Owner-requested local revision, October 28, 2026. No deployment.

Restored About and Support as direct desktop-header links. Kept the existing headline, added one large company description, removed hero search and the separate reward explanation block, and added direct App Store/Google Play links using the site's existing destination constants. Search remains available on the map and community directory. Reward details remain in the reporting guide and homepage FAQ.

The owner-provided OpenLitterMap screenshot supplies the layout reference: headline, large supporting statement, store links and a separate rectangular photograph. https://openlittermap.com/ was opened but returned no extractable page text; no additional live-site behavior is claimed from that result.

Image generated with the built-in image tool, using the previous marketing hero as reference; this is illustrative marketing imagery, not a real public cleanup record. Original retained. Project asset: `apps/web/public/homepage-preview/report-litter-realistic.webp` (1536 × 1024, 410092 bytes), converted to WebP with Sharp. No gradient overlay.

## Generation prompt

Use case: photorealistic-natural / style-transfer. Create a replacement website hero photograph using the input as subject reference. Keep the same idea: a person's realistically proportioned hand holding a black smartphone vertically, using its camera to photograph a small amount of everyday litter on grass beside a public pedestrian path. Redo the photo to look hyper-realistic, like an unretouched documentary photo shot with a modern full-frame camera, not a glossy AI advertisement. Landscape 3:2 composition, entire hand and phone comfortably inside the image, phone in left-center and actual litter at right-center foreground, park path receding behind. An unbranded slightly crushed water bottle, a weathered paper bag and a used food wrapper; irregular grass, subtle dirt, believable creases and texture. Correct hand anatomy, natural pores, imperfect fingernails, casually worn muted green sleeve. The phone screen must realistically show the same visible litter in the correct relative positions viewed from the phone camera's slightly different perspective, with a simple unobtrusive camera shutter control. Natural soft overcast daylight, true-to-life restrained greens, neutral white balance, moderate depth of field, realistic optics. Avoid oversaturated yellow-green light, artificial bokeh, HDR, plastic skin, extra fingers, impossible phone UI, dramatic sunbeams, logos, legible brand names or added text. Full-bleed photograph with clean rectangular edges: NO fade or white gradient on either side, no vignette, no border. This is illustrative marketing imagery, not a real cleanup record.

## Verification

Scoped lint, seven header tests and optimized build including TypeScript passed. Browser checks confirmed restored links, correct app-store destinations, absence of hero search/reward block and no horizontal overflow at effective 1309, 1127 and 355 CSS pixels. Desktop and mobile screenshots inspected. Earlier launch checklist still applies; earlier hero/search-placement descriptions are superseded by this request.

## Header search, app badges, and Safety follow-up

Local only. Restored the direct Safety link beside About and Support; widened the desktop header and switched to the existing mobile menu sooner to keep all links readable. The mobile menu retains Safety.

Header search now reuses the map's PlaceSearch component: location suggestions appear after typing (300ms debounce), with keyboard selection and a direct transition to the selected map area. Removed the separate Search map submit button from the header picker. Escape dismisses suggestions first, then the dialog; closing returns focus to the header trigger. The map keeps its own search control.

The hero uses an isolated responsive style module, aligned text/photo columns and the full 3:2 image without a fade or cropping. App buttons use official Apple and Google artwork, including the colored Play symbol.

Verification: 18 focused header/autocomplete tests passed; TypeScript and production build passed. Browser checks confirmed mobile suggestions appear without submitting, selecting Boone opens the corresponding map area, desktop Safety is visible beside Support, and the phone hero and header fit. No deployment or production data changes.
