import { communityDirectory, isIndexableCommunity } from '@/lib/community-directory';
import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/env';
import { loadPublicReportIndex } from '@/lib/public-report-index';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = getSiteUrl();
  const reports = await loadPublicReportIndex();
  return [
    ...['', '/about', '/support', '/help', '/cleanup-safety', '/cleanup-policy', '/privacy', '/terms', '/photo-review', '/cleaner', '/report-litter', '/fund-a-cleanup', '/communities', '/reports', '/reports/history', '/cleanups', '/get-app']
      .map(path => ({ url: `${site}${path}` })),
    ...communityDirectory.filter(isIndexableCommunity).map(community => ({
      url: `${site}${community.href}`, lastModified: community.reviewedAt!,
    })),
    // Reports do not have a maintained content-updated timestamp. Omit lastmod
    // rather than presenting creation time or the current render time as an edit.
    ...reports.map(report => {
      const url = `${site}/reports/${report.id}`;
      const images = [report.hasBeforePhoto ? `${url}/photo/before` : null,
        report.hasAfterPhoto ? `${url}/photo/after` : null].filter((value): value is string => value !== null);
      return { url, ...(images.length ? { images } : {}) };
    }),
  ];
}
