# September 11 UX follow-up

Scope: Android launch-logo cropping; keyboard overlap in report Other and Extra
details; refreshed generated report-share cards. Preserve unfinished reports,
do not publish reports/social posts/store releases, and continue the login work.

## Reference lock and implementation decisions

Preserve the existing Litterbugs white canvas, green actions, charcoal type,
rounded photo frames and original logo. Refero Literal style
`ab2a33d2-8a04-4cd5-9d63-f629ddcf0940` supports restrained surfaces and functional
green. Komoot screen `61b12e46-7cf6-4b34-8648-257b1a1b11bb` informs clear
photo/title hierarchy; Train Fitness screen
`52190a08-6719-4b38-91e6-31859d1414a9` informs compact, labeled impact facts.
Borrow those structures only, not their brand colors or dark theme. Refero's
form/focus craft and visible keyboard examples support keeping active fields
above the keyboard with an intact label and scrollable context.

The current share pipeline is Next ImageResponse → Satori → PNG, not an AI
model. Reviewed the installed Next ImageResponse guide and the official
[Satori documentation](https://github.com/vercel/satori#css). Keep factual
report data and real photos; do not fabricate cleanup evidence or introduce
per-share AI fees. Use supported flex layouts, explicit dimensions, bounded
text and actual PNG render verification. Preserve public-share eligibility and
the existing location privacy policy.

Android's [splash rules](https://developer.android.com/develop/ui/views/launch/splash-screen)
mask the 288 dp icon canvas to a 192 dp circle. Fit the complete logo into a
128 dp square on Android only, keeping its corners within that circle.
The report modal set Android keyboard height to zero; the Pixel reproduced
complete occlusion of Extra details. Reserve its actual keyboard height and
scroll after the padded content has laid out, rather than relying only on an
early focus timer. Device acceptance remains in progress.

## Share card verification

Implemented the 1080 × 1350 portrait card refresh with real branding, a white
canvas, green status/impact accents, a clearer title and footer, and bounded
long titles/names. Completed photos now read Before → After; an after-only
cleanup retains its After label. Preserve the whole photo instead of cropping
it to a square during preprocessing or rendering. The landscape link-preview
layout is unchanged; its shared photo preprocessing also retains the source
aspect ratio. Native share-image cache filenames advance to v4 so a new app
build will not reuse the previous design indefinitely.

Verified six actual Next ImageResponse PNGs: available, completed with mixed
portrait/landscape images, long title, after-only, missing photo, and an existing
public report with its actual photo and $6 reward. All rendered at 1080 × 1350
and were visually inspected without overlap or clipped text. Layout fixtures
are explicitly labeled and are not report evidence. Local previews reside in
ignored `artifacts/share-card-2026-09-11/`; no social posts were made.

Checks: web TypeScript passed; six focused web component/photo tests passed;
21 mobile report-sharing tests passed. Added regressions for after-only labels,
chronological photo order, completed rewards, bounded titles, and keeping private
notes/location fields off the card. Device presentation of the refreshed card
and deployment remain separate acceptance steps.

## Physical iPhone notification result

Apple sign-in and profile completion succeeded on the physical iPhone 6s.
After Allow was selected, an enabled iOS push device registered. A test push
appeared in Notification Center. A second push using the application's actual
`report_renewed` event shape opened the intended Howard's Creek Road report,
including its photos and $6 reward, when tapped. Expo's receipt returned `ok`.
The first delivery-only payload lacked a routing event and is not counted as a
navigation failure. No report, funding transaction, or social post was created.
This proves the installed QA app's sandbox APNs delivery, not production APNs.

Android QA build 13 installed successfully and preserves the existing saved
report draft. Its keyboard/splash changes are awaiting physical acceptance;
Pixel interaction was paused when the user switched to another app.

## User-directed share-card revision — September 11, 09:30

The user rejected the empty side panels and requested removal of the tagline.
This supersedes the earlier contain-style rendering decision above. Revisited
Refero's Komoot photo detail screen (full screenshot as well as metadata), using
its filled image frame and close photo/title grouping. Retain the existing
Literal-derived white/green brand direction and Train Fitness fact grouping.

Decision ledger: the user owns tagline removal and tighter image fit; Komoot
informs the filled frame; the existing brand owns logo, green status and white
canvas. Move status beside the logo, enlarge the photo area from 580 to 740 px,
use a centered cover crop, and compact the title/details and footer. Original
uploads remain unchanged and photo preprocessing retains aspect ratio. The crop
applies only inside the generated portrait share card. Native cache version is
now v5 so updated builds discard the earlier design.

Rendered the same six PNG cases again and inspected the real report, long title,
and completed pair: no empty side panels, no tagline, clear status, readable
reward/details, and intact footer. No photo content was synthesized or changed.

## Match the established iOS style — September 11, 09:35

User requested removal of green backgrounds behind text and alignment with
“Review Luke's latest iOS changes.” Read that task's design lock and inspected
current ReportDetailsSheet/MapScreen styles: white surfaces, charcoal reward
emphasis, unboxed gray report facts, green reserved for meaningful accents.
Reused the existing Refero Komoot filled-photo direction and revisited Train
Fitness's unboxed metric hierarchy; do not import its dark palette.

Removed fact-chip backgrounds/padding and replaced them with plain text and
subtle dot separators. Text colors now match the report details screen
(#202625, #3E4842). Both Before/After labels use white backgrounds; the missing
photo surface is neutral gray. Tagline remains absent and the taller filled
photo remains. Native cache version advances to v6.

Actual PNG rendering succeeded for all six existing cases. Visually inspected
the real report, long title and after-only layout: no green text backgrounds,
readable report facts and intact footer. This is a visual refinement, not a
change to report eligibility, reward calculations or sign-in behavior.

## Sharing-size hierarchy and reward emphasis — September 11, 09:40

Further user direction: make logo/text readable when shared, research the finish,
remove the redundant footer slogan, and emphasize reward amount and litter type.
Reviewed Refero Nike Training Club social story
`49bdef34-be11-478a-98de-5014aa81958b` (metadata/full image) for strong headline
hierarchy and read Refero's typography guide. Preserve Litterbugs' existing white
surfaces and charcoal typography; do not copy Nike's text-over-photo treatment.

The renderer previously had only its default regular font despite requesting
bold CSS. Added bundled, licensed static Inter Regular/Bold fonts and explicit
ImageResponse font registration. Enlarged logo from 128×100 to 180×140, status
and fact text to 34 px, and reward to 72 px. Reward and litter types form the
primary fact row; title supplies context. Summarize all listed litter types
within a bounded 64-character excerpt. Remove severity from the portrait card
and remove the footer slogan; keep litterbugs.app as the destination.

The 1080×1350 card uses a 660px filled photo frame to reserve readable type space.
Verified real report, long-title/high-value reward, completed and after-only
renders at 390px feed width, not only at export resolution. The real report
shows $6.00 and all four litter types. Photo uploads and financial calculations
are unchanged; display formatting adds currency digit grouping. Native cache
version remains v6 for this unpublished iteration.

Unfunded share cards explicitly say “Volunteer cleanup” with litter types and
omit the dollar amount/reward caption. Added and passed a zero-reward regression
alongside the four existing component tests. Rendered an unfunded PNG and
inspected its 390px preview. A renderer error from an undefined CSS maxWidth
was caught by actual PNG rendering and fixed with explicit numeric bounds;
all seven preview cases then rendered successfully. Final TypeScript passed.
The production font loader successfully loaded both bundled local font files.

## Physical Pixel keyboard and launch acceptance — September 11, 10:00

Tested the installed QA v13 on the physical Pixel 5. Extra site details stayed
entirely above the keyboard with three lines of text and the cursor visible.
Other litter types stayed above the keyboard with a wrapping two-line entry.
Restored both fields to their observed pre-test values (Extra details: `Tl`;
Other: empty), then chose Save for later. No report was submitted. Screenshots
are retained locally in `artifacts/android-ux-2026-09-11/` as
`extra-details-verified.png` and `other-verified.png`.

One cold-launch recording confirmed the native logo was no longer circle-cropped,
but exposed a size mismatch: the 128dp native logo faded into a 244dp React logo.
Matched the Android logo-only loading state to the native 128dp width, retaining
244dp on iOS. Built QA version 14 successfully (36 seconds), installed over v13
without clearing data, and recorded the changed launch once. The frame sequence
shows the complete logo at consistent size through the native/React handoff,
then the map. No enlargement/double-sized logo remains in that recording.
This is evidence for this Pixel/build, not a claim covering every Android model.

The v14 build also includes the latest v6 share-image cache naming. It does not
by itself prove that the redesigned web share-image route is deployed or that
the new card has passed native sharing acceptance. Existing keyboard code was
unchanged by v14; those completed field checks were not repeated.

No simulator was booted; memory pressure reported 54% free during the build.
No extra phone data was deleted and no purchases or social posts were made.

## Live share-image delivery and Android report controls — September 11, 10:11

The physical Pixel v14 opened the native Android share sheet, but its thumbnail
was the older card design. Vercel's latest production deployment was from the
previous day; pushing main had not deployed the September 11 changes. Cancelled
the chooser without selecting a destination. The user then disconnected the
Pixel and authorized continuing with the iPhone/emulators.

Staged committed source on Vercel with domain promotion disabled. Actual PNG
output showed the new layout but a missing logo: the renderer fetched the logo
from its protected deployment hostname. Replaced hostname-dependent logo fetches
with a cached local PNG data URI in both portrait sharing and Open Graph routes.
The final staged PNG includes the complete logo, filled photo, $6.00 reward,
all four litter types and destination. TypeScript passed.

Native share files also had no expiration, so a valid old PNG could survive
indefinitely. Added a five-minute freshness limit using Expo FileSystem's
documented epoch-seconds modificationTime. Expired, missing-date or future-dated
entries download again; fresh validated PNGs remain reusable. The 24 focused
sharing tests passed, including three new freshness cases and existing PNG/error
handling coverage. This does not change stored reports or financial values.

For the user's new Android layout request, moved active-report Show on map and
Close controls inside the photo with a minimum 12dp top inset. Retained completed
report toolbar and iOS placement. Two existing completed-report loading tests
passed after updating the React Native platform mock. Built QA v16 successfully
and installed it on the sole API 36 emulator. Visual inspection confirmed the
buttons at y=231 versus photo y=198, rather than the Pixel's earlier y=191 above
the photo edge. The physical Pixel was already disconnected; do not claim v16
is installed on it.

Deployment dpl_8EF2ECCpcgS6MTCsx9vpbP4osd5X, from commit 291f084, built in 35s
and was promoted to the existing litterbugs-web production site. The public
share-image route returned HTTP 200 image/png. Its SHA-256 exactly matched the
visually inspected staged image:
`a6d0ef0de3408ae9dfa520551ed0d40d46b28e43524c10ba018976f23f553a62`.
Native emulator Share then displayed the new reward-emphasized image thumbnail
and share text in Android's chooser. Cancelled without posting/sending. The
15-minute deployment error-log query returned no logs; this is a bounded check,
not proof of long-term monitoring or absence of all errors.

Evidence is retained locally in artifacts/android-ux-2026-09-11: report controls
before/after, final emulator chooser, and live card. The emulator was shut down
after acceptance. No mobile app-store release occurred. iPhone verification of
the latest sharing/cache changes and separate-person Facebook sign-in remain
pending, alongside production store signing/privacy gates.

## Physical iPhone sharing acceptance — September 11, 10:20

Built current main for the physical iPhone 6s using the existing Grant-signed
QA identity com.gegibson.litterbugs.qa. Xcode reported BUILD SUCCEEDED and
ios-deploy reported 100% Installed package; no app data was cleared. Opened the
Howard's Creek report from its map marker. Native Share opened iOS's chooser
with the new v6 PNG attachment (2 MB) and its redesigned thumbnail. Closed the
chooser without selecting a destination.

Separately exercised Share to Instagram Stories. Instagram opened its Story
editor with the full redesigned card: complete logo, filled original report
photo, $6.00 reward, all four litter types, title and litterbugs.app destination.
All content was visible above Instagram's publishing controls. This confirms
the actual handoff to Instagram, not merely canOpenURL or an installed-app check.
No Your story, Close Friends or publish/next control was pressed. Closed the
editor, selected Discard in its Discard media confirmation, and returned to
Litterbugs. No social post or saved Instagram draft was created.

WDA's Instagram accessibility snapshot timed out, but the screenshot showed the
editor; subsequent coordinate taps completed and the discard dialog was visually
verified. Did not restart the runner or repeat sharing because of the observation
timeout. Local evidence: artifacts/iphone-sharing-2026-09-11/. Existing completed
authentication/push checks were not repeated. Memory pressure reported 47% free,
with no simulator/emulator booted.

Latest sharing is now verified on physical iPhone and Android emulator. Physical
Pixel v14 previously verified generic sharing with the old server image; it was
disconnected before the later card/cache/control updates and still needs the
new build when reconnected. The final separate Facebook tester request remains
pending the account holder's response. Production signing and final store
disclosures remain distinct release gates.
