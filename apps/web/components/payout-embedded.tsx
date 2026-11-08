'use client';
import { trackPayoutSetup } from '@/lib/website-analytics';
import { useEffect, useRef, useState } from 'react';
import type { StripeConnectInstance } from '@stripe/connect-js';
import { ConnectAccountOnboarding, ConnectComponentsProvider } from '@stripe/react-connect-js';
import { payoutConnectAppearance } from '@/lib/payout-connect';
import { PayoutHeading, PayoutProgress } from '@/components/payout-preparing';

export default function PayoutEmbedded({ instance, busy, message, onExit, onFallback, onBack }: {
  instance: StripeConnectInstance; busy: boolean; message: string;
  onExit: () => void; onFallback: () => void; onBack: () => void;
}) {
  const observed = useRef({ loader: false, form: false, error: false });
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  useEffect(() => { instance.update({ appearance: payoutConnectAppearance }); }, [instance]);
  return (
    <div className="payout-flow payout-embedded">
      <PayoutHeading onBack={busy ? undefined : onBack} />
      {message && <p className="form-message error-message" role="alert">{message}</p>}
      {message && <button className="secondary-button" disabled={busy} onClick={onExit}>Check payout status</button>}
      {failed ? <p className="payout-note" role="alert">The secure form couldn&rsquo;t load. You can continue on Stripe and return to Litterbugs afterward.</p> : (
        <div className="payout-connect-stage" aria-busy={loading}>
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
                onLoaderStart={() => { setLoading(false); if (!observed.current.loader) { observed.current.loader = true; trackPayoutSetup('form_loading_started'); } }}
                onStepChange={() => { if (!observed.current.form) { observed.current.form = true; trackPayoutSetup('form_loaded'); } }}
                onLoadError={() => { setLoading(false); setFailed(true); if (!observed.current.error) { observed.current.error = true; trackPayoutSetup('load_failed'); } }}
                onExit={() => { trackPayoutSetup('form_exited'); onExit(); }}
              />
            </ConnectComponentsProvider>
          </div>
        </div>
      )}
      {(failed || message) && <div className="payout-embedded-actions">
        <button className="primary-button payout-go" disabled={busy} onClick={onFallback}>{busy ? 'Checking…' : 'Continue on Stripe'}</button>
      </div>}
    </div>
  );
}
