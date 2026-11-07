import type { Report } from '@litterbugs/report-contract';

export type PublicReportShareState = 'available' | 'in_progress' | 'completed' | 'expired';

export type PublicReportShareModel = {
  id: string;
  state: PublicReportShareState;
  title: string;
  rewardCents?: number;
  fundingEligible?: boolean;
  generalLocation: string;
  localityLabel?: string;
  communitySlug?: string;
  severity: string | null;
  reporterName?: string;
  reporterId?: string | null;
  notes: string | null;
  litterTypes: string[];
  reportDate: string | null;
  expiredDate?: string | null;
  cleanerName: string | null;
  completionDate: string | null;
  cleanupDescription: string | null;
  bagsOrItemsRemoved: number | null;
  weightPounds: number | null;
  beforePhotoUrl: string | null;
  /** How many report photos there are; linked cards page through them with `?photo=N`. */
  photoCount?: number;
  afterPhotoUrl: string | null;
  canonicalUrl: string;
};

type ShareableReport = Pick<Report, 'cleanup_state' | 'cancelled_at' | 'expired_at' | 'expires_at' | 'is_sample'> & {
  is_published?: boolean; renewal_status?: string; title?: string | null;
};

export function isExpiredPublicReport(report: ShareableReport, now = new Date()) {
  if (report.cleanup_state !== 'available') return false;
  // Expiry closures retain their expiry timestamp; explicit withdrawals clear it.
  if (report.cancelled_at && !(report.expired_at && report.renewal_status === 'closed')) return false;
  if (report.expired_at) return true;
  return Boolean(report.expires_at && Number.isFinite(Date.parse(report.expires_at))
    && Date.parse(report.expires_at) <= now.getTime());
}

export function isPubliclyShareableReport(report: ShareableReport, now = new Date()) {
  if (report.is_published === false || report.is_sample) return false;
  if (isExpiredPublicReport(report, now)) {
    // Account-deletion anonymization removes titles: don't republish those records.
    return report.title === undefined || Boolean(report.title?.trim());
  }
  if (report.cancelled_at || report.expired_at) return false;
  if (report.cleanup_state === 'completed') return true;
  if (['claimed', 'completion_submitted', 'changes_requested'].includes(report.cleanup_state)) return true;
  if (report.cleanup_state !== 'available') return false;
  if (!report.expires_at) return true;
  const expiresAt = Date.parse(report.expires_at);
  return Number.isFinite(expiresAt) && expiresAt > now.getTime();
}

export function publicReportShareDescription(report: PublicReportShareModel) {
  if (report.state === 'expired') return `${report.title} is an expired litter report. A cleanup has not been confirmed.`;
  if (report.state === 'in_progress') {
    return `${report.title} has a cleanup in progress. Follow its current status on Litterbugs.`;
  }
  if (report.state === 'completed') {
    const cleaner = report.cleanerName ? ` by ${report.cleanerName}` : '';
    return `${report.title} was cleaned${cleaner}. See the before-and-after community impact story on Litterbugs.`;
  }

  if (report.rewardCents && report.rewardCents > 0) {
    return `${report.title} has a $${(report.rewardCents / 100).toFixed(2)} cleanup reward. See the report in Litterbugs for details.`;
  }

  return `${report.title} needs a volunteer cleanup. Open the litter report in Litterbugs to view its location.`;
}
