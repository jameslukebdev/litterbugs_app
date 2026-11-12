import journey from '@/components/communities/community-journey.module.css';
import { communityReportMapHref } from '@/lib/community-journey';
import { communityListingHref } from '@/lib/community-listings';
import { communityHref, getCommunity } from '@/lib/community-directory';
import type { Metadata } from 'next';
import Link from 'next/link';
import { FiChevronLeft, FiChevronRight, FiClock } from 'react-icons/fi';
/* eslint-disable @next/next/no-img-element -- small status bugs, like the map. */
import { notFound } from 'next/navigation';

import { Website } from '@/components/public-website';
import { BrandBug } from '@/components/brand-bug';
import { CommunityRank } from '@/components/community-rank';
import { publicReportSearchTitle, publicReportSearchDescription, publicReportOriginalSummary, publicReportHistorySummary, publicReportPhotoDescription, reportDateLabel as formatDate } from '@/lib/public-report-content';
import { loadRelatedPublicReports } from '@/lib/related-public-reports';
import { loadPublicReportShare } from '@/lib/public-report-share';
import { SHARED_REPORT_AUTH_PARAM } from '@/lib/participation-auth';
import { publicReportStatus } from '@/lib/public-report-status';
import { AppLink } from '@/components/app-link';
import { ReportPhotos } from './report-photos';

import styles from './report-share.module.css';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const report = await loadPublicReportShare(id, 'linked');
  if (!report) return { title: 'Report unavailable | Litterbugs', robots: { index: false, follow: false } };

  const description = publicReportSearchDescription(report);
  const title = publicReportSearchTitle(report);
  return {
    title: `${title} | Litterbugs`,
    description,
    alternates: { canonical: report.canonicalUrl },
    openGraph: {
      type: 'article',
      title,
      description,
      url: report.canonicalUrl,
      siteName: 'Litterbugs',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    itunes: {
      appId: '6757313862',
      appArgument: report.canonicalUrl,
    },
  };
}

