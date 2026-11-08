import Link from 'next/link';
import seoStyles from '@/components/public-website/seo-pages.module.css';
import { MonthlySupport } from '@/components/monthly-support';
import { monthlySupportLinks } from '@/lib/monthly-support';
import styles from './support.module.css';

/** The /support page body: why to give, the amount picker, then the few things people ask about. */
export function SupportContent() {
  return <>
    <h1>Support Litterbugs</h1>
    <p>Help more people turn litter into cleaner places. Monthly support pays for running and improving Litterbugs: the map, photo storage and keeping everything working.</p>
    <div className={seoStyles.supportForm}><MonthlySupport {...monthlySupportLinks()} /></div>
    <section className={styles.notes} aria-labelledby="support-notes">
      <h2 id="support-notes">Good to know</h2>
      <ul>
        <li><strong>It supports Litterbugs as a whole.</strong> It doesn’t go into any cleanup’s fund or pay reporters. To help pay for one spot, <Link href="/map?view=map">choose a report on the map</Link>.</li>
        <li><strong>It’s optional.</strong> Every amount supports the same work. There are no paid features, badges or special access.</li>
        <li><strong>It isn’t a tax-deductible donation.</strong></li>
        <li><strong>Questions?</strong> Email <a href="mailto:admin@litterbugs.app">admin@litterbugs.app</a>.</li>
      </ul>
    </section>
    <p className={styles.legal}><Link href="/terms">Terms</Link> · <Link href="/privacy">Privacy</Link></p>
  </>;
}
