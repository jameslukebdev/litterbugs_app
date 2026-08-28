import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About Litterbugs | Burrow Base LLC',
  description: 'Litterbugs is a community cleanup product operated by Burrow Base LLC.',
};

export default function AboutPage() {
  return (
    <main className="company-page">
      <article className="company-card">
        <Image className="company-logo" src="/brand/litterbugs-logo.png" alt="Litterbugs" width={636} height={433} priority />
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
          <a href="https://auth.litterbugs.app/privacy">Privacy policy</a>
        </nav>
      </article>
    </main>
  );
}
