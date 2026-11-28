'use client';

import Link from 'next/link';
import { useEffect, useRef, type ReactNode } from 'react';
import { APP_STORE_URL, appDownloadPath, beginAppHandoff, reportAppUrl, storeUrlForUserAgent } from '@/lib/app-links';
import { trackAppChoice } from '@/lib/website-analytics';

/** Only attempt an app handoff after a deliberate tap; desktop/no-JS gets a download page. */
export function AppLink({ reportId, children = 'Use app', className }: {
  reportId?: string; children?: ReactNode; className?: string;
}) {
  const cancelHandoff = useRef<(() => void) | null>(null);
  useEffect(() => () => cancelHandoff.current?.(), []);

  return <Link href={appDownloadPath(reportId)} className={className} onClick={event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    const store = storeUrlForUserAgent(navigator.userAgent, navigator.maxTouchPoints);
    const destination = reportId ? 'report' : 'map';
    if (!store) { trackAppChoice('download_page_requested', destination); return; }
    event.preventDefault();
    cancelHandoff.current?.();
    const storeName = store === APP_STORE_URL ? 'app_store' : 'google_play';
    trackAppChoice('open_requested', destination, storeName);
    cancelHandoff.current = beginAppHandoff(reportAppUrl(reportId), store, undefined, () => trackAppChoice('store_fallback', destination, storeName));
  }}>{children}</Link>;
}

export function ContinueOnWebsiteLink({ reportId, className }: { reportId?: string; className?: string }) {
  return <Link className={className} href={reportId ? `/map?view=map&report=${encodeURIComponent(reportId)}` : '/map?view=map'}
    onClick={event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      trackAppChoice('website_continued', reportId ? 'report' : 'map');
    }}>Continue on the website</Link>;
}
