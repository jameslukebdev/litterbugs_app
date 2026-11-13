'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export const REFRESH_INTERVAL = 5 * 60 * 1000;

export function AnalyticsAutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    let refreshed = Date.now();
    const refresh = () => {
      if (document.visibilityState !== 'visible' || Date.now() - refreshed < REFRESH_INTERVAL) return;
      refreshed = Date.now();
      router.refresh();
    };
    const timer = window.setInterval(refresh, REFRESH_INTERVAL);
    document.addEventListener('visibilitychange', refresh);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, [router]);
  return null;
}
