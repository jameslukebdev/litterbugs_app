import { describe, expect, it, vi } from 'vitest';
import { firstRunProperties, participationFailureProperties, participationProperties, payoutSetupProperties, REPORT_STEP_STAGES, signInProperties } from './analytics';

describe('app participation analytics', () => {
  it('uses the website step names for reporting, funding and cleaning', () => {
    expect(participationProperties('report', 'published')).toEqual({ action: 'report', stage: 'published' });
    expect(participationProperties('fund', 'payment_confirmed')).toEqual({ action: 'fund', stage: 'payment_confirmed' });
    expect(participationProperties('clean', 'evidence_submitted')).toEqual({ action: 'clean', stage: 'evidence_submitted' });
    expect(participationProperties('clean', 'action_tapped')).toEqual({ action: 'clean', stage: 'action_tapped' });
    expect(REPORT_STEP_STAGES).toEqual(['photos', 'litter_type', 'severity', 'details', 'review']);
  });

  it('drops unknown steps and reasons instead of sending them', () => {
    expect(participationProperties('report', 'payment_confirmed')).toBeNull();
    expect(participationProperties('share', 'action_tapped')).toBeNull();
    expect(participationFailureProperties('fund', 'payment_submitted', 'payment_rejected')).toEqual({ action: 'fund', stage: 'payment_submitted', reason: 'payment_rejected' });
    expect(participationFailureProperties('fund', 'payment_submitted', 'claim_failed')).toBeNull();
  });

  it('records payout setup with the website stage names', () => {
    expect(payoutSetupProperties('form_opened')).toEqual({ stage: 'form_opened' });
    expect(payoutSetupProperties('ready')).toEqual({ stage: 'ready' });
    expect(payoutSetupProperties('started')).toBeNull();
  });

  it('records why sign-in was asked for and how the person signed in, and nothing else', () => {
    expect(signInProperties('shown', { intent: 'fund' })).toEqual({ stage: 'shown', intent: 'fund' });
    expect(signInProperties('submitted', { intent: 'none', method: 'apple' })).toEqual({ stage: 'submitted', intent: 'none', method: 'apple' });
    expect(signInProperties('submitted', { intent: 'clean', method: 'someone@example.com' })).toEqual({ stage: 'submitted', intent: 'clean' });
    expect(signInProperties('shown', { intent: 'browse' })).toBeNull();
  });

  it('records the welcome and each tour step by name', () => {
    expect(firstRunProperties('welcome_get_started')).toEqual({ stage: 'welcome_get_started' });
    expect(firstRunProperties('tour_step', 'spot')).toEqual({ stage: 'tour_step', step: 'spot' });
    expect(firstRunProperties('tour_skipped', 'fund')).toEqual({ stage: 'tour_skipped', step: 'fund' });
    expect(firstRunProperties('tour_step', 'unknown')).toBeNull();
    expect(firstRunProperties('tour_done')).toBeNull();
  });
});
