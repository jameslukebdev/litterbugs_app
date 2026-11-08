'use client';

import { trackPayoutSetup } from '@/lib/website-analytics';
import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { StripeConnectInstance } from '@stripe/connect-js';

import { notifyDataChanged, useDataRefresh } from '@/lib/use-data-refresh';
import { ModalShell } from '@/components/modal-shell';
import { PayoutPanel, payoutNeedsConfirmation } from '@/components/payout-panel';
import { PayoutPreparing } from '@/components/payout-preparing';

const PayoutEmbedded = dynamic(() => import('@/components/payout-embedded'), {
  loading: () => <PayoutPreparing />,
});

let warming: Promise<unknown> | null = null;
function warmPayoutSetup() {
  // Loading code on intent starts Stripe's SDK early, without creating an account/session.
  warming ??= Promise.all([import('@/lib/payout-connect'), import('@/components/payout-embedded')])
    .catch(() => { warming = null; });
  return warming;
}

/** The payouts-ready celebration plays once per device, the first time setup is seen as finished. */
const CELEBRATED_KEY = 'litterbugs.payouts-ready-celebrated.v1';
function firstPayoutsReady() {
  try {
    if (localStorage.getItem(CELEBRATED_KEY)) return false;
    localStorage.setItem(CELEBRATED_KEY, '1');
    return true;
  } catch { return false; }
}
import {
  createPayoutLink,
  createPayoutSession,
  loadCleanupFeatureFlags,
  loadPayoutStatus,
  type PayoutStatus,
} from '@/lib/funding';

