'use client';
import { useSyncExternalStore } from 'react';
const subscribe = (change: () => void) => {
  window.addEventListener('online', change); window.addEventListener('offline', change);
  return () => { window.removeEventListener('online', change); window.removeEventListener('offline', change); };
};
export function ConnectionStatus() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  return online ? null : <div className="connection-status" role="status">You’re offline. Saved device drafts remain available. Reconnect to sync, claim, submit or pay.</div>;
}
