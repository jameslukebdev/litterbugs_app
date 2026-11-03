'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Report, Database } from '@litterbugs/report-contract';
import { deviceSaveStatus, subscribeDeviceSaves } from '@/lib/device-save-state';
import { cloudDrafts } from '@/lib/cloud-drafts';
import { loadPayoutStatus, loadCleanupFeatureFlags } from '@/lib/funding';
import { isReportClosed } from '@/lib/report-visibility';

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
  for (const report of reports) if (report.cleanup_state === 'completion_submitted' && !isReportClosed(report, now)) items.push({ id: `review:${report.id}`, title: report.title || 'Your report', reason: 'Cleanup evidence is ready for your review', action: 'Review cleanup', href: `/account/reports/${report.id}?from=reports&task=review` });
  for (const report of renewals) if (report.renewal_status === 'decision_required' && Date.parse(report.renewal_decision_due_at ?? '') > now) items.push({ id: `renew:${report.id}`, title: report.title || 'Your report', reason: 'Decide whether to renew this report or close its cleanup fund', action: 'Review renewal', href: `/account/reports?renewal=${encodeURIComponent(report.id)}`, due: report.renewal_decision_due_at });
  return items.sort((a, b) => (a.due ? Date.parse(a.due) : Infinity) - (b.due ? Date.parse(b.due) : Infinity));
}
export function NeedsAttention({ userId, reports, renewals, attempts, incomplete = false }: { incomplete?: boolean; userId: string; reports: Report[]; renewals: Report[]; attempts: Attempt[] }) {
  const [draftIssue, setDraftIssue] = useState(false);
  const [payoutNeeded, setPayoutNeeded] = useState(false);
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
  if (payoutNeeded && hasPaidWork) items.push({ id: 'setup', title: 'Cleanup payouts', reason: 'Finish payout setup so you can receive eligible rewards.', action: 'Set up payouts', href: '/account/connect' });
  if (!incomplete && !items.length && !draftIssue) return null;
  return <section className="needs-attention member-panel" aria-label="Needs your attention"><h2>Needs your attention</h2><p>Current tasks and deadlines. Reading a notification does not complete a task.</p>
    {incomplete && <p role="status">Some activity could not be refreshed. Tasks shown may be out of date; retry the affected sections before assuming there are no actions due.</p>}
    {items.map(item => <article key={item.id}><div><h3>{item.title}</h3><p>{item.reason}</p>{item.due && <time dateTime={item.due}>Due {new Date(item.due).toLocaleString()}</time>}</div><Link className="secondary-button" href={item.href}>{item.action}</Link></article>)}
    {draftIssue && <p role="status">A draft needs saving or syncing. Open its entry in Resume your work to check the saved copies.</p>}
  </section>;
}
