'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDataRefresh } from '@/lib/use-data-refresh';
import { useEffect } from 'react';
import type { Report } from '@litterbugs/report-contract';
import { CleanupProgress } from '@/components/cleanup-progress';
import { ReportDetail } from '@/components/report-detail';
import { CleanupAction } from '@/components/cleanup-action';
import { CleanupReviewAction } from '@/components/cleanup-review-action';
import { isDiscoverableReport, isReportClosed } from '@/lib/report-visibility';
export function AccountReport({ report, userId, back, task }: { report: Report; userId: string; back: string; task?: 'cleanup' | 'review' }) {
  const router = useRouter();
  const revision = useDataRefresh();
  useEffect(() => { if (revision) router.refresh(); }, [revision, router]);
  const from = back === '/account/notifications' ? 'notifications' : back === '/account/payments' ? 'payments' : back.includes('history') ? 'history' : back === '/account/activity' ? 'current' : 'reports';
  const base = `/account/reports/${report.id}?from=${from}`;
  const closed = isReportClosed(report);
  return <main className="account-report-page">
    <Link className="secondary-button" href={task ? base : back}>{task ? 'Back to report' : from === 'notifications' ? 'Back to notifications' : 'Back to my activity'}</Link>
    <h1>{task === 'cleanup' ? 'Cleanup workspace' : task === 'review' ? 'Review cleanup' : isDiscoverableReport(report) ? 'Your report activity' : 'Report history'}</h1>
    {!isDiscoverableReport(report) && <p>This report is no longer on the discovery map. Your activity and payment records remain in your account.</p>}
    {task ? <section className="account-task-workspace"><h2>{report.title || 'Litter report'}</h2>
      <p>Current status: {closed ? 'Report closed' : report.cleanup_state === 'claimed' ? 'Cleanup in progress' : report.cleanup_state === 'completion_submitted' ? 'Cleanup photos under review' : report.cleanup_state === 'changes_requested' ? 'Updated evidence requested' : report.cleanup_state === 'completed' ? 'Cleanup complete' : 'Available to clean'}. This page reflects the current task, including updates since an earlier notification.</p>
      {closed ? <p>This cleanup is closed. Your history remains available using Back to report.</p> : task === 'cleanup' ? <CleanupAction key={report.id} workspace report={report} userId={userId} onChanged={() => router.refresh()} /> : report.user_id === userId && report.cleanup_state === 'completion_submitted' ? <CleanupReviewAction workspace report={report} userId={userId} isOwner onChanged={() => router.refresh()} /> : <p>No cleanup evidence currently needs your review.</p>}
    </section> : <><ReportDetail embedded taskBase={base} report={report} userId={userId} isOwner={report.user_id === userId} onClose={() => router.push(back)} onReportChanged={() => router.refresh()} />
      {isDiscoverableReport(report) && <Link className="secondary-button" href={`/?report=${report.id}&returnTo=${encodeURIComponent(back)}`}>Open on map{report.user_id === userId && report.cleanup_state === 'available' && !report.funding_locked_at ? ' to edit or manage' : ''}</Link>}
    </>}
    <CleanupProgress report={report} userId={userId} taskBase={base} />
  </main>;
}
