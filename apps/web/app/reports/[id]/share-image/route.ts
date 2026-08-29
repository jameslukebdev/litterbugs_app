import { createElement } from 'react';
import { ImageResponse } from 'next/og';

import { ReportSocialCard } from '@/components/report-social-card';
import { loadPublicReportShare } from '@/lib/public-report-share';

export const runtime = 'nodejs';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = await loadPublicReportShare(id);
  if (!report) return new Response('Report not found', { status: 404 });

  return new ImageResponse(
    createElement(ReportSocialCard, {
      report,
      logoUrl: new URL('/brand/litterbugs-logo.png', request.url).toString(),
    }),
    {
      width: 1080,
      height: 1350,
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=86400',
        'Content-Disposition': `inline; filename="litterbugs-${encodeURIComponent(report.id)}.png"`,
      },
    },
  );
}
