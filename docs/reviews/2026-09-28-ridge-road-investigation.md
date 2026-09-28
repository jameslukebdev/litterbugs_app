**Ridge Road cleanup: investigation and related risks — September 28, 2026**

Scope: Luke's five supplied screenshots; read-only inspection of the linked
Litterbugs production database (`mvaygkflcjswtwchflrk`); current mobile, web,
notification, and payment source at `badd2a5`; prior release evidence; focused
existing mobile tests. No production records, approvals, payments, account
settings, or deployments were changed. The analysis below records the initial findings; implementation and rollout
results are appended at the end. Luke's installed build was not established from the images.

Owner clarification during this investigation: blocks should be very rare and
reserved for serious reasons. Recommendations below use that rule. Ordinary
first paid jobs, ordinary self-cleanups, roadside locations, missing speculative
context, and internal administrative queues should not create automatic holds.
Existing backend gates describe current behavior, not the desired policy.

**1. Ridge Road approval is blocked by first-paid review, despite passing AI.**

The original report is `62fbcc67-1f15-429f-bb12-46058c6cfdf6`. Its active cleanup
is `20f29523-9db1-4b73-ac62-d56ad58a515b`:

| Field | Observed value |
| --- | --- |
| Cleanup state | `completion_submitted` |
| Reporter/cleaner relationship | Self-cleanup |
| Reward | $5.00 |
| Contribution | Grant's successful $5 contribution on September 25 |
| Photo review | `passed` |
| First-paid administrator review | `pending` |
| Payout | `blocked` |
| Stored payout onboarding | Enabled, US, payouts enabled |
| Review deadline | September 30, 5:52:59 p.m. EDT |

AI found the location consistent and the litter materially removed and bagged.
The administrator case `24c40ee7-a1d8-46cd-aced-89ecf0a9439c` is open. There is
also an older expired attempt; its old queued state is historical, not evidence
that the active submission's AI is stuck.

The app already loads `first_paid_admin_status`, but
`apps/mobile/CleanupReviewScreen.js:441` displays approval when photo review
passes and a deadline exists, without checking that administrator status.
The live `public.review_cleanup` function rejects precisely that combination
with `paid_cleanup_review_not_ready`. Read-only evaluation against Luke's actual
attempt returned app-offers-approval=true, server-rejects-approval=true.

This is a confirmed interface/backend mismatch. The first-paid gate is an
existing intentional rule, covered by backend tests, not an unexplained payment
processor rejection. There is no evidence here of a missing contribution or
an attempted failed transfer. Stored onboarding readiness is not a fresh Stripe
bank-settlement verification.

Recommended behavior under the owner's clarified policy: remove the blanket
first-paid administrator prerequisite. First-paid status can support internal
monitoring without preventing ordinary approval or payout. Keep holds for a
specific serious finding, an actual dispute, or a genuine payment restriction.
Until the policy change is implemented, show the existing hold truthfully rather
than offer an action the server refuses. The administrator inbox at
https://litterbugs.app/admin contains the current case; recovery must preserve its
audit history and exclude any independent serious hold. No case was resolved by
this investigation. Change all manual, automatic, and payout readiness checks
together, rather than deleting one guard and leaving other hidden blockers.

**2. The 48-hour promise is incomplete, with a second deadline edge case.**

The app promises automatic approval after 48 hours. The live maintenance and
auto-approval functions deliberately block it while first-paid review is pending.
Waiting until September 30 alone will not necessarily release this cleanup.

The current 48-hour reporter/dispute window and administrator review are separate
gates. Under the clarified policy, ordinary first-paid administration should no
longer extend that window. Keep early reporter approval and timed automatic
approval consistent with the existing dispute policy. Only a specific serious
exception should pause the applicable action. Silently restarting the window
later would change payout expectations.

Additional source-confirmed edge case: after the deadline, `review_cleanup`
returns `auto_approve_cleanup` before its ordinary readiness checks. With a
pending administrator review, that function returns the unchanged attempt,
without an error. The mobile success handler treats every non-completed return
as “Changes requested,” clears the review draft, and tells the user the cleaner
can submit updated evidence. That is incorrect for an unchanged pending review.
This deadline branch was inspected, not triggered on Luke's live cleanup.

Fix both sides: distinguish completed, changes-requested, and still-pending
outcomes explicitly; preserve drafts on non-transitions; return a clear blocked
result from the server. Test before, at, and after the deadline.

