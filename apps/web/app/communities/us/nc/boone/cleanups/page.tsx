import { CommunityResults } from '@/components/communities/community-results';
import { communityReportHref } from '@/lib/community-journey';
import journey from '@/components/communities/community-journey.module.css';
import Link from 'next/link';
import { FiChevronLeft } from 'react-icons/fi';
/* eslint-disable @next/next/no-img-element -- the map's bugs label each list. */
import { notFound } from 'next/navigation';
import { Website, ReportCards, styles as websiteStyles } from '@/components/public-website';
import communityTheme from '@/components/communities/community-theme.module.css';
import styles from '@/components/communities/communities.module.css';
import { getCommunity } from '@/lib/community-directory';
import { communityListingParams, communityListingHref, communityMapHref } from '@/lib/community-listings';
import { loadPublicReportFeed } from '@/lib/public-report-feed';
import { publicPageMetadata } from '@/lib/public-page-metadata';
const community = getCommunity('us-nc-boone')!;
type Props = { searchParams: Promise<{ page?: string | string[]; status?: string | string[] }> };
const BUGS = { available: '/brand/bugs/ladybug.png', completed: '/brand/bugs/flower.png', fundable: '/brand/bugs/bee.png' };
const TABS = { available: 'Available', completed: 'Completed', fundable: 'Accepting funding' };
const labels = { available: 'Available cleanups', completed: 'Completed cleanups', fundable: 'Cleanups accepting funding' };
export const dynamic = 'force-dynamic';
export async function generateMetadata({ searchParams }: Props) {
  const params = communityListingParams(await searchParams);
  if (!params) notFound();
  return publicPageMetadata({ title: `${labels[params.status]} in Boone — Page ${params.page} | Litterbugs`, robots: { index: false, follow: true }, alternates: { canonical: communityListingHref(community, params.status, params.page) } });
}
export default async function CommunityCleanups({ searchParams }: Props) {
  const params = communityListingParams(await searchParams);
  if (!params) notFound();
  const { page, status } = params;
  const feed = await loadPublicReportFeed(status, 6, page, community.slug);
  if (!feed.unavailable && page > 1 && !feed.reports.length) notFound();
  return <Website activePath="/communities"><main data-community-slug={community.slug} id="main-content" tabIndex={-1} className={`${websiteStyles.wide} ${communityTheme.theme} ${styles.hub}`}>
    <header><Link className={styles.breadcrumb} href={community.href}><FiChevronLeft aria-hidden="true" />Boone community</Link><h1>{labels[status]} in Boone</h1><p className={styles.scope}>{community.boundaryDescription}</p></header>
    <nav className={styles.sectionNav} aria-label="Local cleanup listings">{(['available', 'completed', 'fundable'] as const).map(kind => <Link key={kind} href={communityListingHref(community, kind)} aria-current={kind === status ? 'page' : undefined}><img src={BUGS[kind]} alt="" aria-hidden="true" width={18} height={18} />{TABS[kind]}</Link>)}</nav>
    <section aria-label={labels[status]}>
      {feed.unavailable ? <div className={styles.empty}><h2>Reports couldn’t load right now.</h2><p>This is a loading problem, not confirmation that there are no local reports.</p><Link href={communityListingHref(community, status, page)} className={styles.textLink}>Try again</Link></div> : <><p className={styles.scope}>Page {page} · {feed.reports.length} {feed.reports.length === 1 ? 'report' : 'reports'} shown{feed.hasMore ? ' · More on the next page' : ''}</p>{status === 'completed' && feed.reports.length ? <CommunityResults reports={feed.reports} featured={false} /> : <ReportCards feed={feed} empty={`No ${status === 'completed' ? 'completed cleanups' : status === 'fundable' ? 'eligible funding opportunities' : 'available cleanup reports'} in Boone right now.`} />}</>}
      {(page > 1 || feed.hasMore) && <nav className={`${styles.actions} ${journey.actionRow} ${journey.afterCards}`} aria-label="Cleanup listing pages">{page > 1 && <Link className={styles.textLink} href={communityListingHref(community, status, page - 1)}>Previous page</Link>}{feed.hasMore && <Link className={styles.textLink} href={communityListingHref(community, status, page + 1)}>Next page</Link>}</nav>}
      <div className={`${styles.actions} ${journey.actionRow} ${journey.afterCards}`}><Link href={communityReportHref(community)} className={styles.textLink}>Report litter</Link>{status !== 'fundable' && <a className={styles.textLink} href={communityMapHref(community, status)}>View Boone on the map</a>}<Link className={styles.textLink} href={`${community.href}#groups`}>Find local help</Link></div>
    </section>
  </main></Website>;
}
