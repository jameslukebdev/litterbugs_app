'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import type { Report } from '@litterbugs/report-contract';
import { ReportIssueAccess } from '@/components/cleanup-issue-tools';
import { cleanupIssuesEnabled } from '@/lib/cleanup-issues';
import { realUserId } from '@/lib/report-access';
import { isReportClosed } from '@/lib/report-visibility';
import { createClient } from '@/lib/supabase/client';
import { useDataRefresh } from '@/lib/use-data-refresh';
import styles from './report-account-actions.module.css';

type ActionReport = Pick<Report, 'user_id' | 'cleanup_state' | 'cancelled_at' | 'expired_at' | 'expires_at'>;
type Snapshot = { key: string; report: ActionReport | null; attemptStatus: string | null; failed: boolean };

/** Only the public fallback is server-rendered. Account reads use the viewer's RLS. */
export function ReportAccountActions({ reportId, children }: { reportId: string; children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const [retry, setRetry] = useState(0);
  const revision = useDataRefresh();
  const key = `${reportId}:${userId}`;

  useEffect(() => {
    let active = true;
    let identityRevision = 0;
    const client = createClient();
    void client.auth.getUser().then(({ data }) => {
      if (active && identityRevision === 0) setUserId(realUserId(data.user));
    }).catch(() => {});
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      identityRevision++;
      if (active) setUserId(realUserId(session?.user));
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    const client = createClient();
    void Promise.all([
      client.from('reports').select('user_id,cleanup_state,cancelled_at,expired_at,expires_at')
        .eq('id', reportId).eq('is_published', true).eq('is_sample', false).is('moderated_at', null).maybeSingle(),
      client.from('cleanup_attempts').select('status').eq('report_id', reportId).eq('cleaner_id', userId)
        .order('claimed_at', { ascending: false }).limit(1).maybeSingle(),
    ]).then(([report, attempt]) => {
      if (report.error || attempt.error) throw report.error || attempt.error;
      if (active) setSnapshot({ key, report: report.data, attemptStatus: attempt.data?.status ?? null, failed: false });
    }).catch(() => {
      if (active) setSnapshot({ key, report: null, attemptStatus: null, failed: true });
    });
    return () => { active = false; };
  }, [key, reportId, userId, revision, retry]);

  if (!userId || snapshot?.key !== key) return children;
  if (snapshot.failed) return <>{children}<p role="status" className={styles.error}>Account actions could not be loaded. <button type="button" onClick={() => setRetry(value => value + 1)}>Try again</button></p></>;
  if (!snapshot.report) return children;

  const report = snapshot.report;
  const owner = report.user_id === userId;
  const closed = isReportClosed(report);
  const canEdit = cleanupIssuesEnabled && owner && !closed && ['available', 'claimed'].includes(report.cleanup_state);
  const canContinue = !closed && ['claimed', 'changes_requested'].includes(snapshot.attemptStatus ?? '') && ['claimed', 'changes_requested'].includes(report.cleanup_state);
  const canReview = owner && !closed && report.cleanup_state === 'completion_submitted';
  const submitted = !closed && snapshot.attemptStatus === 'completion_submitted';
  const participant = owner || Boolean(snapshot.attemptStatus);
  const taskBase = `/account/reports/${reportId}`;

  return <div className={styles.actions}>
    {participant && <ReportIssueAccess key={key} reportId={reportId} userId={userId} />}
    {canReview && <Link className="primary-button button-link" href={`${taskBase}?task=review`}>Review cleanup</Link>}
    {canContinue && <Link className="primary-button button-link" href={`${taskBase}?task=cleanup`}>Continue cleanup</Link>}
    {submitted && !canReview && <p className={styles.status}>Cleanup under review</p>}
    {canEdit && <Link className="secondary-button button-link" href={`${taskBase}/edit`}>Edit report</Link>}
    {!canContinue && !canReview && (!canEdit || report.cleanup_state === 'available') && children}
  </div>;
}
