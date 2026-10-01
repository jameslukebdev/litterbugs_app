'use client';
import { useRouter } from 'next/navigation';
import type { Report } from '@litterbugs/report-contract';
import { ReportDetail } from '@/components/report-detail';
export function AccountReport({ report, userId, back }: { report: Report; userId: string; back: string }) {
  const router = useRouter();
  return <main className="account-report-page"><h1>Report history</h1><p>This report is no longer on the discovery map. Your activity and payment records remain in your account.</p>
    <ReportDetail embedded report={report} userId={userId} isOwner={report.user_id === userId} onClose={() => router.push(back)} onEdit={() => {}} onDelete={() => {}} />
  </main>;
}
