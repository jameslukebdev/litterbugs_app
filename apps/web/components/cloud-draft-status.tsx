'use client';
import { DraftComparison } from '@/components/draft-comparison';
import { useEffect, useState } from 'react';
import type { DraftSyncStatus } from '@litterbugs/report-contract';
import { cloudDrafts } from '@/lib/cloud-drafts';
const copy: Record<DraftSyncStatus,string> = {
  unsaved:'Your draft has not been saved on this device yet.',
  local:'Saved on this device. Account sync is pending.',syncing:'Syncing draft and photos…',synced:'Draft and photos confirmed on your account.',
  offline:'Account sync could not be confirmed. Keep this page open, check the device-save status and retry when connected.',conflict:'This draft differs from your account draft. Choose which version to keep.',submitting:'Submission in progress. Retry to check the original submission.',
};
export function CloudDraftStatus({userId,draftKey,onRestored}:{userId:string;draftKey:string;onRestored?:()=>void}) {
  const [status,setStatus]=useState<DraftSyncStatus>(()=>cloudDrafts.status(userId,draftKey));
  const [busy,setBusy]=useState(false); const [error,setError]=useState('');
  useEffect(()=>{
    const update=()=>{setStatus(cloudDrafts.status(userId,draftKey));};
    queueMicrotask(update);
    const unsubscribe=cloudDrafts.subscribe((owner,key)=>{if(owner===userId&&key===draftKey)update();});
    const timer=setInterval(update,15000);
    return ()=>{unsubscribe();clearInterval(timer);};
  },[userId,draftKey]);
  async function act(choice?:'device'|'account') {
    setBusy(true);setError('');
    try { if(choice) {await cloudDrafts.resolve(userId,draftKey,choice);if(choice==='account')onRestored?.();} else await cloudDrafts.save(userId,draftKey); }
    catch(error){setError(error instanceof Error?error.message:'Your draft could not sync.');}
    finally{setBusy(false);}
  }
  if (!['offline','conflict','submitting'].includes(status) && !error) return null;
  return <section className="cloud-draft-status" aria-label="Draft sync"><p role="status">{copy[status]}</p>{error&&<p role="alert">{error}</p>}
    {status==='conflict' ? <DraftComparison userId={userId} draftKey={draftKey} actions={(ready, available) => <div className="draft-recovery-actions"><button type="button" className="secondary-button" disabled={busy || !ready || !available.account} onClick={()=>void act('account')}>Use account draft</button><button type="button" className="secondary-button" disabled={busy || !ready || !available.device} onClick={()=>void act('device')}>Keep this device’s draft</button></div>} /> :
      ['local','offline'].includes(status)&&<button type="button" className="secondary-button" disabled={busy} onClick={()=>void act()}>Sync now</button>}
    {status==='submitting' && <button type="button" className="secondary-button" disabled={busy} onClick={()=>void act('account')}>Restore submitted draft</button>}
  </section>;
}
