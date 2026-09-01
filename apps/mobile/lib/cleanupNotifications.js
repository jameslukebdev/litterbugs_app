const CLEANUP_NOTIFICATION_CONTENT = Object.freeze({
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
    message: 'Your cleanup reward was transferred to your Stripe account.',
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
});

export function cleanupNotificationPresentation(notices) {
  if (!notices?.length) return null;
  if (notices.length > 1) {
    return {
      title: 'Cleanup updates',
      message: `You have ${notices.length} cleanup updates to review.`,
    };
  }

  const eventType = notices[0].event_type ?? notices[0].eventType;
  return CLEANUP_NOTIFICATION_CONTENT[eventType] ?? {
    title: 'Cleanup update',
    message: 'There is an update to one of your cleanups.',
  };
}

export function cleanupNotificationDestination(notification) {
  const eventType = notification?.event_type ?? notification?.eventType;
  const reportId = notification?.report_id ?? notification?.reportId;
  const cleanupId = notification?.cleanup_attempt_id ?? notification?.cleanupId;

  if (!reportId) return null;

  if (eventType === 'report_renewal_due') {
    return {
      name: 'ExpiredReports',
      label: 'Review Expired Reports',
      params: { reportId },
    };
  }

  if (eventType === 'cleanup_contribution_refunded') {
    return {
      name: 'ContributionHistory',
      label: 'View Contribution History',
      params: {},
    };
  }

  if (eventType === 'cleanup_payout_failed') {
    return {
      name: 'PayoutSetup',
      label: 'Review Payout Setup',
      params: {},
    };
  }

  if (
    eventType === 'cleanup_fund_increased'
    || eventType === 'report_renewed'
    || eventType === 'report_funding_photos_needed'
  ) {
    return {
      name: 'App',
      label: 'View Report',
      params: { screen: 'Map', params: { reportId } },
    };
  }

  if (!cleanupId) return null;

  if (eventType === 'completion_submitted' || eventType === 'paid_review_started') {
    return {
      name: 'CleanupReview',
      label: 'Review Cleanup',
      params: { cleanupId, reportId },
    };
  }

  if (eventType === 'changes_requested') {
    return {
      name: 'CleanupFeedback',
      label: 'Review Feedback',
      params: { cleanupId, reportId },
    };
  }

  return {
    name: 'App',
    label: 'View Report',
    params: {
      screen: 'Map',
      params: { reportId },
    },
  };
}

export function cleanupStateFromNotification(notification) {
  const eventType = notification?.event_type ?? notification?.eventType;
  switch (eventType) {
    case 'report_claimed':
    case 'claim_expiring_soon':
      return 'claimed';
    case 'completion_submitted':
    case 'paid_review_started':
      return 'completion_submitted';
    case 'changes_requested':
      return 'changes_requested';
    case 'cleanup_approved':
    case 'cleanup_auto_approved':
      return 'completed';
    case 'claim_expired':
    case 'correction_expired':
      return 'available';
    default:
      return null;
  }
}
