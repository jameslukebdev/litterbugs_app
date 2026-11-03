'use client';

import { useState } from 'react';
import styles from './monthly-support.module.css';

export type SupportOption = { amount: number; url: string };

export function MonthlySupport({ options, portalUrl }: { options: SupportOption[]; portalUrl: string }) {
  const [amount, setAmount] = useState(5);
  const selected = options.find((option) => option.amount === amount);
  const ready = Boolean(selected?.url && portalUrl);

  return <div className={styles.support}>
    <fieldset className={styles.amounts}>
      <legend>Choose your monthly support</legend>
      <div className={styles.options}>
        {options.map((option) => <label key={option.amount}>
          <input type="radio" name="monthly-support" value={option.amount} checked={amount === option.amount} onChange={() => setAmount(option.amount)} />
          <span>${option.amount}{' '}<small>/ month</small></span>
        </label>)}
      </div>
    </fieldset>
    <p className={styles.details}>USD. Charged today and every month until you cancel. Cancel before your next billing date to stop future charges.</p>
    {ready ? <a className={styles.checkout} href={selected!.url}>Support with ${amount} / month</a> : <p role="status">Monthly support will be available soon. Please check back.</p>}
    {ready && <p className={styles.details}>Secure checkout with Stripe. No Litterbugs account needed.</p>}
    {portalUrl && <p className={styles.manage}>Already supporting us? <a href={portalUrl}>Manage or cancel your support</a>.</p>}
  </div>;
}
