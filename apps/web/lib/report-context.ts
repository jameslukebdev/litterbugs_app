import type { Report } from '@litterbugs/report-contract';

export type ReportContextFields = Partial<Pick<Report, 'id' | 'created_at' | 'litter_types' | 'types'>>;
/** Existing report metadata only; never infer or disclose an additional location. */
/** `includeId` adds the short report code; member-facing lists leave it off because it means nothing to people. */
export function reportContext(report: ReportContextFields | null | undefined, includeTypes = true, includeId = true): string {
  if (!report) return '';
  const typeLabel = reportTypeSummary(report);
  const date = report.created_at && Number.isFinite(Date.parse(report.created_at))
    ? new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '';
  return [includeTypes ? typeLabel : '', date, includeId && report.id ? `Report ${report.id.slice(0, 8)}` : ''].filter(Boolean).join(' · ');
}

export function reportTypeSummary(report: ReportContextFields): string {
  const types = [...new Set(report.litter_types?.filter(Boolean) ?? [])];
  const typeLabel = types.length ? `${types.slice(0, 2).join(' · ')}${types.length > 2 ? ` +${types.length - 2}` : ''}` : report.types;
  return typeLabel || '';
}