**3. The false funding rejection is generated before the report is published.**

Second report: `ba227d19-b46d-46fa-a02c-7d1f4c5047c3`, “Ridge Road cleanup part 2
- more cleanup needed.” Timeline on September 28, EDT:

| Time | Event |
| --- | --- |
| 5:48:29 p.m. | Funding-rejected notification created |
| 5:48:41–5:49:23 p.m. | Three report photos scanned successfully |
| 5:49:24 p.m. | Report published; actual AI review queued |
| 5:49:32 p.m. | AI passes ordinary roadside litter; funding-approved notification |

The recoverable publication flow first reserves a private report with no photos.
The live `private.queue_report_ai_check` trigger marks that empty record
`ineligible`. `private.notify_report_funding_resolution` then announces a
rejection without checking publication or requiring a completed review. Upload
and publication change it to pending; the real review passes about 8.5 seconds
later. Thus the rejection text claims a review happened when none had happened.

The “created_at” shown for reports is reset to publication time; the earlier
notification is explained by that private-draft interval. Eight retained
rejection notifications since September 9 precede their reports' publication
timestamps. That is a count of matching events, not eight unique affected users.

The second report has no contribution records. Its messages do not establish a
charge, an attempted checkout, or a payment failure. Both notices were accepted
by the push provider for Luke; acceptance does not prove a banner was displayed.

Recommended fix: private drafts must not produce public funding-decision notices.
Separate “not uploaded yet” from “review rejected,” and emit resolution notices
only for genuine reviewed transitions on published reports. Preserve the
legitimate rejection path. Audit stale unread notices so an obsolete rejection
does not continue appearing after approval; delivered operating-system banners
cannot be recalled. Include draft abandonment and photo replacement in tests.

**4. “No contribution now” still leads to a misleading payment invitation.**

The current report form correctly explains that choosing no contribution does
not prohibit other members from funding the report. It is not a permanent
volunteer-only classification.

However, `apps/mobile/lib/cleanupNotifications.js:139` routes every funding
approval to `FundingContribution`, labels the action “Complete Payment,” and
sets `fromReportCreation: true`. `FundingContributionScreen.js` falls back to
$25 when no saved amount exists. The funding-review completion copy also says
the user can complete a Stripe payment. These paths do not establish that the
reporter intended to pay.

This is a credible source-backed explanation for the $25 confusion. The supplied
screenshots do not show the exact $25 screen, so its specific path remains
unverified. No unexpected $25 contribution was found on these two reports.

Recommended fix: a general “Report ready” notice should open the report with
optional “Add a contribution.” “Resume payment” belongs only to an explicit,
persisted checkout intent. A default amount must never be presented as a balance
owed. Test no-contribution, canceled checkout, failed payment, and response-loss
recovery separately.

**5. Missing notifications are primarily missing recipients and events.**

On these reports, today's rejection, approval, claim, and paid-review notices
were all addressed to Luke. No corresponding notice was created for Grant.
The observed records therefore do not point to a Grant-device delivery failure.

The existing administrator push is generated for user-moderation cases. Creating
a first-paid-cleanup case does not use that path. Grant is an active administrator
with moderation alerts enabled, but that preference does not subscribe him to
financial-review cases. Luke is also active; his moderation alerts are disabled.

Contributor completion notifications are not implemented in the inspected
workflow. Cleanup approval notices target the cleaner. Additionally, Ridge Road
is still awaiting review, so an honest “cleanup approved” event has not happened
yet. Define distinct messages for evidence submitted, cleanup approved, and
reward transferred, rather than calling them all “complete.”

Recommended recipient rules:

| Event | Recipient |
| --- | --- |
| Serious exception needs review | Assigned/eligible administrators |
| Serious exception resolved | Affected cleaner and reporter, deduplicated |
| Evidence submitted | Reporter; optionally contributors as a pending update |
| Cleanup approved | Cleaner, reporter, and eligible contributors, deduplicated |
| Reward transfer | Cleaner; optional contributor confirmation with precise wording |
| Refund or payment problem | Affected payer/cleaner and responsible administrator |

