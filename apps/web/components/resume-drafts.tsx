'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { IoArrowForwardOutline, IoTrashOutline } from 'react-icons/io5';
import type { CloudDraft } from '@litterbugs/report-contract';
import { createClient } from '@/lib/supabase/client';
import { accountDraftSummary, deviceDraftSummary, type DraftSummary } from '@/lib/draft-summary';
import { clearReportDraft, loadLocalReportDraft } from '@/lib/saved-report-draft';
import { clearCleanupDraft, loadLocalCleanupDraft } from '@/lib/saved-cleanup-draft';
import { useDataRefresh } from '@/lib/use-data-refresh';
import styles from './resume-drafts.module.css';

type Attempt = { id: string; report_id: string };
type Resume = { key: string; href: string; account?: DraftSummary; device?: DraftSummary; accountRevision?: number; accountStale?: boolean; deviceStale?: boolean };
type Snapshot = { owner: string; rows: Resume[]; message: string };
export function ResumeDrafts({ userId, attempts, onReady }: { userId: string; attempts: Attempt[]; onReady?: (ready: boolean) => void }) {
  const [snapshot, setSnapshot] = useState<Snapshot>({ owner: '', rows: [], message: '' });
  const [retry, setRetry] = useState(0);
  const generation = useRef(0);
  const currentOwner = useRef(userId);
  useEffect(() => { currentOwner.current = userId; }, [userId]);
  const [deletion, setDeletion] = useState<{ owner: string; key: string; busy: boolean; error: string } | null>(null);
  const rows = snapshot.owner === userId ? snapshot.rows : [];
  const message = snapshot.owner === userId ? snapshot.message : '';
  const refresh = useDataRefresh();
  useEffect(() => {
    if (!userId) return;
    let active = true;
    const request = ++generation.current;
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
          if (summary && (record.draft_key === 'report' || attempt)) found.set(record.draft_key, { key: record.draft_key, account: summary, accountRevision: record.revision, href: attempt ? `/account/reports/${attempt.report_id}?from=current` : '/report' });
        } catch { incomplete = true; failedAccountKeys.add(record.draft_key); }
      }
      if (report.status === 'fulfilled' && report.value) found.set('report', { ...found.get('report'), key: 'report', href: '/report', device: deviceDraftSummary(report.value) });
      for (const [index, result] of (cleanups.status === 'fulfilled' ? cleanups.value : []).entries()) {
        if (result.status === 'rejected') { incomplete = true; failedDeviceKeys.add(`cleanup:${attempts[index].id}`); continue; }
        const { attempt, draft } = result.value;
        if (draft) found.set(`cleanup:${attempt.id}`, { ...found.get(`cleanup:${attempt.id}`), key: `cleanup:${attempt.id}`, href: `/account/reports/${attempt.report_id}?from=current`, device: deviceDraftSummary(draft) });
      }
      if (cleanups.status === 'rejected') { incomplete = true; attempts.forEach(attempt => failedDeviceKeys.add(`cleanup:${attempt.id}`)); }
      if (active && request === generation.current) setSnapshot(previous => {
        const merged = new Map(found);
        // Retain only failed sources for this account. Successful absence is authoritative.
        for (const old of previous.owner === userId ? previous.rows : []) {
          if (old.key !== 'report' && !attempts.some(attempt => old.key === `cleanup:${attempt.id}`)) continue;
          const next: Resume = { ...merged.get(old.key), key: old.key, href: old.href };
          if ((remoteFailed || failedAccountKeys.has(old.key)) && old.account && Date.parse(old.account.expiresAt ?? '') > Date.now()) {
            next.account = old.account; next.accountStale = true;
            next.accountRevision = old.accountRevision;
          }
          if (failedDeviceKeys.has(old.key) && old.device) { next.device = old.device; next.deviceStale = true; }
          if (next.account || next.device) merged.set(old.key, next);
        }
        return { owner: userId, rows: [...merged.values()], message: incomplete ? 'Some saved reports couldn’t be refreshed. Please try again.' : '' };
      });
    })().catch(() => {
      if (active && request === generation.current) setSnapshot(previous => ({ owner: userId, rows: previous.owner === userId ? previous.rows : [], message: 'Your saved reports couldn’t be loaded. Please try again.' }));
    });
    return () => { active = false; };
  }, [userId, attempts, refresh, retry]);
  useEffect(() => {
    if (snapshot.owner === userId && userId) onReady?.(true);
  }, [snapshot.owner, userId, onReady]);
  async function deleteDraft(row: Resume) {
    if (deletion?.busy) return;
    const owner = userId;
    setDeletion({ owner, key: row.key, busy: true, error: '' });
    try {
      const options = { expectedRevision: row.accountRevision };
      if (row.key === 'report') await clearReportDraft(owner, options);
      else await clearCleanupDraft(owner, row.key.slice(8), options);
      if (currentOwner.current === owner) {
        generation.current++;
        setSnapshot(previous => previous.owner === owner ? { ...previous, rows: previous.rows.filter(item => item.key !== row.key) } : previous);
      }
      setDeletion(current => current?.owner === owner && current.key === row.key ? null : current);
    } catch {
      setDeletion(current => current?.owner === owner && current.key === row.key ? { ...current, busy: false, error: 'This draft couldn’t be deleted. It may have changed. Refresh your saved reports and try again.' } : current);
    }
  }
  if (!rows.length && !message) return null;
  return <section className={styles.section} aria-label="Resume your work">
    <header className={styles.header}><Image src="/brand/ranks/caterpillar.svg" alt="" width={40} height={40} /><h2>Saved drafts</h2></header>
    {message && <p className={styles.notice} role="status">{message} <button type="button" onClick={() => setRetry(value => value + 1)}>Refresh saved reports</button></p>}
    {rows.map(row => {
      // This is a compact preview; the existing resume flow still reconciles
      // differing drafts. Displaying one summary never selects a saved version.
      const summary = (row.device ?? row.account)!;
      const action = deletion?.owner === userId && deletion.key === row.key ? deletion : null;
      return <article className={styles.row} key={row.key}>
        <div className={styles.summary}><h3>{summary.title === 'Untitled litter report' ? 'Litter report' : summary.title === 'Cleanup evidence' ? 'Cleanup in progress' : summary.title}</h3><span>{summary.photos ? `${summary.photos} photo${summary.photos === 1 ? '' : 's'}` : 'No photos yet'}</span></div>
        {action ? <div className={styles.confirm} role="group" aria-label="Delete saved draft">
          <strong>Delete this draft?</strong><p>{row.key === 'report' ? 'Your saved report and photos will be removed. This can’t be undone.' : 'Your saved cleanup details will be removed. Your cleanup will stay active.'}</p>
          {action.error && <p role="alert">{action.error}</p>}
          <div className={styles.actions}><button type="button" disabled={action.busy} onClick={() => setDeletion(null)}>Keep draft</button><button type="button" className={styles.delete} disabled={action.busy} onClick={() => void deleteDraft(row)}>{action.busy ? 'Deleting…' : 'Delete draft'}</button>{action.error && <button type="button" onClick={() => { setDeletion(null); setRetry(value => value + 1); }}>Refresh saved reports</button>}</div>
        </div> : <div className={styles.actions}>
          <Link className={styles.resume} href={row.href}>{row.key === 'report' ? 'Resume report' : 'Continue cleanup'}<IoArrowForwardOutline aria-hidden /></Link>
          <button type="button" className={styles.delete} disabled={Boolean(deletion?.busy)} onClick={() => setDeletion({ owner: userId, key: row.key, busy: false, error: '' })}><IoTrashOutline aria-hidden />Delete draft</button>
        </div>}
      </article>;
    })}
  </section>;
}
