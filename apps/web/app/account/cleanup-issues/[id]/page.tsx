import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { realUserIdFromClaims } from '@/lib/report-access';
import { cleanupIssuesEnabled, issueClient, issueHref } from '@/lib/cleanup-issues';
import { CleanupIssueConversation } from '@/components/cleanup-issue-conversation';

export const metadata={title:'Cleanup issue | Litterbugs',robots:{index:false,follow:false}};
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{id:string}>}) {
 if(!cleanupIssuesEnabled)notFound();
 const {id}=await params;
 if(!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id))notFound();
 const client=await createClient();
 const {data:auth}=await client.auth.getClaims();const userId=realUserIdFromClaims(auth?.claims);
 if(!userId)redirect(`/sign-in?next=${encodeURIComponent(issueHref(id))}`);
 const db=issueClient(client);
 const {data:issue,error}=await db.from('cleanup_issues').select('*').eq('id',id).maybeSingle();
 if(error)throw new Error('This cleanup issue could not be loaded. Please try again.');
 if(!issue)notFound();
 const [report,messages,profiles,admin]=await Promise.all([
  client.from('reports').select('id,title').eq('id',issue.report_id).maybeSingle(),
  db.from('cleanup_issue_messages').select('*').eq('issue_id',id).order('created_at').order('id'),
  client.from('profiles').select('id,display_name').in('id',[issue.reporter_id,issue.cleaner_id].filter((id):id is string=>!!id)),
  client.rpc('is_cleanup_admin'),
 ]);
 if(report.error||messages.error||profiles.error)throw new Error('This cleanup issue could not be loaded. Please try again.');
 const names=Object.fromEntries((profiles.data??[]).map(p=>[p.id,p.display_name||'Member']));
 return <CleanupIssueConversation key={`${id}:${userId}`} initialIssue={issue} initialMessages={messages.data??[]} userId={userId} title={report.data?.title||'Litter report'} names={names} isAdmin={Boolean(admin.data)} />;
}
