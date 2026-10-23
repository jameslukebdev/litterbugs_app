import Link from 'next/link';
import { PublicSiteHeader } from '@/components/public-site-header';
import styles from '../about/about-simple.module.css';

export const metadata = { title: 'Get help | Litterbugs', description: 'Get help with your Litterbugs account, reports, cleanups, and payments. Contact the support team with your question.', alternates: { canonical: '/help' } };

export default function Page() {
  return <div className={styles.surface}>
    <PublicSiteHeader activePath="/help" />
    <main className={styles.page}>
      <h1>We’re here to help</h1>
      <p>Have a question or something isn’t working? Tell us what happened so we can help you take the next step.</p>
      <p><strong>What to include.</strong> Describe what you were trying to do and what happened. For a report or payment question, include the report title or reference if you have it.</p>
      <p><strong>Keep your details private.</strong> Please don’t send passwords, bank account details, or full card numbers.</p>
      <p><strong>Email support:</strong> <a href="mailto:admin@litterbugs.app">admin@litterbugs.app</a>. Review your message before sending.</p>
      <p><Link href="/">Back to map</Link></p>
    </main>
  </div>;
}
