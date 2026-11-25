import Link from 'next/link';
import { notFound } from 'next/navigation';
import { localCleanupIssueTesting } from '@/lib/local-cleanup-issue-testing';
import { createClient } from '@/lib/supabase/server';
export const metadata={title:'Local cleanup testing | Litterbugs',robots:{index:false,follow:false}};
export const dynamic='force-dynamic';
export default async function Page(){
 const config=await localCleanupIssueTesting();if(!config)notFound();
 const client=await createClient(),{data}=await client.auth.getUser();
 const role=(['cleaner','reporter','outsider'] as const).find(role=>config[role].id===data.user?.id);
 return <main className="account-report-page" style={{maxWidth:650,margin:'0 auto',padding:28}}><h1>Local cleanup testing</h1><p>Isolated test accounts and data. No live report, payment or notification delivery.</p><p>Signed in: <strong>{role??'None'}</strong></p>
 <form action="/api/local/cleanup-issues/session" method="post" style={{display:'flex',gap:12,flexWrap:'wrap'}}>{(['cleaner','reporter','outsider'] as const).map(role=><button className="secondary-button" name="role" value={role} key={role}>Use {role==='outsider'?'other member':role}</button>)}</form>
 <div style={{display:'grid',gap:15,marginTop:28}}><Link href={`/account/reports/${config.reportId}?from=current&task=cleanup`}>Open cleanup</Link><Link href="/account/notifications">Open notifications</Link><Link href={`/reports/${config.reportId}`}>Public report</Link></div></main>;
}
