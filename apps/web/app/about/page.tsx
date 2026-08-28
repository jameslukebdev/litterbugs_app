import type { Metadata } from 'next';
import Link from 'next/link';

import { PublicSiteHeader } from '@/components/public-site-header';

export const metadata: Metadata = {
  title: 'About Litterbugs | Burrow Base LLC',
  description: 'Litterbugs is a community cleanup product operated by Burrow Base LLC.',
};

export default function AboutPage() {
  return (
    <>
      <PublicSiteHeader activePath="/about" />
      <main className="company-page">
        <article className="company-card">
          <p className="company-eyebrow">BURROW BASE LLC</p>
          <h1>About Litterbugs</h1>
          <p>
            Litterbugs is a community cleanup website and mobile app operated by Burrow Base LLC.
            It helps people report litter, see active reports, and coordinate cleanup in their communities.
          </p>

          <h2>Company</h2>
          <p>
            Burrow Base LLC is the legal entity responsible for the Litterbugs product and the
            <strong> litterbugs.app</strong> domain.
          </p>

          <h2>Contact</h2>
          <p>
            Business and support inquiries can be sent to{' '}
            <a href="mailto:support@litterbugs.app">support@litterbugs.app</a>.
          </p>

          <nav className="company-actions" aria-label="Litterbugs company links">
            <Link href="/">Open Litterbugs</Link>
            <Link href="/cleanup-policy">Read cleanup policy</Link>
          </nav>
        </article>
      </main>
    </>
  );
}
