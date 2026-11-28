import type { PublicReportShareModel } from './public-report-share-model';
import { publicReportHref } from './public-report-url';

export type ReportSite = {
  id: string;
  reports: PublicReportShareModel[];
  currentReportId: string | null;
  completedCount: number;
  canReportAgain: boolean;
  local?: boolean;
};

/** Input is already filtered through the public report visibility rules. */
export function reportSite(reports: PublicReportShareModel[], local = false, siteId?: string): ReportSite {
  const ordered = [...reports].sort((a, b) => Date.parse(a.reportDate ?? '') - Date.parse(b.reportDate ?? '') || a.id.localeCompare(b.id));
  const current = ordered.filter(report => report.state === 'available' || report.state === 'in_progress').at(-1);
  const completedCount = ordered.filter(report => report.state === 'completed').length;
  return { id: siteId ?? ordered[0]?.id ?? '', reports: ordered, currentReportId: current?.id ?? null, completedCount, canReportAgain: completedCount > 0 && !current, ...(local ? { local: true } : {}) };
}

export const sitePath = (siteId: string) => `/sites/${encodeURIComponent(siteId)}`;
export function siteHref(site: ReportSite) {
  return site.reports.length > 1 ? sitePath(site.id) : site.reports[0] ? publicReportHref(site.reports[0]) : sitePath(site.id);
}
export function currentSiteReport(site: ReportSite) {
  return site.reports.find(report => report.id === site.currentReportId) ?? site.reports.at(-1) ?? null;
}
export function latestSiteCleanup(site: ReportSite) {
  return [...site.reports].filter(report => report.state === 'completed').sort((a, b) => Date.parse(b.completionDate ?? b.reportDate ?? '') - Date.parse(a.completionDate ?? a.reportDate ?? '') || b.id.localeCompare(a.id))[0] ?? null;
}
export function siteLastActivity(site: ReportSite) {
  const dates = site.reports.flatMap(report => [report.reportDate, report.completionDate, report.expiredDate, report.claimedDate, ...(report.contributorCredit?.donations ?? []).map(donation => donation.donatedAt)]).filter((date): date is string => !!date && Number.isFinite(Date.parse(date)));
  return dates.sort((a,b) => Date.parse(b) - Date.parse(a))[0] ?? null;
}
export function siteCard(site: ReportSite, kind: 'open' | 'completed') {
  const report = kind === 'completed' ? latestSiteCleanup(site) : site.reports.find(report => report.id === site.currentReportId);
  return report ? { ...report, siteLink: { id: site.id, href: siteHref(site), completedCount: site.completedCount, reportCount: site.reports.length, hasActiveReport: !!site.currentReportId } } : null;
}

export function alreadyReportedId(error: { message?: string; details?: string } | null) {
  if (!error?.message?.includes('site_already_reported')) return null;
  return error.details?.match(/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i)?.[0] ?? null;
}
