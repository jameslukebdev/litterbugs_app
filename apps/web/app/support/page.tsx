import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicSiteHeader } from '@/components/public-site-header';
import styles from '../about/about-page.module.css';

export const metadata: Metadata = {
  title: 'Support Litterbugs',
  description: 'Help our community grow by reporting litter, joining a cleanup, or spreading the word.',
};

const waysToHelp = [
  { label: 'SPOT LITTER', title: 'Give a place a little care', body: 'Your photos and local knowledge can help a neighbor find a place that needs attention.' },
  { label: 'LEND A HAND', title: 'Make a difference nearby', body: 'Find a nearby cleanup that feels right for you. Every little bit makes a difference.' },
  { label: 'SPREAD THE WORD', title: 'Help our community grow', body: 'Share a report or a completed cleanup to help more people get involved.' },
];

export default function SupportPage() {
  return <>
    <PublicSiteHeader activePath="/support" />
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="support-title">
        <div className={styles.heroInner}>
          <p className={styles.eyebrow}>SUPPORT LITTERBUGS</p>
          <h1 id="support-title">A little help goes a long way.</h1>
          <p className={styles.heroCopy}>Every report, cleanup, and shared story helps bring us closer to cleaner neighborhoods.</p>
          <div className={styles.heroActions}><Link className={styles.primaryAction} href="/">Explore nearby cleanups</Link></div>
        </div>
      </section>
      <section className={styles.process} aria-label="Ways to help">
        <div className={styles.sectionInner}>
          <div className={styles.roleGrid}>
            {waysToHelp.map(({ label, title, body }) => <article className={styles.role} key={label}>
              <p className={styles.eyebrow}>{label}</p><h2>{title}</h2><p>{body}</p>
            </article>)}
          </div>
        </div>
      </section>
    </main>
  </>;
}
