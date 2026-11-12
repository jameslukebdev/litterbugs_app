import { HomeCleanupProof } from '@/components/public-website/home-cleanup-proof';
import homeStyles from './home.module.css';
import { ReportStarter } from '@/components/public-website/report-starter';
import { MapPreview } from '@/components/public-website/map-preview';
import { loadBooneMapPreview } from '@/lib/map-preview';
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
import { PhotoBatch } from '@/components/photo-batch';

/** The bee's dotted route through the hero, weaving down the gap between the photos (560 × 540 design box). */
const BEE_FLIGHT = 'M 118 26 C 200 -8 300 36 272 118 S 226 236 282 278 S 334 352 276 380 S 238 466 295 498';

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
          <PhotoBatch className={heroStyles.collage}>
            <svg className={heroStyles.trail} viewBox="0 0 560 540" aria-hidden="true" focusable="false">
              <path d={BEE_FLIGHT} />
            </svg>
            <ol className={heroStyles.steps} aria-label="How Litterbugs works">
              <li className={`${heroStyles.step} ${heroStyles.spot}`}>
                <div className={heroStyles.photo}>
                  <Image data-batch-photo="" src="/homepage-photos/walk.webp" alt="A person checking their phone while walking outdoors" fill sizes="(max-width:700px) 40vw, 240px" preload />
                </div>
                <span className={heroStyles.tag}><Image className={heroStyles.tagBug} src="/brand/ranks/lightning-bug.svg" alt="" width={64} height={64} unoptimized />Spot litter</span>
              </li>
              <li className={`${heroStyles.step} ${heroStyles.report}`}>
                <div className={heroStyles.photo}>
                  <Image data-batch-photo="" src="/homepage-photos/reported-litter.webp" alt="Discarded cardboard on a grassy verge, photographed in a Litterbugs report" fill sizes="(max-width:700px) 42vw, 250px" loading="eager" />
                </div>
                <span className={heroStyles.tag}><Image className={heroStyles.tagBug} src="/brand/ranks/dragonfly.svg" alt="" width={64} height={64} unoptimized />Snap a report</span>
              </li>
              <li className={`${heroStyles.step} ${heroStyles.clean}`}>
                <div className={heroStyles.photo}>
                  <Image data-batch-photo="" src="/homepage-photos/cleanup.webp" alt="Two volunteers collecting a discarded plastic bottle" fill sizes="(max-width:700px) 44vw, 260px" loading="eager" />
                </div>
                <span className={heroStyles.tag}><Image className={heroStyles.tagBug} src="/brand/ranks/caterpillar.svg" alt="" width={64} height={64} unoptimized />It gets cleaned up</span>
              </li>
              <li className={`${heroStyles.step} ${heroStyles.paid}`}>
                <div className={heroStyles.photo}>
                  <Image data-batch-photo="" src="/homepage-photos/phone.webp" alt="Hands using a phone outdoors in the sunshine" fill sizes="(max-width:700px) 40vw, 240px" loading="eager" />
                </div>
                <span className={heroStyles.toast}>
                  <Image className={heroStyles.toastBug} src="/brand/bugs/butterfly.png" alt="" width={99} height={98} unoptimized />
                  <span><strong>You earned cash</strong><span className={heroStyles.toastNote}>Your report was cleaned up</span></span>
                </span>
              </li>
            </ol>
            <svg className={heroStyles.flight} viewBox="0 0 560 540" aria-hidden="true" focusable="false">
              <g className={heroStyles.flyingBee}>
                <image href="/brand/bugs/bee.png" x="-25" y="-24" width="50" height="48" />
                <animateMotion dur="2.6s" begin="0s" fill="freeze" calcMode="spline" keyPoints="0;1" keyTimes="0;1" keySplines="0.4 0 0.2 1" path={BEE_FLIGHT} />
              </g>
              <image className={heroStyles.restingBee} href="/brand/bugs/bee.png" x="270" y="474" width="50" height="48" />
            </svg>
          </PhotoBatch>
        </section>
        <div className={`${styles.wide} ${homeStyles.sections}`}>
          <ReportStarter />
          <Suspense fallback={<MapPreview pins={null} />}>
            <HomeMapPreview />
          </Suspense>
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
async function HomeMapPreview() {
  return <MapPreview pins={await loadBooneMapPreview()} />;
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
