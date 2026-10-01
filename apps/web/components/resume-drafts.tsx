'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { CloudDraft } from '@litterbugs/report-contract';
import { createClient } from '@/lib/supabase/client';
import { accountDraftSummary, deviceDraftSummary, type DraftSummary } from '@/lib/draft-summary';
import { loadLocalReportDraft } from '@/lib/saved-report-draft';
import { loadLocalCleanupDraft } from '@/lib/saved-cleanup-draft';
import { useDataRefresh } from '@/lib/use-data-refresh';
import { DraftSummaryView } from './draft-comparison';

type Attempt = { id: string; report_id: string };
type Resume = { key: string; href: string; account?: DraftSummary; device?: DraftSummary };
export function ResumeDrafts({ userId, attempts }: { userId: string; attempts: Attempt[] }) {
  const [rows, setRows] = useState<Resume[]>([]);
  const [message, setMessage] = useState('');
  const refresh = useDataRefresh();
  useEffect(() => {
    if (!userId) return;
    let active = true;
    void (async () => {
      // One failed source or malformed record must not hide readable device copies.
      const [remote, report, cleanups] = await Promise.allSettled([
        createClient().from('customer_drafts').select('*').eq('user_id', userId).in('state', ['editing', 'submitting']).gt('expires_at', new Date().toISOString()),
        loadLocalReportDraft(userId),
        Promise.allSettled(attempts.map(async attempt => ({ attempt, draft: await loadLocalCleanupDraft(userId, attempt.id) }))),
      ]);
      const found = new Map<string, Resume>();
      let incomplete = remote.status === 'rejected' || (remote.status === 'fulfilled' && Boolean(remote.value.error)) || report.status === 'rejected';
      for (const record of remote.status === 'fulfilled' ? remote.value.data ?? [] : []) {
        try {
          const summary = accountDraftSummary(record as CloudDraft);
          const attempt = attempts.find(item => record.draft_key === `cleanup:${item.id}`);
          if (summary && (record.draft_key === 'report' || attempt)) found.set(record.draft_key, { key: record.draft_key, account: summary, href: attempt ? `/account/reports/${attempt.report_id}?from=current` : '/report' });
        } catch { incomplete = true; }
      }
      if (report.status === 'fulfilled' && report.value) found.set('report', { ...found.get('report'), key: 'report', href: '/report', device: deviceDraftSummary(report.value) });
      for (const result of cleanups.status === 'fulfilled' ? cleanups.value : []) {
        if (result.status === 'rejected') { incomplete = true; continue; }
        const { attempt, draft } = result.value;
        if (draft) found.set(`cleanup:${attempt.id}`, { ...found.get(`cleanup:${attempt.id}`), key: `cleanup:${attempt.id}`, href: `/account/reports/${attempt.report_id}?from=current`, device: deviceDraftSummary(draft) });
      }
      if (active) { setRows([...found.values()]); setMessage(incomplete ? 'Some saved versions could not be checked. Available copies are shown below; sync is checked when you resume.' : ''); }
    })();
    return () => { active = false; };
  }, [userId, attempts, refresh]);
  if (!rows.length && !message) return null;
  return <section className="resume-drafts member-panel" aria-label="Resume your work"><h2>Resume your work</h2>{message && <p role="status">{message}</p>}{rows.map(row => <article key={row.key}>
    <div className="draft-comparison">{row.account && <section><h3>Saved to your account</h3><DraftSummaryView summary={row.account} /></section>}{row.device && <section><h3>Saved on this device</h3><DraftSummaryView summary={row.device} /></section>}</div>
    <small>{row.device && row.account ? 'Both copies are shown. We check for differences when you resume; saving time alone does not choose a version.' : row.device ? 'Account sync is checked when resumed. Keep this device copy until sync is confirmed.' : 'Sign in to this same account to continue on another device.'}</small>
    <Link className="secondary-button" href={row.href}>{row.key === 'report' ? 'Resume report' : 'Continue cleanup'}</Link>
  </article>)}</section>;
}
