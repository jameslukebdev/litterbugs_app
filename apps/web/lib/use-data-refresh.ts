'use client';
import { useEffect, useState } from 'react';

const DATA_CHANGED = 'litterbugs:data-changed';
export function notifyDataChanged() {
  window.dispatchEvent(new Event(DATA_CHANGED));
}

/** Visible screens catch up within 30 seconds; pending review screens use 5 seconds. */
export function useDataRefresh(intervalMs = 30_000) {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let lastRefresh = 0;
    const refresh = () => {
      if (document.visibilityState === 'hidden' || navigator.onLine === false) return;
      // Browsers often emit focus and visibilitychange together.
      if (Date.now() - lastRefresh < 500) return;
      lastRefresh = Date.now();
      setRevision(value => value + 1);
    };
    const timer = window.setInterval(refresh, intervalMs);
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    window.addEventListener(DATA_CHANGED, refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
      window.removeEventListener(DATA_CHANGED, refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [intervalMs]);
  return revision;
}
