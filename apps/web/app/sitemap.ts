import { groupCommunities, loadCommunityDirectory } from '@/lib/community-leaderboards';
import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/env';
import { loadIndexableReportSites } from '@/lib/public-site-feed';
import { sitePath } from '@/lib/report-site-model';
import { loadPublicReportIndex } from '@/lib/public-report-index';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = getSiteUrl();
  const [reports, directory, sites] = await Promise.all([loadPublicReportIndex(), loadCommunityDirectory(), loadIndexableReportSites()]);
  return [
    ...['', '/about', '/support', '/help', '/cleanup-safety', '/cleanup-policy', '/privacy', '/terms', '/photo-review', '/cleaner', '/report-litter', '/fund-a-cleanup', '/communities', '/reports', '/reports/history', '/cleanups', '/get-app']
      .map(path => ({ url: `${site}${path}` })),
    // Community pages are offered to search engines once they have substance (5 accepted reports or 1 cleanup);
    // their last real change is the latest report or cleanup there.
    ...directory.communities.filter(community => community.isIndexable).map(community => ({
      url: `${site}${community.path}`, ...(community.lastActivityAt ? { lastModified: new Date(community.lastActivityAt) } : {}),
    })),
    // Country and state lists, once they hold at least one indexed town.
    ...(['country', 'region'] as const).flatMap(level => groupCommunities(directory.communities, level))
      .filter(group => group.isIndexable).map(group => ({
        url: `${site}${group.path}`, ...(group.lastActivityAt ? { lastModified: new Date(group.lastActivityAt) } : {}),
      })),
    ...sites.map(location => ({url: `${site}${sitePath(location.id)}`, ...(location.lastActivityAt ? {lastModified:new Date(location.lastActivityAt)} : {})})),
    // Reports do not have a maintained content-updated timestamp, so open reports
    // omit lastmod rather than presenting creation or render time as an edit. A
    // completed cleanup is the exception: its completion is the page's last real change.
    ...reports.map(report => {
      // The page is listed at its readable address; its photos stay under the id address.
      const url = `${site}${report.path}`;
      const photos = `${site}/reports/${report.id}/photo`;
      const images = [report.hasBeforePhoto ? `${photos}/before` : null,
        report.hasAfterPhoto ? `${photos}/after` : null].filter((value): value is string => value !== null);
      const completed = report.completedAt && Number.isFinite(Date.parse(report.completedAt)) ? new Date(report.completedAt) : null;
      return { url, ...(completed ? { lastModified: completed } : {}), ...(images.length ? { images } : {}) };
    }),
  ];
}
