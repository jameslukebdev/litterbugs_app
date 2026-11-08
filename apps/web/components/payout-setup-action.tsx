'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { StripeConnectInstance } from '@stripe/connect-js';

import { notifyDataChanged, useDataRefresh } from '@/lib/use-data-refresh';
import { ModalShell } from '@/components/modal-shell';
import { PayoutPanel, payoutNeedsConfirmation } from '@/components/payout-panel';
import { PayoutPreparing } from '@/components/payout-preparing';

const PayoutEmbedded = dynamic(() => import('@/components/payout-embedded'), {
  loading: () => <PayoutPreparing />,
});

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

export function PayoutSetupAction({ compact = false }: { compact?: boolean }) {
  const refresh = useDataRefresh();
  const [available, setAvailable] = useState(false);
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

  useEffect(() => {
    let cancelled = false;
    void loadCleanupFeatureFlags()
      .then((flags) => {
        if (!cancelled) setAvailable(Boolean(flags.payments_enabled));
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (lastRefresh.current === refresh) return;
    lastRefresh.current = refresh;
    if (!open) return;
    let cancelled = false;
    void loadPayoutStatus().then(value => { if (!cancelled) { setStatus(value); } }).catch(() => { if (!cancelled) { setMessage('Payout status could not be refreshed. Reopen this window to retry.'); } });
    return () => { cancelled = true; };
  }, [open, refresh]);

  // Arriving from the "Finish payout setup" reminder opens the payout screen straight away.
  useEffect(() => {
    if (!available || open) return;
    if (new URLSearchParams(window.location.search).get('payout') !== 'finish') return;
    const url = new URL(window.location.href);
    url.searchParams.delete('payout');
    window.history.replaceState(window.history.state, '', url);
    queueMicrotask(() => void show());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when payouts become available
  }, [available]);

  if (!available) return null;

  async function show() {
    const version = ++opening.current;
    requestBusy.current = true;
    setConnectInstance(null);
    setStatus(null);
    setEligibleConfirmed(false);
    setOpen(true);
    setBusy(true);
    setMessage('');
    try {
      const next = await loadPayoutStatus();
      if (version !== opening.current) return;
      setStatus(next);
      setCelebrate(next.payoutsEnabled && firstPayoutsReady());
      if (!next.payoutsEnabled && !payoutNeedsConfirmation(next)) {
        await openEmbedded(version);
      }
    } catch (error) {
      if (version !== opening.current) return;
      setMessage(error instanceof Error ? error.message : 'Payout status could not be loaded.');
    } finally {
      if (version === opening.current) { requestBusy.current = false; setBusy(false); }
    }
  }

  async function openEmbedded(version: number) {
    const [session, { createPayoutConnect }] = await Promise.all([
      createPayoutSession(), import('@/lib/payout-connect'),
    ]);
    if (version !== opening.current) return;
    const instance = await createPayoutConnect(session, () => {
      if (version !== opening.current) return;
      close();
    });
    if (version !== opening.current) return;
    setConnectInstance(instance);
  }

  function close() {
    opening.current += 1;
    requestBusy.current = false;
    setOpen(false);
    setBusy(false);
    setConnectInstance(null);
  }

  async function continueToStripe(hosted = false) {
    if (!status || busy || requestBusy.current || (payoutNeedsConfirmation(status) && !eligibleConfirmed)) return;
    requestBusy.current = true;
    setBusy(true);
    setMessage('');
    const version = opening.current;
    try {
      if (hosted || status.payoutsEnabled) {
        const link = await createPayoutLink(status.payoutsEnabled ? 'dashboard' : 'link');
        if (version !== opening.current) return;
        window.location.assign(link.url);
      } else {
        await openEmbedded(version);
      }
    } catch (error) {
      if (version !== opening.current) return;
      setMessage(error instanceof Error ? error.message : 'Payout setup could not be opened.');
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
      setCelebrate(next.payoutsEnabled && firstPayoutsReady());
      setConnectInstance(null);
      notifyDataChanged();
    } catch {
      if (version !== opening.current) return;
      setMessage('Your details may be saved. We couldn’t refresh your payout status. Please try again.');
    } finally {
      if (version === opening.current) { requestBusy.current = false; setBusy(false); }
    }
  }

  return (
    <>
      <button className={`secondary-button${compact ? ' compact-button' : ''}`} onClick={show}>Payout settings</button>
      {open && (
        <ModalShell onClose={close} label="Payout setup" className="payout-dialog flow-page payout-page">
          {!connectInstance && busy ? <PayoutPreparing /> : connectInstance ? <PayoutEmbedded
            key="embedded"
            instance={connectInstance}
            busy={busy}
            message={message}
            onExit={() => void finishEmbedded()}
            onFallback={() => void continueToStripe(true)}
            onBack={() => { setConnectInstance(null); setMessage(''); }}
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
