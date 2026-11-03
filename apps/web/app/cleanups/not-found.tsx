import Link from 'next/link';
import { Website, styles } from '@/components/public-website';
export default function MissingArchivePage() {
  return (
    <Website activePath="/cleanups">
      <main id="main-content" tabIndex={-1} className={styles.guide}>
        <h1>This cleanup page doesn’t exist.</h1>
        <p>
          You may have reached the end of the archive or followed an outdated
          link.
        </p>
        <Link href="/cleanups">See completed cleanups</Link>
      </main>
    </Website>
  );
}
