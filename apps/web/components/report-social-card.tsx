/* eslint-disable @next/next/no-img-element -- Satori renders remote signed report images into the generated social card. */

import type { PublicReportShareModel } from '@/lib/public-report-share-model';

function cardExcerpt(value: string, limit: number) {
  const text = value.trim().replace(/\s+/g, ' ');
  if (text.length <= limit) return text;
  const prefix = text.slice(0, limit - 1);
  const wordEnd = prefix.lastIndexOf(' ');
  return `${wordEnd > limit * 0.7 ? prefix.slice(0, wordEnd) : prefix}…`;
}

export function ReportSocialCard({ report, logoUrl }: { report: PublicReportShareModel; logoUrl: string }) {
  const completed = report.state === 'completed';
  const title = cardExcerpt(report.title || 'Community cleanup', 100);
  const photos = (completed
    ? [{ url: report.beforePhotoUrl, label: 'Before' }, { url: report.afterPhotoUrl, label: 'After' }]
    : [{ url: report.beforePhotoUrl, label: 'Reported site' }]).filter(photo => Boolean(photo.url));
  const details = completed
    ? [
      report.cleanerName ? `Cleaned by ${cardExcerpt(report.cleanerName, 32)}` : null,
      report.bagsOrItemsRemoved != null ? `${report.bagsOrItemsRemoved} bags/items removed` : null,
      report.weightPounds != null ? `${report.weightPounds} lb removed` : null,
    ].filter(Boolean)
    : [report.rewardCents ? `$${(report.rewardCents / 100).toFixed(2)} cleanup reward` : null, report.severity ? `${report.severity} severity` : null, report.litterTypes[0] ? cardExcerpt(report.litterTypes[0], 32) : null].filter(Boolean);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      color: '#17201a',
      background: '#FFFFFF',
      fontFamily: 'Arial, sans-serif',
      padding: 48,
    }}>
      <div style={{ display: 'flex', height: 100, flexShrink: 0, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <img src={logoUrl} alt="Litterbugs" width={128} height={100} style={{ objectFit: 'contain' }} />

        </div>
        <span style={{ color: '#2F7D32', fontSize: 26, fontWeight: 700, letterSpacing: 1.5 }}>
          {completed ? 'CLEANUP COMPLETE' : 'CLEANUP NEEDED'}
        </span>
      </div>

      <div style={{ height: 740, flexShrink: 0, display: 'flex', gap: 12, marginTop: 20 }}>
        {photos.length ? photos.map(photo => (
          <div key={photo.label} style={{ position: 'relative', flex: 1, minWidth: 0, display: 'flex', overflow: 'hidden', borderRadius: 24, background: '#EEF3EE' }}>
            <img src={photo.url!} alt={photo.label} width="100%" height="100%" style={{ objectFit: 'cover', objectPosition: 'center' }} />
            {completed ? (
              <span style={{ position: 'absolute', left: 16, top: 16, padding: '10px 16px', borderRadius: 12, color: photo.label === 'After' ? '#FFFFFF' : '#17201a', background: photo.label === 'After' ? '#2F7D32' : '#FFFFFF', fontSize: 22, fontWeight: 700 }}>
                {photo.label}
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
            borderRadius: 24,
            color: '#526057',
            background: '#EEF3EE',
          }}>
            <img src={logoUrl} alt="Litterbugs" width={240} height={156} style={{ objectFit: 'contain' }} />
            <span style={{ fontSize: 25, fontWeight: 800 }}>
              Photo not provided
            </span>
          </div>
        )}
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 18, paddingTop: 16, paddingBottom: 16 }}>
        <span style={{ fontSize: title.length > 60 ? 46 : 52, fontWeight: 700, lineHeight: 1.12, letterSpacing: -1.5, overflowWrap: 'anywhere' }}>
          {title}
        </span>
        {details.length ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {details.map((detail) => (
              <span key={detail} style={{ padding: '10px 14px', borderRadius: 12, color: '#334038', background: '#EEF3EE', fontSize: 24, fontWeight: 700 }}>
                {detail}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <div style={{ display: 'flex', flexShrink: 0, height: 64, alignItems: 'center', justifyContent: 'space-between', borderTop: '2px solid #E3E9E3' }}>
        <span style={{ color: '#2F7D32', fontSize: 26, fontWeight: 700 }}>{completed ? 'See the difference' : 'View the report. Make a difference.'}</span>
        <span style={{ fontSize: 25, fontWeight: 700 }}>litterbugs.app</span>
      </div>
    </div>
  );
}
