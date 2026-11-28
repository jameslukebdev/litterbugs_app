import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import SharedReportPage, { generateMetadata as reportMetadata } from '@/app/reports/[id]/page';
import { publicReportIdFromSlug } from '@/lib/public-report-url';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

// The readable address of a report. The id at the end of the slug selects the
// report; the proxy has already redirected any outdated words to the current ones.
async function reportParams({ params }: Props) {
  const id = publicReportIdFromSlug((await params).slug);
  return id ? { params: Promise.resolve({ id }) } : null;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const report = await reportParams(props);
  return report ? reportMetadata(report) : { title: 'Report unavailable | Litterbugs', robots: { index: false, follow: false } };
}

export default async function ReadableReportPage(props: Props) {
  const report = await reportParams(props);
  if (!report) notFound();
  return SharedReportPage(report);
}
