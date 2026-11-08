import { createElement } from 'react';
import { ImageResponse } from 'next/og';

import { ReportSocialCard } from '@/components/report-social-card';
import { loadSocialCardFonts } from '@/lib/social-card-fonts';
import { loadSocialCardLogo } from '@/lib/social-card-logo';
import { loadSocialCardBugs } from '@/lib/social-card-bugs';
import { loadPublicReportShare } from '@/lib/public-report-share';

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = await loadPublicReportShare(id);
  if (!report) return new Response('Report not found', { status: 404, headers: { 'Cache-Control': 'private, no-store' } });

  const image = new ImageResponse(
    createElement(ReportSocialCard, {
      report,
      logoUrl: await loadSocialCardLogo(),
      bugs: await loadSocialCardBugs().catch(() => undefined),
    }),
    {
      width: 1080,
      height: 1350,
      fonts: await loadSocialCardFonts(),
    },
  );

  return new Response(await image.arrayBuffer(), {
    headers: {
      'Cache-Control': 'private, no-store',
      'Content-Disposition': `inline; filename="litterbugs-${encodeURIComponent(report.id)}.png"`,
      'Content-Type': 'image/png',
    },
  });
}
