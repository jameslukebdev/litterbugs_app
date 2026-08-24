import { isPermanentUser } from './reportAccess';

export function canOfferCleanup(report, user, now = new Date()) {
  if (!isPermanentUser(user)) return false;
  if (!report || report.cleanup_state !== 'available') return false;
  if (report.expired_at || report.cancelled_at) return false;
  if (!report.expires_at) return true;

  const expirationTime = Date.parse(report.expires_at);
  return Number.isFinite(expirationTime) && expirationTime > now.getTime();
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

  return 'We couldn’t start this cleanup. Check your connection and try again.';
}
