import { JOURNEY_EVENTS, journeyProperties, participationFailureProperties, participationProperties, type JourneyEvent } from './website-analytics';

export type WebsiteFlowEvent = JourneyEvent | 'participation_step' | 'participation_failure';
type RecordingSignal = { event: string; tags: Record<string, string> };

// Clarity accepts names/tags, not the structured PostHog payload. Revalidate at
// this boundary and project only fixed categories; never forward the raw object.
export function clarityJourney(event: WebsiteFlowEvent, properties: Record<string, unknown>): RecordingSignal | null {
  const safe = event === 'participation_step' ? participationProperties(properties)
    : event === 'participation_failure' ? participationFailureProperties(properties)
      : (JOURNEY_EVENTS as readonly string[]).includes(event) ? journeyProperties(event as JourneyEvent, properties) : null;
  if (!safe) return null;
  const fields = safe as Record<string, unknown>;
  if (event === 'map_loading') {
    const names: Record<string, string> = {
      started: 'lb_map_started', tiles_ready: 'lb_map_ready', failed: 'lb_map_failed', recovered: 'lb_map_recovered',
    };
    const tags: Record<string, string> = {
      lb_map_stage: String(fields.stage),
      lb_map_backgrounded: String(fields.backgrounded),
    };
    if (fields.reason) tags.lb_map_failure_reason = String(fields.reason);
    if (fields.stage !== 'started') {
      const elapsed = fields.elapsed_ms as number;
      tags.lb_map_load_bucket = elapsed < 1000 ? 'under_1s' : elapsed < 3000 ? '1_to_3s' : elapsed < 10000 ? '3_to_10s' : '10s_plus';
    }
    return { event: names[String(fields.stage)], tags };
  }
  if (event === 'map_discovery') {
    const stage = String(fields.stage);
    const name = ['results_empty', 'search_results_empty', 'closest_empty'].includes(stage) ? 'lb_map_empty'
      : ['results_failed', 'search_results_failed', 'closest_failed', 'location_search_failed'].includes(stage) ? 'lb_map_results_failed' : null;
    return name ? { event: name, tags: { lb_map_result: stage, ...(typeof fields.filtered === 'boolean' ? { lb_map_filtered: String(fields.filtered) } : {}) } } : null;
  }
  if (fields.action !== 'clean') return null;
  const tags: Record<string, string> = { lb_cleanup_stage: String(fields.stage) };
  if (event === 'participation_failure') {
    tags.lb_cleanup_failure_reason = String(fields.reason);
    return { event: 'lb_cleanup_failed', tags };
  }
  if (event === 'participation_decision') {
    const names: Record<string, string> = {
      cancelled: 'lb_cleanup_cancelled', saved_for_later: 'lb_cleanup_saved_for_later', draft_resumed: 'lb_cleanup_draft_resumed', draft_discarded: 'lb_cleanup_draft_discarded',
    };
    const name = names[String(fields.exit_type)];
    return name ? { event: name, tags: { ...tags, lb_cleanup_exit: String(fields.exit_type) } } : null;
  }
  const names: Record<string, string> = {
    action_tapped: 'lb_cleanup_started', safety_review: 'lb_cleanup_safety_shown', claim_confirmed: 'lb_cleanup_claimed',
    evidence_form: 'lb_cleanup_evidence_opened', evidence_submitted: 'lb_cleanup_evidence_submitted',
  };
  return event === 'participation_step' ? { event: names[String(fields.stage)] ?? 'lb_cleanup_step', tags } : null;
}

/** Critical observations should leave the SDK's normal batch before navigation. */
export function immediateFlowDelivery(event: WebsiteFlowEvent, properties: Record<string, unknown>) {
  return event === 'shared_report_sign_in' || event === 'app_choice'
    || (event === 'map_loading' && ['failed', 'recovered'].includes(String(properties.stage)))
    || (event === 'participation_failure' && properties.action === 'clean')
    || (event === 'participation_decision' && properties.action === 'clean');
}
