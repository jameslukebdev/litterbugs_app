'use client';
import { DraftComparison } from '@/components/draft-comparison';
import { useEffect, useState } from 'react';
import type { DraftSyncStatus } from '@litterbugs/report-contract';
import { cloudDrafts } from '@/lib/cloud-drafts';
const copy: Record<DraftSyncStatus,string> = {
  unsaved:'Your draft has not been saved on this device yet.',
  local:'Saved on this device. Account sync is pending.',syncing:'Syncing draft and photos…',synced:'Synced to your account. Continue on your phone or computer within 30 days.',
  offline:'Saved on this device. Connect to sync your draft.',conflict:'This draft differs from your account draft. Choose which version to keep.',submitting:'Submission in progress. Retry to check the original submission.',
};
export function CloudDraftStatus({userId,draftKey,onRestored}:{userId:string;draftKey:string;onRestored?:()=>void}) {
  const [status,setStatus]=useState<DraftSyncStatus>(()=>cloudDrafts.status(userId,draftKey));
  const [busy,setBusy]=useState(false); const [error,setError]=useState('');
  useEffect(()=>cloudDrafts.subscribe((owner,key,next)=>{if(owner===userId&&key===draftKey)setStatus(next);}),[userId,draftKey]);
  async function act(choice?:'device'|'account') {
    setBusy(true);setError('');
    try { if(choice) {await cloudDrafts.resolve(userId,draftKey,choice);if(choice==='account')onRestored?.();} else await cloudDrafts.save(userId,draftKey); }
    catch(error){setError(error instanceof Error?error.message:'Your draft could not sync.');}
    finally{setBusy(false);}
  }
  return <section className="cloud-draft-status" aria-label="Draft sync"><p role="status">{copy[status]}</p>{error&&<p role="alert">{error}</p>}
    {status==='conflict' && <DraftComparison userId={userId} draftKey={draftKey} />}
    {status==='conflict'?<div className="draft-recovery-actions"><button type="button" className="secondary-button" disabled={busy} onClick={()=>void act('account')}>Use account draft</button><button type="button" className="secondary-button" disabled={busy} onClick={()=>void act('device')}>Keep this device’s draft</button></div>:
      ['local','offline'].includes(status)&&<button type="button" className="secondary-button" disabled={busy} onClick={()=>void act()}>Sync now</button>}
    {status==='submitting' && <button type="button" className="secondary-button" disabled={busy} onClick={()=>void act('account')}>Restore submitted draft</button>}
    {status === 'synced' && <details><summary>Continue on your phone</summary><p>Sign in to the same account in Litterbugs on your phone. For a report, open Profile → My activity → Continue draft. For cleanup photos, open your current cleanup and continue its evidence form.</p><p>Wait for “Synced to your account” before switching devices. Keep one editor open at a time.</p></details>}
  </section>;
}
