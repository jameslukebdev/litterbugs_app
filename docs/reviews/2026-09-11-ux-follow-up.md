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
