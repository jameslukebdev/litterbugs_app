import { ImageResponse } from 'next/og';
import { headers } from 'next/headers';

import { loadPublicReportShare } from '@/lib/public-report-share';

export const alt = 'Litterbugs community cleanup report';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const runtime = 'nodejs';

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = await loadPublicReportShare(id);
  const completed = report?.state === 'completed';
  const requestHeaders = await headers();
  const requestHost = requestHeaders.get('x-forwarded-host') || requestHeaders.get('host') || 'litterbugs.app';
  const requestProtocol = requestHeaders.get('x-forwarded-proto') || (requestHost.startsWith('localhost') ? 'http' : 'https');
  const logoUrl = `${requestProtocol}://${requestHost}/brand/litterbugs-logo.png`;
  const logoResponse = await fetch(logoUrl);
  const logoSource = logoResponse.ok
    ? await logoResponse.arrayBuffer()
    : logoUrl;
  const imageUrls = completed
    ? [report?.afterPhotoUrl, report?.beforePhotoUrl].filter((value): value is string => Boolean(value))
    : [report?.beforePhotoUrl].filter((value): value is string => Boolean(value));

  return new ImageResponse(
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      color: '#17201a',
      background: completed
        ? 'linear-gradient(135deg, #dff2e1 0%, #f7fbf7 60%, #e6d8ef 100%)'
        : 'linear-gradient(135deg, #f4e1f8 0%, #fff 58%, #fde7dd 100%)',
      fontFamily: 'Arial, sans-serif',
      padding: 48,
    }}>
      <div style={{ width: '55%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingRight: 42 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <img src={logoSource as string} alt="Litterbugs" width={132} height={86} style={{ objectFit: 'contain' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#5d6b62', fontSize: 17 }}>Community Cleanup</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <span style={{ color: completed ? '#2f7d32' : '#b448cf', fontSize: 22, fontWeight: 900, letterSpacing: 1.5 }}>
            {completed ? 'CLEANUP COMPLETE' : 'VOLUNTEER CLEANUP NEEDED'}
          </span>
          <span style={{ fontSize: 52, fontWeight: 900, lineHeight: 1.02, letterSpacing: -2 }}>
            {report?.title || 'Litterbugs Report'}
          </span>
          <span style={{ color: '#536159', fontSize: 24 }}>
            {report?.generalLocation || 'View this community report in Litterbugs'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 12, color: '#fff', fontSize: 19, fontWeight: 800 }}>
          {completed && report?.cleanerName ? <span style={{ padding: '10px 16px', borderRadius: 999, background: '#2f7d32' }}>Cleaned by {report.cleanerName}</span> : null}
          {!completed && report?.severity ? <span style={{ padding: '10px 16px', borderRadius: 999, background: '#d44c42' }}>{report.severity} severity</span> : null}
        </div>
      </div>

      <div style={{ width: '45%', height: '100%', display: 'flex', gap: 10 }}>
        {imageUrls.length ? imageUrls.map((url, index) => (
          <div key={url} style={{ position: 'relative', flex: 1, display: 'flex', overflow: 'hidden', borderRadius: 28, background: '#dfe7e0', boxShadow: '0 18px 48px rgba(23, 32, 26, .18)' }}>
            <img src={url} alt="" width="100%" height="100%" style={{ objectFit: 'cover' }} />
            {completed ? (
              <span style={{ position: 'absolute', left: 16, bottom: 16, padding: '8px 12px', borderRadius: 999, color: '#17201a', background: 'rgba(255,255,255,.92)', fontSize: 15, fontWeight: 900 }}>
                {index === 0 && report?.afterPhotoUrl ? 'AFTER' : 'BEFORE'}
              </span>
            ) : null}
          </div>
        )) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 28, background: completed ? '#dff2e1' : '#f4e1f8' }}>
            <img src={logoSource as string} alt="Litterbugs" width={250} height={164} style={{ objectFit: 'contain' }} />
          </div>
        )}
      </div>
    </div>,
    size,
  );
}
