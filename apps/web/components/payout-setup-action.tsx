'use client';

import { useEffect, useState } from 'react';

import { ModalShell } from '@/components/modal-shell';
import {
  createPayoutLink,
  loadCleanupFeatureFlags,
  loadPayoutStatus,
  type PayoutStatus,
} from '@/lib/funding';

export function PayoutSetupAction({ compact = false }: { compact?: boolean }) {
  const [available, setAvailable] = useState(false);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<PayoutStatus | null>(null);
  const [eligibleConfirmed, setEligibleConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    void loadCleanupFeatureFlags()
      .then((flags) => {
        if (!cancelled) setAvailable(Boolean(flags.payments_enabled));
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  if (!available) return null;

  async function show() {
    setOpen(true);
    setBusy(true);
    setMessage('');
    try {
      setStatus(await loadPayoutStatus());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Payout status could not be loaded.');
    } finally {
      setBusy(false);
    }
  }

  async function continueToStripe() {
    if (!status || busy || (!status.payoutsEnabled && !eligibleConfirmed)) return;
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
      <button className={`secondary-button${compact ? ' compact-button' : ''}`} onClick={show}>Cleanup payouts</button>
      {open && (
        <ModalShell onClose={() => setOpen(false)} label="Cleanup payout setup" className="payout-dialog" closeDisabled={busy}>
          <h2>{status?.payoutsEnabled ? 'Payouts are ready' : 'Set up cleanup payouts'}</h2>
          <p>{status?.payoutsEnabled ? 'Review your payout details securely with Stripe.' : 'Stripe securely verifies your identity and bank details.'}</p>
          {!status?.payoutsEnabled && status && (
            <label className="payout-confirmation">
              <input type="checkbox" checked={eligibleConfirmed} onChange={(event) => setEligibleConfirmed(event.target.checked)} />
              <span>I confirm that I am at least 18 and eligible to receive payouts in the United States.</span>
            </label>
          )}
          {message && <p className="form-message error-message" role="alert">{message}</p>}
          <button className="primary-button" onClick={continueToStripe} disabled={busy || !status || (!status.payoutsEnabled && !eligibleConfirmed)}>
            {busy ? 'Loading…' : status?.payoutsEnabled ? 'Review with Stripe' : 'Continue to Stripe'}
          </button>
        </ModalShell>
      )}
    </>
  );
}
