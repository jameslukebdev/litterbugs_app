import { CommunityResults } from '@/components/communities/community-results';
import { booneGuidance, booneGuidanceReviewedAt } from '@/lib/boone-cleanup-guidance';
import { communityListingHref, communityMapHref } from '@/lib/community-listings';
import { communityReportHref } from '@/lib/community-journey';
import journey from '@/components/communities/community-journey.module.css';
import communityTheme from '@/components/communities/community-theme.module.css';
import Link from 'next/link';
import { Website, ReportCards, styles as websiteStyles } from '@/components/public-website';
import { CommunityBreadcrumbs } from '@/components/public-website/structured-data';
import { SaveCommunity, ResourceDirectory } from '@/components/communities/community-controls';
import { getCommunity, isIndexableCommunity } from '@/lib/community-directory';
import { communities } from '@/lib/public-communities';
import { loadPublicReportFeed } from '@/lib/public-report-feed';
import { publicPageMetadata } from '@/lib/public-page-metadata';
import styles from '@/components/communities/communities.module.css';

const community = getCommunity('us-nc-boone')!;
const boundarySource = communities.find(item => item.slug === community.slug)!.source;

export const dynamic = 'force-dynamic';
export const metadata = publicPageMetadata({
  title: community.title,
  description: community.description,
  robots: { index: isIndexableCommunity(community), follow: true },
  alternates: { canonical: community.href },
});
export default async function BooneCommunityPage() {
  const [active, completed] = await Promise.all([
    loadPublicReportFeed('available', 6, 1, community.slug),
    loadPublicReportFeed('completed', 6, 1, community.slug),
  ]);
  return <Website activePath="/communities">
    <CommunityBreadcrumbs name={community.name} path={community.href} />
    <main data-community-slug={community.slug} id="main-content" tabIndex={-1} className={`${websiteStyles.wide} ${communityTheme.theme} ${styles.hub}`}>
      <header><Link className={styles.breadcrumb} href="/communities">Communities</Link><h1>{community.heading}</h1><div className={styles.actions}><Link className="primary-button button-link" href={communityReportHref(community)}>Report litter</Link><SaveCommunity slug={community.slug} name={community.name} /></div><p className={styles.scope}>{community.boundaryDescription} <a href={boundarySource}>Boundary source</a>.</p></header>
      <nav className={styles.sectionNav} aria-label="Boone community sections"><a href="#cleanups">Cleanups</a><a href="#groups">Groups &amp; help</a><a href="#results">Completed work</a><a href="#local-guidance">Local guidance</a></nav>
      <section id="cleanups" aria-labelledby="cleanup-heading"><div className={styles.sectionHeading}><h2 id="cleanup-heading">Places that need attention</h2><a className={styles.textLink} href={communityMapHref(community)}>View reports on the map</a></div>
        <p className={styles.sectionIntro}>Cleanup opportunities in Boone and nearby locations within postal code 28607. Open a report to check its location, status, and cleanup details.{active.hasMore ? ` Showing ${active.reports.length} recent reports; use “Browse all local opportunities” to see the rest.` : ''}</p>
        <nav className={journey.opportunityFilters} aria-label="Boone report filters"><span aria-current="page">Available cleanups</span><Link href={communityListingHref(community, 'fundable')}>Accepting funding</Link></nav>
        {active.reports.length ? <ReportCards feed={active} /> : <div className={styles.empty}><h3>{active.unavailable ? 'Reports couldn’t load right now.' : 'No active Litterbugs reports here right now.'}</h3><p>{active.unavailable ? 'Please try again shortly.' : ''}</p><div className={styles.actions}><Link className={styles.textLink} href={communityReportHref(community)}>Report litter</Link><a className={styles.textLink} href="#groups">Find local help</a></div></div>}
        <div className={`${styles.actions} ${journey.actionRow} ${journey.afterCards}`}><Link className={styles.textLink} href={communityListingHref(community)}>Browse all local opportunities</Link><Link className={styles.textLink} href={communityReportHref(community)}>Report litter</Link></div>
      </section>
      <section id="groups" aria-labelledby="groups-heading"><h2 id="groups-heading">Local groups &amp; cleanup help</h2><p className={styles.sectionIntro}>Choose help by what you need. Town programs, county services, and regional activities have different service areas and participation rules.</p><ResourceDirectory communitySlug={community.slug} /></section>
      <section id="results" aria-labelledby="results-heading">
        <div className={styles.sectionHeading}><h2 id="results-heading">Completed cleanups</h2><Link className={styles.textLink} href={communityListingHref(community, 'completed')}>All Boone results</Link></div>
        {completed.reports.length ? <CommunityResults reports={completed.reports} /> : <div className={styles.empty}><p>{completed.unavailable ? 'Cleanup results couldn’t load right now. Please try again shortly.' : 'No completed cleanups yet.'}</p></div>}
      </section>
      <section id="local-guidance" className={styles.guidance} aria-labelledby="guidance-heading">
        <h2 id="guidance-heading">Cleaning up in Boone</h2>
        <p className={styles.sectionIntro}>Plan access, supplies, and disposal before you choose a cleanup date. These routes serve different locations; being in postal code 28607 does not mean a town program covers your site.</p>
        {booneGuidance.map((item, index) => <details key={item.question} open={index === 0}><summary>{item.question}</summary>{item.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}<div className={styles.actions}>{item.links.map(link => <a className={styles.textLink} key={link.href} href={link.href}>{link.label}</a>)}</div></details>)}
        <p className={styles.directoryNote}>Official program and disposal sources reviewed {new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(booneGuidanceReviewedAt))}. Confirm arrangements with the provider before your cleanup. <Link href="/support">Suggest a resource or correction</Link>.</p>
      </section>
    </main>
  </Website>;
}
