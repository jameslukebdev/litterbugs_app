# Photo review: reports should be easy to pass

Owner direction: presume ordinary reports qualify for funding. Recognizable
litter in a usable photo is enough unless there is concrete evidence of a
narrow exception. Do not require reporters to prove a location is safe or public.

Implementation status: deployed September 23 to Cloud Run revision
`litterbugs-gemini-relay-00004-rxr` (100% traffic) and the
`run-financial-maintenance` Supabase Edge Function. Live review results record
`policy_version: presume-eligible-2026-09-23`.

Three existing safety holds with no human review actions were re-evaluated,
preserving their original AI results and recording superseding audit actions:

- Rural roadside bag, report `1a1cd5fa-7ad9-4d11-bad7-5529811582b2`: passed,
  funding eligible.
- Ridge Road litter beyond the guardrail, report
  `62fbcc67-1f15-429f-bb12-46058c6cfdf6`: passed, funding eligible.
- Yard photo, report `dbbf4d21-2dc2-48ca-8c1c-7176975f6791`: asks for a closer
  photo because no litter is identifiable; no longer held for private property.

The rollout script scopes these three reports and will not override human
decisions, funding locks, moderation removals, or completed/claimed reports.

## Every non-pass reason

| Reason | Revised threshold |
| --- | --- |
| `blurry` | Ask for photos only if the entire set prevents identifying litter or assessing cleanup; usable imperfect photos pass. |
| `poor_framing` | Same threshold; do not require identical angles or a wide view. |
| `insufficient_coverage` | Ask for photos only if the relevant evidence cannot be assessed; one useful photo may suffice. No visible litter or unrelated content gets a photo request, not rejection. |
| `cleanup_incomplete` | Cleanup claims only: substantial reported litter must remain. Minor remnants pass. Request finishing and new evidence on attempts 1–2; human review on attempt 3. |
| `mismatched_location` | Cleanup claims only: contradictory fixed landmarks, not different angles, lighting, or removed litter. Inability to compare gets a targeted photo request first. |
| `exact_original_photo_reuse` | Original images submitted as completed-cleanup evidence still require review, including the existing exact-file hash check. Similar views are not duplicates. |
| `hazardous_waste` | Clearly identifiable waste requiring specialist handling. Ordinary bags, bottles, cans, and unknown contents pass. |
| `traffic_exposure` | Concrete unavoidable traffic danger at the litter. Rural roads, narrow verges, missing parking information, or missing proof of separation pass. |
| `private_property` | Ownership alone passes. Review only a clear access restriction affecting the litter, with no reported authorization. No proof of permission required. |
| `inaccessible_terrain` | Clearly requires specialist equipment or rescue-level access. Ordinary slopes, ditches, mud, vegetation, and nearby water pass. |
| `suspected_manipulation` | Strong specific evidence of material fabrication. Compression, cropping, timestamps, colors, and ordinary artifacts pass. |
| `ambiguous` | Not a standalone report hold. Missing context passes. Actual inability to assess cleanup gets targeted photo requests, then review after the third attempt. |

The backend continues to escalate concrete safety/integrity reason codes even
if Gemini inconsistently labels the decision as a pass. Prompts explicitly forbid
emitting speculative hazard codes. Gemini `fail` responses are converted to human
review; exhausted provider retries also create review holds rather than marking
reports ineligible. Neither condition grants automatic approval without evidence.

First-paid-cleanup reviews, disputes, payment eligibility, and payout checks are
separate from initial report approval and remain in place. They are not reasons
for Gemini to reject an ordinary report. The existing three-attempt photo limit
applies to cleanup submissions, not original report photo quality.

## Verification

- Seven relay tests passed, including the outgoing system instruction check.
- Nineteen shared financial tests passed, including legacy failure normalization,
  all seven mandatory review reasons, and non-escalation of quality reason codes.
- Financial-maintenance Edge Function type check passed.
- Live rechecks confirm the intended roadside behavior on two existing reports.
  This is evidence for these examples, not a general model-accuracy guarantee.
