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
      <p>Litterbugs helps you turn litter in your community into action. Find places that need attention, help fund a cleanup, or earn money by reporting and cleaning up litter.</p>
      <p>Spot litter? Add photos and a location to the map. Your report helps others find the site and support its cleanup. When an eligible funded cleanup is approved, you earn 5% of the eligible contributions for creating the report.</p>
      <p>Want to help without doing the cleanup yourself? Contribute to a report to build its cleanup reward. Your support helps pay someone to do the work.</p>
      <p>Ready to clean? Find a nearby report, check the available reward, and claim a site you can clean safely. Submit photos of your work for review. Once the cleanup is approved and payout requirements are met, you receive the cleanup reward. You can also clean a site you reported and earn both rewards.</p>
      <p>You can track your reports, cleanups, and earnings in your account. To receive payments, you must be 18 or older and set up an eligible US Stripe payout account. See the <Link href="/cleanup-policy">cleanup and reward policy</Link> for the full details.</p>
      <p><Link href="/?view=map">Explore the map</Link> to get started, and read the <Link href="/cleanup-safety">safety guidelines</Link> before cleaning.</p>
      <p>Questions? Email <a href="mailto:admin@litterbugs.app">admin@litterbugs.app</a>.</p>
    </main>
  </>;
}
