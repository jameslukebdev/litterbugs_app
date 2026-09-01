import type { Report } from '@litterbugs/report-contract';

export type PublicReportShareState = 'available' | 'completed';

export type PublicReportShareModel = {
  id: string;
  state: PublicReportShareState;
  title: string;
  generalLocation: string;
  severity: string | null;
  notes: string | null;
  litterTypes: string[];
  reportDate: string | null;
  cleanerName: string | null;
  completionDate: string | null;
  cleanupDescription: string | null;
  bagsOrItemsRemoved: number | null;
  durationMinutes: number | null;
  beforePhotoUrl: string | null;
  afterPhotoUrl: string | null;
  canonicalUrl: string;
};

export function isPubliclyShareableReport(report: Pick<Report, 'cleanup_state' | 'cancelled_at' | 'expired_at' | 'expires_at' | 'is_sample'>, now = new Date()) {
  if (report.is_sample || report.cancelled_at || report.expired_at) return false;
  if (report.cleanup_state === 'completed') return true;
  if (report.cleanup_state !== 'available') return false;
  if (!report.expires_at) return true;

  const expiresAt = Date.parse(report.expires_at);
  return Number.isFinite(expiresAt) && expiresAt > now.getTime();
}

export function publicReportShareDescription(report: PublicReportShareModel) {
  if (report.state === 'completed') {
    const cleaner = report.cleanerName ? ` by ${report.cleanerName}` : '';
    return `${report.title} was cleaned${cleaner}. See the before-and-after community impact story on Litterbugs.`;
  }

  return `${report.title} needs a volunteer cleanup. Open the litter report in Litterbugs to view its location.`;
}
