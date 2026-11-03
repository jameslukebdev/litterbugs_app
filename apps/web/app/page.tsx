import { HomeCleanupProof } from '@/components/public-website/home-cleanup-proof';
import homeStyles from './home.module.css';
import { ReportStarter } from '@/components/public-website/report-starter';
import { Suspense } from 'react';
import { publicPageMetadata } from '@/lib/public-page-metadata';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { legacyMapDestination } from '@/lib/legacy-map-url';
import { loadLatestCleanup } from '@/lib/latest-cleanup';
import { loadPublicReportFeed } from '@/lib/public-report-feed';
import {
  Website,
  ReportCards,
  styles,
} from '@/components/public-website';
import heroStyles from '@/components/public-website/home-hero.module.css';
import { APP_STORE_URL, GOOGLE_PLAY_URL } from '@/lib/app-links';
import { WebsiteStructuredData } from '@/components/public-website/structured-data';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = publicPageMetadata({
  title: 'Report Litter & Earn Reporter Rewards | Litterbugs',
  description:
    'Spot litter, add photos and a location, and help get it cleaned up. Explore cleanup opportunities and learn how eligible reports can earn rewards.',
  alternates: { canonical: '/' },
});

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const destination = legacyMapDestination(await searchParams);
  if (destination) redirect(destination);
  return (
    <Website>
      <WebsiteStructuredData />
      <main id="main-content" tabIndex={-1} className={homeStyles.home}>
        <section className={heroStyles.hero} aria-labelledby="home-title">
          <div className={heroStyles.copy}>
            <h1 id="home-title">
              See litter?
              <br />
              Get paid to report it.
            </h1>
            <p>Earn money by reporting litter or cleaning it up. Or donate to a cleanup.</p>
            <div className={heroStyles.stores} aria-label="Download Litterbugs">
              <a href={APP_STORE_URL} aria-label="Download Litterbugs on the App Store">
                <Image className={heroStyles.apple} src="/brand/app-store-badge.svg" alt="Download on the App Store" width={144} height={48} unoptimized />
              </a>
              <a href={GOOGLE_PLAY_URL} aria-label="Get Litterbugs on Google Play">
                <Image className={heroStyles.google} src="/brand/google-play-badge.png" alt="Get it on Google Play" width={186} height={72} unoptimized />
              </a>
            </div>
          </div>
          <div className={heroStyles.collage} aria-label="Everyday moments, from spotting litter to cleaning it up">
            <div className={heroStyles.photoColumn}>
              <div className={`${heroStyles.photo} ${heroStyles.walk}`}>
                <Image src="/homepage-photos/walk.webp" alt="A person checking their phone while walking outdoors" fill sizes="(max-width:700px) 45vw, (max-width:1244px) 23vw, 280px" preload />
              </div>
              <div className={`${heroStyles.photo} ${heroStyles.cleanup}`}>
                <Image src="/homepage-photos/cleanup.webp" alt="Two volunteers collecting a discarded plastic bottle" fill sizes="(max-width:700px) 45vw, (max-width:1244px) 23vw, 280px" loading="eager" />
              </div>
            </div>
            <div className={heroStyles.photoColumn}>
              <div className={`${heroStyles.photo} ${heroStyles.phone}`}>
                <Image src="/homepage-photos/phone.webp" alt="Hands using a phone outdoors in the sunshine" fill sizes="(max-width:700px) 45vw, (max-width:1244px) 23vw, 280px" loading="eager" />
              </div>
              <div className={`${heroStyles.photo} ${heroStyles.litter}`}>
                <Image src="/homepage-photos/reported-litter.webp" alt="Discarded cardboard on a grassy verge, photographed in a Litterbugs report" fill sizes="(max-width:700px) 45vw, (max-width:1244px) 23vw, 280px" loading="eager" />
              </div>
            </div>
          </div>
        </section>
        <div className={`${styles.wide} ${homeStyles.sections}`}>
          <ReportStarter />
          <section className={styles.section}>
            <Suspense fallback={<HomeFeedLoading />}>
              <HomeReports />
            </Suspense>
          </section>
          <Suspense fallback={null}>
            <HomeProof />
          </Suspense>

        </div>
      </main>
    </Website>
  );
}

async function HomeReports() {
  const recent = await loadPublicReportFeed('available', 9);
  return (
    <>
      <ReportCards
        carousel
        feed={recent}
        empty="No available reports to show right now. Spotted litter? Start the next report."
      />
      <Link href="/reports">Browse all litter reports</Link>
    </>
  );
}
async function HomeProof() {
  const proof = await loadLatestCleanup();
  return proof ? <HomeCleanupProof report={proof} /> : null;
}
function HomeFeedLoading() {
  return (
    <div role="status" aria-label="Loading litter reports">
      <div className={styles.sectionTitle}><h2>Reports needing a cleanup</h2></div>
      <span className="sr-only">Loading litter reports…</span>
      <div className={styles.cards} aria-hidden="true">
        {[1, 2, 3].map((key) => (
          <div key={key} className={styles.card}>
            <div className={styles.cardPhoto} />
            <div className={styles.cardCopy} style={{ minHeight: 150 }}>
              Loading report…
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
