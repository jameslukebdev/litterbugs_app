/* eslint-disable @next/next/no-img-element -- Satori renders remote signed report images into the generated social card. */

import type { PublicReportShareModel } from '@/lib/public-report-share-model';
import type { SocialCardBug } from '@/lib/social-card-bugs';

function cardExcerpt(value: string, limit: number) {
  const text = value.trim().replace(/\s+/g, ' ');
  if (text.length <= limit) return text;
  const prefix = text.slice(0, limit - 1);
  const wordEnd = prefix.lastIndexOf(' ');
  return `${wordEnd > limit * 0.7 ? prefix.slice(0, wordEnd) : prefix}…`;
}

/** Status chip in the site's bug families: ladybug = needs a cleanup, caterpillar = being cleaned, flower = cleaned. */
/** Colour comes from the bug and the text only; no tinted backgrounds. */
const STATUS = {
  available: { text: 'Needs a cleanup', bug: 'ladybug', ink: '#A8323B' },
  in_progress: { text: 'Being cleaned', bug: 'caterpillar', ink: '#2F6B3A' },
  completed: { text: 'Cleaned up', bug: 'flower', ink: '#176350' },
  expired: { text: 'Report expired', bug: null, ink: '#5C5966' },
} as const;

export function ReportSocialCard({ report, logoUrl, bugs }: { report: PublicReportShareModel; logoUrl: string; bugs?: Partial<Record<SocialCardBug, string>> }) {
  const status = STATUS[report.state];
  const statusBug = status.bug ? bugs?.[status.bug] : undefined;
  const completed = report.state === 'completed';
  const title = cardExcerpt(report.title || 'Community cleanup', 100);
  const photos = (completed
    ? [{ url: report.beforePhotoUrl, label: 'Before' }, { url: report.afterPhotoUrl, label: 'After' }]
    : [{ url: report.beforePhotoUrl, label: 'Reported site' }]).filter(photo => Boolean(photo.url));
  const litterSummary = cardExcerpt(report.litterTypes.filter(Boolean).join(' · '), 64);
  const details = completed
    ? [
      report.cleanerName ? `Cleaned by ${cardExcerpt(report.cleanerName, 32)}` : null,
      report.bagsOrItemsRemoved != null ? `${report.bagsOrItemsRemoved} ${report.bagsOrItemsRemoved === 1 ? 'bag or item' : 'bags or items'} removed` : null,
      report.weightPounds != null ? `${report.weightPounds} lb removed` : null,
    ].filter(Boolean)
    : [];

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      color: '#292932',
      background: '#FFFFFF',
      fontFamily: 'Inter',
      padding: 48,
    }}>
      <div style={{ display: 'flex', height: 140, flexShrink: 0, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <img src={logoUrl} alt="Litterbugs" width={180} height={140} style={{ objectFit: 'contain' }} />

        </div>
        <span style={{ display: 'flex', alignItems: 'center', gap: 14, color: status.ink, fontSize: 36, fontWeight: 700 }}>
          {statusBug ? <img src={statusBug} alt="" width={46} height={46} style={{ objectFit: 'contain' }} /> : null}
          {status.text}
        </span>
      </div>

      <div style={{ height: 660, flexShrink: 0, display: 'flex', gap: 12, marginTop: 20 }}>
        {photos.length ? photos.map(photo => (
          <div key={photo.label} style={{ position: 'relative', flex: 1, minWidth: 0, display: 'flex', overflow: 'hidden', borderRadius: 28, background: '#F4F2FB' }}>
            <img src={photo.url!} alt={photo.label} width="100%" height="100%" style={{ objectFit: 'cover', objectPosition: 'center' }} />
            {completed ? (
              <span style={{ position: 'absolute', left: 18, top: 18, padding: '10px 20px', borderRadius: 999, color: photo.label === 'After' ? '#176350' : '#A8323B', background: '#FFFFFF', fontSize: 30, fontWeight: 700 }}>
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
            borderRadius: 28,
            color: '#686477',
            background: '#F4F2FB',
          }}>
            <img src={logoUrl} alt="Litterbugs" width={240} height={156} style={{ objectFit: 'contain' }} />
            <span style={{ fontSize: 34, fontWeight: 800 }}>
              Photo not provided
            </span>
          </div>
        )}
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 18, paddingTop: 16, paddingBottom: 16 }}>
        {report.state === 'available' ? (
          <div style={{ display: 'flex', gap: 40, alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0, gap: 6, maxWidth: report.rewardCents ? 600 : 300 }}>
              <span style={{ color: report.rewardCents ? '#A8323B' : '#292932', fontSize: report.rewardCents ? 72 : 52, fontWeight: 700, lineHeight: 1.05 }}>
                {report.rewardCents ? `$${(report.rewardCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Volunteer cleanup'}
              </span>
              {report.rewardCents ? <span style={{ color: '#686477', fontSize: 28 }}>Pays to clean it up</span> : null}
            </div>
            {litterSummary ? (
              <div style={{ display: 'flex', flex: 1, minWidth: 0, flexDirection: 'column', gap: 8 }}>
                <span style={{ color: '#686477', fontSize: 28 }}>Litter type</span>
                <span style={{ color: '#292932', fontSize: 34, fontWeight: 700, lineHeight: 1.15, overflowWrap: 'anywhere' }}>{litterSummary}</span>
              </div>
            ) : null}
          </div>
        ) : null}
        {report.state === 'expired' && <span style={{ color: '#686477', fontSize: 30 }}>A cleanup has not been confirmed.</span>}
        <span style={{ fontSize: title.length > 60 ? 46 : 52, fontWeight: 700, lineHeight: 1.12, letterSpacing: -1.5, overflowWrap: 'anywhere' }}>
          {title}
        </span>
        {details.length ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            {details.map((detail, index) => (
              <div key={detail} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {index > 0 ? <span style={{ color: '#B8B4C4', fontSize: 34 }}>·</span> : null}
                <span style={{ color: '#45434D', fontSize: 34, fontWeight: 400 }}>
                  {detail}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <div style={{ display: 'flex', flexShrink: 0, height: 80, alignItems: 'center', justifyContent: 'flex-end', borderTop: '2px solid #ECE8F8' }}>
        <span style={{ color: '#5146ED', fontSize: 34, fontWeight: 700 }}>litterbugs.app</span>
      </div>
    </div>
  );
}
