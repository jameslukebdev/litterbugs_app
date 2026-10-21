import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicSiteHeader } from '@/components/public-site-header';
import { MonthlySupport } from '@/components/monthly-support';
import { monthlySupportLinks } from '@/lib/monthly-support';
import styles from '../about/about-simple.module.css';

export const metadata: Metadata = {
  alternates: { canonical: '/support' },
  title: 'Support Litterbugs',
  description: 'Help keep Litterbugs running with optional monthly support. Choose $5, $10, or $25 per month and cancel anytime.',
};

export default function SupportPage() {
  return <div className={styles.surface}>
    <PublicSiteHeader activePath="/support" />
    <main className={styles.page}>
      <h1>Support Litterbugs</h1>
      <p>Help more people turn litter into cleaner places. Your monthly support helps cover the cost of running and improving Litterbugs, from maps and photo storage to keeping the service working.</p>
      <MonthlySupport {...monthlySupportLinks()} />
      <p><strong>What your support does.</strong> It supports Litterbugs as a whole. It does not go into a specific cleanup reward or earn a reporter reward. To help pay for a particular cleanup, <Link href="/?view=map">choose a report on the map</Link> instead.</p>
      <p><strong>Always optional.</strong> Every amount supports the same work. There are no paid app features, badges, or special access. These payments are not tax-deductible charitable donations.</p>
      <p><strong>Questions?</strong> Email <a href="mailto:admin@litterbugs.app">admin@litterbugs.app</a>.</p>
      <p><Link href="/terms">Terms</Link> · <Link href="/privacy">Privacy</Link></p>
    </main>
  </div>;
}
