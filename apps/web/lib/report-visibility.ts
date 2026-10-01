import type { Report } from '@litterbugs/report-contract';

export function reportDiscoveryWindow(now = new Date()) {
  return `cleanup_state.in.(completed,claimed,completion_submitted,changes_requested),expires_at.gt.${now.toISOString()}`;
}

export function isDiscoverableReport(report: Pick<Report, 'is_published' | 'is_sample' | 'cancelled_at' | 'expired_at' | 'cleanup_state' | 'expires_at'>, now = new Date()) {
  if (!report.is_published || report.is_sample || report.cancelled_at || report.expired_at) return false;
  if (['completed', 'claimed', 'completion_submitted', 'changes_requested'].includes(report.cleanup_state ?? '')) return true;
  return Boolean(report.expires_at && Date.parse(report.expires_at) > now.getTime());
}

/** TestFlight keeps ongoing cleanup work alive beyond the original discovery window. */
export function isReportClosed(report: Pick<Report, 'cancelled_at' | 'expired_at' | 'cleanup_state' | 'expires_at'>, now = Date.now()) {
  if (report.cancelled_at || report.expired_at) return true;
  if (['completed', 'claimed', 'completion_submitted', 'changes_requested'].includes(report.cleanup_state)) return false;
  return Boolean(report.expires_at && Date.parse(report.expires_at) <= now);
}

export function reportWorkflowTone(report: Pick<Report, 'cleanup_state'>) {
  if (report.cleanup_state === 'completed') return 'completed';
  return ['claimed', 'completion_submitted', 'changes_requested'].includes(report.cleanup_state) ? 'active' : 'available';
}
