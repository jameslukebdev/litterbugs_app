import type { Metadata } from 'next';

import { LegalPage } from '@/components/legal-page';
import {
  CLEANUP_ACKNOWLEDGMENT,
  CLEANUP_ACKNOWLEDGMENT_TITLE,
  CLEANUP_ACKNOWLEDGMENT_VERSION,
  CLEANUP_GUIDELINES_VERSION,
  CLEANUP_RELEASE,
  CLEANUP_SAFETY_GUIDELINES,
} from '@/lib/cleanup-safety-document';

import styles from './cleanup-safety.module.css';

export const metadata: Metadata = {
  title: 'Cleanup Safety & Waiver | Litterbugs',
  description: 'The safety rules, acknowledgment, assumption of risk, and release shown before a Litterbugs cleanup claim.',
};

export default function CleanupSafetyPage() {
  return (
    <LegalPage
      activePath="/cleanup-safety"
      eyebrow="CLEANUP SAFETY & RELEASE"
      title="Safety and cleanup acknowledgment"
      summary="A public reference copy of the safety rules, assumption of risk, release, and funded reward acknowledgment shown before a cleanup claim."
      effectiveDate="August 27, 2026"
      sections={[
        {
          title: 'Before every cleanup claim',
          content: <>
            <p className={styles.notice}>
              Viewing this page does not claim a cleanup or record acceptance. Before every claim,
              the Litterbugs app presents the active text and requires a separate, unchecked affirmative
              checkbox. The acceptance record identifies the exact versions accepted for that claim.
            </p>
            <div className={styles.versions} aria-label="Published cleanup document versions">
              <div><span>Acknowledgment version</span><strong>{CLEANUP_ACKNOWLEDGMENT_VERSION}</strong></div>
              <div><span>Safety version</span><strong>{CLEANUP_GUIDELINES_VERSION}</strong></div>
            </div>
          </>,
        },
        {
          title: CLEANUP_ACKNOWLEDGMENT_TITLE,
          content: <p className={styles.documentText}>{CLEANUP_ACKNOWLEDGMENT}</p>,
        },
        {
          title: 'Cleanup safety guidelines',
          content: <p className={styles.documentText}>{CLEANUP_SAFETY_GUIDELINES}</p>,
        },
        {
          title: 'Assumption of risk and release',
          content: <p className={`${styles.documentText} ${styles.release}`}>{CLEANUP_RELEASE}</p>,
        },
        {
          title: 'Related documents',
          content: <p>
            The Terms of Use, Privacy Policy, and Cleanup and Reward Policy also apply. The in-app
            claim flow remains the authoritative place to accept the active acknowledgment for a specific cleanup.
          </p>,
        },
      ]}
    />
  );
}
