'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Report, Database } from '@litterbugs/report-contract';
import { deviceSaveStatus, subscribeDeviceSaves } from '@/lib/device-save-state';
import { cloudDrafts } from '@/lib/cloud-drafts';
import { loadPayoutStatus, loadCleanupFeatureFlags } from '@/lib/funding';
import { isReportClosed } from '@/lib/report-visibility';
import { createClient } from '@/lib/supabase/client';

type PayoutRow = { onboarding_status: string; payouts_enabled: boolean; requirements_due: string[] | null };
export const FINISH_PAYOUT_HREF = '/account/connect?payout=finish';
/** Someone who started payout setup with Stripe and stopped partway gets a nudge to finish it. */
export function payoutReminder(row: PayoutRow | null): Attention | null {
  if (!row || row.payouts_enabled) return null;
  const due = row.requirements_due ?? [];
  const onlyBank = due.length > 0 && due.every(item => item === 'external_account');
  return {
    id: 'payout-finish',
    title: 'Your payouts',
    reason: onlyBank
      ? 'You’re almost done. Stripe just needs your bank details, then you can be paid for cleanups.'
      : 'Pick up where you left off with Stripe. It takes a few minutes, then you can be paid for cleanups.',
    action: 'Finish setup',
    href: FINISH_PAYOUT_HREF,
  };
}

type Attempt = Pick<Database['public']['Tables']['cleanup_attempts']['Row'], 'id' | 'report_id' | 'status' | 'claim_expires_at' | 'correction_due_at' | 'payout_status' | 'is_paid'> & { report: { title: string | null } | null };
type Attention = { id: string; title: string; reason: string; action: string; href: string; due?: string | null };
export function attentionItems(reports: Report[], renewals: Report[], attempts: Attempt[], now = Date.now()): Attention[] {
  const items: Attention[] = [];
  for (const attempt of attempts) {
    const title = attempt.report?.title || 'Your cleanup';
    if (['claimed', 'changes_requested'].includes(attempt.status)) {
      const due = attempt.status === 'changes_requested' ? attempt.correction_due_at : attempt.claim_expires_at;
      items.push({ id: attempt.id, title, reason: due && Date.parse(due) <= now ? 'The deadline has passed. Open your cleanup to check its current status.' : attempt.status === 'changes_requested' ? 'Updated cleanup evidence requested' : 'Your cleanup is ready to continue', action: 'Continue cleanup', href: `/account/reports/${attempt.report_id}?from=current&task=cleanup`, due });
    }
    if (attempt.payout_status === 'failed') items.push({ id: `payout:${attempt.id}`, title, reason: 'Your reward could not be sent. Review the payout details.', action: 'Review payouts', href: '/account/connect' });
  }
  for (const report of reports) if (report.cleanup_state === 'completion_submitted' && !isReportClosed(report, now)) items.push({ id: `review:${report.id}`, title: report.title || 'Your report', reason: 'Someone cleaned up your spot. Check the photos and approve it.', action: 'Review cleanup', href: `/account/reports/${report.id}?from=reports&task=review` });
  for (const report of renewals) if (report.renewal_status === 'decision_required' && Date.parse(report.renewal_decision_due_at ?? '') > now) items.push({ id: `renew:${report.id}`, title: report.title || 'Your report', reason: 'Decide whether to renew this report or close its cleanup fund', action: 'Review renewal', href: `/account/reports?renewal=${encodeURIComponent(report.id)}`, due: report.renewal_decision_due_at });
  return items.sort((a, b) => (a.due ? Date.parse(a.due) : Infinity) - (b.due ? Date.parse(b.due) : Infinity));
}
export function NeedsAttention({ userId, reports, renewals, attempts, incomplete = false }: { incomplete?: boolean; userId: string; reports: Report[]; renewals: Report[]; attempts: Attempt[] }) {
  const [draftIssue, setDraftIssue] = useState(false);
  const [payoutNeeded, setPayoutNeeded] = useState(false);
  const [payoutRow, setPayoutRow] = useState<PayoutRow | null>(null);
  // Members can read their own payout record; a started-but-unfinished setup becomes a reminder.
  useEffect(() => {
    let active = true;
    void loadCleanupFeatureFlags().then(async flags => {
      if (!flags.payments_enabled) return;
      const { data } = await createClient().from('cleaner_payout_accounts').select('onboarding_status, payouts_enabled, requirements_due').eq('user_id', userId).maybeSingle();
      if (active) setPayoutRow(data as PayoutRow | null);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [userId]);
  useEffect(() => {
    const update = () => setDraftIssue(deviceSaveStatus(userId).failed || ['report', ...attempts.map(attempt => `cleanup:${attempt.id}`)].some(key => ['local', 'offline', 'conflict'].includes(cloudDrafts.status(userId, key))));
    // Unknown / untouched drafts must not become attention items merely from a default status.
    const unsubscribe = cloudDrafts.subscribe((owner) => { if (owner === userId) update(); });
    const deviceUnsubscribe = subscribeDeviceSaves(update);
    queueMicrotask(update);
    return () => { unsubscribe(); deviceUnsubscribe(); };
  }, [userId, attempts]);
  const hasPaidWork = attempts.some(attempt => attempt.is_paid && attempt.payout_status !== 'transferred');
  useEffect(() => {
    if (!hasPaidWork) return;
    let active = true;
    void loadCleanupFeatureFlags().then(async flags => {
      if (!flags.payments_enabled) return;
      const status = await loadPayoutStatus();
      if (active) setPayoutNeeded(!status.payoutsEnabled);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [hasPaidWork, attempts]);
  const items = attentionItems(reports, renewals, attempts);
  const finish = payoutReminder(payoutRow);
  if (finish) items.push(finish);
  else if (payoutNeeded && hasPaidWork) items.push({ id: 'setup', title: 'Cleanup payouts', reason: 'Set up payouts so you can be paid for cleanups.', action: 'Set up payouts', href: FINISH_PAYOUT_HREF });
  if (!incomplete && !items.length && !draftIssue) return null;
  return <section className="needs-attention member-panel" aria-label="Needs your attention"><h2>Needs your attention</h2>
    {incomplete && <p role="status">Some activity could not be refreshed. Tasks shown may be out of date; retry the affected sections before assuming there are no actions due.</p>}
    {items.map(item => <article key={item.id}><div><h3>{item.title}</h3><p>{item.reason}</p>{item.due && <time dateTime={item.due}>Due {new Date(item.due).toLocaleString()}</time>}</div><Link className="secondary-button" href={item.href}>{item.action}</Link></article>)}
    {draftIssue && <p role="status">A draft needs saving or syncing. Open its entry in Resume your work to check the saved copies.</p>}
  </section>;
}
