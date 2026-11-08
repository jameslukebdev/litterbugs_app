'use client';
/* eslint-disable @next/next/no-img-element -- existing decorative payout family artwork. */
import { useEffect, useState } from 'react';
import type { StripeConnectInstance } from '@stripe/connect-js';
import { ConnectAccountOnboarding, ConnectComponentsProvider } from '@stripe/react-connect-js';
import { payoutConnectAppearance } from '@/lib/payout-connect';

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
      <p className="payout-lead">Stripe verifies your legal name and sends your cleanup payouts to your bank account. It may also need your address or ID.</p>
      {message && <p className="form-message error-message" role="alert">{message}</p>}
      {message && <button className="secondary-button" disabled={busy} onClick={onExit}>Check payout status</button>}
      {failed ? <p className="payout-note" role="alert">The secure form couldn&rsquo;t load. You can continue on Stripe and return to Litterbugs afterward.</p> : (
        <>
          {loading && <p className="payout-lead" role="status">Loading your secure payout form…</p>}
          <div className="payout-connect-form">
            <ConnectComponentsProvider connectInstance={instance}>
              <ConnectAccountOnboarding
                key="cleanup-participant-details"
                collectionOptions={{ fields: 'currently_due', futureRequirements: 'omit', requirements: {
                  // Stripe documents v1 and v2 requirement names. The server ensures missing
                  // activity and entity type are supplied; keep personal identity, bank and terms collection intact.
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
