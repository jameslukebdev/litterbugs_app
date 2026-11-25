import 'server-only';
import { createPublicClient } from './supabase/public';
import { loadPublicReportShare } from './public-report-share';
import { withServerContributorCredits } from './server-contributor-credits';
import { isLocalSiteReport, readLocalSite } from './local-report-sites';
import { reportSite } from './report-site-model';

export async function loadReportSite(reportId: string) {
  if (isLocalSiteReport(reportId)) {
    const site = await readLocalSite();
    return site.reports.some(report => report.id === reportId) ? site : null;
  }
  const { data, error } = await createPublicClient().rpc('report_site_history', { target_report_id: reportId });
  // An older backend remains usable until the separately authorized migration.
  if (error?.code === 'PGRST202' || error?.code === '42883') return null;
  if (error) throw error;
  const reports = await Promise.all((data ?? []).map(row => loadPublicReportShare(row.report_id, 'linked')));
  const visible = reports.filter(report => report !== null);
  if (!visible.length) return null;
  return reportSite(await withServerContributorCredits(visible));
}
