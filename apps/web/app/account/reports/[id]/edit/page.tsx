import { notFound,redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { cleanupIssuesEnabled, issueClient } from '@/lib/cleanup-issues';
import { realUserIdFromClaims } from '@/lib/report-access';
import { ReportContentEditor } from '@/components/report-content-editor';
export const metadata={title:'Edit report | Litterbugs',robots:{index:false,follow:false}};
export default async function Page({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{issue?:string}>}) {
 if(!cleanupIssuesEnabled)notFound();const {id}=await params,{issue}=await searchParams;
 if(!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id))notFound();
 const client=await createClient(),{data:auth}=await client.auth.getClaims();const userId=realUserIdFromClaims(auth?.claims);
 if(!userId)redirect(`/sign-in?next=${encodeURIComponent(`/account/reports/${id}/edit`)}`);
 const {data:report,error}=await client.from('reports').select('*').eq('id',id).eq('user_id',userId).maybeSingle();
 if(error)throw new Error('Your report could not be loaded. Please try again.');
 if(!report?.is_published||(report as typeof report & {moderated_at?:string|null}).moderated_at||report.cancelled_at||!['available','claimed'].includes(report.cleanup_state))notFound();
 let back=`/reports/${id}`;
 if(issue&&/^[0-9a-f-]{36}$/i.test(issue)){
  const {data:thread}=await issueClient(client).from('cleanup_issues').select('id').eq('id',issue).eq('report_id',id).maybeSingle();
  if(thread)back=`/account/cleanup-issues/${thread.id}`;
 }
 return <ReportContentEditor key={`${id}:${userId}`} report={report as typeof report & {content_revision:number;additional_information:string|null}} userId={userId} back={back}/>;
}
