import Link from 'next/link';
import { Website, ReportCards, DirectoryNav, styles } from '@/components/public-website';
import info from '@/components/public-website/info-pages.module.css';
import { publishedCommunities } from '@/lib/community-directory';
import { loadOpenReportDirectory, openReportPage } from '@/lib/open-report-directory';
import { publicPageMetadata } from '@/lib/public-page-metadata';

type Props = { searchParams: Promise<{ page?: string | string[] }> };
export const dynamic = 'force-dynamic';

export async function generateMetadata({ searchParams }: Props) {
  const page = openReportPage((await searchParams).page);
  const feed = await loadOpenReportDirectory(page);
  return publicPageMetadata({
    title: `Litter Reports & Cleanup Opportunities${page > 1 ? ` — Page ${page}` : ''} | Litterbugs`,
    description: 'Browse litter reports that need a cleanup or have work underway. See photos, find a spot to help, or explore completed cleanups.',
    robots: feed.unavailable ? { index: false, follow: true } : undefined,
    alternates: { canonical: page > 1 ? `/reports?page=${page}` : '/reports' },
  });
}

export default async function ReportsPage({ searchParams }: Props) {
  const page = openReportPage((await searchParams).page);
  const feed = await loadOpenReportDirectory(page);
  return <Website activePath="/reports">
    <main id="main-content" tabIndex={-1} className={styles.wide}>
      <header className={styles.directoryIntro}>
        <h1>Places that need a cleanup.</h1>
        <DirectoryNav current="open" cities={<nav className={info.cities} aria-label="Browse by city">
          <span>Browse by city</span>
          {publishedCommunities().map(community => <Link key={community.slug} href={community.href}>{community.name}</Link>)}
          <Link href="/communities">All communities</Link>
        </nav>} />
      </header>
      <ReportCards showLocation feed={feed} empty="No open reports right now. Spotted litter? Add a report." />
      {(page > 1 || feed.hasMore) && <nav className={styles.pagination} aria-label="Report pages">
        {page > 1 ? <Link href={page === 2 ? '/reports' : `/reports?page=${page - 1}`}>Previous page</Link> : <span />}
        {feed.hasMore && <Link href={`/reports?page=${page + 1}`}>Next page</Link>}
      </nav>}
      <p className={info.closing}>Spotted litter that isn’t listed? <Link href="/report-litter">Report a spot</Link></p>
    </main>
  </Website>;
}
