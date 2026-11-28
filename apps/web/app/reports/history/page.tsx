import Link from 'next/link';
import { Website, ReportCards, DirectoryNav, styles } from '@/components/public-website';
import info from '@/components/public-website/info-pages.module.css';
import { loadHistoricalReportDirectory, openReportPage } from '@/lib/open-report-directory';
import { publicPageMetadata } from '@/lib/public-page-metadata';

type Props = { searchParams: Promise<{ page?: string | string[] }> };
export const dynamic = 'force-dynamic';
export async function generateMetadata({ searchParams }: Props) {
  const page = openReportPage((await searchParams).page);
  const feed = await loadHistoricalReportDirectory(page);
  return publicPageMetadata({
    title: `Past Litter Reports${page > 1 ? ` — Page ${page}` : ''} | Litterbugs`,
    description: 'Browse past litter reports, original photos, and reporting dates. These reports have expired; a cleanup has not been confirmed.',
    robots: feed.unavailable ? { index: false, follow: true } : undefined,
    alternates: { canonical: page > 1 ? `/reports/history?page=${page}` : '/reports/history' },
  });
}
export default async function ReportHistory({ searchParams }: Props) {
  const page = openReportPage((await searchParams).page);
  const feed = await loadHistoricalReportDirectory(page);
  return <Website activePath="/reports">
    <main id="main-content" tabIndex={-1} className={styles.wide}>
      <header className={styles.directoryIntro}>
        <h1>Expired litter reports.</h1>
        <p>A cleanup has not been confirmed, and conditions may have changed.</p>
        <DirectoryNav current="history" />
      </header>
      <ReportCards showLocation feed={feed} empty="No past reports to show yet." />
      {(page > 1 || feed.hasMore) && <nav className={styles.pagination} aria-label="Past report pages">
        {page > 1 ? <Link href={page === 2 ? '/reports/history' : `/reports/history?page=${page - 1}`}>Previous page</Link> : <span />}
        {feed.hasMore && <Link href={`/reports/history?page=${page + 1}`}>Next page</Link>}
      </nav>}
      <p className={info.closing}>Looking for somewhere to help now? <Link href="/reports">Find a current cleanup</Link></p>
    </main>
  </Website>;
}
