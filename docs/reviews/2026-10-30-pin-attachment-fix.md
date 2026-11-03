# Individual pin attachment follow-up

User clarified the issue is a pin jump when zooming even when visible grouping appears unchanged. The earlier cluster-signature optimization did not fully address this.

Investigated coordinate assignments with temporary development diagnostics: reported pins returned numeric coordinates matching source values. Removed the speculative position-cache patch and all diagnostics; map-experience.tsx is byte-identical to the prior production snapshot.

The marker-clusterer renderer assigns every displayed individual marker to the map on a rendering pass, including those already attached. Added a renderer subclass limited to this application's AdvancedMarkerElement renderer and existing native gmp-click handling. Map assignment is now conditional on actual attachment changes; already-hidden members are likewise not repeatedly detached. Grouping radius, zoom limits, report positions, selection logic and click handlers are unchanged.

35 targeted clustering/map-publication tests passed, including a regression exercising three renderer passes with one attachment write. Scoped lint and diff checks passed. Local zoom in/out exercised without console errors. Production release is staged from the existing isolated release snapshot with only report-clusters.ts and its test changed.

Released: dpl_352omwBm7KNiV3bfV8swmvxQraaN at https://litterbugs.app (artifact https://litterbugs-es0y1luxa-grant-9890s-projects.vercel.app). Production build/TypeScript and staged /map check passed, then promoted. Live zoom controls exercised after promotion. Rollback: dpl_BYAMLcNesPehxEWRMbhrp37bXopx. No clustering parameters or animation changes in this follow-up.
