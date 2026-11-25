import { reportMapHref } from '@/lib/report-links';
import type { Metadata } from 'next';
import Link from 'next/link';
import { FiChevronLeft, FiChevronRight, FiClock, FiMapPin } from 'react-icons/fi';
/* eslint-disable @next/next/no-img-element -- small status bugs, like the map. */
import { notFound } from 'next/navigation';

import { Website } from '@/components/public-website';
import { BrandBug } from '@/components/brand-bug';
import { ContributionSupporters } from '@/components/contribution-supporters';
import { withServerContributorCredits } from '@/lib/server-contributor-credits';
import { CommunityRank } from '@/components/community-rank';
import { ReportStructuredData } from '@/components/public-website/structured-data';
import { publicReportListing } from '@/lib/public-report-structured-data';
import { publicReportPageTitle, publicReportSearchTitle, publicReportSearchDescription, publicReportOriginalSummary, publicReportHistorySummary, publicReportPhotoDescription, publicReportStorySummary, reportDateLabel as formatDate } from '@/lib/public-report-content';
import { loadRelatedPublicReports } from '@/lib/related-public-reports';
import { loadPublicReportShare } from '@/lib/public-report-share';
import { SHARED_REPORT_AUTH_PARAM } from '@/lib/participation-auth';
import { publicReportStatus } from '@/lib/public-report-status';
import { AppLink } from '@/components/app-link';
import { ReportFacts, distanceLabel } from './report-facts';
import { ReportSiteActivity } from '@/components/report-site-activity';
import { isLocalSiteReport } from '@/lib/local-report-site-ids';
import { ReportLocation } from './report-location';
import { ReportPhotos } from './report-photos';
import { ReportShareButton } from './report-share-button';

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
  // The id address is the one the app, its share image and its photos live under;
  // the readable canonical address is for browsers and search engines.
  const idUrl = `${new URL(report.canonicalUrl).origin}/reports/${encodeURIComponent(report.id)}`;
  const image = { url: `${idUrl}/opengraph-image/card`, width: 1200, height: 630, type: 'image/png', alt: `${title} | Litterbugs` };
  return {
    title: publicReportPageTitle(report),
    description,
    alternates: { canonical: report.canonicalUrl },
    openGraph: {
      type: 'article',
      title,
      description,
      url: report.canonicalUrl,
      siteName: 'Litterbugs',
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
    itunes: {
      appId: '6757313862',
      // The published app routes only /reports/<id>.
      appArgument: idUrl,
    },
  };
}

