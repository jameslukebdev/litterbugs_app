# Confirmed iPhone audit fixes — September 10, 2026

Branch: `codex/confirmed-iphone-audit-fixes`, based on `9010523`.

## Changes

- iOS report image sharing sends one image item instead of an image plus a separate caption, which Instagram rejected. Native text/link fallback remains available when the share module is absent. Restored the dedicated Instagram Stories option and preserved the receiver for `Linking.canOpenURL`.
- Guest report creation and funding/cleanup entry clear conflicting pending actions. Returning to the map after canceled sign-in clears stale intent. Funding sign-in no longer claims a report draft was saved.
- Report forms reserve the actual iOS keyboard height and scroll the focused bottom field into view.
- Both owned and public profile report queries include the photo paths needed by thumbnail cards.
- Funded share captions, public descriptions, and image cards include the eligible cleanup reward. Share image cache names now include reward cents and a new format version.
- Replaced the unresolved Patreon destination with a community support page after the user explicitly approved that fallback. Native guest Profile and signed-in Settings lead to the same support screen; its Explore nearby cleanups button returns to Map. Web account settings link to `/support`.
- Promoted the current web source so the live cleanup policy agrees with checkout: $1–$1,000 principal per contribution.

## Patreon investigation

All historical Patreon URL changes were inspected back to the repository’s initial January 2, 2026 revision. They use the same `patreon.com/litterbugs` address, with or without creator-share tracking parameters. Both forms currently redirect to Litterbugs member profile 19487804, which has no support choices. Patreon’s LitterBug search result is an unrelated Canadian business. Public searches under James Luke Barber and the developer handle did not establish a correct destination. The connected phone had only the QA Litterbugs app, so a separately installed published release could not be inspected. The user then authorized the alternative support page and ending the search.

## Verification

- Physical iPhone 6s, iOS 15.8.2: Instagram’s ordinary share extension now accepts the image and offers Post, Story, and Message choices. Canceled without publishing or sending.
- Physical: dedicated Instagram Stories opens the Story editor with the report card and $6.00 reward. The media was explicitly discarded without saving a draft or posting.
- Physical: Fund → cancel sign-in → Report litter now opens ordinary report sign-in, without stale funding intent.
- Physical: public report thumbnails now display photos for both listed active reports.
- Physical: guest Support Litterbugs opens the new page and Explore nearby cleanups returns to Map.
- Signed-in iPhone 17 Pro simulator: My reports displays the waterfall thumbnail; ordinary title-field focus scrolls the title above the software keyboard. A temporary title used in testing was discarded.
- Live website: `/support` renders friendly community copy and a working map link; policy renders $1 to $1,000; funded report metadata and downloaded social card show the $6.00 reward.
- Mobile: 367 tests, 81 files passed. Web: 105 tests, 28 files passed. Web typecheck/lint passed. Mobile source check: 147 modules, zero errors. Physical and simulator Release builds succeeded.

Production web deployment: `dpl_5Thidic21c7SPDA5KB8uwZRZpf1v`, promoted to `litterbugs.app`. Earlier unpromoted candidates were superseded.

## Limits

No money spent, social posts/messages sent, reports published, cleanups claimed, or account/profile changes saved. Actual financial settlement, refunds, full cleanup lifecycle, and authenticated physical-device flows remain outside this safe audit. These fixes do not imply every possible feature state passed. Full original walkthrough and screenshots are in `artifacts/iphone-2026-09-10/testing-report.md`.

Final installed physical Release bundle SHA-256: `45427143825cd2a4f0724da1168c44439a976cc78a6840ec335fa26a8d4db23d`. Final physical and simulator installs preserve existing app data. Changes remain on the fix branch; main has not been merged with these new fixes.
