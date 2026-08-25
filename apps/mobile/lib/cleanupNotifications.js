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

  if (!reportId || !cleanupId) return null;

  if (eventType === 'completion_submitted') {
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
