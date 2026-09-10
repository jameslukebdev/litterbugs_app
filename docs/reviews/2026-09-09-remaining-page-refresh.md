# Remaining mobile page refresh

## Direction
Continue the existing white/green Litterbugs design: restrained medium-weight headings, 20-point page margins, subtle green-gray outlines, pale-green selected states, and minimum 44-point actions. Keep status warnings amber and destructive actions red. Preserve account, payout, review deadlines, validation, and submission behavior.

## Individual pages and references

- Public profiles: carry over the previously inspected Airbnb profile hierarchy (Refero c3a860ba-6021-4601-83c3-19b859fff4f3). Compact avatar/name/rank row, left-aligned bio, outlined impact summary, segmented report tabs, and app-styled profile actions. Report navigation returns to the existing map stack.
- Complete cleanup: Google Maps photo/review entry (https://refero.design/screens/e9a144c3-173d-47fa-b0ed-3a9272de8bbc). Explicit two-stage form/review labels, grouped inputs, quieter required labels, larger photo-removal targets.
- Review cleanup: same photo-first evidence hierarchy plus Ada's structured feedback form (https://refero.design/screens/7acf690b-e368-463c-9b8a-b76e3ba09ed9). Clear before/after labels, grouped impact metrics, sentence-case actions, stable submit labels. Removed duplicate editable prop and retained the draft-ready/busy guard on both note fields.
- Cleanup feedback: Ada's feedback hierarchy, adapted to a read-only request. Deadline is prominent, requested changes use neutral outlined markers, duplicated history copy removed, clear update/view actions.
- Report account: Instagram reason selection (https://refero.design/screens/84139169-7f56-4de3-9675-ace3f572c605). Bordered reason group, selected green state, stable submit control, and locked fields during submission. Existing reason codes and moderation behavior retained.
- Sign-in and registration: existing provider choices and email-sheet flow preserved; white canvas, smaller brand mark, lighter typography, stable labels for email submission and resend, fields locked during requests.
- Password recovery and reset: Oku's focused recovery form (https://refero.design/screens/aba2ce8b-19a2-45da-8198-369a0b818222). Single-column forms, clear requirement copy, no raised inset card, stable save button, existing enumeration-safe email responses retained.
- Initial profile setup: consistent with the refreshed profile editor and public profile. Left-aligned introduction, compact optional photo row, explanation of where the display name appears, stable Continue button.

Native destructive confirmations and actionable error alerts remain. Third-party legal/Patreon sites were not redesigned.

## Verification and screenshots

361 tests pass across 80 files, including request-button timing and short-request cancellation. Mobile source checks pass. iOS Release Simulator build succeeds.

Screenshots in `artifacts/page-refresh/index.html` render copied production screen components in a separate simulator app with synthetic data and network access disabled. Photos intentionally show empty states. Authentication forms use preview-only initial modes. These are visual previews, not live backend workflow verification.

The initial screenshot attempt used custom app links on the user's simulator and triggered repeated iOS open-app prompts. Those calls were stopped, the preview app removed, and the simulator restarted. The regular Litterbugs map was visually confirmed without the prompt. Subsequent capture used an isolated simulator and an internal timed page sequence, without custom links. No preview watermark or preview route exists in production source.

## Cleanup fund photo-recovery follow-up

| Decision | Source and purpose |
| --- | --- |
| Keep status and errors on the existing page | Refero Cosmos upload timeout screen, https://refero.design/screens/b1f2f7c8-53dd-4fc4-9dd2-d18101e0898a: preserves gallery context while work or an error is shown. Borrow the recovery pattern, not the dark palette. |
| Owner action is Edit photos | User's screenshot and requested recovery: the completed better-photos decision cannot be fixed by fetching the same status again. Open the existing editor on its photo step. |
| Use white, outlined pale-green guidance and a camera icon | Existing approved Litterbugs pages; compact, left-aligned, scrollable content replaces the large centered shield/error state. |
| Keep Refresh status only for pending review | Pending/safety review can change without a new photo. Poll while focused, retain the page on manual refresh, and use a stable label with delayed progress. |

Ownership, cleanup availability, expiry, cancellation and funding locks are checked before exposing editing and checked again against the latest report on navigation. Other contributors get an explanation and Return to report. No payment, eligibility or moderation bypass is added. The selected initial contribution is saved without claiming it was charged. New photos continue through the existing upload and automatic review path.
