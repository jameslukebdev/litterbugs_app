import type { Metadata } from 'next';
import Link from 'next/link';

import { PublicSiteHeader } from '@/components/public-site-header';
import styles from './about-page.module.css';

export const metadata: Metadata = {
  title: 'How Litterbugs Works',
  description: 'See how neighbors report litter, build cleanup rewards, and verify completed work with Litterbugs.',
};

const steps = [
  {
    number: '01',
    title: 'Report what you see',
    body: 'Add the location, useful details, and photos so neighbors understand what needs attention.',
  },
  {
    number: '02',
    title: 'Rally support',
    body: 'Eligible reports can collect community contributions toward a cleanup reward. The map keeps the status and reward visible.',
  },
  {
    number: '03',
    title: 'Clean and verify',
    body: 'An eligible cleaner can claim the report, follow the safety requirements, and submit before-and-after evidence for review.',
  },
];

const roles = [
  {
    label: 'SPOT IT',
    title: 'Give the community a starting point',
    body: 'Report litter with a precise location and enough detail for someone else to understand the job.',
  },
  {
    label: 'BACK IT',
    title: 'Help make cleanup worth doing',
    body: 'Add to the displayed reward on an eligible report when you want to support the work.',
  },
  {
    label: 'CLEAN IT',
    title: 'Turn a report into a result',
    body: 'Claim eligible work, follow the safety rules, and document the cleanup for review.',
  },
];

export default function AboutPage() {
  return (
    <>
      <PublicSiteHeader activePath="/about" />
      <main className={styles.page}>
        <section className={styles.hero} aria-labelledby="about-title">
          <div className={styles.heroInner}>
            <p className={styles.eyebrow}>HOW LITTERBUGS WORKS</p>
            <h1 id="about-title">A cleaner block starts with one report.</h1>
            <p className={styles.heroCopy}>
              Litterbugs gives neighbors one shared map to flag litter, build a cleanup reward,
              and verify the work when it is done.
            </p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryAction} href="/">
                Explore the map
              </Link>
              <a className={styles.secondaryAction} href="#process">
                See the three steps
              </a>
            </div>
          </div>
        </section>

        <section className={styles.process} id="process" aria-labelledby="process-title">
          <div className={styles.sectionInner}>
            <div className={styles.sectionIntro}>
              <p className={styles.eyebrow}>FROM REPORT TO REWARD</p>
              <h2 id="process-title">Three steps, one shared view</h2>
              <p>
                Everyone can see what has been reported, what support has been added, and what
                still needs to happen.
              </p>
            </div>

            <ol className={styles.stepList}>
              {steps.map((step) => (
                <li className={styles.step} key={step.number}>
                  <span className={styles.stepNumber} aria-hidden="true">{step.number}</span>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className={styles.trust} aria-labelledby="trust-title">
          <div className={`${styles.sectionInner} ${styles.trustGrid}`}>
            <div className={styles.trustLead}>
              <p className={styles.eyebrow}>CLEAR BEFORE YOU COMMIT</p>
              <h2 id="trust-title">Built around clear expectations</h2>
            </div>
            <div className={styles.trustContent}>
              <p>
                Funding terms, safety requirements, evidence review, disputes, refunds, and reward
                rules are written down before anyone participates.
              </p>
              <nav className={styles.policyLinks} aria-label="Participation policies">
                <Link href="/cleanup-policy">Cleanup &amp; reward policy</Link>
                <Link href="/cleanup-safety">Safety &amp; waiver</Link>
                <Link href="/terms">Terms of use</Link>
              </nav>
            </div>
          </div>
        </section>

        <section className={styles.roles} aria-labelledby="roles-title">
          <div className={styles.sectionInner}>
            <div className={styles.sectionIntro}>
              <p className={styles.eyebrow}>HOW YOU CAN HELP</p>
              <h2 id="roles-title">There is more than one way to move a cleanup forward</h2>
            </div>

            <div className={styles.roleGrid}>
              {roles.map((role) => (
                <article className={styles.role} key={role.label}>
                  <p className={styles.roleLabel}>{role.label}</p>
                  <h3>{role.title}</h3>
                  <p>{role.body}</p>
                </article>
              ))}
            </div>
            <p className={styles.fundingNote}>
              Contributions are not charitable donations. See the{' '}
              <Link href="/cleanup-policy">cleanup and reward policy</Link> for the complete rules.
            </p>
          </div>
        </section>

        <section className={styles.finalCta} aria-labelledby="cta-title">
          <div className={styles.finalCtaInner}>
            <div>
              <p className={styles.eyebrow}>START WITH THE MAP</p>
              <h2 id="cta-title">See what your community needs.</h2>
            </div>
            <Link className={styles.lightAction} href="/">
              Open Litterbugs
            </Link>
          </div>
          <p className={styles.contact}>
            Questions? <a href="mailto:support@litterbugs.app">support@litterbugs.app</a>
          </p>
        </section>
      </main>
    </>
  );
}
