'use client';
import { useEffect, useRef, useState } from 'react';
import type { Database } from '@litterbugs/report-contract';
import { createClient } from '@/lib/supabase/client';
import { useDataRefresh } from '@/lib/use-data-refresh';
import { formatUsd } from '@/lib/funding';

type Contribution = Database['public']['Tables']['cleanup_contributions']['Row'];
const messages: Record<string, string> = {
  payment_pending: 'We haven’t confirmed this payment yet. Check its status before paying again.',
  succeeded: 'Your contribution is in the cleanup fund.', paid_out: 'This contribution was included in the cleaner’s reward.',
  failed: 'This payment did not complete.', refund_pending: 'A refund has been requested.',
  refund_processing: 'Your refund is being processed.', refunded: 'The contribution was refunded.',
};
export function PaymentDetail({ contributionId, onOpenReport, standalone = false }: { standalone?: boolean; contributionId: string; onOpenReport: (id: string) => void }) {
  const [item, setItem] = useState<Contribution | null>(null);
  const refresh = useDataRefresh(item?.status === 'payment_pending' ? 10000 : 30000);
  const lastReconcileRef = useRef(0);
  const [message, setMessage] = useState('');
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const client = createClient();
      const { data: auth, error: authError } = await client.auth.getUser();
      if (cancelled) return;
      if (authError || !auth.user) throw new Error('Sign in to view your payment details.');
      if (item?.id === contributionId && item.status === 'payment_pending' && Date.now() - lastReconcileRef.current >= 10000) {
        lastReconcileRef.current = Date.now();
        // A provider outage must not hide the last server-confirmed receipt.
        await client.functions.invoke('check-contribution-status', { body: { contributionId } }).catch(() => undefined);
      }
      const { data, error } = await client.from('cleanup_contributions').select('*').eq('id', contributionId).eq('contributor_id', auth.user.id).maybeSingle();
      if (error || !data) throw new Error('Payment details could not be loaded.');
      if (!cancelled) { setItem(data); setMessage(''); }
    }
    void load().catch(error => { if (!cancelled) setMessage(error.message); });
    return () => { cancelled = true; };
  }, [contributionId, retry, refresh, item?.id, item?.status]);
  async function check() {
    if (busy) return;
    setBusy(true);
    try {
      const { data, error } = await createClient().functions.invoke('check-contribution-status', { body: { contributionId } });
      if (error || data?.error) throw new Error();
      setRetry(value => value + 1);
    } catch { setMessage('We couldn’t confirm this payment. Try again before paying again.'); }
    finally { setBusy(false); }
  }
  const Heading = standalone ? 'h1' : 'h2';
  const AmountHeading = standalone ? 'h2' : 'h3';
  return <section className="payment-detail"><Heading>Payment details</Heading>
    {item ? <><AmountHeading>{formatUsd(item.total_amount_cents)}</AmountHeading><p>{messages[item.status] || 'Payment status unavailable.'}</p><p>{new Date(item.created_at).toLocaleString()}</p><dl className="funding-summary"><div><dt>Cleanup contribution</dt><dd>{formatUsd(item.principal_amount_cents)}</dd></div><div><dt>Service fee</dt><dd>{formatUsd(item.platform_fee_cents)}</dd></div></dl>{item.refunded_at && <p>Refunded {new Date(item.refunded_at).toLocaleString()}</p>}{item.status === 'payment_pending' && <button className="secondary-button" disabled={busy} onClick={check}>{busy ? 'Checking…' : 'Check payment status'}</button>}<button className="primary-button" onClick={() => onOpenReport(item.report_id)}>View report</button></> : !message && <p role="status">Loading payment details…</p>}
    {message && <p role="status">{message}</p>}
    {!item && message && <button className="secondary-button" onClick={() => setRetry(value => value + 1)}>Retry</button>}
    <a href="/help">Payment help</a>
  </section>;
}
