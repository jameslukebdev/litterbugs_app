import { publicPageMetadata } from '@/lib/public-page-metadata';
import type { Metadata } from 'next';
import Image from 'next/image';
import { Website } from '@/components/public-website';
import { ContinueOnWebsiteLink } from '@/components/app-link';
import { APP_STORE_URL, GOOGLE_PLAY_URL, isInstagramStoreVisit } from '@/lib/app-links';
import styles from './get-app.module.css';
import { PhoneMap } from './phone-map';

export const metadata: Metadata = publicPageMetadata({
  title: 'Get the Litterbugs app',
  description: 'Get the Litterbugs app for iPhone and Android to report litter, fund cleanups and get paid to clean up.',
  alternates: { canonical: '/get-app' },
});

export default async function GetAppPage({ searchParams }: { searchParams: Promise<{ report?: string; utm_source?: string }> }) {
  const { report, utm_source } = await searchParams;
  const reportId = typeof report === 'string' && /^[a-f0-9-]{36}$/i.test(report) ? report : undefined;
  const googlePlayUrl = isInstagramStoreVisit(utm_source)
    ? `${GOOGLE_PLAY_URL}&utm_source=instagram&utm_campaign=instagram_bio`
    : GOOGLE_PLAY_URL;
  return (
    <Website activePath="/get-app" infoPage={false}>
      <main id="main-content" tabIndex={-1} className={styles.hero}>
        <div className={styles.copy}>
          <h1>See Litter? <span>Get paid to clean it up or report it</span></h1>
          <div className={styles.download}>
            <div className={styles.stores}>
              <a href={APP_STORE_URL}>
                <Image src="/brand/app-store-badge.svg" alt="Download on the App Store" width={144} height={48} unoptimized />
              </a>
              <a href={googlePlayUrl}>
                <span className={styles.playBadge}>
                  <Image src="/brand/google-play-badge.png" alt="Get it on Google Play" width={646} height={250} unoptimized />
                </span>
              </a>
            </div>
            <ContinueOnWebsiteLink className={styles.continue} reportId={reportId} />
          </div>
        </div>
        <PhoneMap />
      </main>
    </Website>
  );
}
