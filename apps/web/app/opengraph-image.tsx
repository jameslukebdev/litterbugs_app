import { ImageResponse } from 'next/og';
import { loadSocialCardLogo } from '@/lib/social-card-logo';
export const alt = 'Litterbugs — See litter? Get paid to report it.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export default async function SocialImage() {
  const logo = await loadSocialCardLogo();
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#f5f8f3',
          padding: '48px 64px',
          color: '#18552b',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <img
            src={logo as string}
            width={168}
            height={114}
            alt="Litterbugs"
            style={{ objectFit: 'contain' }}
          />
          <span style={{ fontSize: 26 }}>litterbugs.app</span>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            marginTop: 35,
            fontWeight: 700,
            fontSize: 76,
            lineHeight: 1.08,
          }}
        >
          <span>See litter?</span>
          <span>Get paid to report it.</span>
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 26,
            color: '#435847',
            marginTop: 30,
          }}
        >
          Report litter. Help fund a cleanup. Or do the work.
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 19,
            color: '#435847',
            marginTop: 25,
          }}
        >
          Reporter rewards require an approved eligible funded cleanup.
        </div>
      </div>
    ),
    size,
  );
}
