import type { ReactNode } from 'react';

import type { PublicPath } from './public-site-header';
import { Website } from './public-website';
import styles from './legal-page.module.css';

type LegalSection = {
  title: string;
  content: ReactNode;
};

export function LegalPage({
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
    <Website activePath={activePath}>
      <main id="main-content" tabIndex={-1} className={styles.page}>
        <header className={styles.header}>
          <h1>{title}</h1>
          <p className={styles.summary}>{summary}</p>
          <p className={styles.effective}>Effective {effectiveDate}</p>
        </header>

        <div className={styles.content}>
          {sections.map((section) => (
            <section key={section.title} className={styles.section}>
              <p className={styles.sectionLabel}><strong>{section.title}</strong></p>
              <div>{section.content}</div>
            </section>
          ))}
        </div>


      </main>
    </Website>
  );
}
