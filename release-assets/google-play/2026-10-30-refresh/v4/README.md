# Litterbugs — reporting-first gallery

October 30, 2026. Review exports only; nothing uploaded or published.

## Order

1. Make money reporting litter.
2. Make money cleaning up.
3. Donate to a cleanup.
4. Find litter on the map.
5. Find your next cleanup.
6. See what needs cleaning.
7. Get others involved.
8. Help clean up your community.

Five real native Android screenshots and three graphics. Eight opaque 1080 × 1920 PNGs. The reporter-earnings graphic is preserved and now leads the gallery. The profile screenshot is removed. Added headline copy has no amounts, percentages, subheadings, or eligibility copy; actual app UI remains intact.

## Map provenance

The real map is the existing October 29 production-signed build-20 verification screenshot, showing a cluster of 19 reports and captured status counts. It is not a new build-21 screenshot. No pins, map tiles, counts or activity were invented or overlaid. The full screenshot is proportionally resized without cropping or modifying UI. The other four app screenshots are October 30 build-21 captures from v3.

The map screenshot is zoomed out to a regional cluster. A closer local view with individual reports would be a useful future refinement. Obtaining that would require another correctly signed app capture session; no emulator, IDE, or build was started for this revision. Previous local build-21 signing did not authorize map tiles.

## Supporting motivations

Owner priority: reporting income first, cleanup income second, donations third. Supporting ideas: personal achievement, competition, community, environmental advocacy, tangible impact.

Current mobile source supports ranks (ProfileScreen.js / RankUpCelebration.js), submitted bags/items and optional weight (CleanupSubmissionScreen.js), completed cleanup history, and before/after evidence (MapScreen.js). These support future achievement and impact panels when clean real captures are available. Do not imply aggregate litter-quantity tracking solely from the submission fields.

Challenges and comparing participant progress, organized participation with schools/groups, and influencing government/business decisions were not established in this pass. They remain messaging opportunities, not verified product promises. The current sharing screenshot supports “Get others involved”; the illustration supports the community aspiration without claiming formal group features.

## Files and resource use

index.html is the shared Creative Production review renderer output. gallery-review.png shows all eight images. manifest.json records sources. Run node build-assets.cjs to reproduce sequentially with one image worker and caching disabled. Existing feature options are copied unchanged; the existing video remains at ../v3/video-app-preview.mp4 and was not re-encoded in this gallery-only revision. Earlier drafts are preserved.
