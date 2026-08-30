/* eslint-disable @next/next/no-img-element -- Satori renders remote signed report images into the generated social card. */

import type { PublicReportShareModel } from '@/lib/public-report-share-model';

export function ReportSocialCard({ report, logoUrl }: { report: PublicReportShareModel; logoUrl: string }) {
  const completed = report.state === 'completed';
  const imageUrls = completed
    ? [report.afterPhotoUrl, report.beforePhotoUrl].filter((value): value is string => Boolean(value))
    : [report.beforePhotoUrl].filter((value): value is string => Boolean(value));
  const details = completed
    ? [
      report.cleanerName ? `Cleaned by ${report.cleanerName}` : null,
      report.bagsOrItemsRemoved != null ? `${report.bagsOrItemsRemoved} bags/items removed` : null,
      report.durationMinutes != null ? `${report.durationMinutes} minutes volunteered` : null,
    ].filter(Boolean)
    : [report.severity ? `${report.severity} priority` : null, report.litterTypes[0] ?? null].filter(Boolean);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      color: '#17201a',
      background: completed
        ? 'linear-gradient(155deg, #dff2e1 0%, #f8fbf8 58%, #e6d8ef 100%)'
        : 'linear-gradient(155deg, #f5e5f8 0%, #fff 56%, #fde7dd 100%)',
      fontFamily: 'Arial, sans-serif',
      padding: 64,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <img src={logoUrl} alt="Litterbugs" width={160} height={104} style={{ objectFit: 'contain' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#637168', fontSize: 22 }}>Community cleanup</span>
          </div>
        </div>
        <span style={{ color: '#69766d', fontSize: 20, fontWeight: 800 }}>litterbugs.app</span>
      </div>

      <div style={{ height: 690, display: 'flex', gap: 12, marginTop: 50 }}>
        {imageUrls.length ? imageUrls.map((url, index) => (
          <div key={url} style={{ position: 'relative', flex: 1, display: 'flex', overflow: 'hidden', borderRadius: 34, background: '#dfe7e0', boxShadow: '0 24px 60px rgba(23, 32, 26, .18)' }}>
            <img src={url} alt="" width="100%" height="100%" style={{ objectFit: 'cover' }} />
            {completed ? (
              <span style={{ position: 'absolute', left: 20, bottom: 20, padding: '10px 16px', borderRadius: 999, color: '#17201a', background: 'rgba(255,255,255,.94)', fontSize: 18, fontWeight: 900 }}>
                {index === 0 && report.afterPhotoUrl ? 'AFTER' : 'BEFORE'}
              </span>
            ) : null}
          </div>
        )) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 26,
            borderRadius: 34,
            color: '#526057',
            background: completed ? '#e3eee5' : '#edf1ee',
            border: '2px solid rgba(82, 96, 87, .12)',
          }}>
            <img src={logoUrl} alt="Litterbugs" width={240} height={156} style={{ objectFit: 'contain' }} />
            <span style={{ fontSize: 25, fontWeight: 800 }}>
              Photo not provided
            </span>
          </div>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 22 }}>
        <span style={{ color: completed ? '#2f7d32' : '#d9332f', fontSize: 26, fontWeight: 900, letterSpacing: 2 }}>
          {completed ? 'CLEANUP COMPLETE' : 'CLEANUP NEEDED'}
        </span>
        <span style={{ fontSize: 68, fontWeight: 900, lineHeight: 1.02, letterSpacing: -3 }}>
          {report.title}
        </span>
        {details.length ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {details.map((detail) => (
              <span key={detail} style={{ padding: '12px 18px', borderRadius: 999, color: '#334038', background: 'rgba(255,255,255,.82)', fontSize: 22, fontWeight: 800 }}>
                {detail}
              </span>
            ))}
          </div>
        ) : null}
        <span style={{ color: '#526057', fontSize: 26, lineHeight: 1.35 }}>
          {completed ? 'See the community impact and help keep the momentum going.' : 'View the report and help your community clean it up.'}
        </span>
      </div>
    </div>
  );
}
