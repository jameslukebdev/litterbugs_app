'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Database } from '@litterbugs/report-contract';
import { createClient } from '@/lib/supabase/client';
import { loadAccountPages } from '@/lib/account-reports';
import { useDataRefresh } from '@/lib/use-data-refresh';
import { formatUsd } from '@/lib/funding';
import { Icon } from '@/components/icon';

type Reward = Pick<Database['public']['Tables']['reporter_rewards']['Row'],
  'cleanup_attempt_id' | 'report_id' | 'amount_cents' | 'status' | 'created_at'> & { report: { title: string | null } | null };
const statusLabel = { pending: 'Pending payout · check your payout settings', processing: 'Sending to Stripe',
  transferred: 'Sent to Stripe', failed: 'Payment needs attention · we’re reviewing it' };

export function ReporterEarnings({ userId }: { userId: string }) {
  const refresh = useDataRefresh();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setFailed(false);
      try {
        const result = await loadAccountPages((start, end) => createClient().from('reporter_rewards')
          .select('cleanup_attempt_id, report_id, amount_cents, status, created_at, report:reports(title)')
          .eq('reporter_id', userId).order('created_at', { ascending: false }).order('cleanup_attempt_id').range(start, end));
        if (result.error) throw result.error;
        if (!cancelled) setRewards(result.data ?? []);
      } catch { if (!cancelled) setFailed(true); }
      finally { if (!cancelled) setLoading(false); }
    }
    void load();
    return () => { cancelled = true; };
  }, [userId, refresh, retry]);
  return <section className="member-panel" aria-label="Reporter earnings">
    <header><div><span className="eyebrow">YOUR REPORT REWARDS</span><h3>Reporter earnings</h3></div></header>
    <p style={{ padding: '0 18px', fontSize: 14, lineHeight: 1.5 }}>Earn 5% of eligible contributions when a report you create leads to an approved, funded cleanup. Your reward comes from the service fee, so the cleaner keeps the full cleanup reward.</p>
    <div className="member-activity-list">
      {loading ? <p className="member-empty" role="status">Loading reporter earnings…</p> : failed ? <button className="secondary-button" onClick={() => setRetry(value => value + 1)}>Retry loading reporter earnings</button> : rewards.length ? rewards.map(reward =>
        <Link key={reward.cleanup_attempt_id} href={`/account/reports/${reward.report_id}?from=payments`} className="member-activity-row member-completed-row">
          <span><strong>{reward.report?.title || 'Completed litter cleanup'}</strong>
            <small>{new Date(reward.created_at).toLocaleDateString()} · Reporter reward</small>
            <small className="member-reward-status">{formatUsd(reward.amount_cents)} · {statusLabel[reward.status]}</small></span>
          <Icon name="chevron-right" />
        </Link>) : <p className="member-empty">No reporter earnings yet. Reporting is free, and you can use the same payout settings for both kinds of reward.</p>}
    </div>
    <p style={{ padding: '0 18px', fontSize: 13, lineHeight: 1.5, color: 'var(--muted)' }}>Receiving rewards requires an eligible US Stripe account and age 18 or older. Bank arrival follows your Stripe payout schedule.</p>
  </section>;
}
