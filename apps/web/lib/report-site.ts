import 'server-only';
import { cache } from 'react';
import { createPublicClient } from './supabase/public';
import { loadPublicReportShare, loadHostedPublicReportShare } from './public-report-share';
import { withServerContributorCredits } from './server-contributor-credits';
import { isLocalWebsite, localOccurrence, readLocalOccurrences } from './local-site-store';
import { reportSite } from './report-site-model';

const missingFunction = (error: { code?: string } | null) => error?.code === 'PGRST202' || error?.code === '42883';
async function hydrateSite(rows: { report_id: string; cleanup_site_id: string }[], local: boolean) {
  const reports = await Promise.all(rows.map(row => loadHostedPublicReportShare(row.report_id, 'linked')));
  const visible = reports.filter(report => report !== null);
  if (!visible.length) return null;
  const id = rows[0].cleanup_site_id;
  const additions = local ? await readLocalOccurrences() : [];
  const added = await Promise.all(additions.filter(row => row.siteId === id).map(row => loadPublicReportShare(row.id, 'linked')));
  return reportSite(await withServerContributorCredits([...visible, ...added.filter(row => row !== null)]), local, id);
}

export const loadReportSite = cache(async (reportId: string) => {
  const local = await isLocalWebsite();
  const occurrence = local ? await localOccurrence(reportId) : null;
  const sourceId = occurrence?.sourceReportId ?? reportId;
  const { data, error } = await createPublicClient().rpc('report_site_history', { target_report_id: sourceId });
  // Local development reads existing published reports without changing the hosted schema.
  if (missingFunction(error)) {
    if (!local) return null;
    const source = await loadHostedPublicReportShare(sourceId, 'linked', true);
    if (!source) return null;
    return hydrateSite([{report_id: sourceId, cleanup_site_id: occurrence?.siteId ?? sourceId}], true);
  }
  if (error) throw error;
  return hydrateSite(data ?? [], local);
});

export const loadReportSiteById = cache(async (siteId: string) => {
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(siteId)) return null;
  const local = await isLocalWebsite();
  const { data, error } = await createPublicClient().rpc('cleanup_site_reports', { target_site_id: siteId });
  if (missingFunction(error)) {
    if (!local) return null;
    const occurrence = (await readLocalOccurrences()).find(row => row.siteId === siteId);
    return loadReportSite(occurrence?.sourceReportId ?? siteId);
  }
  if (error) throw error;
  return hydrateSite(data ?? [], local);
});
