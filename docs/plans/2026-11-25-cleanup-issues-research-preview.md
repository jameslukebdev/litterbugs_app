# Cleanup issue requests and funded-report revisions — research/preview only

Owner requested research and a preview before implementation. Follow-up: this must
be a utility, not a big button; research Refero. No production feature, schema,
notifications, payments, website deployment or app OTA is authorized by this task.

## Existing behavior verified

- Web CleanupAction/CleanupEvidencePanel already provide Give it back / I can't do
  this cleanup, but release_cleanup returns the report to availability without a
  structured site problem or corrective request to the original reporter.
- Mobile canEditOrDeleteReport combines editing/deleting and requires available
  state. MapScreen and ReportDetailsSheet also reject funding_locked_at edits.
- Database private.protect_funded_report_facts independently rejects edits to
  funded title, location, types/severity, photo_paths and notes. Removing a disabled
  button will not make funded edits work.
- saveReportEdit removes superseded photos after a confirmed update. Reusing that
  behavior for funded/claimed reports would destroy useful original evidence.
- cleanup_notifications, participant inbox links and Expo push delivery already
  exist. Extend those operational channels, respecting push preferences; don't
  introduce a marketing email service or change email-list preferences.
- Live mobile baseline is2797676 / group63bc12bc; shared mobile checkout has other
  work. This preview uses websiteba1feca only as a visual/source baseline.

## Reference lock

Primary: existing Litterbugs report details, Your cleanup panel and one Timeline.
Preserve white surfaces, Nunito headings/system body, existing photo-led hierarchy,
bug artwork, mint #b9e9dd/#8ed7c5, gold fund role, blue report role and lilac cleanup
role. New issue ENTRY stays neutral text/flag or an ellipsis utility; amber is for
an outstanding issue, red only for a genuine safety concern. No new hero/grid.
Use existing local preview photos; all names/amounts are illustrative, labeled in
the review shell outside the product UI. No generated imagery is needed.

Refero styles inspected: Tally dbd841f2-12e7-4b5c-b5b8-94ded944643b (single-column
form restraint), Airbnb2b556363-5cb0-443f-a550-7273d108fea9 (48px targets/rounded
white surfaces), Buy Me a Coffee2c2500c8-ff34-4bd1-8cec-aef76ab75df1 (human scale).
These are bounded ingredients, not replacement brand palettes or marketing layouts.

