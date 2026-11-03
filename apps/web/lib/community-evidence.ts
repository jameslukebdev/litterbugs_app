import type { PublicReportShareModel } from './public-report-share-model';

export function cleanupCompletionDate(value: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return null;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(value));
}
export function cleanupOutcome(report: PublicReportShareModel) {
  const parts: string[] = [];
  if (Number.isInteger(report.bagsOrItemsRemoved) && report.bagsOrItemsRemoved! >= 0) {
    parts.push(`${report.bagsOrItemsRemoved} ${report.bagsOrItemsRemoved === 1 ? 'bag/item' : 'bags/items'}`);
  }
  if (typeof report.weightPounds === 'number' && Number.isFinite(report.weightPounds) && report.weightPounds >= 0) {
    parts.push(`${report.weightPounds} lb (cleaner-reported)`);
  }
  return parts.join(' · ');
}
