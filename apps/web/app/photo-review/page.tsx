import Link from 'next/link';
import { PublicSiteHeader } from '@/components/public-site-header';
import styles from '../about/about-simple.module.css';

export const metadata = { title: 'About photo review | Litterbugs', description: 'Learn how Litterbugs checks report and cleanup photos, and how to get help with a review.', alternates: { canonical: '/photo-review' } };

export default function Page() {
  return <div className={styles.surface}>
    <PublicSiteHeader activePath="/photo-review" />
    <main className={styles.page}>
      <h1>How your photos are reviewed</h1>
      <p>Photo checks help assess reports and cleanup progress. Here’s what happens after you upload.</p>
      <p><strong>Storage and file safety.</strong> Photos are stored by Litterbugs and checked by Cloudmersive for unsafe files.</p>
      <p><strong>Report and cleanup checks.</strong> Report and cleanup photos may also be reviewed by Google Gemini for photo clarity, litter, hazards, and cleanup progress.</p>
      <p><strong>AI has limits.</strong> AI can make mistakes; it does not send rewards.</p>
      <p><strong>Questions about a photo review?</strong> Email <a href="mailto:admin@litterbugs.app">admin@litterbugs.app</a> or <Link href="/help">get help</Link>.</p>
      <p><Link href="/">Back to map</Link></p>
    </main>
  </div>;
}
