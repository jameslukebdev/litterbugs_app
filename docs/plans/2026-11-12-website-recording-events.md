# Website recording events

Scope: website instrumentation only. Analytics project settings and native app
code are unchanged. Website bundle marker: `web-participation-2026-11-12-v9`.

PostHog retains its existing structured `map_loading`, `map_discovery`,
`participation_step`, `participation_failure` and `participation_decision` events.
The browser now sends the following matching, bounded markers to Clarity.

| Clarity event | Observation |
| --- | --- |
| `lb_map_started` | Map initialization began. |
| `lb_map_ready` | Initial tiles became visible. |
| `lb_map_failed` | Known startup, authorization or marker-render failure. |
| `lb_map_recovered` | Initial tiles appeared after a startup timeout. |
| `lb_map_empty` | Area, search or closest-report query returned no reports. |
| `lb_map_results_failed` | A report/location search or results request failed. |
| `lb_cleanup_started` | Visitor tapped the cleanup action. |
| `lb_cleanup_safety_shown` | The safety review opened. |
| `lb_cleanup_claimed` | A claim was confirmed; this is not completion. |
| `lb_cleanup_evidence_opened` | Cleanup evidence form opened. |
| `lb_cleanup_evidence_submitted` | Evidence submission was confirmed; this is not approval. |
| `lb_cleanup_step` | Another recognized cleanup stage, including sign-in/payout. |
| `lb_cleanup_failed` | A recognized cleanup-stage failure occurred. |
| `lb_cleanup_cancelled` | Visitor explicitly closed the cleanup entry/evidence flow. |
| `lb_cleanup_saved_for_later` | Explicit save-for-later decision, if emitted by the flow. |
| `lb_cleanup_draft_resumed` | An existing cleanup draft was resumed. |
| `lb_cleanup_draft_discarded` | Explicit discard decision, if emitted by the flow. |

Markers project only existing allowlisted signals. Defining a marker does not
add a new save/discard control or invent a corresponding user action.

Clarity custom tags: `lb_workflow_version`, `lb_map_stage`,
`lb_map_failure_reason`, `lb_map_backgrounded`, `lb_map_load_bucket`,
`lb_map_result`, `lb_map_filtered`, `lb_cleanup_stage`,
`lb_cleanup_failure_reason`, `lb_cleanup_exit`. Map duration buckets are under
1s, 1–3s, 3–10s and 10s+. The underlying timer begins at map initialization,
not the homepage click. Backgrounded loads are labeled separately.

These tags describe values encountered in a recording; they are not a live
state or a join between a particular failure and a particular cleanup. No report
or member IDs, text, coordinates, URLs, filenames, photos or provider payloads
are added to the markers. No identity linking or PostHog replay is enabled.

## Finding recordings after release

In Clarity Recordings, filter Smart events to `lb_map_failed` or
`lb_cleanup_cancelled`. Narrow with the failure reason, cleanup stage or bundle
tag when useful. Start/open markers also support investigating flows that lack
their claim/submission step. A hidden tab, OAuth handoff or incomplete recording
does not establish permanent abandonment, so no abandonment event is inferred.

New custom events/tags become available only after Clarity receives them. This
code change alone does not populate the live project's filter picker or alter saved
segments/funnels. A blocked recorder, opted-out browser or incomplete upload can
leave a PostHog event without an available Clarity recording.

## Delivery and local verification

- Preserve order across early steps, failures and decisions before SDK loading.
- Track provider delivery separately; late/failed Clarity or Google does not
  hold up PostHog, and a provider readiness change does not resend accepted events.
- Send important map failures/recovery and cleanup failures/decisions immediately
  through PostHog's beacon transport. Delivery is still best effort.
- Bound the pending provider buffer to 150 entries and our Clarity bootstrap to
  250 commands while its scripts are unavailable. Oldest telemetry can be dropped;
  consent and bundle tags are preserved where possible. No user action waits.
- Keep localhost, previews, saved analytics exclusion, Do Not Track and Global
  Privacy Control behavior. No automatic permission pop-up is introduced.
- Test delivery using mocked providers, not the real ingestion endpoints. The
  normal local server intentionally does not send analytics. After deployment,
  any ingestion/recording verification must be isolated from visitor reporting,
  and the testing browser's exclusion restored afterward.

Reference: [Microsoft Clarity client API](https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-api).
