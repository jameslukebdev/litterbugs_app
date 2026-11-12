import { GetAppQr } from '@/components/get-app-qr';
import type { Metadata } from 'next';
import Image from 'next/image';
import { Website } from '@/components/public-website';
import { AppLink, ContinueOnWebsiteLink } from '@/components/app-link';
import { APP_STORE_URL, GOOGLE_PLAY_URL, isInstagramStoreVisit } from '@/lib/app-links';
import seoStyles from '@/components/public-website/seo-pages.module.css';
import styles from '@/components/app-promotion.module.css';

export const metadata: Metadata = { title: 'Get the Litterbugs app', alternates: { canonical: '/get-app' } };

export default async function GetAppPage({ searchParams }: { searchParams: Promise<{ report?: string; utm_source?: string }> }) {
  const { report, utm_source } = await searchParams;
  const reportId = typeof report === 'string' && /^[a-f0-9-]{36}$/i.test(report) ? report : undefined;
  const googlePlayUrl = isInstagramStoreVisit(utm_source)
    ? `${GOOGLE_PLAY_URL}&utm_source=instagram&utm_campaign=instagram_bio`
    : GOOGLE_PLAY_URL;
  return <Website activePath="/get-app">
    <main id="main-content" tabIndex={-1} className={`${styles.downloadPage} ${seoStyles.download}`}>
      <Image className={styles.appIcon} src="/brand/app-icon-192.png" alt="Litterbugs app" width={72} height={72} priority />
      <h1>Take Litterbugs with you</h1>
      <p>Spot litter, share a report, and find your next cleanup. Keep your community close, wherever you go.</p>
      <div className={seoStyles.downloadStores}>
        <a href={APP_STORE_URL}><Image src="/brand/app-store-badge.svg" alt="Download on the App Store" width={144} height={48} unoptimized /></a>
        <a href={googlePlayUrl}><Image src="/brand/google-play-badge.png" alt="Get it on Google Play" width={186} height={72} unoptimized /></a>
      </div>
      <p className={styles.installed}>Already have Litterbugs? <AppLink reportId={reportId}>Open the app</AppLink></p>
      <div className={styles.desktopQr}>
        <GetAppQr className={styles.qr} />
      </div>
      <ContinueOnWebsiteLink className="primary-button button-link" reportId={reportId} />
    </main>
  </Website>;
}
