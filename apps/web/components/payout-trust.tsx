import { FiLock } from 'react-icons/fi';
import styles from './payout-trust.module.css';

/**
 * Says plainly who handles payout details. Wording matches the Privacy Policy: Stripe collects identity
 * and bank details; Litterbugs does not receive or store full bank-account numbers.
 */
export function PayoutTrust({ compact = false }: { compact?: boolean }) {
  return <div className={`${styles.trust}${compact ? ` ${styles.compact}` : ''}`}>
    <FiLock className={styles.icon} aria-hidden="true" />
    <p>
      <strong>Secured by Stripe.</strong>{' '}
      {compact
        ? 'Litterbugs never receives your full bank-account number.'
        : 'Stripe checks your identity and sends your payouts. Litterbugs never receives your full bank-account number.'}
    </p>
  </div>;
}
