'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { PayoutSetupAction } from './payout-setup-action';
import { PayoutProgress } from './payout-preparing';
import styles from './account-payouts.module.css';

const PayoutDashboard = dynamic(() => import('./payout-dashboard'), { ssr: false, loading: () => <PayoutProgress /> });

/**
 * Payouts are Stripe only, and everything stays inside Litterbugs. A first-time cleaner confirms
 * eligibility and taps one button; Stripe's form opens right here. Once a bank is connected, Stripe's
 * embedded payouts view (balance, payouts, bank) appears here instead of a separate Stripe dashboard.
 */
export function AccountPayouts({ bankReady, setup, onBankSettingsClosed }: {
  bankReady: boolean | null;
  setup?: { started: boolean; ageConfirmed: boolean };
  onBankSettingsClosed: () => void;
}) {
  const [eligible, setEligible] = useState(false);
  const confirmed = Boolean(setup?.ageConfirmed) || eligible;
  const unfinished = bankReady === false && Boolean(setup?.started);
  const status = bankReady ? 'Bank connected through Stripe'
    : unfinished ? 'Bank setup not finished'
      : bankReady === false ? 'No bank connected' : 'Couldn’t check your bank';

  return (
    <section className={`member-panel ${styles.getPaid}`} aria-labelledby="account-payouts-heading">
      <div>
        <h2 id="account-payouts-heading">Payouts</h2>
        <p className={styles.bankStatus} data-ready={bankReady === true} role="status">{status}</p>
      </div>
      {bankReady ? <PayoutDashboard /> : <div className={styles.setupRow}>
        {bankReady === false && !setup?.ageConfirmed && <label className={styles.eligibility}>
          <input type="checkbox" checked={eligible} onChange={event => setEligible(event.target.checked)} />
          <span>I’m at least 18 and eligible to receive payouts in the United States.</span>
        </label>}
        <PayoutSetupAction
          buttonLabel={bankReady === null ? 'Payout settings' : unfinished ? 'Finish bank setup' : 'Add bank with Stripe'}
          primary={bankReady === false} confirmed={bankReady === false && confirmed}
          disabled={bankReady === false && !confirmed} inlineClassName={styles.bankSetupPanel}
          onReady={onBankSettingsClosed} onDismiss={onBankSettingsClosed} />
      </div>}
    </section>
  );
}
