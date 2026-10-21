import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicSiteHeader } from '@/components/public-site-header';
import styles from './about-simple.module.css';

export const metadata: Metadata = {
  alternates: { canonical: '/about' },
  title: 'How Litterbugs Works',
  description: 'See how neighbors report litter, build cleanup rewards, and verify completed work with Litterbugs.',
};

export default function AboutPage() {
  return <>
    <PublicSiteHeader activePath="/about" />
    <main className={styles.page}>
      <h1>About Litterbugs</h1>
      <p>Litterbugs helps people find and clean up litter in their community. You can report a spot on the map, contribute toward a cleanup, or do the cleanup yourself.</p>
      <p>Reporting is free. Add photos and a location so others can see what needs attention. Someone can then claim the report, clean the site safely, and submit photos for review.</p>
      <p>For approved, funded cleanups, the cleaner receives the full cleanup contribution. The person who created the report earns 5% of eligible contributions, paid from the service fee. This does not reduce the cleaner’s reward.</p>
      <p>A 20% service fee is added to each contribution, plus $0.50 for contributions under $5. For example, a $10 contribution costs $12 total. After approval, the cleaner receives $10 and the reporter earns $0.50. Litterbugs keeps $1.50 before covering standard payment processing costs.</p>
      <p>Rewards depend on approval and payout eligibility. To receive payments, you must be 18 or older with an eligible US Stripe payout account. Contributions are not charitable donations. Read the <Link href="/cleanup-policy">cleanup and reward policy</Link> for the full details.</p>
      <p>Ready to help? <Link href="/?view=map">Explore the map</Link> and read the <Link href="/cleanup-safety">safety guidelines</Link> before cleaning.</p>
      <p>Questions? Email <a href="mailto:admin@litterbugs.app">admin@litterbugs.app</a>.</p>
    </main>
  </>;
}