Concrete screen/image evidence:
- [Linear task detail](https://refero.design/screens/128f5dee-15ec-4191-a2dd-49dfa382d29c):
  unobtrusive top-right ellipsis; primary task content remains dominant.
- [komoot route options](https://refero.design/screens/f877fa0e-47cb-4a81-b734-80bfdc84f13a):
  contextual secondary actions in an icon-and-label popover beside Share.
- [Buy Me a Coffee reporting form](https://refero.design/screens/ddf84d41-d820-4435-8099-b0887934aea4):
  reason list, details, one submission action. Borrow structure, not moderation-red.
- Airbnb screens07ecf44d-6593-4784-b1a7-a947d7377236 and59e44f50-430e-4e41-9998-6518a90509bf:
  reason/details progression. Flow5989 and Granola14171 inspected; compress their
  general-support journey into one task-specific sheet instead of many help pages.

## Official workflow research

- [SeeClickFix notifications](https://www.civicplus.help/seeclickfix/docs/customize-email-notifications)
  attach notifications to request status/comments. Adopt issue-linked events and
  deep links to the exact report; do not copy its email delivery configuration.
- [FixMyStreet FAQ](https://www.fixmystreet.com/faq) uses report updates/status and
  subscriptions for civic work. Adopt one continuing record, not duplicate reports
  for corrections to the same occurrence.
- [GoFundMe editing](https://support.gofundme.com/hc/en-us/articles/360001992687-Editing-your-fundraiser-content)
  separates editable content (story/main image) from account/transfers settings.
  [Updates](https://support.gofundme.com/hc/en-us/articles/12553895153563-How-to-post-a-GoFundMe-update)
  keep supporters informed. Analogy supports editable descriptions with explicit
  update history; it does not establish Litterbugs financial/refund policy.

## Proposed first version (recommendations, not built rules)

1. Active cleaner only: Your cleanup > Cleanup options (ellipsis) > Report an issue.
   Alternative shown for comparison: small inline flag/text, never a large entry CTA.
   This is distinct from reporting/blocking an account or disputing a finished cleanup.
2. One short sheet: Unsafe to clean / Can't reach litter / Litter moved / No litter
   here / Other; details required, photo optional. Keep cleanup or Give it back is
   explicit. Safety/gone default Give it back; an issue never implies completion.
3. Blocking issue pauses new funding/claims. Retaining the claim pauses its clock;
   giving it back releases that attempt while keeping the report on hold. Existing
   personal-unavailability release stays separate and need not flag the site.
4. Private issue details belong to cleaner, reporter and authorized team members.
   Public page/card only says Update requested. Notification inbox + optional push
   link to the issue. Deduplicate retries and notify once; no broad free-form chat.
5. Reporter can update photos, description and access notes even when funded or
   claimed. Keep original photos and a revision history, including the report
   version seen at claim and contribution. Do not delete earlier evidence.
6. Routine access/details correction: notify cleaner, who confirms Looks right or
   Still an issue. Resume retained claim/remaining clock, or make site available
   if claim was released. If cleaner is unavailable, team can review; timing policy
   remains to be selected. Don't auto-resolve a safety issue after a timer.
7. Unsafe/moved/no-litter cases go to team review. Reporter can correct information
   but cannot self-clear a safety hold. No litter is a closure request, never a
   completed cleanup or automatic payout. A different location/scope needs separate
   review; don't move existing donations to another site through an Edit form.
8. Keep same report/site URLs and existing Timeline. Add Update requested / Report
   updated / Issue resolved events; do not count them as cleanups. Donor identity,
   anonymity and financial totals stay as before. Held funds do not auto-transfer,
   pay out or refund from this issue form; closure must use existing reviewed
   financial/refund workflow. Exact escalation/closure timing needs product agreement.

## Implementation boundaries for a later approved build

Split content-edit permission from delete/financial permissions. Use narrow,
authenticated reporter-owned revision RPCs and expected-version concurrency checks;
don't drop the funded-facts trigger or allow arbitrary direct report updates.
Stage/sanitize/review new photos before publication. Snapshot existing funded
report/claim evidence before first revision; immutable retained media needs access
rules and deletion/retention policy. Preserve donor anonymity in every projection.
Issue creation + optional release/hold + notification enqueue must be atomic and
idempotent. Server must enforce holds in claim/funding APIs, including old clients.
Handle stale saves, replaced cleaners, duplicate requests, deleted/blocked accounts,
notification failures, issue re-open, unresponsive reporter and staff escalation.
Push previews omit raw notes/precise address; full evidence is in authenticated UI.
Reuse existing admin attention queue for sensitive cases. No store/native module
change appears necessary, but OTA readiness depends on later implementation review.

## Preview delivery / verification

Development-only /dev-review-preview/cleanup-issues, app and web views; browser-local
state only, no Supabase client/fetch/RPC/upload/payment/notification implementation.
Inline/menu comparison, five reasons, keep/release outcomes, notification/reporter
review, funded editor with retained original, cleaner/team review, public hold and
single Timeline. Product copy stays short; research/explanations remain outside it.
Visual QA passed in Chrome on shared localhost3000: recommended ellipsis menu,
inline alternative, required-details form, local confirmation, notification link,
reporter review, funded access-note save, cleaner confirmation and public Timeline.
$35/3 contributions and original evidence remain visible; issue resolution is still
0 cleanups. Safety has no self-clear action; no-litter closure waits for team review.
Website and app preview views rendered;390px viewport has375px client/scroll width,
no horizontal overflow, no broken images. Fixed inherited oversized radio inputs
and grid intrinsic overflow within this route only; viewport override restored.
Scoped ESLint passes; browser console has no errors. Evidence:
/tmp/litterbugs-cleanup-issues-evidence-20261125/utility-menu.jpg.
No native runtime/backend behavior is claimed tested: this is an interactive concept,
not functioning notifications, database edits, claim pauses, media uploads or payments.
No production source/schema, deployment or OTA changed. Nothing deployed.
