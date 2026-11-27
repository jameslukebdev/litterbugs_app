'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { StripeConnectInstance } from '@stripe/connect-js';
import { ConnectComponentsProvider, ConnectNotificationBanner, ConnectPayouts } from '@stripe/react-connect-js';
import { createPayoutSession } from '@/lib/funding';
import { payoutDashboardAppearance } from '@/lib/payout-connect';
import { PayoutProgress } from '@/components/payout-preparing';
import styles from './account-payouts.module.css';

/**
 * The cleaner's balance, payouts and bank, shown inside Litterbugs with Stripe's embedded
 * components so there is no second (Stripe Express) dashboard to learn.
 */
export default function PayoutDashboard() {
  const [instance, setInstance] = useState<StripeConnectInstance | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const attempt = useRef(0);

  const open = useCallback(async () => {
    const version = ++attempt.current;
    setFailed(false);
    setLoading(true);
    try {
      const { createPayoutConnect, reusePayoutConnect } = await import('@/lib/payout-connect');
      const onEnded = () => { if (version === attempt.current) { setInstance(null); setFailed(true); } };
      let next = await reusePayoutConnect(onEnded, 'manage');
      if (!next) next = await createPayoutConnect(await createPayoutSession('manage'), onEnded, 'manage');
      if (version === attempt.current) setInstance(next);
    } catch {
      if (version === attempt.current) { setLoading(false); setFailed(true); }
    }
  }, []);

  useEffect(() => {
    const attempts = attempt;
    queueMicrotask(() => void open());
    return () => { attempts.current++; };
  }, [open]);

  useEffect(() => { instance?.update({ appearance: payoutDashboardAppearance }); }, [instance]);

  if (failed) {
    return <div className={styles.dashboardError}>
      <p role="alert">Your payouts couldn’t load.</p>
      <button type="button" className="secondary-button" onClick={() => void open()}>Try again</button>
    </div>;
  }

  return (
    <div className={styles.dashboard} aria-busy={loading}>
      {loading && <PayoutProgress />}
      {instance && <ConnectComponentsProvider connectInstance={instance}>
        <ConnectNotificationBanner />
        <ConnectPayouts onLoaderStart={() => setLoading(false)} onLoadError={() => { setLoading(false); setFailed(true); }} />
      </ConnectComponentsProvider>}
    </div>
  );
}
