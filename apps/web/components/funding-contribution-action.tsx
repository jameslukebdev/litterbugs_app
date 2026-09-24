'use client';

import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import type { Report } from '@litterbugs/report-contract';
import { useEffect, useMemo, useState } from 'react';

import { resumeOrCreatePayment } from '@/lib/payment-attempt';
import { PaymentDetail } from '@/components/payment-detail';
import { ModalShell } from '@/components/modal-shell';
import {
  calculatePlatformFee,
  formatUsd,
  loadCleanupFeatureFlags,
  parseContributionAmount,
  type ContributionIntent,
} from '@/lib/funding';

function ContributionPaymentForm({
  intent,
  reportId,
  onComplete,
  onBusyChange,
}: {
  intent: ContributionIntent;
  reportId: string;
  onComplete: () => void | Promise<void>;
  onBusyChange: (busy: boolean) => void;
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
    onBusyChange(true);
    try {
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-return?report=${encodeURIComponent(reportId)}&contribution=${encodeURIComponent(intent.contributionId)}`,
      },
      redirect: 'if_required',
    });
    if (result.error) {
      setError(result.error.message || 'Payment was not completed.');
      setBusy(false);
      return;
    }
    await onComplete();
    } catch { setError('We couldn’t confirm this payment. Check Payments before trying again.'); }
    finally { setBusy(false); onBusyChange(false); }
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
  initialAmountCents,
  startOpen = false,
  onDismiss,
  onRefreshFunding,
}: {
  report: Report;
  userId: string | null;
  onRequireSignIn?: () => void;
  onChanged?: () => void | Promise<void>;
  initialAmountCents?: number;
  startOpen?: boolean;
  onDismiss?: () => void;
  onRefreshFunding?: () => Promise<void>;
}) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [open, setOpen] = useState(startOpen);
  const [amount, setAmount] = useState(() => initialAmountCents == null ? '25' : (initialAmountCents / 100).toFixed(2));
  const [previousContribution, setPreviousContribution] = useState<string | null>(null);
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
      .catch(() => { if (!cancelled) setEnabled(false); });
    return () => { cancelled = true; };
  }, []);

  const eligible = report.cleanup_state === 'available'
    && report.funding_eligibility === 'eligible'
    && report.renewal_status === 'active'
    && !report.funding_frozen_at
    && !report.cancelled_at
    && !report.expired_at;
  if (!startOpen && (!enabled || !eligible)) return null;

  function dismiss() {
    setOpen(false);
    onDismiss?.();
  }

  async function refreshFunding() {
    if (!onRefreshFunding || busy) return;
    setBusy(true);
    setMessage('');
    try { await onRefreshFunding(); }
    catch { setMessage('The review could not be refreshed. Your report is saved; you can add funds later.'); }
    finally { setBusy(false); }
  }

  function begin() {
    if (!userId) {
      onRequireSignIn?.();
      return;
    }
    setIntent(null);
    setPreviousContribution(null);
    setMessage('');
    setOpen(true);
  }

  async function continueToPayment() {
    if (!userId || !enabled || !eligible || principalAmountCents == null || busy) return;
    setBusy(true);
    setMessage('');
    try {
      const result = await resumeOrCreatePayment(userId!, report.id, principalAmountCents);
      setAmount((result.amount / 100).toFixed(2));
      if (result.contributionId) setPreviousContribution(result.contributionId);
      else { setIntent(result.intent ?? null); if (result.amount !== principalAmountCents) setMessage('Resuming your previous unpaid contribution with its original amount.'); }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Payment could not be started.');
    } finally {
      setBusy(false);
    }
  }

  async function complete() {
    setIntent(null);
    setOpen(false);
    setMessage('Payment submitted. Check Payments for confirmation before paying again.');
    await onChanged?.();
    onDismiss?.();
  }

  return (
    <>
      {message && <span className="cleanup-action-message" role="status">{message}</span>}
      {!startOpen && <button className="primary-button compact-button" onClick={begin}>{userId ? 'Add funds' : 'Sign in to fund'}</button>}
      {open && (
        <ModalShell onClose={dismiss} label="Add money to this cleanup reward" className="funding-dialog" closeDisabled={busy}>
          <h2>{intent ? 'Secure payment' : 'Add to the cleanup reward'}</h2>
          <p className="funding-dialog-report">{report.title || 'Litter cleanup'}</p>
          {previousContribution ? <PaymentDetail contributionId={previousContribution} onOpenReport={() => dismiss()} /> : enabled !== true || !eligible ? <>
            <p role="status">{enabled === null ? 'Checking funding availability…' : !enabled
              ? 'Your report is saved. Funding is temporarily unavailable. No payment has been made.'
              : report.funding_eligibility === 'pending'
                ? 'Your report is saved. Its photos are being reviewed before funding opens. No payment has been made.'
                : 'Your report is saved. Funding is not available yet. Open the report to see its review status. No payment has been made.'}</p>
            <p>Your selected contribution is {formatUsd(initialAmountCents ?? 0)}. You can close this screen and add funds later.</p>
            {message && <p className="form-message error-message" role="alert">{message}</p>}
            {enabled && onRefreshFunding && <button className="secondary-button" disabled={busy} onClick={refreshFunding}>{busy ? 'Checking…' : 'Check funding status'}</button>}
            <button className="primary-button" disabled={busy} onClick={dismiss}>Done</button>
          </> : !intent ? (
            <>
              <div className="funding-amount-presets" aria-label="Suggested contribution amounts">{['5', '25', '50'].map(preset => <button key={preset} className="secondary-button" aria-pressed={principalAmountCents === Number(preset) * 100} onClick={() => setAmount(preset)}>${preset}</button>)}</div>
              <label className="funding-amount-label">Contribution amount
                <span className="funding-amount-input"><b>$</b><input value={amount} onChange={(event) => { setAmount(event.target.value); setMessage(''); }} inputMode="decimal" aria-label="Cleanup fund contribution amount" /></span>
                <small>Minimum $1 · Maximum $1,000</small>
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
              <ContributionPaymentForm intent={intent} reportId={report.id} onComplete={complete} onBusyChange={setBusy} />
            </Elements>
          ) : <p className="form-message error-message">Payment could not be loaded.</p>}
        </ModalShell>
      )}
    </>
  );
}
