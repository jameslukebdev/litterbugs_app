import { notificationViewQuery, type NotificationView } from './notification-view';
import type { Database } from '@litterbugs/report-contract';

export type CleanupNotification = Database['public']['Tables']['cleanup_notifications']['Row'];

const CLEANUP_NOTIFICATION_CONTENT: Record<string, { title: string; message: string }> = {
  admin_cleanup_needed: {
    title: 'Cleanup needs attention',
    message: 'A cleanup or payment issue needs your review. Open your admin inbox.',
  },
  funded_cleanup_completed: {
    title: 'Cleanup you funded is complete',
    message: 'A cleanup you helped fund has been approved. Thank you for supporting it!',
  },
  admin_moderation_needed: {
    title: 'Community report needs review',
    message: 'A member sent a concern to the Litterbugs team. Review it in your admin inbox.',
  },
  report_claimed: {
    title: 'Report claimed',
    message: 'Your litter report has been claimed for cleanup.',
  },
  claim_expiring_soon: {
    title: 'Cleanup expires soon',
    message: 'Your cleanup claim expires soon.',
  },
  claim_expired: {
    title: 'Cleanup claim expired',
    message: 'Your cleanup claim expired and is available to other volunteers again.',
  },
  completion_submitted: {
    title: 'Cleanup ready for review',
    message: 'A cleanup was submitted for your review.',
  },
  changes_requested: {
    title: 'Changes requested',
    message: 'Changes were requested for your cleanup submission.',
  },
  cleanup_approved: {
    title: 'Cleanup approved',
    message: 'Your cleanup was approved. Thanks for helping keep the community clean!',
  },
  cleanup_auto_approved: {
    title: 'Cleanup automatically approved',
    message: 'Your cleanup was automatically approved.',
  },
  correction_expired: {
    title: 'Cleanup update window expired',
    message: 'The report is available to other volunteers again. Your earlier evidence remains in the cleanup history.',
  },
  paid_review_started: {
    title: 'Funded cleanup ready for review',
    message: 'The cleanup photos passed review. You have 48 hours to report a problem.',
  },
  paid_cleanup_disputed: {
    title: 'Cleanup disputed',
    message: 'The payout is paused while a Litterbugs team member reviews the cleanup.',
  },
  cleanup_reward_sent: {
    title: 'Cleanup reward sent',
    message: 'Your cleanup reward was sent to your payout account.',
  },
  cleanup_payout_failed: {
    title: 'Cleanup reward needs attention',
    message: 'Your cleanup is approved, but a Litterbugs team member needs to review the reward transfer.',
  },
  cleanup_fund_increased: {
    title: 'Cleanup fund increased',
    message: 'A member added money to your report’s cleaner reward.',
  },
  cleanup_contribution_refunded: {
    title: 'Contribution refunded',
    message: 'Your full cleanup contribution and Litterbugs fee were refunded.',
  },
  report_renewal_due: {
    title: 'Renew or close your report',
    message: 'You have 7 days to renew it or its cleanup fund will be refunded.',
  },
  report_renewed: {
    title: 'Report renewed',
    message: 'Your report and its cleanup fund are active for another 30 days.',
  },
  report_funding_photos_needed: {
    title: 'Better report photos needed',
    message: 'Replace the original report photos before members can fund this cleanup.',
  },
  report_funding_review_required: {
    title: 'Cleanup fund safety review',
    message: 'Your report needs a quick administrator safety review before funding can begin.',
  },
  report_funding_approved: {
    title: 'Cleanup funding approved',
    message: 'Your report can now accept contributions. Adding funds is optional.',
  },
  report_funding_rejected: {
    title: 'Cleanup funding unavailable',
    message: 'Your report was reviewed and cannot accept cleanup funding.',
  },
};

export function notificationPresentation(notice: Pick<CleanupNotification, 'event_type'>) {
  return CLEANUP_NOTIFICATION_CONTENT[notice.event_type] ?? { title: 'Cleanup update', message: 'There is an update to one of your cleanups.' };
}
export function notificationHref(notice: Pick<CleanupNotification, 'event_type' | 'report_id' | 'contribution_id'> & { id?: string }, view?: NotificationView) {
  if (notice.event_type.startsWith('admin_')) return '/admin';
  if (notice.event_type === 'cleanup_contribution_refunded') return notice.contribution_id ? `/account/payments/${encodeURIComponent(notice.contribution_id)}` : '/account/payments';
  if (notice.event_type === 'cleanup_payout_failed' || notice.event_type === 'cleanup_reward_sent') return '/account/connect';
  if (notice.event_type === 'report_renewal_due') return '/account/reports';
  const query = view ? notificationViewQuery(view) : new URLSearchParams();
  query.set('from', 'notifications');
  if (view && notice.id) query.set('notice', notice.id);
  return notice.report_id ? `/account/reports/${encodeURIComponent(notice.report_id)}?${query}` : '/account/activity';
}
