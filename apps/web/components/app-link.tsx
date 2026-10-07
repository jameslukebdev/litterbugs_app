'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { appDownloadPath, beginAppHandoff, reportAppUrl, storeUrlForUserAgent } from '@/lib/app-links';

/** Only attempt an app handoff after a deliberate tap; desktop/no-JS gets a download page. */
export function AppLink({ reportId, children = 'Use app', className }: {
  reportId?: string; children?: ReactNode; className?: string;
}) {
  const cancelHandoff = useRef<(() => void) | null>(null);
  useEffect(() => () => cancelHandoff.current?.(), []);

  return <a href={appDownloadPath(reportId)} className={className} onClick={event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    const store = storeUrlForUserAgent(navigator.userAgent, navigator.maxTouchPoints);
    if (!store) return;
    event.preventDefault();
    cancelHandoff.current?.();
    cancelHandoff.current = beginAppHandoff(reportAppUrl(reportId), store);
  }}>{children}</a>;
}
