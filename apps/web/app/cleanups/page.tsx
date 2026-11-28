import { publicPageMetadata } from '@/lib/public-page-metadata';
import Link from 'next/link';
import { Website, ReportCards, DirectoryNav, styles } from '@/components/public-website';
import info from '@/components/public-website/info-pages.module.css';
import { archivePageNumber, loadCleanupArchive } from '@/lib/cleanup-archive';
import { notFound } from 'next/navigation';
type Props = { searchParams: Promise<{ page?: string | string[] }> };
function pageNumber(value: string | string[] | undefined) {
  const page = archivePageNumber(value);
  if (page === null) notFound();
  return page;
}
export const dynamic = 'force-dynamic';
export async function generateMetadata({ searchParams }: Props) {
  const page = pageNumber((await searchParams).page);
  const feed = await loadCleanupArchive(page);
  return publicPageMetadata({
    robots: feed.unavailable ? { index: false, follow: true } : undefined,
    title: `Completed Litter Cleanups${page > 1 ? ` — Page ${page}` : ''} | Litterbugs`,
    description:
      'See real completed cleanups, original before-and-after photos, and recorded results from the Litterbugs community.',
    alternates: {
      canonical: page > 1 ? `/cleanups?page=${page}` : '/cleanups',
    },
  });
}
export default async function CleanupsPage({ searchParams }: Props) {
  const page = pageNumber((await searchParams).page);
  const feed = await loadCleanupArchive(page);
  return (
    <Website activePath="/cleanups">
      <main id="main-content" tabIndex={-1} className={styles.wide}>
        <header className={styles.directoryIntro}>
          <h1>Completed litter cleanups.</h1>
          <DirectoryNav current="completed" />
        </header>
        <ReportCards
          feed={feed}
          empty={
            page > 1
              ? 'No more completed cleanups.'
              : 'No completed cleanups yet.'
          }
        />
        <nav className={styles.pagination} aria-label="Cleanup pages">
          {page > 1 ? (
            <Link
              href={page === 2 ? '/cleanups' : `/cleanups?page=${page - 1}`}
            >
              Newer reports
            </Link>
          ) : (
            <span />
          )}
          {feed.hasMore && (
            <Link href={`/cleanups?page=${page + 1}`}>Older reports</Link>
          )}
        </nav>
        <p className={info.closing}>Know a spot that needs the same? <Link href="/report-litter">Report a spot</Link> or <Link href="/communities">explore communities</Link>.</p>
      </main>
    </Website>
  );
}
