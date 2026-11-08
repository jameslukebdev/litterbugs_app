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
  showContents = false,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  effectiveDate: string;
  sections: LegalSection[];
  activePath: PublicPath;
  /** Long documents: list the sections at the top as jump links. */
  showContents?: boolean;
}) {
  const anchor = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return (
    <Website activePath={activePath}>
      <main id="main-content" tabIndex={-1} className={styles.page}>
        <header className={styles.header}>
          <h1>{title}</h1>
          <p className={styles.summary}>{summary}</p>
          <p className={styles.effective}>Effective {effectiveDate}</p>
        </header>

        {showContents && <nav className={styles.contents} aria-label="On this page">
          <p>On this page</p>
          <ol>{sections.map((section) => <li key={section.title}><a href={`#${anchor(section.title)}`}>{section.title}</a></li>)}</ol>
        </nav>}

        <div className={styles.content}>
          {sections.map((section) => (
            <section key={section.title} id={showContents ? anchor(section.title) : undefined} className={styles.section}>
              <p className={styles.sectionLabel}><strong>{section.title}</strong></p>
              <div>{section.content}</div>
            </section>
          ))}
        </div>


      </main>
    </Website>
  );
}
