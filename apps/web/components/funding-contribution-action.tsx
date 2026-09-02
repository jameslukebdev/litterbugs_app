'use client';

import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import type { Report } from '@litterbugs/report-contract';
import { useEffect, useMemo, useState } from 'react';

import { ModalShell } from '@/components/modal-shell';
import {
  calculatePlatformFee,
  createCleanupContribution,
  formatUsd,
  loadCleanupFeatureFlags,
  parseContributionAmount,
  type ContributionIntent,
} from '@/lib/funding';

function ContributionPaymentForm({
  intent,
  reportId,
  onComplete,
}: {
  intent: ContributionIntent;
  reportId: string;
  onComplete: () => void | Promise<void>;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!stripe || !elements || busy) return;
    setBusy(true);
    setError('');
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-return?report=${encodeURIComponent(reportId)}`,
      },
      redirect: 'if_required',
    });
    if (result.error) {
      setError(result.error.message || 'Payment was not completed.');
      setBusy(false);
      return;
    }
    await onComplete();
  }

  return (
    <form className="funding-payment-form" onSubmit={submit}>
      <PaymentElement options={{ layout: 'tabs' }} />
      {error && <p className="form-message error-message" role="alert">{error}</p>}
      <button className="primary-button" type="submit" disabled={!stripe || busy}>
        {busy ? 'Processing…' : `Pay ${formatUsd(intent.totalAmountCents)}`}
      </button>
    </form>
  );
}

export function FundingContributionAction({
  report,
  userId,
  onRequireSignIn,
  onChanged,
}: {
  report: Report;
  userId: string | null;
  onRequireSignIn?: () => void;
  onChanged?: () => void | Promise<void>;
}) {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('25');
  const [intent, setIntent] = useState<ContributionIntent | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const principalAmountCents = useMemo(() => parseContributionAmount(amount), [amount]);
  const platformFeeCents = principalAmountCents == null
    ? null
    : calculatePlatformFee(principalAmountCents);
  const publishableKey = intent?.publishableKey;
  const stripe = useMemo(
    () => publishableKey ? loadStripe(publishableKey) : null,
    [publishableKey],
  );

  useEffect(() => {
    let cancelled = false;
    void loadCleanupFeatureFlags()
      .then((flags) => {
        if (!cancelled) {
          setEnabled(Boolean(flags.payments_enabled && flags.gemini_financial_review_enabled));
        }
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  if (
    !enabled
    || report.cleanup_state === 'completed'
    || report.cleanup_state === 'claimed'
    || report.funding_eligibility !== 'eligible'
    || report.funding_frozen_at
  ) return null;

  function begin() {
    if (!userId) {
      onRequireSignIn?.();
      return;
    }
    setIntent(null);
    setMessage('');
    setOpen(true);
  }

  async function continueToPayment() {
    if (principalAmountCents == null || busy) return;
    setBusy(true);
    setMessage('');
    try {
      setIntent(await createCleanupContribution(report.id, principalAmountCents));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Payment could not be started.');
    } finally {
      setBusy(false);
    }
  }

  async function complete() {
    setIntent(null);
    setOpen(false);
    setMessage('Contribution received. The reward will update after Stripe confirms it.');
    await onChanged?.();
  }

  return (
    <>
      {message && <span className="cleanup-action-message" role="status">{message}</span>}
      <button className="primary-button compact-button" onClick={begin}>{userId ? 'Add funds' : 'Sign in to fund'}</button>
      {open && (
        <ModalShell onClose={() => setOpen(false)} label="Add money to this cleanup reward" className="funding-dialog" closeDisabled={busy}>
          <h2>{intent ? 'Secure payment' : 'Add to the cleanup reward'}</h2>
          <p className="funding-dialog-report">{report.title || 'Litter cleanup'}</p>
          {!intent ? (
            <>
              <label className="funding-amount-label">Contribution amount
                <span className="funding-amount-input"><b>$</b><input value={amount} onChange={(event) => { setAmount(event.target.value); setMessage(''); }} inputMode="decimal" aria-label="Cleanup fund contribution amount" /></span>
                <small>Minimum $5 · Maximum $5,000</small>
              </label>
              {principalAmountCents != null && platformFeeCents != null && (
                <dl className="funding-summary">
                  <div><dt>Cleaner reward</dt><dd>{formatUsd(principalAmountCents)}</dd></div>
                  <div><dt>Litterbugs fee (10%)</dt><dd>{formatUsd(platformFeeCents)}</dd></div>
                  <div><dt>Total</dt><dd>{formatUsd(principalAmountCents + platformFeeCents)}</dd></div>
                </dl>
              )}
              <p className="funding-refund-note">If this report closes before payout, your full charge—including the fee—is refunded.</p>
              {message && <p className="form-message error-message" role="alert">{message}</p>}
              <button className="primary-button funding-continue" onClick={continueToPayment} disabled={principalAmountCents == null || busy}>{busy ? 'Opening payment…' : 'Continue'}</button>
            </>
          ) : stripe ? (
            <Elements stripe={stripe} options={{
              clientSecret: intent.paymentIntentClientSecret,
              appearance: { variables: { colorPrimary: '#2f7d32', borderRadius: '12px' } },
            }}>
              <ContributionPaymentForm intent={intent} reportId={report.id} onComplete={complete} />
            </Elements>
          ) : <p className="form-message error-message">Payment could not be loaded.</p>}
        </ModalShell>
      )}
    </>
  );
}
