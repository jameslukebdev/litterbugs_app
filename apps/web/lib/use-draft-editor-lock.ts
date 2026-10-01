'use client';
import { useEffect, useState } from 'react';
/** Local photo stores are shared by tabs. Hold one editor per account/slot so
 * a second tab cannot replace the first editor's recovery copy. */
export function useDraftEditorLock(owner: string | null, key: string | null) {
  const [lease,setLease] = useState<{id:string;state:'waiting'|'ready'|'unavailable'}>();
  const id=owner&&key?`${owner}.${key}`:'';
  useEffect(() => {
    if(!id) return;
    let active=true; let release:(()=>void)|undefined;
    if(!navigator.locks) { queueMicrotask(()=>{if(active)setLease({id,state:'ready'});}); return () => {active=false;}; }
    const controller=new AbortController();
    const timer=setTimeout(()=>{if(active)setLease({id,state:'unavailable'});},500);
    void navigator.locks.request(`litterbugs.draft-editor.${id}`,{signal:controller.signal},async () => {
      clearTimeout(timer); if(!active) return;
      setLease({id,state:'ready'}); await new Promise<void>(resolve=>{release=resolve;});
    }).catch(()=>{clearTimeout(timer);if(active)setLease({id,state:'unavailable'});});
    return ()=>{active=false;clearTimeout(timer);controller.abort();release?.();};
  },[id]);
  return lease?.id===id?lease.state:'waiting';
}
