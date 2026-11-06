import journey from '@/components/communities/community-journey.module.css';
import { communityReportMapHref } from '@/lib/community-journey';
import { communityListingHref } from '@/lib/community-listings';
import { communityHref, getCommunity } from '@/lib/community-directory';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Website } from '@/components/public-website';
import { BrandBug } from '@/components/brand-bug';
import { CommunityRank } from '@/components/community-rank';
import { publicReportSearchTitle, publicReportSearchDescription, publicReportSummary, publicReportPhotoDescription, reportDateLabel as formatDate } from '@/lib/public-report-content';
import { loadRelatedPublicReports } from '@/lib/related-public-reports';
import { loadPublicReportShare } from '@/lib/public-report-share';
import { OpenReportAction } from './open-report-action';
import { ReportPhotos } from './report-photos';

import styles from './report-share.module.css';

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

  const related = await loadRelatedPublicReports(report.id, report.communitySlug);
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

  return (
    <Website><main data-community-slug={community?.slug} id="main-content" tabIndex={-1} className={styles.page}>
      <div className={styles.shell}>
        <nav className={styles.header} aria-label="Report navigation"><Link href="/map">Back to map</Link><Link href={community ? communityListingHref(community, 'completed') : '/cleanups'}>{community ? `Results in ${community.name}` : 'Completed cleanups'}</Link></nav>

        <article className={styles.story}>
          <section className={styles.hero}>
            <h1>{report.title}</h1>
            <p className={styles.summary}>{publicReportSummary(report)}</p>
            {!completed && !inProgress && !expired && <p className={styles.heroDescription}>
              {report.rewardCents && report.rewardCents > 0
                ? `$${(report.rewardCents / 100).toFixed(2)} cleanup reward`
                : 'Volunteer cleanup'}
            </p>}
            <div className={styles.reporter}>
              <span>Reported by</span>
              {report.reporterId ? <Link href={`/members/${report.reporterId}`} className={styles.reporterLink}>
                <span>{report.reporterName || 'Community member'}</span>
                <CommunityRank userId={report.reporterId} compact />
              </Link> : <span>{report.reporterName || 'Community member'}</span>}
            </div>
            <div className={styles.heroMeta}>
              <span>{expired ? 'Report expired' : completed ? 'Cleanup complete' : inProgress ? 'Cleanup in progress' : 'Cleanup needed'}</span>
              {localCommunityHref && <Link href={localCommunityHref}>{report.generalLocation}</Link>}
              {completed && report.cleanerName ? <span>Cleaned by {report.cleanerName}</span> : null}
              {!completed && !expired && report.severity ? <span>{report.severity} priority</span> : null}
              {completed && report.completionDate ? <time dateTime={report.completionDate}>{formatDate(report.completionDate)}</time> : null}
              {expired && report.expiredDate && formatDate(report.expiredDate) ? <span>Expired <time dateTime={report.expiredDate}>{formatDate(report.expiredDate)}</time></span> : null}
              {!completed && report.reportDate ? <span>Reported <time dateTime={report.reportDate}>{formatDate(report.reportDate)}</time></span> : null}
            </div>
          </section>

          <div className={`${styles.detailsLayout} ${completed || (!report.beforePhotoUrl && !report.afterPhotoUrl) ? styles.fullWidth : ''}`}>
          <ReportPhotos key={report.id}
            beforePhotoUrl={report.beforePhotoUrl} afterPhotoUrl={report.afterPhotoUrl}
            beforeDescription={publicReportPhotoDescription(report, 'before')}
            afterDescription={publicReportPhotoDescription(report, 'after')}
          />

          <div className={styles.content}>
            <div className={styles.reportCopy}>
              {report.notes && <section className={styles.section} aria-labelledby="original-report-heading">
                <h2 id="original-report-heading">{completed || expired ? 'The original report' : 'About this report'}</h2>
                <p>{report.notes}</p>
              </section>}
              {completed && report.cleanupDescription && <section className={styles.section} aria-labelledby="cleanup-result-heading">
                <h2 id="cleanup-result-heading">The cleanup</h2>
                <p>{report.cleanupDescription}</p>
              </section>}

              <div className={styles.facts}>
                {impactFacts.map((fact) => (
                  <div className={styles.fact} key={fact}>
                    <strong>Removed</strong>
                    <span>{fact}</span>
                  </div>
                ))}
                {report.litterTypes.length ? (
                  <div className={styles.fact}>
                    <strong>{completed ? 'Original litter' : 'Reported litter'}</strong>
                    <span>{report.litterTypes.join(', ')}</span>
                  </div>
                ) : null}
                {report.reportDate ? (
                  <div className={styles.fact}>
                    <strong>Reported</strong>
                    <span><time dateTime={report.reportDate}>{formatDate(report.reportDate)}</time></span>
                  </div>
                ) : null}
              </div>
              {impactFacts.length > 0 && <p className={styles.outcomeNote}>Amounts reported by the cleaner.</p>}
            </div>

            <aside className={styles.nextSteps}>
            {expired ? <Link className="primary-button button-link" href="/reports">Find a current cleanup</Link> : !completed && !inProgress && localCommunityHref ? <div className={journey.reportActions}>
              {report.fundingEligible && <Link className="report-action-link button-link report-action-fund" prefetch={false} href={`/sign-in?next=${encodeURIComponent(communityReportMapHref(report.id, report.communitySlug, 'fund'))}`}><BrandBug kind="bee" size={21} />Fund</Link>}
              <Link className="report-action-link button-link report-action-clean" prefetch={false} href={`/sign-in?next=${encodeURIComponent(communityReportMapHref(report.id, report.communitySlug, 'clean'))}`}><BrandBug kind="butterfly" size={21} />Clean</Link>
            </div> : <Link className="primary-button button-link" href={communityReportMapHref(report.id, report.communitySlug, 'locate')}>View on map</Link>}
            {localCommunityHref && <Link className={styles.textAction} href={localCommunityHref}>Back to {report.generalLocation}</Link>}
              <div className={styles.actions}>
                <Link className={styles.textAction} href={expired ? "/report-litter" : completed ? community ? communityListingHref(community) : "/cleaner" : "/fund-a-cleanup"}>{expired ? "Report a spot" : completed ? community ? `Find another cleanup in ${community.name}` : "Find another cleanup" : "How funding works"}</Link>
                <Link className={styles.textAction} href="/report-litter">How reporting works</Link>
                {!expired && <OpenReportAction reportId={report.id} className={styles.textAction} />}
              </div>
            </aside>
          </div>
          </div>
        </article>
        <section className={styles.related} aria-labelledby="related-reports-heading">
          <h2 id="related-reports-heading">{community ? `More reports in ${community.name}` : 'Explore more litter reports'}</h2>
          {related.length > 0 && <ul className={styles.relatedList}>
            {related.map(item => <li key={item.id}>
              <Link prefetch={false} href={`/reports/${item.id}`}>{item.title}</Link>
              <span>{item.state === 'completed' ? 'Cleanup complete' : 'Cleanup needed'}</span>
            </li>)}
          </ul>}
          <div className={styles.browseLinks}>
            {community && <>
              <Link href={communityListingHref(community)}>Reports needing cleanup in {community.name}</Link>
              <Link href={communityListingHref(community, 'completed')}>Completed cleanups in {community.name}</Link>
            </>}
            <Link href="/reports">Browse reports needing cleanup</Link>
            <Link href="/reports/history">Past reports</Link>
            <Link href="/cleanups">Browse all completed cleanups</Link>
            <Link href="/communities">Explore communities</Link>
          </div>
        </section>
      </div>
    </main></Website>
  );
}
