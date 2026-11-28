import 'server-only';
import { isLocalWebsite } from './local-site-store';
import { loadLocalSiteDirectory } from './local-site-directory';
import { createPublicClient } from './supabase/public';
import { loadPublicReportShare } from './public-report-share';
import { collectReportPage, reportFeedStateMatches } from './public-report-feed-page';
import { publicReportHref } from './public-report-url';
import { sitePath } from './report-site-model';
import type { PublicFeed } from './public-report-feed';

class OlderBackend extends Error {}
export async function loadPublicSiteFeed(kind: 'open' | 'completed', size: number, page: number): Promise<PublicFeed | null> {
  const client = createPublicClient();
  try {
    if (await isLocalWebsite()) return await loadLocalSiteDirectory(kind,size,page);
    const result = await collectReportPage(async (offset,count) => {
      const { data,error } = await client.rpc('cleanup_site_directory', { feed_kind: kind,page_size: count,page_offset: offset });
      if (error?.code === 'PGRST202' || error?.code === '42883') throw new OlderBackend();
      if (error) throw error;
      return data ?? [];
    }, () => true, async row => {
      const report = await loadPublicReportShare(row.report_id,'linked');
      if (!report || !reportFeedStateMatches(kind,report.state)) return null;
      return { ...report, siteLink: { id: row.cleanup_site_id, href: row.report_count > 1 ? sitePath(row.cleanup_site_id) : publicReportHref(report), completedCount: row.completed_count, reportCount: row.report_count, hasActiveReport: !!row.current_report_id } };
    }, size,page);
    return { ...result,unavailable:false };
  } catch (error) {
    if (error instanceof OlderBackend) return null;
    return { reports:[],hasMore:false,unavailable:true };
  }
}

/** New site overviews supplement, never replace, the occurrence sitemap URLs. */
export async function loadIndexableReportSites() {
  const client = createPublicClient();
  const sites: { id: string; lastActivityAt: string | null }[] = [];
  for (let offset=0;;offset+=500) {
    const { data,error } = await client.rpc('cleanup_site_directory',{feed_kind:'all',page_size:500,page_offset:offset});
    if (error?.code === 'PGRST202' || error?.code === '42883') return [];
    if (error) throw error;
    for (const row of data ?? []) sites.push({id:row.cleanup_site_id,lastActivityAt:row.last_activity_at});
    if (!data || data.length < 500) return sites;
  }
}
