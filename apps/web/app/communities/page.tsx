import { cleanupCompletionDate } from '@/lib/community-evidence';
import communityTheme from '@/components/communities/community-theme.module.css';
import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { publicPageMetadata } from '@/lib/public-page-metadata';
import { Website, styles as websiteStyles } from '@/components/public-website';
import { PublicPhoto } from '@/components/public-website/public-photo';
import { CommunitySearch, SavedCommunities } from '@/components/communities/community-controls';
import { resourcesForCommunity } from '@/lib/community-resources';
import { publishedCommunities, type Community } from '@/lib/community-directory';
import { loadPublicReportFeed } from '@/lib/public-report-feed';
import type { PublicReportShareModel } from '@/lib/public-report-share-model';
import styles from './communities-home.module.css';

export const metadata = publicPageMetadata({
  title: 'Cleanup Communities, Local Groups & Ways to Help | Litterbugs',
  description: 'Find your cleanup community. Search a city, region, or postal code to discover local litter reports, cleanup groups, practical help, and cleanup results.',
  alternates: { canonical: '/communities' },
});

function CommunityCard({ community, result }: { community: Community; result?: PublicReportShareModel }) {
  const photo = result?.afterPhotoUrl || result?.beforePhotoUrl;
  const date = cleanupCompletionDate(result?.completionDate ?? null);

  return <Link href={community.href} className={styles.communityCard}>
    <div className={styles.cardPhoto}>
      {photo ? <PublicPhoto src={photo} alt={`Cleanup evidence from a completed report in ${community.name}`} width={600} height={440} /> : <div className={styles.photoFallback}><span className={styles.logoBee} aria-hidden="true" /><span>Small actions.<br />Cleaner places.</span></div>}
      
    </div>
    <div className={styles.cardCopy}>
      
      <h3>{community.name}</h3>
      <p>{community.summary}</p>
      <div className={styles.resourceCount}><strong>{resourcesForCommunity(community.slug).length} local resources</strong></div>
      {result && <div className={styles.recentResult}><span>Recent completed cleanup{date ? ` · ${date}` : ''}</span><strong>{result.title}</strong></div>}
      <span className={styles.cardAction}>Explore community </span>
    </div>
  </Link>;
}

async function CommunityWithActivity({ community }: { community: Community }) {
  const completed = await loadPublicReportFeed('completed', 1, 1, community.slug);
  return <CommunityCard community={community} result={completed.reports[0]} />;
}

export default function CommunitiesPage() {
  return <Website activePath="/communities">
    <main id="main-content" tabIndex={-1} className={`${websiteStyles.wide} ${communityTheme.theme} ${styles.home}`}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          
          <h1>Find your cleanup community.</h1>
          
          <div className={styles.finder}><CommunitySearch /></div>
          <Link className={styles.quietLink} href="/reports">Browse all litter reports</Link>
          <Link className={styles.quietLink} href="/map?view=map&browse=1">Explore the map </Link>
        </div>
        <figure className={styles.heroPhoto}>
          <Image src="/community-photos/beach-team.jpg" alt="Volunteers collecting litter together" width={720} height={720} sizes="(max-width: 760px) 100vw, 36vw" priority />
          
        </figure>
      </header>

      <section className={styles.browse} aria-labelledby="browse-communities-heading">
        <div className={styles.sectionHeading}><div><h2 id="browse-communities-heading">Browse communities</h2></div></div>
        <SavedCommunities communities={publishedCommunities().map(({ slug, href, name }) => ({ slug, href, name }))} />
        <div className={styles.directoryGrid}>
          {publishedCommunities().map(community => <Suspense key={community.slug} fallback={<CommunityCard community={community} />}><CommunityWithActivity community={community} /></Suspense>)}
          <aside className={styles.otherPlace} aria-labelledby="other-place-heading">
            <span className={styles.logoFlower} aria-hidden="true" />
            <h3 id="other-place-heading">Your place could be next.</h3>
            <p>No community page yet? You can still explore reports and put a place that needs care on the map.</p>
            <a className={styles.outlineAction} href="#find-community">Find another place</a>
            <Link className={styles.quietLink} href="/report">Report litter </Link>
          </aside>
        </div>
      </section>

    </main>
  </Website>;
}
