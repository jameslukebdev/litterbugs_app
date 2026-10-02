'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Report } from '@litterbugs/report-contract';
import { createClient } from '@/lib/supabase/client';
import { useDataRefresh } from '@/lib/use-data-refresh';
import { cleanupProgress, type ProgressAttempt } from '@/lib/cleanup-progress';
export function CleanupProgress({ report, userId, taskBase }: { report: Report; userId: string; taskBase: string }) {
  const revision = useDataRefresh();
  const [checkedAt,setCheckedAt] = useState(() => Date.now());
  const [retry,setRetry] = useState(0);
  const [result,setResult] = useState<{key:string;attempt:ProgressAttempt|null;error?:boolean}>();
  const key = `${userId}:${report.id}`;
  useEffect(()=>{
    let active=true;
    queueMicrotask(()=>{if(active)setCheckedAt(Date.now());});
    void createClient().from('cleanup_attempts')
      .select('id,cleaner_id,status,claimed_at,claim_expires_at,first_submitted_at,latest_submitted_at,review_due_at,correction_due_at,completed_at,released_at,cancelled_at,expired_at,is_paid,payout_status,financial_review_status,first_paid_admin_status,dispute_status')
      .eq('report_id',report.id).order('claimed_at',{ascending:false}).limit(1).maybeSingle()
      .then(({data,error})=>{if(active)setResult(previous=>({key,attempt:error && previous?.key===key ? previous.attempt : data,error:Boolean(error)}));},()=>{if(active)setResult(previous=>({key,attempt:previous?.key===key?previous.attempt:null,error:true}));});
    return()=>{active=false;};
  },[key,report.id,revision,retry]);
  const current=result?.key===key?result:undefined;
  const progress=cleanupProgress(report,current?.attempt??null,userId);
  return <section className="cleanup-progress member-panel" aria-label="Cleanup progress">
    <h2>Cleanup progress</h2>
    {current?.error && <p role="status">Progress could not be refreshed. Previously loaded dates may be out of date. <button className="secondary-button" onClick={()=>setRetry(value=>value+1)}>Retry progress</button></p>}
    {!current && <p role="status">Loading cleanup dates…</p>}
    {current && <><p className="cleanup-progress-timezone">Dates and deadlines use your local time.</p><ol>{progress.events.map((event,index)=><li key={`${event.label}:${index}`}><strong>{event.label}</strong><time dateTime={event.at}>{new Date(event.at).toLocaleString()}</time></li>)}</ol></>}
    <p>{progress.next}</p>
    {progress.due && <p><strong>Due {new Date(progress.due).toLocaleString()}</strong>{Date.parse(progress.due)<=checkedAt?' — This deadline has passed. Refresh the task before proceeding.':''}</p>}
    {progress.task && <Link className="secondary-button" href={`${taskBase}&task=${progress.task}`}>{progress.task==='review'?'Review cleanup':'Continue cleanup'}</Link>}
    {progress.payment && <div className="cleanup-progress-payment"><h3>Reward status</h3><p>{progress.payment}</p><Link href="/account/connect">View payout account</Link></div>}
  </section>;
}
