import { cache } from 'react';
import { notFound } from 'next/navigation';
import { archivePageNumber } from './cleanup-archive';
import { loadPublicReportFeed } from './public-report-feed';

export function openReportPage(value: string | string[] | undefined) {
  const page = archivePageNumber(value);
  if (page === null) notFound();
  return page;
}

export const loadOpenReportDirectory = cache(async (page: number) => {
  const feed = await loadPublicReportFeed('open', 12, page);
  if (!feed.unavailable && page > 1 && !feed.reports.length) notFound();
  return feed;
});

export const loadHistoricalReportDirectory = cache(async (page: number) => {
  const feed = await loadPublicReportFeed('history', 12, page);
  if (!feed.unavailable && page > 1 && !feed.reports.length) notFound();
  return feed;
});
