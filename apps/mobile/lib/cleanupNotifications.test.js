import { describe, expect, it } from 'vitest';

import {
  cleanupNotificationDestination,
  cleanupNotificationPresentation,
  cleanupStateFromNotification,
} from './cleanupNotifications';

describe('cleanup notifications', () => {
  it('presents every required workflow event', () => {
    expect(cleanupNotificationPresentation([{ event_type: 'report_claimed' }]).message)
      .toContain('claimed');
    expect(cleanupNotificationPresentation([{ event_type: 'claim_expiring_soon' }]).message)
      .toContain('expires soon');
    expect(cleanupNotificationPresentation([{ event_type: 'claim_expired' }]).message)
      .toContain('expired');
    expect(cleanupNotificationPresentation([{ event_type: 'completion_submitted' }]).message)
      .toContain('submitted');
    expect(cleanupNotificationPresentation([{ event_type: 'changes_requested' }]).message)
      .toContain('Changes');
    expect(cleanupNotificationPresentation([{ event_type: 'cleanup_approved' }]).message)
      .toContain('approved');
    expect(cleanupNotificationPresentation([{ event_type: 'cleanup_auto_approved' }]).message)
      .toContain('automatically');
    expect(cleanupNotificationPresentation([{ event_type: 'correction_expired' }]).message)
      .toContain('available');
    expect(cleanupNotificationPresentation([{ event_type: 'paid_review_started' }]).message)
      .toContain('48 hours');
    expect(cleanupNotificationPresentation([{ event_type: 'paid_cleanup_disputed' }]).message)
      .toContain('paused');
    expect(cleanupNotificationPresentation([{ event_type: 'cleanup_reward_sent' }]).message)
      .toContain('transferred');
    expect(cleanupNotificationPresentation([{ event_type: 'cleanup_fund_increased' }]).message)
      .toContain('added money');
    expect(cleanupNotificationPresentation([{ event_type: 'cleanup_contribution_refunded' }]).message)
      .toContain('refunded');
    expect(cleanupNotificationPresentation([{ event_type: 'cleanup_payout_failed' }]).message)
      .toContain('Litterbugs team member');
    expect(cleanupNotificationPresentation([{ event_type: 'report_renewal_due' }]).message)
      .toContain('7 days');
    expect(cleanupNotificationPresentation([{ event_type: 'report_renewed' }]).message)
      .toContain('another 30 days');
    expect(cleanupNotificationPresentation([{ event_type: 'report_funding_photos_needed' }]).message)
      .toContain('Replace');
  });

  it('routes review and feedback events to dedicated screens', () => {
    expect(cleanupNotificationDestination({
      eventType: 'completion_submitted',
      reportId: 'report',
      cleanupId: 'cleanup',
    })).toMatchObject({ name: 'CleanupReview', label: 'Review Cleanup' });

    expect(cleanupNotificationDestination({
      event_type: 'changes_requested',
      report_id: 'report',
      cleanup_attempt_id: 'cleanup',
    })).toMatchObject({ name: 'CleanupFeedback', label: 'Review Feedback' });
  });

  it('routes other events to the relevant report', () => {
    expect(cleanupNotificationDestination({
      event_type: 'cleanup_approved',
      report_id: 'report',
      cleanup_attempt_id: 'cleanup',
    })).toMatchObject({
      name: 'App',
      params: { screen: 'Map', params: { reportId: 'report' } },
    });
    expect(cleanupNotificationDestination({
      event_type: 'cleanup_fund_increased',
      report_id: 'report',
      cleanup_attempt_id: null,
    })).toMatchObject({
      name: 'App',
      params: { screen: 'Map', params: { reportId: 'report' } },
    });
    expect(cleanupNotificationDestination({
      event_type: 'cleanup_contribution_refunded',
      report_id: 'report',
      cleanup_attempt_id: null,
    })).toMatchObject({ name: 'ContributionHistory' });
    expect(cleanupNotificationDestination({
      event_type: 'report_funding_photos_needed',
      report_id: 'report',
      cleanup_attempt_id: null,
    })).toMatchObject({
      name: 'App',
      params: { screen: 'Map', params: { reportId: 'report' } },
    });
  });

  it('projects event types to report cleanup states', () => {
    expect(cleanupStateFromNotification({ event_type: 'report_claimed' })).toBe('claimed');
    expect(cleanupStateFromNotification({ event_type: 'completion_submitted' })).toBe('completion_submitted');
    expect(cleanupStateFromNotification({ event_type: 'changes_requested' })).toBe('changes_requested');
    expect(cleanupStateFromNotification({ event_type: 'cleanup_approved' })).toBe('completed');
    expect(cleanupStateFromNotification({ event_type: 'claim_expired' })).toBe('available');
  });
});
