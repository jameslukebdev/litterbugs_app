'use client';
import { useEffect, useState } from 'react';
import { deviceSaveStatus, forgetOtherDeviceSaves, retryDeviceSaves, subscribeDeviceSaves } from '@/lib/device-save-state';
import { createClient } from '@/lib/supabase/client';
export function DeviceSaveStatus() {
  const [status, setStatus] = useState({ pending: false, failed: false });
  useEffect(() => {
    const update = () => setStatus(deviceSaveStatus());
    update();
    const unsubscribe = subscribeDeviceSaves(update);
    const { data } = createClient().auth.onAuthStateChange((_event, session) => forgetOtherDeviceSaves(session?.user.id ?? null));
    const protect = (event: BeforeUnloadEvent) => {
      const current = deviceSaveStatus();
      if (!current.pending && !current.failed) return;
      event.preventDefault(); event.returnValue = '';
    };
    window.addEventListener('beforeunload', protect);
    return () => { data.subscription.unsubscribe(); unsubscribe(); window.removeEventListener('beforeunload', protect); };
  }, []);
  if (!status.pending && !status.failed) return null;
  return <div className="device-save-banner" role={status.failed ? 'alert' : 'status'}>
    {status.failed ? <>A draft could not be saved on this device. Keep this tab open. <button disabled={status.pending} onClick={() => void retryDeviceSaves()}>Retry saving</button></> : 'Saving draft on this device… Keep this tab open until saving finishes.'}
  </div>;
}