export default async function SharedReportPage({ params }: Props) {
  const { id } = await params;
  const source = await loadPublicReportShare(id, 'linked');
  if (!source) notFound();
  const [report] = isLocalSiteReport(id) ? [source] : await withServerContributorCredits([source]);

  // Optional recommendations must not hold the report and its actions behind another database read.
  const relatedLinks = loadRelatedPublicReports(report.id, report.location?.latitude, report.location?.longitude).then(related => related.length > 0 ? <ul className={styles.relatedList}>
    {related.map(item => {
      const itemStatus = publicReportStatus(item.state);
      return <li key={item.id}>
        <Link prefetch={false} href={item.path ?? `/reports/${item.id}`}>{item.title}</Link>
        <span className={styles.relatedStatus} data-tone={itemStatus.tone}>{itemStatus.bug ? <img src={itemStatus.bug} alt="" aria-hidden="true" width={16} height={16} /> : <FiClock aria-hidden="true" />}{itemStatus.label}{item.miles != null && <span className={styles.relatedDistance}>{distanceLabel(item.miles)}</span>}</span>
      </li>;
    })}
  </ul> : null);
  const completed = report.state === 'completed';
  const inProgress = report.state === 'in_progress';
  const expired = report.state === 'expired';
  // The town's leaderboard, when the report's community is public.
  const community = report.community;
  const localCommunityHref = community?.path ?? null;
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
  const storySummary = publicReportStorySummary(report);
  // The listing this report belongs to: the same tabs a visitor browses, and the page's breadcrumb parent.
  const listing = publicReportListing(report.state);
  const mapHref = reportMapHref(report.id, 'locate');

  return (
    <Website infoPage><main data-community-slug={community?.slug} id="main-content" tabIndex={-1} className={styles.page}>
      <div className={styles.shell}>
        <nav className={styles.header} aria-label="Report navigation"><Link href={listing.path} className={styles.back}><FiChevronLeft aria-hidden="true" />{listing.name}</Link></nav>

        <article className={styles.story}>
          <ReportStructuredData report={report} />
          {/* Photos and the report's summary share the top of the page, so nothing sits beside empty space. */}
          <div className={styles.top}>
          <ReportPhotos key={report.id}
            beforePhotoUrl={report.beforePhotoUrl} afterPhotoUrl={report.afterPhotoUrl}
            beforeCount={report.photoCount} afterCount={report.afterPhotoCount}
            beforeDescription={publicReportPhotoDescription(report, 'before')}
            afterDescription={publicReportPhotoDescription(report, 'after')}
          />
          <header className={styles.hero}>
            <p className={styles.status} data-tone={status.tone}>
              {status.bug ? <img src={status.bug} alt="" aria-hidden="true" width={20} height={20} /> : <FiClock aria-hidden="true" />}
              {status.label}
            </p>
            <h1>{report.title}</h1>
            <p className={styles.meta}>
              {/* The address line below already names the town; show the town here only when there is no address. */}
              {report.address ? null : localCommunityHref ? <Link href={localCommunityHref}>{report.generalLocation}</Link> : report.place ? <span>{report.generalLocation}</span> : null}
              {completed && report.cleanerName ? <span>Cleaned by {report.cleanerId ? <Link href={`/members/${report.cleanerId}`}>{report.cleanerName}</Link> : report.cleanerName}</span> : null}
              {completed && report.completionDate ? <span>Cleaned <time dateTime={report.completionDate}>{formatDate(report.completionDate)}</time></span> : null}
              {!completed && !expired && report.severity ? <span>{report.severity} priority</span> : null}
              {!completed ? reportedOn : null}
              {expired && report.expiredDate && formatDate(report.expiredDate) ? <span>Expired <time dateTime={report.expiredDate}>{formatDate(report.expiredDate)}</time></span> : null}
            </p>
            {report.address && <p className={styles.heroAddress}><FiMapPin aria-hidden="true" />Near {report.address.line}</p>}
            <ReportFacts report={report} />
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
            <div className={styles.nextSteps}>
            {expired ? <Link className="primary-button button-link" href="/reports">Find a current cleanup</Link> : !completed && !inProgress ? <div className={styles.reportActions}>
              {report.fundingEligible && <Link className="report-action-link button-link report-action-fund" prefetch={false} href={`/sign-in?${SHARED_REPORT_AUTH_PARAM}=1&next=${encodeURIComponent(reportMapHref(report.id, 'fund'))}`}><BrandBug kind="bee" size={21} className="bug-hop" />Fund</Link>}
              <Link className="report-action-link button-link report-action-clean" prefetch={false} href={`/sign-in?${SHARED_REPORT_AUTH_PARAM}=1&next=${encodeURIComponent(reportMapHref(report.id, 'clean'))}`}><BrandBug kind="butterfly" size={21} className="bug-hop" />Clean</Link>
            </div> : completed
              // A finished cleanup's best next step is the next one that needs doing.
              ? <Link className="primary-button button-link" href="/reports">Find another cleanup</Link>
              : <Link className="primary-button button-link" href={mapHref}>View on map</Link>}
              <ReportShareButton reportId={report.id} title={report.title}
                label={completed ? 'Share cleanup' : 'Share report'}
                // The same share dialog the report cards open; an expired report gets its own status and wording there.
                dialog={{
                  expired,
                  report: { cleanup_state: completed ? 'completed' : inProgress ? 'claimed' : 'available', title: report.title,
                    funded_amount_cents: report.rewardCents ?? 0, litter_types: report.litterTypes, severity: report.severity, types: null },
                  previewPhotoUrl: (completed ? report.afterPhotoUrl ?? report.beforePhotoUrl : report.beforePhotoUrl)
                    ? `${completed ? report.afterPhotoUrl ?? report.beforePhotoUrl : report.beforePhotoUrl}?width=640` : null,
                }}
                message={completed ? `See the cleanup impact for ${report.title} on Litterbugs.`
                  : expired ? `See the litter report history for ${report.title} on Litterbugs.`
                    : `View ${report.title} and help clean it up with Litterbugs.`} />
            </div>
          </header>
          </div>

          <div className={styles.body}>
            <div className={styles.reportCopy}>
              {/* Each section opens with one plain sentence of who, where and when; the member's own words follow. */}
              {completed && <section className={styles.section} aria-labelledby="cleanup-result-heading">
                <h2 id="cleanup-result-heading">The cleanup</h2>
                <p>{storySummary}</p>
                {report.cleanupDescription && <p>{report.cleanupDescription}</p>}
                {impactFacts.length > 0 && <dl className={`${styles.facts} ${styles.sectionFacts}`}>
                  <div className={styles.fact}>
                    <dt>Removed</dt>
                    <dd>{impactFacts.join(' · ')}<small>Amounts reported by the cleaner.</small></dd>
                  </div>
                </dl>}
              </section>}
              {!completed && !expired && <section className={styles.section} aria-labelledby="original-report-heading">
                <h2 id="original-report-heading">About this report</h2>
                <p>{storySummary}</p>
              </section>}
              {(expired || (completed && report.notes)) && <section className={styles.section} aria-labelledby="original-report-heading">
                <h2 id="original-report-heading">The original report</h2>
                {expired && <p>{storySummary}</p>}
                <p>{expired ? publicReportOriginalSummary(report) : report.notes}</p>
              </section>}
              {expired && <section className={styles.section} aria-labelledby="report-history-heading">
                <h2 id="report-history-heading">Report history</h2>
                <p>{publicReportHistorySummary(report)}</p>
              </section>}

              {/* Expired reports already list the litter in “The original report”. */}
              {/* An open report's details sit as labelled facts under its opening sentence. */}
              {!expired && (report.litterTypes.length > 0 || (!completed && report.notes)) && <dl className={`${styles.facts} ${styles.sectionFacts}`}>
                {!completed && report.notes && <div className={styles.fact}>
                  <dt>Site details</dt>
                  <dd>{report.notes}</dd>
                </div>}
                {report.litterTypes.length > 0 && <div className={styles.fact}>
                  <dt>{completed ? 'Original litter' : 'Reported litter'}</dt>
                  <dd>{report.litterTypes.join(', ')}</dd>
                </div>}
              </dl>}
              {!expired && <ContributionSupporters reportId={report.id} initialCredit={report.contributorCredit} />}
              <ReportSiteActivity reportId={report.id} initialReport={report} />
            </div>
            <div className={styles.side}>
            <ul className={styles.links}>
              {localCommunityHref && community && <li><Link href={localCommunityHref}>{community.name} leaderboard<FiChevronRight aria-hidden="true" /></Link></li>}
              <li><Link href={expired ? "/report-litter" : completed ? mapHref : "/fund-a-cleanup"}>{expired ? "Report a spot" : completed ? "View on map" : "How funding works"}<FiChevronRight aria-hidden="true" /></Link></li>
              <li><Link href="/report-litter">How reporting works<FiChevronRight aria-hidden="true" /></Link></li>
              {!expired && <li><AppLink reportId={report.id} className={styles.appLink}>Open in Litterbugs</AppLink></li>}
            </ul>
            <div className={styles.aside}>
              {/* A report is often the only Litterbugs page a reader or an answer engine sees. */}
              <p className={styles.about}>Litterbugs is a community app where neighbors report litter, fund and carry out cleanups, and verify completed work.{' '}<Link href="/about">How Litterbugs works</Link></p>
            </div>
            </div>
          </div>
          {report.location && <ReportLocation latitude={report.location.latitude} longitude={report.location.longitude}
            address={report.address?.line ?? null} title={report.title} mapHref={expired ? undefined : mapHref}
            kind={completed ? 'done' : inProgress ? 'busy' : expired ? 'muted' : 'open'} />}
        </article>
        <section className={styles.related} aria-labelledby="related-reports-heading">
          <h2 id="related-reports-heading">{report.location ? 'Nearby reports' : 'Explore more litter reports'}</h2>
          <Suspense fallback={null}>{relatedLinks}</Suspense>
          <div className={styles.browseLinks}>
            <Link href="/reports">Browse reports needing cleanup</Link>
            <Link href="/reports/history">Expired reports</Link>
            <Link href="/cleanups">Browse all completed cleanups</Link>
            <Link href={community?.path ?? '/communities'}>{community ? `${community.name} leaderboard` : 'Leaderboards'}</Link>
          </div>
        </section>
      </div>
    </main></Website>
  );
}
