# Recurring cleanups — research and local preview

November 24, 2026. Scope: research and interactive preview only. No production
feature, schema migration, website deployment, native implementation or OTA.

Preview: http://localhost:3000/dev-review-preview/site-history

Use App / Website and the six preview states. All mutations stay in React state.
The photo picker creates a local object URL; it does not upload. Sample photo,
approval simulation and research notes live outside the product screen. Native app
screens are browser mockups in the established Litterbugs style, not an app update.

## Follow-up discussion — attribution, existing workflow and Timeline

Owner's intended attribution: whoever submits the new occurrence is its reporter.
Keep the original reporter on the original occurrence. New reporter ownership,
cleanup-review responsibility and any reporter reward follow the ordinary rules
for that new report; the original reporter does not become permanent owner of all
future reports at the location. The existing Renew action for an open report keeps
its original ownership; Needs cleaning again starts a separate linked occurrence.

Reuse the normal new-report workflow and existing validation, funding, claim,
completion review and settlement rules. The extra behavior is preselected site
identity/location, linkage to earlier occurrences and duplicate/concurrency checks.
Do not bypass normal photo/safety/funding eligibility checks or reuse old balances.

The owner confirmed an existing website Timeline. Inspected its report/donation/
claim/completion events in `apps/web/app/reports/[id]/report-timeline.tsx` and its
public-page integration. Recommended revision (not yet applied to the preview):
use one site Timeline, with events grouped by reporting/cleanup occurrence and
expandable cleanup evidence. Replace the preview's separate chronological Cleanup
history surface with a short cleanup-count link into that Timeline. Keep event
ordering consistent with the current Timeline. The member account's My activity /
Cleanup history remains a separate personal activity view and is not being removed.

Already reported is an exception state for an existing active report, including
stale pages or two simultaneous submissions; it is not another normal reporting
step. The separate preview scene illustrates that case. Recommended final treatment:
open the existing current report with a short notice, preserving a draft where
appropriate, rather than a dedicated extra page or a second pin/fund. Server-side
checks still apply even when the normal UI hides Needs cleaning again on active sites.

This turn only records discussion and recommendations. Initial preview UI remains
unchanged; no new Timeline, report, schema, workflow or release implementation.

## Recommended product model

**One site, with separate reports/cleanups over time.** The site's current condition
can change; each successful earlier cleanup remains a dated achievement.

1. A cleaned site's details offers **Needs cleaning again**, alongside its most
   recent cleanup and a **Cleanup history** row.
2. Signed-in reporting starts at that same location, without another pin drop or
   retyping its title. Require newly supplied photos; details can be optional.
3. Use the report/photo review pipeline before changing the site's public condition.
   The previous cleanup remains intact while the candidate is under review. The
   precise existing moderation/eligibility gates must be mapped during implementation;
   this preview's approval is simulated, not an existing server capability claim.
4. Once approved, the site becomes **Needs a cleanup** with current photos and its own
   new report/funding/claim lifecycle. Show one current map pin, not overlapping
   active incidents for the same site.
5. **Cleanup history** lists accepted cleanups newest first. Expand one to view its
   own before/after photos, cleaner, date, impact and appropriate payment status.
   New reports can appear as dated events without increasing the completed count.
6. An already-active site opens **View current report**, rather than another active
   report. A concurrent pending candidate needs a corresponding private-safe response.

Do not automatically mark a place dirty after a timer. Actual new litter needs a
new observation. Also distinguish **new litter after a valid cleanup** from
**a cleanup that was never completed properly**: the latter belongs to the existing
review/dispute process and must not erase or bypass it.

## What the research supports

