import type { PublicReportShareModel } from './public-report-share-model';

export type ReportSite = {
  reports: PublicReportShareModel[];
  currentReportId: string | null;
  completedCount: number;
  canReportAgain: boolean;
  local?: boolean;
};

/** Input is already filtered through the public report visibility rules. */
export function reportSite(reports: PublicReportShareModel[], local = false): ReportSite {
  const ordered = [...reports].sort((a, b) => Date.parse(a.reportDate ?? '') - Date.parse(b.reportDate ?? '') || a.id.localeCompare(b.id));
  const current = ordered.filter(report => report.state === 'available' || report.state === 'in_progress').at(-1);
  const completedCount = ordered.filter(report => report.state === 'completed').length;
  return { reports: ordered, currentReportId: current?.id ?? null, completedCount, canReportAgain: completedCount > 0 && !current, ...(local ? { local: true } : {}) };
}

export function alreadyReportedId(error: { message?: string; details?: string } | null) {
  if (!error?.message?.includes('site_already_reported')) return null;
  return error.details?.match(/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i)?.[0] ?? null;
}
