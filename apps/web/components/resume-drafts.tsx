'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { CloudDraft } from '@litterbugs/report-contract';
import { createClient } from '@/lib/supabase/client';
import { accountDraftSummary, type DraftSummary } from '@/lib/draft-summary';
import { loadLocalReportDraft } from '@/lib/saved-report-draft';
import { loadLocalCleanupDraft } from '@/lib/saved-cleanup-draft';
import { DraftSummaryView } from './draft-comparison';

type Attempt = { id: string; report_id: string };
type Resume = { key: string; href: string; summary: DraftSummary; source: string };
export function ResumeDrafts({ userId, attempts }: { userId: string; attempts: Attempt[] }) {
  const [rows, setRows] = useState<Resume[]>([]);
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!userId) return;
    let active = true;
    void (async () => {
      const [remote, report, cleanups] = await Promise.all([
        createClient().from('customer_drafts').select('*').eq('user_id', userId).in('state', ['editing', 'submitting']).gt('expires_at', new Date().toISOString()),
        loadLocalReportDraft(userId).catch(() => undefined),
        Promise.all(attempts.map(async attempt => ({ attempt, draft: await loadLocalCleanupDraft(userId, attempt.id).catch(() => undefined) }))),
      ]);
      const found = new Map<string, Resume>();
      for (const record of remote.data ?? []) {
        const summary = accountDraftSummary(record as CloudDraft);
        const attempt = attempts.find(item => record.draft_key === `cleanup:${item.id}`);
        if (summary && (record.draft_key === 'report' || attempt)) found.set(record.draft_key, { key: record.draft_key, summary, href: attempt ? `/account/reports/${attempt.report_id}?from=current` : '/report', source: 'Saved to your account' });
      }
      if (report) found.set('report', { key: 'report', href: '/report', summary: { title: report.draft.title || 'Untitled litter report', photos: report.draft.photos.length, savedAt: report.savedAt ? new Date(report.savedAt).toISOString() : undefined, savedOn: 'device', detail: `${report.coordinates.latitude.toFixed(4)}, ${report.coordinates.longitude.toFixed(4)}` }, source: 'Saved copy on this device · sync checked when resumed' });
      for (const { attempt, draft } of cleanups) if (draft) found.set(`cleanup:${attempt.id}`, { key: `cleanup:${attempt.id}`, href: `/account/reports/${attempt.report_id}?from=current`, summary: { title: 'Cleanup evidence', photos: draft.photos.length, savedAt: draft.savedAt ? new Date(draft.savedAt).toISOString() : undefined, savedOn: 'device', detail: draft.description }, source: 'Saved copy on this device · sync checked when resumed' });
      if (active) { setRows([...found.values()]); setMessage(remote.error ? 'Account drafts could not be checked. Any device copies are shown below.' : ''); }
    })().catch(() => { if (active) setMessage('Saved drafts could not be checked. You can still resume from My reports or your current cleanup.'); });
    return () => { active = false; };
  }, [userId, attempts]);
  if (!rows.length && !message) return null;
  return <section className="resume-drafts member-panel" aria-label="Resume your work"><h2>Resume your work</h2>{message && <p role="status">{message}</p>}{rows.map(row => <article key={row.key}><DraftSummaryView summary={row.summary} /><small>{row.source}</small><Link className="secondary-button" href={row.href}>{row.key === 'report' ? 'Resume report' : 'Continue cleanup'}</Link></article>)}</section>;
}
