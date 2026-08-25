import { isPermanentUser } from './reportAccess';

export function canOfferCleanup(report, user, now = new Date()) {
  if (!isPermanentUser(user)) return false;
  if (!report || report.cleanup_state !== 'available') return false;
  if (report.expired_at || report.cancelled_at) return false;
  if (!report.expires_at) return true;

  const expirationTime = Date.parse(report.expires_at);
  return Number.isFinite(expirationTime) && expirationTime > now.getTime();
}

export function isCleanupInProgress(report) {
  return ['claimed', 'completion_submitted', 'changes_requested'].includes(
    report?.cleanup_state
  );
}

export function cleanupMapTone(report) {
  if (isCleanupInProgress(report)) return 'active';
  if (report?.cleanup_state === 'completed') return 'completed';
  return 'available';
}

export function cleanupStatusPresentation(
  report,
  currentUserIsCleaner = false,
  currentUserIsReporter = false
) {
  switch (report?.cleanup_state) {
    case 'claimed':
      return {
        title: 'Cleanup in Progress',
        description: currentUserIsCleaner
          ? 'You claimed this cleanup.'
          : 'Another volunteer has claimed this report.',
        icon: 'time-outline',
        tone: 'active',
        showClaimActions: currentUserIsCleaner,
        showSubmissionAction: false,
        showReviewAction: false,
      };
    case 'completion_submitted':
      return {
        title: 'Awaiting Cleanup Review',
        description: 'Cleanup results were submitted and are waiting for the original reporter to review them.',
        icon: 'hourglass-outline',
        tone: 'active',
        showClaimActions: false,
        showSubmissionAction: false,
        showReviewAction: currentUserIsReporter,
      };
    case 'changes_requested':
      return {
        title: 'Changes Requested',
        description: 'The reporter requested updated cleanup evidence from the cleaner.',
        icon: 'refresh-circle-outline',
        tone: 'active',
        showClaimActions: false,
        showSubmissionAction: currentUserIsCleaner,
        showReviewAction: false,
      };
    case 'completed':
      return {
        title: 'Cleanup Complete',
        description: 'This cleanup was approved and is preserved as a community impact record.',
        icon: 'checkmark-circle-outline',
        tone: 'completed',
        showClaimActions: false,
        showSubmissionAction: false,
        showReviewAction: false,
      };
    default:
      return null;
  }
}

export function isCurrentCleaner(attempt, user) {
  return Boolean(
    isPermanentUser(user)
    && attempt?.cleaner_id
    && attempt.cleaner_id === user.id
  );
}

export function cleanupActionMessage(error) {
  const message = error?.message ?? '';

  if (/This cleanup was just claimed/i.test(message)) {
    return 'Someone else just claimed this cleanup.';
  }
  if (/cleanup_report_not_available/i.test(message)) {
    return 'This report is no longer available for cleanup.';
  }
  if (/cleanup_waiver_(required|outdated)/i.test(message)) {
    return 'The cleanup acknowledgment changed. Review the current version and try again.';
  }
  if (/cleanup_waiver_unavailable/i.test(message)) {
    return 'Cleanup participation is temporarily unavailable.';
  }
  if (/cleanup_requires_permanent_account|cleanup_profile_required/i.test(message)) {
    return 'Sign in with a permanent account before joining a cleanup.';
  }
  if (/cleanup_not_cleaner/i.test(message)) {
    return 'Only the cleaner who claimed this report can release it.';
  }
  if (/cleanup_(not_claimed|claim_expired)/i.test(message)) {
    return 'This cleanup claim is no longer active.';
  }

  return 'We couldn’t update this cleanup. Check your connection and try again.';
}

export function cleanupExpirationNoticeMessage(count) {
  if (count > 1) {
    return `${count} cleanup reservations expired. Those reports are available for other volunteers.`;
  }

  return 'Your 24-hour cleanup reservation expired. The report is available for another volunteer.';
}

export function cleanupNotificationPresentation(notices) {
  if (!notices?.length) return null;

  if (notices.length > 1) {
    return {
      title: 'Cleanup updates',
      message: `You have ${notices.length} cleanup updates to review.`,
    };
  }

  switch (notices[0].event_type) {
    case 'changes_requested':
      return {
        title: 'Cleanup changes requested',
        message: 'The reporter requested updated evidence. Review the feedback and resubmit within 24 hours.',
      };
    case 'correction_expired':
      return {
        title: 'Cleanup correction window expired',
        message: 'The report is available for another volunteer. Your earlier evidence and review history were preserved.',
      };
    default:
      return {
        title: 'Cleanup reservation expired',
        message: cleanupExpirationNoticeMessage(1),
      };
  }
}
