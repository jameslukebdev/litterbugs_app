import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { realUserIdFromClaims } from '@/lib/report-access';
import { AccountReport } from './report-page';

export const metadata = { title: 'Your report | Litterbugs', robots: { index: false, follow: false } };
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string; task?: string }> }) {
  const [{ id }, { from, task }] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id)) notFound();
  const back = from === 'notifications' ? '/account/notifications' : from === 'history' ? '/account/activity?view=history' : from === 'current' ? '/account/activity' : from === 'payments' ? '/account/payments' : '/account/reports';
  const client = await createClient();
  const { data: identity } = await client.auth.getClaims();
  const userId = realUserIdFromClaims(identity?.claims);
  if (!userId) redirect(`/sign-in?next=${encodeURIComponent(`/account/reports/${id}?from=${from ?? 'reports'}${task === 'cleanup' || task === 'review' ? `&task=${task}` : ''}`)}`);
  // Use the signed-in client's RLS, plus participation checks. History isn't discovery.
  const { data: report, error } = await client.from('reports').select('*').eq('id', id).eq('is_published', true).eq('is_sample', false).maybeSingle();
  if (error) throw new Error('Your report could not be loaded. Please try again.');
  if (!report) notFound();
  if (report.user_id !== userId) {
    const [attempts, contributions] = await Promise.all([
      client.from('cleanup_attempts').select('id').eq('report_id', id).eq('cleaner_id', userId).limit(1),
      client.from('cleanup_contributions').select('id').eq('report_id', id).eq('contributor_id', userId).limit(1),
    ]);
    if (attempts.error || contributions.error) throw new Error('Your activity could not be checked. Please try again.');
    if (!attempts.data?.length && !contributions.data?.length) notFound();
  }
  return <AccountReport report={report} userId={userId} back={back} task={task === 'cleanup' || task === 'review' ? task : undefined} />;
}
