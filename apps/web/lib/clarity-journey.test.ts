import { describe, expect, it } from 'vitest';
import { clarityJourney, immediateFlowDelivery } from './clarity-journey';

describe('safe recording markers', () => {
  it('projects map failures without raw payloads or precise elapsed time', () => {
    expect(clarityJourney('map_loading', {
      stage: 'failed', reason: 'startup_timeout', elapsed_ms: 12000, backgrounded: false,
      report_id: 'private-id', email: 'private@example.invalid', latitude: 36.12345, error: 'private error',
    })).toEqual({ event: 'lb_map_failed', tags: {
      lb_map_stage: 'failed', lb_map_backgrounded: 'false', lb_map_failure_reason: 'startup_timeout', lb_map_load_bucket: '10s_plus',
    } });
    expect(clarityJourney('map_loading', { stage: 'failed', reason: 'private error', elapsed_ms: 12000, backgrounded: false })).toBeNull();
  });
  it.each([['started', 'lb_map_started'], ['tiles_ready', 'lb_map_ready'], ['recovered', 'lb_map_recovered']])('labels %s separately', (stage, event) => {
    expect(clarityJourney('map_loading', { stage, elapsed_ms: 1600, backgrounded: true })).toMatchObject({ event, tags: { lb_map_backgrounded: 'true' } });
  });
  it.each(['results_failed', 'search_results_failed', 'closest_failed', 'location_search_failed'])('makes %s searchable', stage => {
    expect(clarityJourney('map_discovery', { stage })).toEqual({ event: 'lb_map_results_failed', tags: { lb_map_result: stage } });
  });
  it('marks empty results without treating normal result polling as friction', () => {
    expect(clarityJourney('map_discovery', { stage: 'results_empty', filtered: true })).toEqual({ event: 'lb_map_empty', tags: { lb_map_result: 'results_empty', lb_map_filtered: 'true' } });
    expect(clarityJourney('map_discovery', { stage: 'results_loaded' })).toBeNull();
  });
  it.each([
    ['action_tapped', 'lb_cleanup_started'], ['safety_review', 'lb_cleanup_safety_shown'],
    ['claim_confirmed', 'lb_cleanup_claimed'], ['evidence_form', 'lb_cleanup_evidence_opened'],
    ['evidence_submitted', 'lb_cleanup_evidence_submitted'], ['auth_shown', 'lb_cleanup_step'],
  ])('keeps cleanup %s distinct', (stage, event) => {
    expect(clarityJourney('participation_step', { action: 'clean', stage })).toEqual({ event, tags: { lb_cleanup_stage: stage } });
  });
  it('records explicit cancellation and resume without claiming a permanent abandonment', () => {
    expect(clarityJourney('participation_decision', { action: 'clean', stage: 'evidence_form', exit_type: 'cancelled' })).toEqual({ event: 'lb_cleanup_cancelled', tags: { lb_cleanup_stage: 'evidence_form', lb_cleanup_exit: 'cancelled' } });
    expect(clarityJourney('participation_decision', { action: 'clean', stage: 'evidence_form', exit_type: 'draft_resumed' })?.event).toBe('lb_cleanup_draft_resumed');
    expect(clarityJourney('participation_decision', { action: 'clean', stage: 'evidence_form', exit_type: 'tab_hidden' })).toBeNull();
    expect(clarityJourney('participation_step', { action: 'clean', stage: 'approved' })).toBeNull();
  });
  it('keeps arbitrary payloads out of failure tags and ignores unrelated flows', () => {
    expect(clarityJourney('participation_failure', { action: 'clean', stage: 'evidence_form', reason: 'photo_upload_failed', filename: 'private.jpg' })).toEqual({ event: 'lb_cleanup_failed', tags: { lb_cleanup_stage: 'evidence_form', lb_cleanup_failure_reason: 'photo_upload_failed' } });
    expect(clarityJourney('participation_failure', { action: 'clean', stage: 'evidence_form', reason: 'private.jpg' })).toBeNull();
    expect(clarityJourney('participation_step', { action: 'report', stage: 'review' })).toBeNull();
    expect(clarityJourney('shared_report_sign_in', { stage: 'attempted', provider: 'google' })).toBeNull();
  });
  it('requests immediate delivery only for important exits and failures', () => {
    expect(immediateFlowDelivery('map_loading', { stage: 'failed' })).toBe(true);
    expect(immediateFlowDelivery('participation_decision', { action: 'clean', exit_type: 'cancelled' })).toBe(true);
    expect(immediateFlowDelivery('participation_failure', { action: 'clean' })).toBe(true);
    expect(immediateFlowDelivery('map_loading', { stage: 'started' })).toBe(false);
    expect(immediateFlowDelivery('participation_step', { action: 'clean', stage: 'action_tapped' })).toBe(false);
  });
});
