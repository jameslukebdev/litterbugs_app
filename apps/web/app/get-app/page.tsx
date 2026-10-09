import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { PublicSiteHeader } from '@/components/public-site-header';
import { AppLink } from '@/components/app-link';
import { AppStoreLinks } from '@/components/app-promotion';
import styles from '@/components/app-promotion.module.css';

export const metadata: Metadata = { title: 'Get the Litterbugs app' };

export default async function GetAppPage({ searchParams }: { searchParams: Promise<{ report?: string }> }) {
  const { report } = await searchParams;
  const reportId = typeof report === 'string' && /^[a-f0-9-]{36}$/i.test(report) ? report : undefined;
  return <>
    <PublicSiteHeader activePath="/get-app" />
    <main className={styles.downloadPage}>
      <Image className={styles.appIcon} src="/brand/app-icon-192.png" alt="Litterbugs app" width={72} height={72} priority />
      <h1>Take Litterbugs with you</h1>
      <p>Spot litter, share a report, and find your next cleanup. Keep your community close, wherever you go.</p>
      <AppStoreLinks />
      <p className={styles.installed}>Already have Litterbugs? <AppLink reportId={reportId}>Open the app</AppLink></p>
      <div className={styles.desktopQr}>
        <Image className={styles.qr} src="/brand/get-app-qr.svg" alt="QR code linking to litterbugs.app/get-app" width={176} height={176} unoptimized />
        <p>Scan with your phone to get the app.</p>
      </div>
      <Link className={styles.continue} href={reportId ? `/?view=map&report=${encodeURIComponent(reportId)}` : '/?view=map'}>Continue on the website</Link>
    </main>
  </>;
}