| Evidence | Finding | Adaptation for Litterbugs |
| --- | --- | --- |
| [FixMyStreet FAQ](https://www.fixmystreet.com/faq) | Report-makers can sometimes mark an incorrectly fixed issue as not fixed; availability depends on the receiving authority's integration. Public reports also help avoid duplicates. | Keep current condition explicit; distinguish an unresolved cleanup from genuinely new litter. Do not imply every external system permits unrestricted reopening. |
| [SeeClickFix status documentation](https://dev.seeclickfix.com/v2/issues/changing_status/) | Documents authenticated open/closed transitions, permissions and archive limits. | Provide a clear recurrence entry point, with server-checked permissions and active-report checks. Do not copy its seven-day archive rule into Litterbugs. |
| [TrashOut's documented data flow](https://www.trashout.ngo/how-data-contribute-to-cleaner-planet) | A photo/location report is followed by cleanup, status updates and activity information. This source is a 2018 first-party description, not an audit of today's installed app. | Treat the location as an ongoing place, while retaining the activity that happened there. |
| [NCDOT Adopt-A-Highway information sheet](https://connect.ncdot.gov/resources/safety/Teppl/TEPPL%20All%20Documents%20Library/AAH%20Info%20Sheet.pdf) | Each pickup is reported with its date, bags, participants and hours. | Keep each cleanup as its own dated result with existing impact stats; repeated maintenance is normal. This is a product-record pattern, not a legal assessment. |
| [Aboard activity via Refero](https://refero.design/pages/bfd66d37-7929-45e7-943b-c5b974e05f45) | Shows dated state changes and photo evidence in an activity surface. Screenshot inspected. | Chronological history with status, person and expandable evidence. |
| [Google Maps via Refero](https://refero.design/screens/404a1fa0-01b9-4274-aea3-4975df2aabef) | Groups dated contributions and photos under places. Screenshot inspected. | Preserve a recognizable site identity while browsing separate dated entries. |
| [Pool report flow via Refero](https://refero.design/flows/11982) | Place detail → report action → photo/text form → submission confirmation. Seven-step source flow inspected. | Start from the site, reuse its location, request evidence and provide a clear received/review state. Avoid adding the source's extra notification opt-in here. |

The separate funded cleanup model is our recommendation derived from Litterbugs'
existing financial/report relationships; it is not a financial capability claimed
for those reference products.

## Reference lock and decision ledger

Primary visual target: existing Litterbugs report details and completed-cleanup
components. Preserve white surfaces, Nunito Black headings, existing bug artwork,
rounded controls, purple utility actions, yellow funding and lilac cleanup actions.
Cleaned state uses mint fills `#b9e9dd` / borders `#8ed7c5` with dark text. Red ladybug
identifies new litter. No forest-green restyle or new brand language.

Refero style research: two searches, full styles for Duolingo
(`bd4b3de7-fd30-4620-a8ca-e850b0f2817b`) and Tally
(`dbd841f2-12e7-4b5c-b5b8-94ded944643b`). Borrow only friendly, short action labels
and white, document-like form hierarchy. Preserve Litterbugs tokens instead of
copying either reference's typefaces, palette, illustration or marketing composition.
Screen searches covered activity/history and place/photo history; flow search covered
photo-backed location issue reporting. Primary behavioral references are above.

| Decision | Source / role | Reason |
| --- | --- | --- |
| Existing report styling and bug roles | Current Litterbugs UI; Duolingo's bounded friendly tone | The feature should feel like part of the current app, with no redesign. |
| Short labels, no directional subheadings | Owner preferences; Tally's concrete action language | The action and fields explain themselves. |
| Mint completed state / red new-litter state | Current Litterbugs semantic colors | Preserve what each status color already means. |
| One history row opening a dedicated history view | Existing report detail + Aboard/Maps evidence | Keeps the normal detail screen compact; longer history can scroll separately. |
| Collapsible dated cleanups with their own photos | Aboard and Google Maps screenshot evidence | Read at a glance; inspect the proof when needed. |
| Location already selected in recurrence form | Existing site context + Pool flow | Avoid unnecessary location entry and duplicate pins. |
| Review state before new public availability | Current photo-review infrastructure; preservation requirement | A new report should not invalidate a verified earlier cleanup on a single unsupported tap. |
| Fresh report with separate fund | Existing report-based funding and cleanup model | Protect previous contributions, payments, receipts and payouts. |
| New photo heart count starts at zero | Existing photo heart identity | Do not carry previous photo reactions to new evidence. |

Media: existing public report before/after pair from
`/reports/3906e5ce-cd04-4ccf-8e9f-4fa754546019/photo/...`, resized640 copies saved as
preview-only images. The preview's site title, names, dates, stats and repeated
cleanup events are illustrative, not new production facts. Both historical entries
reuse the sample pair; production must resolve each occurrence's own evidence.

## Why this needs backend work as well as UI

Inspected current code:

- `apps/web/components/completed-cleanup.tsx` loads the most recent completed
  `cleanup_attempts` row for a report, then its final submission/photos.
- `apps/mobile/lib/cleanupImpact.js` does the same with `order(completed_at).limit(1)`.
- Existing active cleanup uniqueness is per `report_id`; contributions, rewards and
  transfer handling also belong to a report/attempt. A generic completed→available
  status reset would not by itself establish a safe new funding lifecycle.
- The shared checkout also has work in progress at
  `apps/web/app/reports/[id]/report-timeline.tsx`; preserve and coordinate with that
  work when adding cross-occurrence history. This is not claimed as the currently
  deployed public timeline.

Recommended incremental implementation, **not implemented here**:

1. Add an explicit site/group identity. Keep each occurrence as a report, retaining
   existing report→attempt→submission/photo/contribution relationships. Existing
   reports initially form singleton sites; backfill only unambiguous identity.
2. Add one authenticated, transactional recurrence operation with idempotency and
   per-site locking/uniqueness for candidate/current occurrences. Check the latest
   accepted cleanup, current/pending candidates, upload ownership, content eligibility
   and site identity server-side. Recheck at submission and moderation completion,
   not only in the client. A rejected/abandoned candidate must not leave the site stuck.
3. Keep history immutable at the occurrence/financial level. Derive public current
   condition from the latest approved occurrence and its cleanup state; review-pending
   candidates are visible only as appropriate to their reporter/moderators.
4. Build a paginated public history response exposing accepted evidence/approved
   identities under existing privacy/deletion/blocking rules. Failed/rejected cleanup
   attempts are not listed as successful cleanups. No private email, GPS trail or raw
   moderation details in the public projection.
5. Add site-level current pin/list projection, detail history and archive links to
   website, iOS and Android. Preserve old report URLs and evidence URLs; old receipt
   links must still resolve to the old report. Audit older OTA clients' direct report
   reads: their individual report flows must keep working even if they cannot yet
   consolidate all occurrences under one site.
6. Reuse the existing photo workflow and review states. Decide during implementation
   how fresh evidence is established; requiring a newly supplied image alone does not
   prove when it was taken. Do not promise reliable capture-time validation from EXIF.
7. Reuse normal notification preferences for a site update if notifications are added
   later; do not connect this to marketing emails or invent a new signup checkbox.

### Money, credit and identity boundaries

- New report starts at zero. No balance, authorisation, donor receipt, refund,
  payout reference or named/anonymous donation from an earlier occurrence transfers.
- Previous funds stay with their original report, even while a payout/refund is still
  processing. A historic cleanup displays Paid only when the existing payment state
  supports it; otherwise show the appropriate pending/volunteer result.
- Cleaner credit, reporter credit, rank points and bag totals remain historical.
  Reward the newly accepted work once with the existing idempotent ledger; don't
  erase prior achievements or count a new observation as a successful cleanup.
- Photos and hearts remain per photo/occurrence. Earlier donor privacy choices apply
  to earlier contributions. Names removed by existing privacy/deletion behavior must
  not reappear merely because a site history was built.
- Nearby similar pins are suggestions for user confirmation, not automatic site
  merging based only on distance. A large location move should use the ordinary new
  report path instead of attaching unrelated rubbish to the wrong site's history.
- Do not allow recurrence to bypass an active cleanup claim or completion review.
  A contested old cleanup uses the existing feedback/dispute flow.

## Validation and scope

Flow checked through CUA browser UI:

Cleaned site → Needs cleaning again → required photo form → sample evidence →
Submit report → Photo review → View site (old cleanup intact) → simulated passed
review → Needs a cleanup ($0, new photo hearts0) → history → expand prior cleanup
→ before/after photo dialog → Escape closes. Duplicate report opens current report.
Removing the photo disables Submit again. Reset restores the initial fixture.

| Check | Result |
| --- | --- |
| Local page title/URL and meaningful content | Pass |
| No framework error overlay | Pass |
| Browser console | Zero errors/warnings in checked Chrome preview |
| 1440×1080 desktop Website + App mockup | Pass; wide website uses two columns |
| 390×900 narrow Website + App | Pass; no horizontal overflow or broken images |
| Photo-required submit / add / remove | Pass |
| Review preserves previous cleanup; approval changes current condition | Pass |
| Duplicate report and history/photo interactions | Pass |
| Scoped ESLint and TypeScript | Pass |
| Production backend/native/store/OTA implementation | Not part of this preview |

Browser: CUA in-app used for the full initial interaction sequence; its desktop
capture was blurry after viewport override, so CUA Chrome was used for clear desktop
visual verification and captures. No external Playwright process or DOM mutation
shortcuts. Both temporary viewport overrides restored. App and Website previews
left open as deliverables. Evidence and browser QA JSON:
`/tmp/litterbugs-site-history-research-20261124/`.

No new test files for this reversible prototype. No backend/API calls, report writes,
photo uploads or payments from the prototype. Only pre-existing public photo assets
were downloaded for its illustrative media. No schema migrations, release branch
promotion, native changes or OTA publication. Current production email preference
OTA and all previous updates are unchanged.
