'use client';

import { useState } from 'react';
import { FiCheck, FiLock } from 'react-icons/fi';
import { ANALYTICS_EVENT } from '@/lib/website-analytics';
import styles from './monthly-support.module.css';

export type SupportOption = { amount: number; url: string };

export function MonthlySupport({ options, portalUrl }: { options: SupportOption[]; portalUrl: string }) {
  const [amount, setAmount] = useState(5);
  const selected = options.find((option) => option.amount === amount);
  const ready = Boolean(selected?.url && portalUrl);

  return <div className={styles.support}>
    <fieldset className={styles.amounts}>
      <legend>Choose an amount</legend>
      <div className={styles.options}>
        {options.map((option) => <label key={option.amount} className={styles.option}>
          <input type="radio" name="monthly-support" value={option.amount} checked={amount === option.amount} onChange={() => setAmount(option.amount)} />
          {amount === option.amount && <FiCheck className={styles.check} aria-hidden="true" />}
          <strong>${option.amount}</strong>{' '}<small>/ month</small>
        </label>)}
      </div>
    </fieldset>
    {ready ? <>
      <p className={styles.terms}>You’ll be charged ${amount} USD today, then every month until you cancel. Cancel anytime before your next billing date.</p>
      <a className={styles.checkout} href={selected!.url} onClick={() => window.dispatchEvent(new CustomEvent(ANALYTICS_EVENT, { detail: { event: 'support_checkout_clicked', amount, currency: 'USD', billing_interval: 'month' } }))}>Support with ${amount} / month</a>
      <p className={styles.secure}><FiLock aria-hidden="true" />Secure checkout with Stripe. No Litterbugs account needed.</p>
    </> : <p className={styles.terms} role="status">Monthly support will be available soon. Please check back.</p>}
    {portalUrl && <p className={styles.manage}>Already supporting us? <a href={portalUrl}>Manage or cancel your support</a></p>}
  </div>;
}
