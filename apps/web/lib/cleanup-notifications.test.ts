import { expect, it } from 'vitest';
import { notificationHref, notificationPresentation } from './cleanup-notifications';
it.each(['report_claimed', 'claim_expired', 'cleanup_changes_requested', 'funded_cleanup_completed', 'report_funding_approved'])('routes %s through authenticated participation checks and keeps the inbox return path', event_type => {
  expect(notificationHref({ event_type, report_id: 'report-id', contribution_id: null })).toBe('/account/reports/report-id?from=notifications');
});
it('preserves refund receipt, payout and admin destinations', () => {
  expect(notificationHref({ event_type: 'cleanup_contribution_refunded', report_id: 'r', contribution_id: 'receipt' })).toBe('/account/payments/receipt');
  expect(notificationHref({ event_type: 'cleanup_reward_sent', report_id: 'r', contribution_id: null })).toBe('/account/connect');
  expect(notificationHref({ event_type: 'admin_cleanup_needed', report_id: 'r', contribution_id: null })).toBe('/admin');
});
it('labels a daily nearby alert and opens its own results', () => {
  const alert = { id: 'alert-id', event_type: 'nearby_reports_daily', report_id: null, contribution_id: null };
  expect(notificationPresentation(alert).title).toBe('New litter near you');
  expect(notificationHref(alert, { filter: 'unread', page: 2 })).toBe('/account/notifications/alert-id?filter=unread&page=2');
});
it.each(['cleanup_issue_requested', 'cleanup_issue_replied', 'cleanup_issue_report_updated', 'cleanup_issue_resolved'])('opens the private thread for %s', event_type => {
  const notification = { event_type, report_id: 'report-id', contribution_id: null, issue_id: 'issue-id' };
  expect(notificationHref(notification)).toBe('/account/cleanup-issues/issue-id');
  expect(notificationPresentation(notification).title).toBeTruthy();
});
