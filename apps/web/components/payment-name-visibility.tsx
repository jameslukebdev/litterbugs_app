'use client';

import { FiEye, FiEyeOff } from 'react-icons/fi';
import styles from './contribution-supporters.module.css';

export function PaymentNameVisibility({ shown, busy, error, onChange, heading = 'h3' }: {
  shown: boolean;
  busy: boolean;
  error?: string;
  onChange: (shown: boolean) => void;
  heading?: 'h2' | 'h3';
}) {
  const Heading = heading;
  const Icon = shown ? FiEye : FiEyeOff;
  return <div className={styles.paymentName}>
    <div className={styles.paymentNameRow}>
      <span className={styles.privacyIcon} aria-hidden="true"><Icon /></span>
      <div className={styles.privacyCopy}>
        <Heading>Donation privacy</Heading>
        <p role="status" aria-atomic="true">{shown ? 'Your name is shown.' : 'You’re listed as Anonymous.'}</p>
      </div>
      <button type="button" className={`secondary-button ${styles.privacyButton}`} disabled={busy} onClick={() => onChange(!shown)}>
        {busy ? 'Saving…' : shown ? 'Hide my name' : 'Show my name'}
      </button>
    </div>
    {error && <p className={styles.privacyError} role="alert">{error}</p>}
  </div>;
}
