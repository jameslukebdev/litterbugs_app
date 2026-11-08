'use client';
/* eslint-disable @next/next/no-img-element -- existing decorative payout family artwork. */
import { useEffect, useState } from 'react';
import type { StripeConnectInstance } from '@stripe/connect-js';
import { ConnectAccountOnboarding, ConnectComponentsProvider } from '@stripe/react-connect-js';
import { payoutConnectAppearance } from '@/lib/payout-connect';
import { PayoutProgress } from '@/components/payout-preparing';

export default function PayoutEmbedded({ instance, busy, message, onExit, onFallback, onBack }: {
  instance: StripeConnectInstance; busy: boolean; message: string;
  onExit: () => void; onFallback: () => void; onBack: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  useEffect(() => { instance.update({ appearance: payoutConnectAppearance }); }, [instance]);
  return (
    <div className="payout-flow payout-embedded">
      <header className="payout-head">
        <img src="/brand/ranks/caterpillar.svg" alt="" aria-hidden="true" width={42} height={42} />
        <h2>Set up your payouts</h2>
      </header>
      <p className="payout-lead">Verify your legal name, add your bank account, then review and accept Stripe&rsquo;s terms to receive cleanup payouts.</p>
      {message && <p className="form-message error-message" role="alert">{message}</p>}
      {message && <button className="secondary-button" disabled={busy} onClick={onExit}>Check payout status</button>}
      {failed ? <p className="payout-note" role="alert">The secure form couldn&rsquo;t load. You can continue on Stripe and return to Litterbugs afterward.</p> : (
        <>
          {loading && <PayoutProgress />}
          <div className="payout-connect-form">
            <ConnectComponentsProvider connectInstance={instance}>
              <ConnectAccountOnboarding
                key="cleanup-participant-details"
                collectionOptions={{ fields: 'currently_due', futureRequirements: 'omit', requirements: {
                  // Stripe documents v1 and v2 requirement names. The server ensures missing
                  // activity and entity type are supplied. Collect only what Stripe requires now;
                  // never exclude name, address, DOB, tax/ID details, bank accounts or terms.
                  exclude: ['business_profile.product_description', 'defaults.profile.product_description', 'business_type', 'identity.entity_type'],
                } }}
                onLoaderStart={() => setLoading(false)}
                onLoadError={() => { setLoading(false); setFailed(true); }}
                onExit={onExit}
              />
            </ConnectComponentsProvider>
          </div>
        </>
      )}
      {(failed || message) && <div className="payout-embedded-actions">
        <button className="secondary-button" disabled={busy} onClick={onBack}>Back</button>
        <button className="primary-button payout-go" disabled={busy} onClick={onFallback}>{busy ? 'Checking…' : 'Continue on Stripe'}</button>
      </div>}
    </div>
  );
}
