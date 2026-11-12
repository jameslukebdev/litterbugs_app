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
import info from './info-pages.module.css';
import { FiClock, FiImage, FiMap } from 'react-icons/fi';
import { publicReportStatus } from '@/lib/public-report-status';
import { EmptyBug, SlidingUnderline } from '@/components/bug-motion';
import { ReadingProgress } from '../reading-progress';
import { LITTER_MAP_HREF } from '@/lib/home-map-link';
export { styles };

const READING_PATHS: PublicPath[] = ['/photo-review', '/cleanup-safety', '/about', '/help', '/get-app', '/fund-a-cleanup', '/cleaner', '/report-litter', '/support'];
const INFO_PATHS: PublicPath[] = ['/reports', '/cleanups', '/communities', '/photo-review', '/cleanup-safety', '/about', '/help', '/get-app', '/fund-a-cleanup', '/cleaner', '/report-litter'];

export function Website({
  children,
  activePath = '/',
  branded = true,
  infoPage = INFO_PATHS.includes(activePath),
}: {
  children: ReactNode;
  activePath?: PublicPath;
  branded?: boolean;
  /** Reading pages (reports, cleanups, guides, the report page): one shared, quieter layout. */
  infoPage?: boolean;
}) {
  return (
    <div data-public-page={activePath} className={`${styles.surface} ${infoPage ? info.info : ''} ${branded ? brand.brand : ''} ${['/report-litter', '/fund-a-cleanup', '/cleaner', '/cleanups', '/locations', '/communities', '/reports', '/get-app', '/about', '/help', '/support', '/cleanup-safety'].includes(activePath) ? seoStyles.page : ''}`}>
      <a className={styles.skipLink} href="#main-content">
        Skip to content
      </a>
      <PublicSiteHeader activePath={activePath} />
      {READING_PATHS.includes(activePath) && <ReadingProgress />}
      {children}
      <PublicSiteFooter />
    </div>
  );
}
/* eslint-disable @next/next/no-img-element -- small status bugs, like the map. */
/** Tabs shared by the open, completed and past report lists, using the map's bugs. */
export function DirectoryNav({ current, cities }: { current: 'open' | 'completed' | 'history'; cities?: ReactNode }) {
  const tabs = [
    { key: 'open', href: '/reports', label: 'Open reports', short: 'Open', bug: '/brand/bugs/ladybug.png' },
    { key: 'completed', href: '/cleanups', label: 'Completed cleanups', short: 'Completed', bug: '/brand/bugs/flower.png' },
    { key: 'history', href: '/reports/history', label: 'Expired reports', short: 'Expired', bug: null },
  ] as const;
  return <div className={info.directoryNav}>
    <nav className={info.tabs} aria-label="Browse litter reports">
      {tabs.map(tab => <Link key={tab.key} href={tab.href} aria-current={tab.key === current ? 'page' : undefined} data-tab={tab.key}>
        {tab.bug ? <img src={tab.bug} alt="" aria-hidden="true" width={18} height={18} /> : <FiClock aria-hidden="true" />}<span className={info.long}>{tab.label}</span><span className={info.short}>{tab.short}</span>
      </Link>)}
      <Link className={info.mapLink} href={LITTER_MAP_HREF}><FiMap aria-hidden="true" />View the map</Link>
      <SlidingUnderline name="report-lists" />
    </nav>
    {cities}
  </div>;
}
/** The header menu each guide sits under, with that menu's bug. */
const GUIDE_MENUS: Partial<Record<PublicPath, { label: string; bug: string; tone: string }>> = {
  '/report-litter': { label: 'Report', bug: '/brand/ranks/dragonfly.svg', tone: 'report' },
  '/fund-a-cleanup': { label: 'Donate', bug: '/brand/bugs/bee.png', tone: 'donate' },
  '/cleaner': { label: 'Earn', bug: '/brand/ranks/caterpillar.svg', tone: 'earn' },
};
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
          {GUIDE_MENUS[activePath] && <p className={info.eyebrow} data-tone={GUIDE_MENUS[activePath]!.tone}>
            <img src={GUIDE_MENUS[activePath]!.bug} alt="" aria-hidden="true" width={22} height={22} />{GUIDE_MENUS[activePath]!.label}
          </p>}
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
        const day = (value: string | null | undefined) => value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '';
        // The photo label already says the status, so this line is about money (or, for past reports, the outcome).
        const reward = report.state === 'expired' ? 'Cleanup not confirmed'
          : report.state === 'completed' ? funded ? `${amount} funded cleanup` : 'Volunteer cleanup'
          : funded ? `Pays ${amount}` : 'Volunteer cleanup';
        // Like the map list: cleaned-up spots lead with the after photo, then every report photo.
        const reportPhotos = report.beforePhotoUrl
          ? Array.from({ length: Math.max(1, report.photoCount ?? 1) }, (_, n) => ({ src: n ? `${report.beforePhotoUrl}?photo=${n}` : report.beforePhotoUrl!, after: false }))
          : [];
        const photos = [...(report.state === 'completed' && report.afterPhotoUrl ? [{ src: report.afterPhotoUrl, after: true }] : []), ...reportPhotos];
        const timing = report.state === 'completed' ? report.completionDate ? `Cleaned ${day(report.completionDate)}` : ''
          : report.state === 'expired' && report.expiredDate ? `Expired ${day(report.expiredDate)}`
          : day(report.reportDate);
        const status = publicReportStatus(report.state);
        return <article className="report-card-container" key={report.id}>
          <Link prefetch={false} className="report-result" href={`/reports/${report.id}`}>
            <ReportCardContent
              photo={<span className={`report-result-photo${photos.length ? '' : ' report-result-photo-empty'}`}>
                {photos.length ? photos.map((item, slide) => <span className="card-slide" data-active={slide === 0 || undefined} key={item.src}>
                  <PublicPhoto src={item.src} alt="" width={600} height={400} eager={slide === 0 && showLocation && index < 3} />
                </span>) : <span><FiImage aria-hidden="true" />No photo</span>}
                <span className="report-result-workflow" data-tone={report.state === 'completed' ? 'completed' : report.state === 'available' ? 'available' : report.state === 'expired' ? 'expired' : 'active'}>{status.short}</span>
                {photos.length > 1 && <span className="report-result-dots" aria-hidden="true">{photos.slice(0, 5).map((item, dot) => <i key={item.src} data-active={dot === 0 || undefined} />)}</span>}
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
      <EmptyBug />
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
