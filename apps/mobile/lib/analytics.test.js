import { describe, expect, it, vi } from 'vitest';
import { participationFailureProperties, participationProperties, REPORT_STEP_STAGES } from './analytics';

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
});
