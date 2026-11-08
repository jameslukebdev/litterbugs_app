import type { Metadata } from 'next';
import { Website } from '@/components/public-website';
import { SupportContent } from './support-content';
import styles from '../about/about-simple.module.css';

export const metadata: Metadata = {
  alternates: { canonical: '/support' },
  title: 'Support Litterbugs',
  description: 'Help keep Litterbugs running with optional monthly support. Choose $5, $10, or $25 per month and cancel anytime.',
};

export default function SupportPage() {
  return <Website activePath="/support">
    <main id="main-content" tabIndex={-1} className={styles.page}>
      <SupportContent />
    </main>
  </Website>;
}
