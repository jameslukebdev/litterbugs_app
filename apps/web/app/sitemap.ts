import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/env';
import { loadPublicReportIndex } from '@/lib/public-report-index';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = getSiteUrl();
  const reports = await loadPublicReportIndex();
  return [
    ...['', '/about', '/support', '/help', '/cleanup-safety', '/cleanup-policy', '/privacy', '/terms', '/photo-review', '/cleaner']
      .map(path => ({ url: `${site}${path}` })),
    ...reports.map(report => ({ url: `${site}/reports/${report.id}` })),
  ];
}