export function PayoutSetupAction({ compact = false, autoOpen = false, onReady, onDismiss }: {
  compact?: boolean; autoOpen?: boolean; onReady?: () => void; onDismiss?: (reason: 'closed' | 'session_ended') => void;
}) {
  const refresh = useDataRefresh();
  // Cleanup entry has just checked the server's status endpoint, including its payments flag.
  // Opening still rechecks status; normal account/settings buttons retain their flag check.
  const [available, setAvailable] = useState(autoOpen);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<PayoutStatus | null>(null);
  const [eligibleConfirmed, setEligibleConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [celebrate, setCelebrate] = useState(false);
  const [connectInstance, setConnectInstance] = useState<StripeConnectInstance | null>(null);
  const requestBusy = useRef(false);
  const opening = useRef(0);
  const lastRefresh = useRef(refresh);
  const observedReady = useRef<boolean | null>(null);
  const observeStatus = useCallback((next: PayoutStatus) => {
    if (next.payoutsEnabled && observedReady.current !== true) trackPayoutSetup(observedReady.current === false ? 'ready' : 'already_ready');
    observedReady.current = next.payoutsEnabled;
  }, []);

  useEffect(() => {
    if (autoOpen) return;
    let cancelled = false;
    void loadCleanupFeatureFlags()
      .then((flags) => {
        if (!cancelled) setAvailable(Boolean(flags.payments_enabled));
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [autoOpen]);

  useEffect(() => () => { opening.current += 1; }, []);

  useEffect(() => {
    if (!autoOpen) return;
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) void show(); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one opening per mounted cleanup entry
  }, [autoOpen]);

  useEffect(() => {
    if (!available || window.location.pathname !== '/account/payments') return;
    // Prepare code while this dedicated screen is idle; never create a payout account/session here.
    if (window.requestIdleCallback) {
      const task = window.requestIdleCallback(() => void warmPayoutSetup(), { timeout: 1500 });
      return () => window.cancelIdleCallback(task);
    }
    const task = window.setTimeout(() => void warmPayoutSetup(), 500);
    return () => window.clearTimeout(task);
  }, [available]);

  useEffect(() => {
    if (lastRefresh.current === refresh) return;
    lastRefresh.current = refresh;
    if (!open) return;
    let cancelled = false;
    void loadPayoutStatus().then(value => { if (!cancelled) { setStatus(value); observeStatus(value); } }).catch(() => { if (!cancelled) { trackPayoutSetup('status_failed'); setMessage('We couldn’t check your payout status. Close this window and open it again to retry.'); } });
    return () => { cancelled = true; };
  }, [open, refresh, observeStatus]);

  // Arriving from the "Finish payout setup" reminder opens the payout screen straight away.
  useEffect(() => {
    if (autoOpen || !available || open) return;
    if (new URLSearchParams(window.location.search).get('payout') !== 'finish') return;
    const url = new URL(window.location.href);
    url.searchParams.delete('payout');
    window.history.replaceState(window.history.state, '', url);
    queueMicrotask(() => void show());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when payouts become available
  }, [available]);

  if (!available) return null;

  async function show() {
    void warmPayoutSetup();
    const version = ++opening.current;
    requestBusy.current = true;
    observedReady.current = null;
    trackPayoutSetup('opened');
    setConnectInstance(null);
    setStatus(null);
    setEligibleConfirmed(false);
    setOpen(true);
    setBusy(true);
    setMessage('');
    let startingForm = false;
    try {
      const next = await loadPayoutStatus();
      if (version !== opening.current) return;
      setStatus(next);
      observeStatus(next);
      if (resumeCleanup(next)) return;
      setCelebrate(next.payoutsEnabled && firstPayoutsReady());
      if (!next.payoutsEnabled && !payoutNeedsConfirmation(next)) {
        startingForm = true;
        await openEmbedded(version);
      }
    } catch (error) {
      if (version !== opening.current) return;
      trackPayoutSetup(startingForm ? 'start_failed' : 'status_failed');
      setMessage(error instanceof Error ? error.message : 'We couldn’t load your payout status. Check your connection and try again.');
    } finally {
      if (version === opening.current) { requestBusy.current = false; setBusy(false); }
    }
  }

  async function openEmbedded(version: number) {
    const { createPayoutConnect, reusePayoutConnect } = await import('@/lib/payout-connect');
    const onInvalidated = () => {
      if (version !== opening.current) return;
      trackPayoutSetup('session_ended'); close('session_ended');
    };
    if (version !== opening.current) return;
    let instance = await reusePayoutConnect(onInvalidated);
    if (!instance) {
      const session = await createPayoutSession();
      if (version !== opening.current) return;
      instance = await createPayoutConnect(session, onInvalidated);
    }
    if (version !== opening.current) return;
    setConnectInstance(instance);
    trackPayoutSetup('form_opened');
  }

  function close(reason: 'closed' | 'session_ended' | null = 'closed') {
    opening.current += 1;
    requestBusy.current = false;
    setOpen(false);
    setBusy(false);
    setConnectInstance(null);
    if (reason) onDismiss?.(reason);
  }

  function resumeCleanup(next: PayoutStatus) {
    if (!onReady || !next.payoutsEnabled || next.onboardingStatus !== 'enabled') return false;
    close(null);
    onReady();
    return true;
  }

  async function continueToStripe(hosted = false) {
    if (!status || busy || requestBusy.current || (payoutNeedsConfirmation(status) && !eligibleConfirmed)) return;
    requestBusy.current = true;
    setBusy(true);
    setMessage('');
    const version = opening.current;
    try {
      if (hosted || status.payoutsEnabled) {
        trackPayoutSetup('hosted_requested');
        const link = await createPayoutLink(status.payoutsEnabled ? 'dashboard' : 'link');
        if (version !== opening.current) return;
        window.location.assign(link.url);
      } else {
        await openEmbedded(version);
      }
    } catch (error) {
      if (version !== opening.current) return;
      trackPayoutSetup('start_failed');
      setMessage(error instanceof Error ? error.message : 'Payout setup didn’t open. Check your connection and try again.');
    } finally {
      if (version === opening.current) { requestBusy.current = false; setBusy(false); }
    }
  }

  async function finishEmbedded() {
    if (requestBusy.current) return;
    requestBusy.current = true;
    setBusy(true);
    setMessage('');
    const version = opening.current;
    try {
      // Exiting the form is not proof of verification. Reconcile the server's Stripe capabilities.
      const next = await loadPayoutStatus();
      if (version !== opening.current) return;
      setStatus(next);
      observeStatus(next);
      if (resumeCleanup(next)) { notifyDataChanged(); return; }
      setCelebrate(next.payoutsEnabled && firstPayoutsReady());
      setConnectInstance(null);
      notifyDataChanged();
    } catch {
      if (version !== opening.current) return;
      trackPayoutSetup('status_failed');
      setMessage('Your details may already be saved with Stripe. We just couldn’t refresh your payout status, so please try again.');
    } finally {
      if (version === opening.current) { requestBusy.current = false; setBusy(false); }
    }
  }

  return (
    <>
      {!autoOpen && <button className={`secondary-button${compact ? ' compact-button' : ''}`} onPointerEnter={() => void warmPayoutSetup()} onFocus={() => void warmPayoutSetup()} onPointerDown={() => void warmPayoutSetup()} onClick={show}>Payout settings</button>}
      {open && (
        <ModalShell onClose={() => { trackPayoutSetup('closed'); close(); }} label="Payout setup" className="payout-dialog flow-page payout-page">
          {!connectInstance && busy ? <PayoutPreparing /> : connectInstance ? <PayoutEmbedded
            key="embedded"
            instance={connectInstance}
            busy={busy}
            message={message}
            onExit={() => void finishEmbedded()}
            onFallback={() => void continueToStripe(true)}
            onBack={() => { trackPayoutSetup('back'); setConnectInstance(null); setMessage(''); }}
          /> : <PayoutPanel
            status={status}
            eligibleConfirmed={eligibleConfirmed}
            onEligible={setEligibleConfirmed}
            busy={busy}
            message={message}
            onContinue={() => void (status ? continueToStripe() : show())}
            onFallback={() => void continueToStripe(true)}
            celebrate={celebrate}
          />}
        </ModalShell>
      )}
    </>
  );
}