Use durable event delivery, deduplication, acknowledgment, preferences, and links
that resolve current state. Removing routine first-paid holds also removes the
need for mandatory administrator action on each first job. Avoid sending every
administrator every ordinary cleanup. Give the rare serious cases queue
ownership, aging indicators, and escalation: one other open
report-safety case dates to September 1. Its existence warrants triage; this
investigation did not judge that case's underlying merits.

**6. Photo performance needs measurement beyond AI latency.**

Luke's cleanup scan records show:

| Photo | Scan start EDT | Scan finish EDT | Approximate duration |
| --- | --- | --- | --- |
| 1 | 5:51:16.661 | 5:51:18.892 | 2.23 seconds |
| 2 | 5:51:34.264 | 5:51:37.208 | 2.94 seconds |
| 3 | 5:52:44.185 | 5:52:46.949 | 2.76 seconds |

Submission saved at 5:52:47.602; AI passed at 5:52:59.145, about 11.54 seconds
later. Roughly 102.5 seconds elapsed from the first scan's start to final AI
approval. This is not the full submit-button duration, which was not recorded.

Server scans alone do not explain the long gaps. Possible contributors include
device preparation, photo-library retrieval, upload/network latency, or an older
installed build. The measurements do not identify which one dominates.

Current cleanup code processes batches of two photos and waits for the active
batch before starting the next. Progress updates arrive after a batch settles.
The recoverable new-report uploader separately uses a sequential loop; changing
the concurrency helper alone will not speed up that path. The app also waits
for the final funded AI review before reporting submission success.

Recommended changes: record per-stage timings and bytes, report completed-photo
progress immediately, retain bounded concurrency and ordered evidence, preserve
the recovery journal, and make “Evidence saved; review in progress” visible once
the submission is durable. Verify background/foreground, force-quit, slow
networks, partial failure, and retry without duplicate submissions. Do not trade
away scanning or recovery just to shorten the spinner.

**7. Website review parity has additional concrete defects.**

`apps/web/components/cleanup-review-action.tsx:141` submits `['Other']` for
volunteer change requests. The live database permits lowercase `other`, not
`Other`. That path violates the current constraint. The textarea permits 1,000
characters, while ordinary review notes are limited to 500 by the RPC and live
constraint. These are source/live-contract mismatches; a live user submission
was not made to demonstrate them.

The website's paid-review interface offers disputes, not mobile's early-approval
action, and does not explain the first-paid hold. Mobile refreshes review context
on focus/foreground, rather than continuously while the user waits. Website
attempt loading similarly lacks a continuously refreshed review state.

Recommended fix: centralize readiness, allowed actions, reason codes, note limits,
and user-facing status across mobile and web. Preserve distinct dispute limits
where intentional. Verify parity by workflow, not merely by matching styling.

**8. Related product and payment considerations.**

- **Self-cleanup:** Luke is reporter and cleaner; Grant supplied the reward.
  Self-cleanup is intentionally supported and should not itself trigger a hold.
  Monitor concrete abuse signals without adding another blanket review gate.
  If a serious exception does require administrator judgment, avoid having the
  person benefiting from that disputed decision resolve their own case. There
  is no finding here that Luke misused the app.
- **Partial cleanup:** Luke created a second report because more litter remained.
  The AI accepted the first cleanup. Define the original job's scope, when a
  partial job earns its reward, and how a follow-up report links to it. Otherwise
  duplicate funding or disagreements about substantial remaining litter become
  possible. These risks were not observed as duplicate payments here.
- **Public supporters:** No public funder section or visibility preference was
  found in the inspected workflow. Add explicit consent/anonymity, profile
  deletion handling, refunded-payment rules, and deduplication. Expose a minimal
  public supporter projection, not the private contribution ledger. Decide
  separately whether individual contribution amounts are public.
- **Payment stages:** Current reward processing creates a Stripe transfer to the
  cleaner's connected account. That does not itself prove arrival at a bank.
  Keep “approved,” “transferred to payout account,” and “bank payout” distinct;
  connected-bank payout event coverage is a follow-up audit item.
