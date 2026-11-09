'use client';
import { contributionReturnPath } from '@/lib/community-journey';

import { rememberContributionAttempt, trackParticipation, trackParticipationFailure, trackParticipationExit } from '@/lib/website-analytics';
import { useGuestParticipationEntry } from '@/lib/use-guest-participation-entry';

import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import type { Report } from '@litterbugs/report-contract';
import { useEffect, useMemo, useState } from 'react';

import { observeContributionConfirmation } from '@/lib/observe-contribution';
import { resumeOrCreatePayment } from '@/lib/payment-attempt';
import { PaymentDetail } from '@/components/payment-detail';
import { ModalShell } from '@/components/modal-shell';
import { BrandBug } from '@/components/brand-bug';
import { FlowDone } from '@/components/flow-done';
import { FundingAmountPanel, FundingPayLayout, FundingUnavailablePanel } from '@/components/funding-panel';
import {
  loadContributionQuote,
  type ContributionQuote,
  formatUsd,
  loadCleanupFeatureFlags,
  parseContributionAmount,
  type ContributionIntent,
} from '@/lib/funding';
import { clearFundBeforeCheckout, rememberFundBeforeCheckout } from '@/lib/bug-motion';

function ContributionPaymentForm({
  intent,
  reportId,
  fundedCents,
  reportTitle,
  onComplete,
  onBusyChange,
}: {
  intent: ContributionIntent;
  reportId: string;
  fundedCents: number;
  reportTitle?: string | null;
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
    rememberContributionAttempt(intent.contributionId);
    rememberFundBeforeCheckout(reportId, fundedCents);
    trackParticipation('fund', 'payment_submitted');
    try {
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}${contributionReturnPath(reportId, intent.contributionId, new URLSearchParams(window.location.search).get('returnTo'))}`,
      },
      redirect: 'if_required',
    });
    if (result.error) {
      clearFundBeforeCheckout(reportId);
      trackParticipationFailure('fund', 'payment_submitted', 'payment_rejected');
      setError(result.error.message || 'Payment was not completed.');
      setBusy(false);
      return;
    }
    void observeContributionConfirmation(intent.contributionId);
    await onComplete();
    } catch { trackParticipationFailure('fund', 'payment_submitted', 'payment_confirmation_unavailable'); setError('We couldn’t confirm this payment. Check Payments before trying again.'); }
    finally { setBusy(false); onBusyChange(false); }
  }

  return (
    <form className="funding-payment-form" onSubmit={submit}>
      <FundingPayLayout reportTitle={reportTitle} principalCents={intent.principalAmountCents} feeCents={intent.platformFeeCents} error={error}
        button={<button className="primary-button fund-pay" type="submit" disabled={!stripe || busy}>{busy ? 'Processing…' : `Pay ${formatUsd(intent.totalAmountCents)}`}</button>}>
        <PaymentElement options={{ layout: 'tabs' }} onReady={() => trackParticipation('fund', 'payment_ready')} onLoadError={() => trackParticipationFailure('fund', 'payment_form', 'payment_form_failed')} />
      </FundingPayLayout>
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
  autoOpen = false,
  onDismiss,
  onRefreshFunding,
}: {
  report: Report;
  userId: string | null;
  onRequireSignIn?: () => void;
  onChanged?: () => void | Promise<void>;
  initialAmountCents?: number;
  startOpen?: boolean;
  autoOpen?: boolean;
  onDismiss?: () => void;
  onRefreshFunding?: () => Promise<void>;
}) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [manuallyOpen, setOpen] = useState(startOpen);
  const [dismissed, setDismissed] = useState(false);
  const eligible = report.cleanup_state === 'available'
    && report.funding_eligibility === 'eligible'
    && report.renewal_status === 'active'
    && !report.funding_frozen_at
    && !report.cancelled_at
    && !report.expired_at;
  const open = manuallyOpen || (autoOpen && !dismissed && Boolean(userId) && enabled === true && eligible);
  const [amount, setAmount] = useState(() => initialAmountCents == null ? '25' : (initialAmountCents / 100).toFixed(2));
  const [previousContribution, setPreviousContribution] = useState<string | null>(null);
  const [intent, setIntent] = useState<ContributionIntent | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [paid, setPaid] = useState(false);
  const [quote, setQuote] = useState<ContributionQuote | null>(null);
  const [quoteError, setQuoteError] = useState('');
  const [quoteRetry, setQuoteRetry] = useState(0);
  const principalAmountCents = useMemo(() => parseContributionAmount(amount), [amount]);
  const currentQuote = quote?.principalAmountCents === principalAmountCents ? quote : null;
  const platformFeeCents = currentQuote?.platformFeeCents ?? null;

  const markEntryPrompted = useGuestParticipationEntry({ action: 'fund', reportId: report.id, autoOpen, userId,
    available: enabled === true && eligible && !dismissed, onRequireSignIn });

  useEffect(() => {
    if (!open || !userId || !principalAmountCents || intent) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void loadContributionQuote(principalAmountCents).then(value => { if (!cancelled) { setQuote(value); setQuoteError(''); } }).catch(error => { if (!cancelled) { setQuote(null); setQuoteError(error.message); trackParticipationFailure('fund', 'amount_review', 'payment_quote_failed'); } });
    }, 200);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [open, userId, principalAmountCents, intent, quoteRetry]);
  useEffect(() => {
    if (open && enabled === true && eligible && userId && !previousContribution) {
      trackParticipation('fund', intent ? 'payment_form' : 'amount_review');
    }
  }, [open, enabled, eligible, userId, intent, previousContribution]);
  const publishableKey = intent?.publishableKey;
  const stripe = useMemo(
    () => publishableKey ? loadStripe(publishableKey).then(client => {
      if (!client) trackParticipationFailure('fund', 'payment_form', 'payment_form_failed');
      return client;
    }).catch(() => {
      trackParticipationFailure('fund', 'payment_form', 'payment_form_failed');
      return null;
    }) : null,
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

  if (!startOpen && enabled === null && eligible) return <span className="primary-button compact-button report-action-fund funding-action-pending" role="status" aria-label="Checking funding availability"><BrandBug kind="bee" size={21} className="bug-hop" /><span aria-hidden="true">Fund</span></span>;
  if (!startOpen && (!enabled || !eligible)) {
    return autoOpen && userId ? <p role="status">This cleanup isn’t accepting contributions right now.</p> : null;
  }

  function dismiss() {
    trackParticipationExit('fund', intent ? 'payment_form' : previousContribution ? 'payment_submitted' : 'amount_review', 'cancelled');
    setDismissed(true);
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
    markEntryPrompted();
    trackParticipation('fund', 'action_tapped');
    if (!userId) {
      onRequireSignIn?.();
      return;
    }
    setIntent(null);
    setPreviousContribution(null);
    setMessage('');
    setPaid(false);
    setOpen(true);
  }

  async function continueToPayment() {
    if (!userId || !enabled || !eligible || principalAmountCents == null || busy) return;
    setBusy(true);
    setMessage('');
    try {
      const result = await resumeOrCreatePayment(userId!, report.id, principalAmountCents, currentQuote?.pricingVersion);
      setAmount((result.amount / 100).toFixed(2));
      if (result.contributionId) setPreviousContribution(result.contributionId);
      else { setIntent(result.intent ?? null); if (result.amount !== principalAmountCents) setMessage('Resuming your previous unpaid contribution with its original amount.'); }
    } catch (error) {
      trackParticipationFailure('fund', 'amount_review', 'payment_start_failed');
      setMessage(error instanceof Error ? error.message : 'Payment could not be started.');
      setQuote(null);
      setQuoteRetry(value => value + 1);
    } finally {
      setBusy(false);
    }
  }

  async function complete() {
    setIntent(null);
    setOpen(false);
    setPaid(true);
    setMessage('Payment submitted. Check Payments for confirmation before paying again.');
    await onChanged?.();
    onDismiss?.();
  }

  return (
    <>
      {message && (paid
        ? <FlowDone bug="bee" title="Thank you!">{message}</FlowDone>
        : <span className="cleanup-action-message" role="status">{message}</span>)}
      {!startOpen && <button className="primary-button compact-button report-action-fund" onClick={begin}><BrandBug kind="bee" size={21} className="bug-hop" />Fund</button>}
      {open && (
        <ModalShell onClose={dismiss} label="Add to this cleanup fund" className="funding-dialog flow-page fund-page" closeDisabled={busy}>
          {previousContribution ? <div className="fund-flow"><PaymentDetail contributionId={previousContribution} onOpenReport={() => dismiss()} /></div> : enabled !== true || !eligible ? (
            <FundingUnavailablePanel reportTitle={report.title || 'Litter cleanup'}>
              <p role="status">{enabled === null ? 'Checking funding availability…' : !enabled
                ? 'Your report is saved. Funding is temporarily unavailable. No payment has been made.'
                : report.funding_eligibility === 'pending'
                  ? 'Your report is saved. Its photos are being reviewed before funding opens. No payment has been made.'
                  : 'Your report is saved. Funding is not available yet. Open the report to see its review status. No payment has been made.'}</p>
              <p>Your selected contribution is {formatUsd(initialAmountCents ?? 0)}. You can close this screen and add funds later.</p>
              {message && <p className="form-message error-message" role="alert">{message}</p>}
              <div className="cleaner-buttons">
                {enabled && onRefreshFunding && <button className="secondary-button" disabled={busy} onClick={refreshFunding}>{busy ? 'Checking…' : 'Check funding status'}</button>}
                <button className="primary-button" disabled={busy} onClick={dismiss}>Done</button>
              </div>
            </FundingUnavailablePanel>
          ) : !intent ? (
            <FundingAmountPanel
              reportTitle={report.title || 'Litter cleanup'}
              presets={['5', '25', '50']}
              amount={amount}
              onAmount={value => { setAmount(value); setMessage(''); }}
              principalCents={principalAmountCents}
              feeCents={platformFeeCents}
              quoteStatus={principalAmountCents != null && !currentQuote ? quoteError || 'Checking the current service fee…' : null}
              quoteError={quoteError}
              onRetryQuote={() => setQuoteRetry(value => value + 1)}
              message={message}
              busy={busy}
              onContinue={() => void continueToPayment()}
            />
          ) : stripe ? (
            <Elements stripe={stripe} options={{
              clientSecret: intent.paymentIntentClientSecret,
              appearance: { variables: { colorPrimary: '#5146ed', borderRadius: '14px', fontFamily: 'system-ui, sans-serif' } },
            }}>
              <ContributionPaymentForm intent={intent} reportId={report.id} fundedCents={report.funded_amount_cents} reportTitle={report.title || 'Litter cleanup'} onComplete={complete} onBusyChange={setBusy} />
            </Elements>
          ) : <p className="form-message error-message">Payment could not be loaded.</p>}
        </ModalShell>
      )}
    </>
  );
}
