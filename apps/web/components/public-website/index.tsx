import brand from './brand.module.css';
import seoStyles from './seo-pages.module.css';
import { HomeCleanupProof } from './home-cleanup-proof';
import { ReportAuthor } from '../report-author';
import { ReportCardOptions } from './report-card-options';
import { CardPhotoSwitch } from './card-photo-switch';
import { ReportCarousel } from './report-carousel';
import { ReportCardContent } from '../report-card-content';
import { PublicPhoto } from './public-photo';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { PublicSiteHeader, type PublicPath } from '../public-site-header';
import { PublicSiteFooter } from '../public-site-footer';
import type { PublicFeed } from '@/lib/public-report-feed';
import type { PublicReportShareModel } from '@/lib/public-report-share-model';
import styles from './website.module.css';
export { styles };

export function Website({
  children,
  activePath = '/',
  branded = true,
}: {
  children: ReactNode;
  activePath?: PublicPath;
  branded?: boolean;
}) {
  return (
    <div data-public-page={activePath} className={`${styles.surface} ${branded ? brand.brand : ''} ${['/report-litter', '/fund-a-cleanup', '/cleaner', '/cleanups', '/locations', '/communities', '/reports', '/get-app', '/about', '/help', '/support', '/cleanup-safety'].includes(activePath) ? seoStyles.page : ''}`}>
      <a className={styles.skipLink} href="#main-content">
        Skip to content
      </a>
      <PublicSiteHeader activePath={activePath} />
      {children}
      <PublicSiteFooter />
    </div>
  );
}
export function Guide({
  title,
  intro,
  action,
  href,
  children,
  activePath,
  className = '',
}: {
  title: string;
  intro: string;
  action?: string;
  href?: string;
  children: ReactNode;
  activePath: PublicPath;
  className?: string;
}) {
  return (
    <Website activePath={activePath}>
      <main id="main-content" tabIndex={-1} className={`${styles.guide} ${seoStyles.guide} ${className}`}>
        <header className={styles.guideIntro}>
          <h1>{title}</h1>
          <p>{intro}</p>
          {action && href && <Link className="primary-button button-link" href={href}>
            {action}
          </Link>}
        </header>
        {children}
      </main>
    </Website>
  );
}
export function Participation() {
  return (
    <nav
      className={styles.participation}
      aria-label="Choose how to participate"
    >
      <div>
        <Link href="/report">Report litter</Link>
        <p>
          Add photos and a location. You could earn a reporter reward after an
          eligible funded cleanup is approved and payout conditions are met.
        </p>
      </div>
      <div>
        <Link href="/cleaner">Find a cleanup</Link>
        <p>
          Choose a spot you can clean safely, with or without a funded reward.
        </p>
      </div>
      <div>
        <Link href="/fund-a-cleanup">Fund a cleanup</Link>
        <p>Contribute to a report and help pay someone to do the work.</p>
      </div>
    </nav>
  );
}
export function ReportCards({
  feed,
  empty = 'No reports to show here yet.',
  carousel = false,
  showLocation = false,
}: {
  feed: PublicFeed;
  empty?: string;
  carousel?: boolean;
  showLocation?: boolean;
}) {
  return feed.reports.length ? (
    <ReportCarousel enabled={carousel} className={`${styles.cards} public-report-cards`}>
      {feed.reports.map((report, index) => {
        const funded = (report.rewardCents ?? 0) > 0;
        const amount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format((report.rewardCents ?? 0) / 100);
        const reward = report.state === 'expired' ? 'Report expired' : report.state === 'in_progress' ? 'Cleanup in progress' : report.state === 'completed'
          ? report.rewardCents == null ? 'Cleanup completed' : funded ? `${amount} funded cleanup` : 'Volunteer cleanup completed'
          : funded ? `Pays ${amount}` : 'Volunteer cleanup';
        // Cleaned-up spots lead with the after photo and can flip back to the before photo, like the map list.
        const photos = (report.state === 'completed' ? [{ src: report.afterPhotoUrl, after: true }, { src: report.beforePhotoUrl, after: false }] : [{ src: report.beforePhotoUrl, after: false }])
          .filter((item): item is { src: string; after: boolean } => Boolean(item.src));
        const timing = report.state === 'completed' ? 'Cleanup complete' : report.reportDate ? new Date(report.reportDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '';
        const status = report.state === 'expired' ? 'Expired' : report.state === 'completed' ? 'Cleaned' : report.state === 'available' ? 'Available' : 'In progress';
        return <article className="report-card-container" key={report.id}>
          <Link prefetch={false} className="report-result" href={`/reports/${report.id}`}>
            <ReportCardContent
              photo={<span className={`report-result-photo${photos.length ? '' : ' report-result-photo-empty'}`}>
                {photos.length ? photos.map((item, slide) => <span className="card-slide" data-slide={slide} key={item.src}>
                  <PublicPhoto src={item.src} alt="" width={600} height={400} eager={slide === 0 && showLocation && index < 3} />
                  {item.after && photos.length > 1 && <span className="report-result-photo-count">After cleanup</span>}
                </span>) : <span>No photo yet</span>}
                <span className="report-result-workflow" data-tone={report.state === 'completed' ? 'completed' : report.state === 'available' ? 'available' : 'active'}>{status}</span>
                {photos.length > 1 && <span className="report-result-dots" aria-hidden="true">{photos.map((item, dot) => <i key={item.src} data-dot={dot} />)}</span>}
              </span>}
              title={report.title}
              reward={reward}
              funded={funded}
              summary={[showLocation ? report.localityLabel : null, (report.litterTypes.length > 2 ? `${report.litterTypes.slice(0, 2).join(' · ')} +${report.litterTypes.length - 2}` : report.litterTypes.join(' · ')) || 'General litter'].filter(Boolean).join(' · ')}
              severity={report.severity ?? 'Medium'}
              timing={timing}
            />
          </Link>
          {photos.length > 1 && <CardPhotoSwitch count={photos.length} title={report.title} />}
          <div className="public-card-footer">
            {report.reporterId ? <ReportAuthor profileId={report.reporterId} sourceReportId={report.id} /> : <span className="public-card-author-fallback">{report.reporterName || 'Community member'}</span>}
            <ReportCardOptions reportId={report.id} title={report.title} />
          </div>
        </article>;
      })}
    </ReportCarousel>
  ) : (
    <ReportCarousel enabled={carousel} className={styles.cards}>
    <div className={styles.empty}>
      <p>
        {feed.unavailable
          ? 'Reports couldn’t load right now. Please try again shortly.'
          : empty}
      </p>
      <Link href="/map">Open map</Link> ·{' '}
      <Link href="/report">Report litter</Link>
    </div>
    </ReportCarousel>
  );
}
export function CleanupProof({ report, showHeading = true }: { report: PublicReportShareModel; showHeading?: boolean }) {
  return <HomeCleanupProof report={report} heading="See a completed cleanup" showHeading={showHeading} />;
}
