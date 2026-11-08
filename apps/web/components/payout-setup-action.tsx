'use client';

import { useEffect, useState } from 'react';

import { useDataRefresh } from '@/lib/use-data-refresh';
import { ModalShell } from '@/components/modal-shell';
import { PayoutPanel, payoutNeedsConfirmation } from '@/components/payout-panel';

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
    if (!open) return;
    let cancelled = false;
    void loadPayoutStatus().then(value => { if (!cancelled) setStatus(value); }).catch(() => { if (!cancelled) setMessage('Payout status could not be refreshed. Reopen this window to retry.'); });
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
    setOpen(true);
    setBusy(true);
    setMessage('');
    try {
      const next = await loadPayoutStatus();
      setStatus(next);
      setCelebrate(next.payoutsEnabled && firstPayoutsReady());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Payout status could not be loaded.');
    } finally {
      setBusy(false);
    }
  }

  async function continueToStripe() {
    if (!status || busy || (payoutNeedsConfirmation(status) && !eligibleConfirmed)) return;
    setBusy(true);
    setMessage('');
    try {
      const link = await createPayoutLink(status.payoutsEnabled ? 'dashboard' : 'link');
      window.location.assign(link.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Payout setup could not be opened.');
      setBusy(false);
    }
  }

  return (
    <>
      <button className={`secondary-button${compact ? ' compact-button' : ''}`} onClick={show}>Payout settings</button>
      {open && (
        <ModalShell onClose={() => setOpen(false)} label="Payout setup" className="payout-dialog flow-page payout-page" closeDisabled={busy}>
          <PayoutPanel
            status={status}
            eligibleConfirmed={eligibleConfirmed}
            onEligible={setEligibleConfirmed}
            busy={busy}
            message={message}
            onContinue={() => void continueToStripe()}
            celebrate={celebrate}
          />
        </ModalShell>
      )}
    </>
  );
}