- **International support:** Current onboarding creates US individual accounts
  and syncs country US; payments use USD. Report geography and payer location are
  separate from recipient eligibility. Do not infer worldwide payouts from
  worldwide maps or supported cards. The reviewed funding guard does not contain
  a report-country payout gate; establish one if contributions should be limited
  to locations where cleaners can actually receive rewards. The prior 120-country
  expansion remains gated by account-specific approval in the project record;
  Stripe correspondence was not rechecked in this investigation. Current Stripe
  documentation distinguishes [Connect cross-border payouts](https://docs.stripe.com/connect/cross-border-payouts)
  and [Global Payouts](https://docs.stripe.com/global-payouts); neither public
  availability list is approval for this account and funds flow.

**9. Older notes: retain the existing decisions and verify installed versions.**

| Luke's earlier item | Current evidence / next consideration |
| --- | --- |
| 50-mile reporting limit | Fresh-GPS publication and immediate pin checks exist; September 25 native evidence is documented. Strict legacy-write enforcement remains deliberately deferred until compatible clients are distributed. Do not call the rollout fully enforced. |
| Ordinary roadside reports | Policy changed September 23. Both current Ridge Road photo reviews passed. Today's false rejection came before AI review. |
| Three photos | Existing one-to-three cap is intentional; optimize the current path before expanding it. |
| Shared links | Prior September 24 physical-device evidence covers sharing and explicit website-to-app handoff. Automatic iOS Universal Links remain a separate entitlement limitation. No new device verification was performed here. |
| Cleanup agreement | Existing direction is acceptance once per exact document-version pair, plus a site-specific confirmation for each cleanup. Preserve acceptance history; legal enforceability was not assessed. |
| Website matches app | Prior layout and map alignment does not prove review/payment workflow parity; defects above show further work is needed. |

Relevant historical evidence: `2026-09-23-photo-review-policy.md`,
`2026-09-23-global-payouts-and-reporting.md`,
`2026-09-24-physical-iphone-share-verification.md`,
`2026-09-25-report-radius-confirmation.md`, and
`../current-mobile-release-candidates.md`.

**10. Minimal-blocking policy and implementation order.**

| Situation | Recommended result |
| --- | --- |
| Ordinary usable report photos, including roadside litter | Publish and pass without manual approval |
| First paid cleanup or ordinary self-cleanup | Same normal approval path as other jobs; optional internal monitoring |
| No contribution chosen | Publish; no checkout, payment debt language, or funding-failure alert |
| Minor photo imperfections, different angles, speculative hazards | Do not hold; ask for evidence only when a material fact truly cannot be assessed |
| Concrete serious danger or strong evidence of material fraud | Hold the affected activity with a specific reason and an accountable review path |
| Substantial original litter clearly remains | Request the necessary correction; do not call it a payment failure |
| Actual dispute | Pause the disputed reward; preserve the evidence and unaffected activity |
| Provider or network outage | Preserve the submission and retry automatically; identify a technical delay rather than reject the work or imply wrongdoing |
| Genuine payout eligibility or processor restriction | Hold the payout only where possible; explain the precise recovery step and retain cleanup evidence/recognition |

Separate cleanup outcome from reward state in the product. This may require a
schema/workflow adjustment because current paid completion and payout gates are
coupled. Technical failure must not silently authorize an unverified money
movement, but it also must not discard the submission or create a permanent
manual-review dependency. Optional improvements and monitoring are not new
user-facing completion gates.

Recommended order:

1. Replace the blanket first-paid hold across approval, auto-approval, and payout
   with the clarified exception policy. Recover existing first-paid-only cases
   through an audited transition, preserving genuine independent holds. Verify
   cleanup state and reward transfer separately.
2. Correct mobile readiness, precise exception messaging, deadline outcomes, and
   notifications for the remaining serious cases. Keep technical payment
   correctness, idempotency, and genuine eligibility requirements enforced.
3. Suppress draft-generated rejection notices and make funding notifications
   respect actual payment intent. Reconcile obsolete unread notices carefully.
4. Fix website reason/length mismatches and align supported review actions.
5. Add contributor lifecycle notifications and privacy-aware supporter display.
6. Instrument and optimize uploads; verify actual installed builds on devices.
7. Clarify country eligibility, partial-job scope, bank-payout status, and serious
   exception ownership. Use monitoring for ordinary activity rather than adding
   new manual steps or routine approval gates.

Required regression scenarios include: volunteer and funded cleanups; first and
subsequent paid jobs; self and third-party cleanup; pending/passed/rejected AI;
pending/approved administrator review; open/resolved disputes; before/after
deadline; unpublished/abandoned/recovered reports; no contribution/canceled
checkout; repeat notification delivery; and interrupted uploads. Assert actual
state transitions, ledger effects, and recipients, not just wording in source.

Verification performed here: seven existing focused mobile test files passed,
31 tests total (notifications, funding availability, report-funding UI contract,
cleanup submission, submission recovery, report submission, concurrent batches).
Those passing tests do not cover all the combined states exposed by this incident.
Live read-only predicates confirmed the current approval mismatch; live function
definitions, constraints, review rows, contribution rows, notification deliveries,
and scan timings support the findings above. No new regression tests, physical
device run, approval, payment, migration, or deployment was performed.


**Implementation and backend rollout — September 28, 2026**

Implemented the narrowly agreed fixes on branch `codex/cleanup-approval-fixes`.
No new workflow tables, review service, or extra user steps were introduced.
The existing first-paid fact remains available for history, but new claims use
`first_paid_admin_status = not_required`. AI passes and administrator resolution
of an actual photo-review case no longer create a second first-paid case.
Manual and automatic approval ignore the routine pending flag while preserving
recorded rejection, photo-review, dispute, payout eligibility, and ledger checks.
Expired blocked reviews return a real error instead of an unchanged success.

Migration `20260928224522_remove_routine_cleanup_holds.sql` is applied to the
linked production project. Unreviewed first-paid cases are retired with an
explicit `routine_first_paid_hold_removed` audit action; original evidence,
contributions, approval deadlines, human decisions, and payment state are retained.
Ridge Road's case was resolved this way. The cleanup remains submitted, photos
passed, reward $5, payout blocked pending Luke's approval or the ordinary deadline.
No approval or transfer was performed by Codex.

Funding resolution notifications now require a published report and an actual
review timestamp. The deployed notification service describes contributions as
optional. Updated mobile notification routing opens the report, not checkout.
Mobile and web preserve feedback and avoid claiming a transition when a response
remains pending. Website change requests use lowercase `other` and a 500-character
review note limit; the separate 1,000-character dispute limit is retained.

Validation: full `npm run check` passed (453 mobile, 196 web, 14 shared, 25 backend,
7 relay tests, type checks, lint/build/boundaries, and auth-bridge dry run).
Mobile source check passed across 163 modules. The notification service was
checked again after its copy change. New SQL regression tests passed against the
production schema inside rollback-only transactions: real claim/submission/AI
pass/reporter approval, deadline auto-approval, exactly-once review, genuine
rejection/dispute/evidence holds, and draft versus real decision notifications.
Existing mobile workflow SQL also passed. A recovery rehearsal confirmed unchanged
contribution rows, unchanged cleanup fields except the routine status, preserved
function permissions, and an audit entry for Ridge Road.

The old broad `funded_cleanup_mvp.sql` suite was also attempted but its legacy
client direct-insert fixtures conflict with newer publication grants/RLS; it is
not counted as passing. Its obsolete first-paid expectation was updated. The new
focused suite uses the current claim/submission APIs and passes without weakening
production permissions.

Rendered verification used the actual website review component and modal with
mocked reads/writes at 1280x900 and 390x900. Browser plugin not available; used
installed Chrome through Playwright. Correct reason/limits, pending-result
feedback retention, page identity and clean console checks passed. Evidence:
`/tmp/litterbugs-sep28-browser/review-1280.png`, `review-390.png`,
`pending-1280.png`, and `pending-390.png`. This is a rendered component test, not
an actual production cleanup submission or a native-device acceptance test.

Luke's verification: rebuild the iOS app from the delivered commit using a new
TestFlight build number; reopening the existing Ridge Road cleanup can verify
the server approval fix even before that update. Approve only if its evidence is
correct, then confirm Completed and track the existing $5 reward separately.
Do not create another contribution. In the updated build, submit an ordinary
report with No contribution now: expect no premature rejection, no required
checkout/$25 amount, and any funding-approved notice to open the report. Old
already-delivered push banners cannot be recalled. Use a genuine ordinary next
cleanup to confirm no first-paid administrator queue is introduced. Website
volunteer change requests should accept a normal note and request updated
photos without the old generic save failure. Real-money failure testing remains
outside this acceptance walkthrough; serious-hold cases were exercised with
rolled-back fixtures.

Contributor completion notifications, public funder profiles, upload optimization,
international expansion, store publication, and the deferred strict GPS rollout
are separate work and were not included in this narrow fix.
