import { cache } from 'react';
import { notFound } from 'next/navigation';
import { loadPublicReportFeed } from './public-report-feed';

export function archivePageNumber(
  value: string | string[] | undefined,
): number | null {
  if (value === undefined) return 1;
  if (typeof value !== 'string' || !/^[1-9]\d{0,3}$/.test(value)) return null;
  const page = Number(value);
  return page <= 1000 ? page : null;
}

export const loadCleanupArchive = cache(async (page: number) => {
  const feed = await loadPublicReportFeed('completed', 12, page);
  // An outage is not evidence that a page has ceased to exist.
  if (!feed.unavailable && page > 1 && !feed.reports.length) notFound();
  return feed;
});
