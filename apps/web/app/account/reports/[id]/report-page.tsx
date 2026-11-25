'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDataRefresh } from '@/lib/use-data-refresh';
import { useEffect } from 'react';
import type { Report } from '@litterbugs/report-contract';
import { cleanupIssuesEnabled } from '@/lib/cleanup-issues';
import styles from '@/components/cleanup-issues.module.css';
import { CleanupAction } from '@/components/cleanup-action';
import { CleanupReviewAction } from '@/components/cleanup-review-action';
import { isDiscoverableReport, isReportClosed } from '@/lib/report-visibility';
export function AccountReport({ report, userId, task, isActiveCleaner=false }: { isActiveCleaner?:boolean; report: Report; userId: string; back: string; task: 'cleanup' | 'review' }) {
  const router = useRouter();
  const revision = useDataRefresh();
  useEffect(() => { if (revision) router.refresh(); }, [revision, router]);
  const base = `/reports/${report.id}`;
  const closed = isReportClosed(report);
  const reviewable = !closed && report.user_id === userId && report.cleanup_state === 'completion_submitted';
  const cleaning = isActiveCleaner && !closed && task === 'cleanup' && ['claimed', 'changes_requested'].includes(report.cleanup_state ?? '');
  const focused = (task === 'review' && reviewable) || cleaning;
  return <main className={`account-report-page ${cleanupIssuesEnabled?styles.accountPage:''} ${styles.focusedPage}`}>
    <Link className="secondary-button account-back-link" href={base}>Back to report</Link>
    <h1>{task === 'cleanup' ? (isActiveCleaner?'Your cleanup':'Cleanup') : 'Review cleanup'}</h1>
    {!isDiscoverableReport(report) && <p>This report is no longer listed on the map.</p>}
    {focused && <p className="account-task-report">{report.title || 'Litter report'}</p>}
    <section className="account-task-workspace" data-task={focused ? 'focused' : task}>{!focused && <><h2>{report.title || 'Litter report'}</h2>
      <p>Current status: {closed ? 'Report closed' : report.cleanup_state === 'claimed' ? 'Cleanup in progress' : report.cleanup_state === 'completion_submitted' ? 'Cleanup photos under review' : report.cleanup_state === 'changes_requested' ? 'Updated evidence requested' : report.cleanup_state === 'completed' ? 'Cleanup complete' : 'Available to clean'}.</p></>}
      {closed ? <p>This cleanup is closed.</p> : task === 'cleanup' ? <CleanupAction key={report.id} workspace report={report} userId={userId} onChanged={() => router.refresh()} /> : reviewable ? <CleanupReviewAction workspace report={report} userId={userId} isOwner onChanged={() => router.refresh()} /> : <p>No cleanup evidence currently needs your review.</p>}
    </section>

  </main>;
}
