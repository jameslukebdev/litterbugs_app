import type { Report } from '@litterbugs/report-contract';

export function reportDiscoveryWindow(now = new Date()) {
  return `cleanup_state.eq.completed,expires_at.gt.${now.toISOString()}`;
}

export function isDiscoverableReport(report: Pick<Report, 'is_published' | 'is_sample' | 'cancelled_at' | 'expired_at' | 'cleanup_state' | 'expires_at'>, now = new Date()) {
  if (!report.is_published || report.is_sample || report.cancelled_at || report.expired_at) return false;
  if (report.cleanup_state === 'completed') return true;
  return Boolean(report.expires_at && Date.parse(report.expires_at) > now.getTime());
}
