'use client';
import { trackPayoutSetup } from '@/lib/website-analytics';
import { useEffect, useRef, useState } from 'react';
import type { StripeConnectInstance } from '@stripe/connect-js';
import { ConnectAccountManagement, ConnectAccountOnboarding, ConnectComponentsProvider } from '@stripe/react-connect-js';
import { payoutConnectAppearance, payoutDashboardAppearance } from '@/lib/payout-connect';
import { PayoutHeading, PayoutProgress } from '@/components/payout-preparing';
import { PayoutTrust } from '@/components/payout-trust';

export default function PayoutEmbedded({ instance, busy, openingStripe = false, message, onExit, onFallback, onBack, manage = false, inline = false }: {
  instance: StripeConnectInstance; busy: boolean; openingStripe?: boolean; message: string;
  onExit: () => void; onFallback: () => void; onBack: () => void;
  manage?: boolean;
  /** Opened on the page under its own button: no repeated title or Back, just Stripe's form. */
  inline?: boolean;
}) {
  const observed = useRef({ loader: false, form: false, error: false });
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  useEffect(() => { instance.update({ appearance: manage ? payoutDashboardAppearance : payoutConnectAppearance }); }, [instance, manage]);

  function startLoadingForm() {
    setLoading(false);
    if (!observed.current.loader) {
      observed.current.loader = true;
      trackPayoutSetup('form_loading_started');
    }
  }

  function failToLoadForm() {
    setLoading(false);
    setFailed(true);
    if (!observed.current.error) {
      observed.current.error = true;
      trackPayoutSetup('load_failed');
    }
  }

  return (
    <div className="payout-flow payout-embedded">
      {manage ? (
        <div>
          <h3>Bank details</h3>
          {!failed && <p className="payout-lead">You’re signed in to Litterbugs. Stripe verifies it’s you before showing your bank details.</p>}
        </div>
      ) : inline ? <PayoutTrust compact /> : <PayoutHeading onBack={onBack} backDisabled={busy} />}
      {message && <p className="form-message error-message" role="alert">{message}</p>}
      {message && <button className="secondary-button" disabled={busy} onClick={onExit}>Check payout status</button>}
      {failed ? <p className="payout-note" role="alert">The secure form couldn&rsquo;t load. You can continue on Stripe and return to Litterbugs afterward.</p> : (
        <div className="payout-connect-stage" aria-busy={loading}>
          {loading && <PayoutProgress />}
          <div className="payout-connect-form">
            <ConnectComponentsProvider connectInstance={instance}>
              {manage ? (
                <ConnectAccountManagement onLoaderStart={startLoadingForm} onLoadError={failToLoadForm} />
              ) : <ConnectAccountOnboarding
                key="cleanup-participant-details"
                collectionOptions={{ fields: 'currently_due', futureRequirements: 'omit', requirements: {
                  // Stripe documents v1 and v2 requirement names. The server ensures missing
                  // activity and entity type are supplied. Collect only what Stripe requires now;
                  // never exclude name, address, DOB, tax/ID details, bank accounts or terms.
                  exclude: ['business_profile.product_description', 'defaults.profile.product_description', 'business_type', 'identity.entity_type'],
                } }}
                onLoaderStart={startLoadingForm}
                onStepChange={() => { if (!observed.current.form) { observed.current.form = true; trackPayoutSetup('form_loaded'); } }}
                onLoadError={failToLoadForm}
                onExit={() => { trackPayoutSetup('form_exited'); onExit(); }}
              />}
            </ConnectComponentsProvider>
          </div>
        </div>
      )}
      {(failed || message) && <div className="payout-embedded-actions">
        <button className="primary-button payout-go" disabled={busy} onClick={onFallback}>{openingStripe ? 'Opening Stripe…' : 'Continue on Stripe'}</button>
      </div>}
    </div>
  );
}
