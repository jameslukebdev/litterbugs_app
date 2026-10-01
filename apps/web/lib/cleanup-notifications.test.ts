import { expect, it } from 'vitest';
import { notificationHref } from './cleanup-notifications';
it.each(['report_claimed', 'claim_expired', 'cleanup_changes_requested', 'funded_cleanup_completed', 'report_funding_approved'])('routes %s through authenticated participation checks and keeps the inbox return path', event_type => {
  expect(notificationHref({ event_type, report_id: 'report-id', contribution_id: null })).toBe('/account/reports/report-id?from=notifications');
});
it('preserves refund receipt, payout and admin destinations', () => {
  expect(notificationHref({ event_type: 'cleanup_contribution_refunded', report_id: 'r', contribution_id: 'receipt' })).toBe('/account/payments/receipt');
  expect(notificationHref({ event_type: 'cleanup_reward_sent', report_id: 'r', contribution_id: null })).toBe('/account/connect');
  expect(notificationHref({ event_type: 'admin_cleanup_needed', report_id: 'r', contribution_id: null })).toBe('/admin');
});