export default async function SharedReportPage({ params }: Props) {
  const { id } = await params;
  const report = await loadPublicReportShare(id, 'linked');
  if (!report) notFound();

  // Optional recommendations must not hold the report and its actions behind another database read.
  const relatedLinks = loadRelatedPublicReports(report.id, report.communitySlug).then(related => related.length > 0 ? <ul className={styles.relatedList}>
    {related.map(item => {
      const itemStatus = publicReportStatus(item.state);
      return <li key={item.id}>
        <Link prefetch={false} href={`/reports/${item.id}`}>{item.title}</Link>
        <span className={styles.relatedStatus} data-tone={itemStatus.tone}>{itemStatus.bug ? <img src={itemStatus.bug} alt="" aria-hidden="true" width={16} height={16} /> : <FiClock aria-hidden="true" />}{itemStatus.label}</span>
      </li>;
    })}
  </ul> : null);
  const completed = report.state === 'completed';
  const inProgress = report.state === 'in_progress';
  const expired = report.state === 'expired';
  const community = report.communitySlug ? getCommunity(report.communitySlug) : undefined;
  const localCommunityHref = report.communitySlug ? communityHref(report.communitySlug) : null;
  const impactFacts = [
    report.bagsOrItemsRemoved != null
      ? `${report.bagsOrItemsRemoved} ${report.bagsOrItemsRemoved === 1 ? 'bag/item' : 'bags/items'} removed`
      : null,
    report.weightPounds != null
      ? `${report.weightPounds} ${report.weightPounds === 1 ? 'pound' : 'pounds'} removed`
      : null,
  ].filter(Boolean);

  const status = publicReportStatus(report.state);
  const reportedOn = report.reportDate ? <span>Reported <time dateTime={report.reportDate}>{formatDate(report.reportDate)}</time></span> : null;
  const funded = (report.rewardCents ?? 0) > 0;

  return (
    <Website infoPage><main data-community-slug={community?.slug} id="main-content" tabIndex={-1} className={styles.page}>
      <div className={styles.shell}>
        <nav className={styles.header} aria-label="Report navigation"><Link href="/map" className={styles.back}><FiChevronLeft aria-hidden="true" />Back to map</Link></nav>

        <article className={styles.story}>
          <header className={styles.hero}>
            <p className={styles.status} data-tone={status.tone}>
              {status.bug ? <img src={status.bug} alt="" aria-hidden="true" width={20} height={20} /> : <FiClock aria-hidden="true" />}
              {status.label}
            </p>
            <h1>{report.title}</h1>
            <p className={styles.meta}>
              {localCommunityHref ? <Link href={localCommunityHref}>{report.generalLocation}</Link> : null}
              {completed && report.cleanerName ? <span>Cleaned by {report.cleanerName}</span> : null}
              {completed && report.completionDate ? <span>Cleaned <time dateTime={report.completionDate}>{formatDate(report.completionDate)}</time></span> : null}
              {!completed && !expired && report.severity ? <span>{report.severity} priority</span> : null}
              {!completed ? reportedOn : null}
              {expired && report.expiredDate && formatDate(report.expiredDate) ? <span>Expired <time dateTime={report.expiredDate}>{formatDate(report.expiredDate)}</time></span> : null}
            </p>
            {!completed && !inProgress && !expired && (funded
              ? <p className={styles.fund}><img src="/brand/bugs/bee.png" alt="" aria-hidden="true" width={18} height={18} />${(report.rewardCents! / 100).toFixed(2)} in its cleanup fund</p>
              : <p className={styles.volunteer}>Volunteer cleanup</p>)}
            <div className={styles.reporter}>
              <span>Reported by</span>
              {report.reporterId ? <Link href={`/members/${report.reporterId}`} className={styles.reporterLink}>
                <span>{report.reporterName || 'Community member'}</span>
                <CommunityRank userId={report.reporterId} compact />
              </Link> : <strong>{report.reporterName || 'Community member'}</strong>}
            </div>
          </header>

          <div className={`${styles.detailsLayout} ${!report.beforePhotoUrl && !report.afterPhotoUrl ? styles.fullWidth : ''} ${completed ? styles.twoPhotos : ''}`}>
          <ReportPhotos key={report.id}
            beforePhotoUrl={report.beforePhotoUrl} afterPhotoUrl={report.afterPhotoUrl}
            beforeDescription={publicReportPhotoDescription(report, 'before')}
            afterDescription={publicReportPhotoDescription(report, 'after')}
          />

          <div className={styles.content}>
            <div className={styles.nextSteps}>
            {expired ? <Link className="primary-button button-link" href="/reports">Find a current cleanup</Link> : !completed && !inProgress && localCommunityHref ? <div className={`${journey.reportActions} ${styles.reportActions}`}>
              {report.fundingEligible && <Link className="report-action-link button-link report-action-fund" prefetch={false} href={`/sign-in?${SHARED_REPORT_AUTH_PARAM}=1&next=${encodeURIComponent(communityReportMapHref(report.id, report.communitySlug, 'fund'))}`}><BrandBug kind="bee" size={21} className="bug-hop" />Fund</Link>}
              <Link className="report-action-link button-link report-action-clean" prefetch={false} href={`/sign-in?${SHARED_REPORT_AUTH_PARAM}=1&next=${encodeURIComponent(communityReportMapHref(report.id, report.communitySlug, 'clean'))}`}><BrandBug kind="butterfly" size={21} className="bug-hop" />Clean</Link>
            </div> : <Link className="primary-button button-link" href={communityReportMapHref(report.id, report.communitySlug, 'locate')}>View on map</Link>}
            </div>

            <div className={styles.reportCopy}>
              {(expired ? publicReportOriginalSummary(report) : report.notes) && <section className={styles.section} aria-labelledby="original-report-heading">
                <h2 id="original-report-heading">{completed || expired ? 'The original report' : 'About this report'}</h2>
                <p>{expired ? publicReportOriginalSummary(report) : report.notes}</p>
              </section>}
              {expired && <section className={styles.section} aria-labelledby="report-history-heading">
                <h2 id="report-history-heading">Report history</h2>
                <p>{publicReportHistorySummary(report)}</p>
              </section>}
              {completed && report.cleanupDescription && <section className={styles.section} aria-labelledby="cleanup-result-heading">
                <h2 id="cleanup-result-heading">The cleanup</h2>
                <p>{report.cleanupDescription}</p>
              </section>}

              {/* Expired reports already list the litter in “The original report”. */}
              {(impactFacts.length > 0 || (!expired && report.litterTypes.length > 0)) && <dl className={styles.facts}>
                {impactFacts.length > 0 && <div className={styles.fact}>
                  <dt>Removed</dt>
                  <dd>{impactFacts.join(' · ')}<small>Amounts reported by the cleaner.</small></dd>
                </div>}
                {!expired && report.litterTypes.length ? <div className={styles.fact}>
                  <dt>{completed ? 'Original litter' : 'Reported litter'}</dt>
                  <dd>{report.litterTypes.join(', ')}</dd>
                </div> : null}
              </dl>}
            </div>

            <ul className={styles.links}>
              {localCommunityHref && <li><Link href={localCommunityHref}>Back to {report.generalLocation}<FiChevronRight aria-hidden="true" /></Link></li>}
              <li><Link href={expired ? "/report-litter" : completed ? community ? communityListingHref(community) : "/cleaner" : "/fund-a-cleanup"}>{expired ? "Report a spot" : completed ? community ? `Find another cleanup in ${community.name}` : "Find another cleanup" : "How funding works"}<FiChevronRight aria-hidden="true" /></Link></li>
              <li><Link href="/report-litter">How reporting works<FiChevronRight aria-hidden="true" /></Link></li>
              {!expired && <li><AppLink reportId={report.id} className={styles.appLink}>Open in Litterbugs</AppLink></li>}
            </ul>
          </div>
          </div>
        </article>
        <section className={styles.related} aria-labelledby="related-reports-heading">
          <h2 id="related-reports-heading">{community ? `More reports in ${community.name}` : 'Explore more litter reports'}</h2>
          <Suspense fallback={null}>{relatedLinks}</Suspense>
          <div className={styles.browseLinks}>
            {community && <>
              <Link href={communityListingHref(community)}>Reports needing cleanup in {community.name}</Link>
              <Link href={communityListingHref(community, 'completed')}>Completed cleanups in {community.name}</Link>
            </>}
            <Link href="/reports">Browse reports needing cleanup</Link>
            <Link href="/reports/history">Expired reports</Link>
            <Link href="/cleanups">Browse all completed cleanups</Link>
            <Link href="/communities">Explore communities</Link>
          </div>
        </section>
      </div>
    </main></Website>
  );
}
