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
type Resume = { key: string; href: string; account?: DraftSummary; device?: DraftSummary; accountStale?: boolean; deviceStale?: boolean };
type Snapshot = { owner: string; rows: Resume[]; message: string };
export function ResumeDrafts({ userId, attempts, onReady }: { userId: string; attempts: Attempt[]; onReady?: (ready: boolean) => void }) {
  const [snapshot, setSnapshot] = useState<Snapshot>({ owner: '', rows: [], message: '' });
  const [retry, setRetry] = useState(0);
  const rows = snapshot.owner === userId ? snapshot.rows : [];
  const message = snapshot.owner === userId ? snapshot.message : '';
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
      const remoteFailed = remote.status === 'rejected' || Boolean(remote.value.error);
      const failedAccountKeys = new Set<string>();
      const failedDeviceKeys = new Set<string>(report.status === 'rejected' ? ['report'] : []);
      let incomplete = remoteFailed || report.status === 'rejected';
      for (const record of remote.status === 'fulfilled' && !remote.value.error ? remote.value.data ?? [] : []) {
        try {
          const summary = accountDraftSummary(record as CloudDraft);
          const attempt = attempts.find(item => record.draft_key === `cleanup:${item.id}`);
          if (summary && (record.draft_key === 'report' || attempt)) found.set(record.draft_key, { key: record.draft_key, account: summary, href: attempt ? `/account/reports/${attempt.report_id}?from=current` : '/report' });
        } catch { incomplete = true; failedAccountKeys.add(record.draft_key); }
      }
      if (report.status === 'fulfilled' && report.value) found.set('report', { ...found.get('report'), key: 'report', href: '/report', device: deviceDraftSummary(report.value) });
      for (const [index, result] of (cleanups.status === 'fulfilled' ? cleanups.value : []).entries()) {
        if (result.status === 'rejected') { incomplete = true; failedDeviceKeys.add(`cleanup:${attempts[index].id}`); continue; }
        const { attempt, draft } = result.value;
        if (draft) found.set(`cleanup:${attempt.id}`, { ...found.get(`cleanup:${attempt.id}`), key: `cleanup:${attempt.id}`, href: `/account/reports/${attempt.report_id}?from=current`, device: deviceDraftSummary(draft) });
      }
      if (cleanups.status === 'rejected') { incomplete = true; attempts.forEach(attempt => failedDeviceKeys.add(`cleanup:${attempt.id}`)); }
      if (active) setSnapshot(previous => {
        const merged = new Map(found);
        // Retain only failed sources for this account. Successful absence is authoritative.
        for (const old of previous.owner === userId ? previous.rows : []) {
          if (old.key !== 'report' && !attempts.some(attempt => old.key === `cleanup:${attempt.id}`)) continue;
          const next: Resume = { ...merged.get(old.key), key: old.key, href: old.href };
          if ((remoteFailed || failedAccountKeys.has(old.key)) && old.account && Date.parse(old.account.expiresAt ?? '') > Date.now()) {
            next.account = old.account; next.accountStale = true;
          }
          if (failedDeviceKeys.has(old.key) && old.device) { next.device = old.device; next.deviceStale = true; }
          if (next.account || next.device) merged.set(old.key, next);
        }
        return { owner: userId, rows: [...merged.values()], message: incomplete ? 'Some saved versions could not be checked. Available copies are shown below; sync is checked when you resume.' : '' };
      });
    })().catch(() => {
      if (active) setSnapshot(previous => ({ owner: userId, rows: previous.owner === userId ? previous.rows : [], message: 'Saved drafts could not be checked. Retry to see your saved work.' }));
    });
    return () => { active = false; };
  }, [userId, attempts, refresh, retry]);
  useEffect(() => {
    if (snapshot.owner === userId && userId) onReady?.(true);
  }, [snapshot.owner, userId, onReady]);
  if (!rows.length && !message) return null;
  return <section className="resume-drafts member-panel" aria-label="Resume your work"><h2>Resume your work</h2>{message && <p role="status">{message} <button type="button" className="secondary-button" onClick={() => setRetry(value => value + 1)}>Retry saved drafts</button></p>}{rows.map(row => <article key={row.key}>
    <div className="resume-draft-copies">{row.account && <div><span className="resume-copy-label">Account copy</span><strong>{row.account.title}</strong><span>{row.account.photos} photo{row.account.photos === 1 ? '' : 's'}</span></div>}{row.device && <div><span className="resume-copy-label">Device copy</span><strong>{row.device.title}</strong><span>{row.device.photos} photo{row.device.photos === 1 ? '' : 's'}</span></div>}</div>
    {row.accountStale && <p role="status">Last known account copy — could not refresh.</p>}
    {row.deviceStale && <p role="status">Last known device copy — could not refresh.</p>}
    <Link className="secondary-button resume-draft-action" href={row.href}>{row.key === 'report' ? 'Resume report' : 'Continue cleanup'}</Link>
    <small>{row.device && row.account ? 'Both copies are kept. We check for differences when you resume.' : row.device ? 'Keep this device copy until account sync is confirmed.' : 'Continue on another device by signing in to this account.'}</small>
    <details className="resume-draft-details"><summary>Saved version details</summary><div className="draft-comparison">{row.account && <section><h3>Saved to your account</h3><DraftSummaryView summary={row.account} omitTitle /></section>}{row.device && <section><h3>Saved on this device</h3><DraftSummaryView summary={row.device} omitTitle /></section>}</div><p>Saving time alone does not choose a version. Copies are compared when you resume.</p></details>
  </article>)}</section>;
}
