import { notificationView, notificationInboxHref, notificationViewQuery } from '@/lib/notification-view';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { realUserIdFromClaims } from '@/lib/report-access';
import { AccountReport } from './report-page';
import { withServerContributorCredits } from '@/lib/server-contributor-credits';

export const metadata = { title: 'Your report | Litterbugs', robots: { index: false, follow: false } };
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string; task?: string; filter?: string; page?: string; notice?: string }> }) {
  const [{ id }, { from, task, filter, page, notice }] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id)) notFound();
  // Old activity, receipt and notification links now open the one public report.
  // Cleanup/review URLs remain focused task forms, never a second report summary.
  if (task !== 'cleanup' && task !== 'review') redirect(`/reports/${id}`);
  const inbox = notificationView({ filter, page });
  const inboxQuery = notificationViewQuery(inbox);
  if (notice) inboxQuery.set('notice', notice);
  const back = from === 'notifications' ? notificationInboxHref(inbox, notice) : from === 'history' ? '/account/activity?view=history' : from === 'current' ? '/account/activity' : from === 'payments' ? '/account/payments' : '/account/reports';
  const client = await createClient();
  const { data: identity } = await client.auth.getClaims();
  const userId = realUserIdFromClaims(identity?.claims);
  if (!userId) redirect(`/sign-in?next=${encodeURIComponent(`/account/reports/${id}?from=${from ?? 'reports'}${from === 'notifications' && inboxQuery.size ? `&${inboxQuery}` : ''}${task === 'cleanup' || task === 'review' ? `&task=${task}` : ''}`)}`);
  // Use the signed-in client's RLS, plus participation checks. History isn't discovery.
  const { data: report, error } = await client.from('reports').select('*').eq('id', id).eq('is_published', true).eq('is_sample', false).maybeSingle();
  if (error) throw new Error('Your report could not be loaded. Please try again.');
  if (!report) notFound();
  let isActiveCleaner=false;
  if (report.user_id !== userId) {
    const [attempts, contributions] = await Promise.all([
      client.from('cleanup_attempts').select('id,status').eq('report_id', id).eq('cleaner_id', userId).order('claimed_at',{ascending:false}).limit(1),
      client.from('cleanup_contributions').select('id').eq('report_id', id).eq('contributor_id', userId).limit(1),
    ]);
    if (attempts.error || contributions.error) throw new Error('Your activity could not be checked. Please try again.');
    if (!attempts.data?.length && !contributions.data?.length) notFound();
    isActiveCleaner=Boolean(attempts.data?.some(attempt=>['claimed','changes_requested','completion_submitted'].includes(attempt.status)));
  }else{
    const {data:attempts,error:attemptError}=await client.from('cleanup_attempts').select('status').eq('report_id',id).eq('cleaner_id',userId).order('claimed_at',{ascending:false}).limit(1);
    if(attemptError)throw new Error('Your cleanup could not be checked. Please try again.');
    isActiveCleaner=Boolean(attempts?.some(attempt=>['claimed','changes_requested','completion_submitted'].includes(attempt.status)));
  }
  const [completeReport] = await withServerContributorCredits([report]);
  return <AccountReport isActiveCleaner={isActiveCleaner} report={completeReport} userId={userId} back={back} task={task} />;
}
