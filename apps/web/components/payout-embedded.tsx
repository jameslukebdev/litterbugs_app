'use client';
/* eslint-disable @next/next/no-img-element -- existing decorative payout family artwork. */
import { useState } from 'react';
import type { StripeConnectInstance } from '@stripe/connect-js';
import { ConnectAccountOnboarding, ConnectComponentsProvider } from '@stripe/react-connect-js';

export default function PayoutEmbedded({ instance, busy, message, onExit, onFallback, onBack }: {
  instance: StripeConnectInstance; busy: boolean; message: string;
  onExit: () => void; onFallback: () => void; onBack: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  return (
    <div className="payout-flow payout-embedded">
      <header className="payout-head">
        <img src="/brand/ranks/caterpillar.svg" alt="" aria-hidden="true" width={42} height={42} />
        <h2>Set up your payouts</h2>
      </header>
      <p className="payout-lead">Get paid for approved cleanups. Stripe securely collects your identity and bank details here on Litterbugs.</p>
      {message && <p className="form-message error-message" role="alert">{message}</p>}
      {failed ? <p className="payout-note" role="alert">The secure form couldn&rsquo;t load. You can continue on Stripe and return to Litterbugs afterward.</p> : (
        <>
          {loading && <p className="payout-lead" role="status">Loading your secure payout form…</p>}
          <div className="payout-connect-form">
            <ConnectComponentsProvider connectInstance={instance}>
              <ConnectAccountOnboarding
                collectionOptions={{ fields: 'currently_due', futureRequirements: 'omit' }}
                onLoaderStart={() => setLoading(false)}
                onLoadError={() => { setLoading(false); setFailed(true); }}
                onExit={onExit}
              />
            </ConnectComponentsProvider>
          </div>
        </>
      )}
      <p className="payout-stripe-note">Stripe may open a sign-in window to verify it&rsquo;s you.</p>
      <div className="payout-embedded-actions">
        <button className="secondary-button" disabled={busy} onClick={onBack}>Back</button>
        <button className={failed ? 'primary-button payout-go' : 'text-button'} disabled={busy} onClick={onFallback}>{busy ? 'Checking…' : 'Continue on Stripe'}</button>
      </div>
    </div>
  );
}
