import Link from 'next/link';
import type { ReactNode } from 'react';

import { PublicSiteHeader, type PublicPath } from './public-site-header';
import styles from './legal-page.module.css';

type LegalSection = {
  title: string;
  content: ReactNode;
};

export function LegalPage({
  eyebrow,
  title,
  summary,
  effectiveDate,
  sections,
  activePath,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  effectiveDate: string;
  sections: LegalSection[];
  activePath: PublicPath;
}) {
  return (
    <>
      <PublicSiteHeader activePath={activePath} />
      <main className={styles.page}>
        <header className={styles.header}>
          <span className={styles.eyebrow}>{eyebrow}</span>
          <h1>{title}</h1>
          <p className={styles.summary}>{summary}</p>
          <p className={styles.effective}>Effective {effectiveDate}</p>
        </header>

        <div className={styles.content}>
          {sections.map((section) => (
            <section key={section.title} className={styles.section}>
              <h2>{section.title}</h2>
              <div>{section.content}</div>
            </section>
          ))}
        </div>

        <footer className={styles.footer}>
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/cleanup-policy">Cleanup policy</Link>
          <Link href="/cleanup-safety">Safety &amp; waiver</Link>
        </footer>
      </main>
    </>
  );
}
