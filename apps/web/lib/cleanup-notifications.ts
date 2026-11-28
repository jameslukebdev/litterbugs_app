import { nearbyAlertHref, notificationViewQuery, type NotificationView } from './notification-view';
import type { Database } from '@litterbugs/report-contract';

export type CleanupNotification = Database['public']['Tables']['cleanup_notifications']['Row'];
type NotificationTarget = Pick<CleanupNotification, 'event_type' | 'contribution_id'> & { report_id: string | null; id?: string; issue_id?: string | null };

const CLEANUP_NOTIFICATION_CONTENT: Record<string, { title: string; message: string }> = {
  tip_received: {
    title: 'You got a tip',
    message: 'Someone thanked you with a tip.',
  },
  cleanup_issue_requested:{title:'Cleanup issue reported',message:'The cleaner sent a private message about your report.'},
  cleanup_issue_replied:{title:'New cleanup response',message:'There is a private response to your cleanup issue.'},
  cleanup_issue_report_updated:{title:'Cleanup report updated',message:'The reporter updated the public report.'},
  cleanup_issue_resolved:{title:'Cleanup issue resolved',message:'The cleanup issue has been resolved.'},
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
    title: 'Your spot was cleaned up',
    message: 'Check the before and after photos, then approve the cleanup or ask for changes.',
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
  nearby_reports_daily: {
    title: 'New litter near you',
    message: 'See the reports that prompted this alert.',
  },
};

/** The tip behind a tip_received notification, readable by the person tipped. */
export type TipNotice = { tip_amount_cents: number; tipper_name: string | null; note: string | null };

export function notificationPresentation(notice: Pick<CleanupNotification, 'event_type'> & { tip?: TipNotice | null }) {
  if (notice.event_type === 'tip_received' && notice.tip) {
    const from = notice.tip.tipper_name?.trim() || 'Someone';
    const note = notice.tip.note?.trim();
    return {
      title: `${from} tipped you $${(notice.tip.tip_amount_cents / 100).toFixed(2)}`,
      message: note ? `\u201c${note}\u201d` : 'Thank you for helping keep your community clean.',
    };
  }
  return CLEANUP_NOTIFICATION_CONTENT[notice.event_type] ?? { title: 'Cleanup update', message: 'There is an update to one of your cleanups.' };
}
export function notificationHref(notice: NotificationTarget, view?: NotificationView) {
  if(notice.event_type.startsWith('cleanup_issue_') && notice.issue_id)return `/account/cleanup-issues/${encodeURIComponent(notice.issue_id)}`;
  if (notice.event_type === 'tip_received') return '/account/payments';
  if (notice.event_type.startsWith('admin_')) return '/admin';
  if (notice.event_type === 'nearby_reports_daily') return notice.id ? nearbyAlertHref(notice.id, view) : '/account/notifications';
  if (notice.event_type === 'cleanup_contribution_refunded') return notice.contribution_id ? `/account/payments/${encodeURIComponent(notice.contribution_id)}` : '/account/payments';
  if (notice.event_type === 'cleanup_payout_failed' || notice.event_type === 'cleanup_reward_sent') return '/account/connect';
  if (notice.event_type === 'report_renewal_due') return '/account/reports';
  const query = view ? notificationViewQuery(view) : new URLSearchParams();
  query.set('from', 'notifications');
  if (view && notice.id) query.set('notice', notice.id);
  return notice.report_id ? `/account/reports/${encodeURIComponent(notice.report_id)}?${query}` : '/account/activity';
}
