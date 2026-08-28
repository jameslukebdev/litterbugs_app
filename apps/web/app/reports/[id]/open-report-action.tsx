'use client';

const APP_STORE_URL = 'https://apps.apple.com/app/id6757313862';
const GOOGLE_PLAY_URL = 'https://play.google.com/store/apps/details?id=com.litterbugs.app';
const FALLBACK_DELAY_MS = 1400;

export function storeUrlForUserAgent(userAgent: string) {
  if (/android/i.test(userAgent)) return GOOGLE_PLAY_URL;
  if (/iphone|ipad|ipod/i.test(userAgent)) return APP_STORE_URL;
  return null;
}

export function reportAppUrl(reportId: string) {
  return `litterbugs://reports/${encodeURIComponent(reportId)}`;
}

export function OpenReportAction({ reportId, className }: { reportId: string; className?: string }) {
  const openReport = () => {
    const fallback = storeUrlForUserAgent(navigator.userAgent);
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

    const stopFallback = () => {
      if (document.hidden && fallbackTimer) clearTimeout(fallbackTimer);
    };

    document.addEventListener('visibilitychange', stopFallback, { once: true });
    window.location.href = reportAppUrl(reportId);

    if (fallback) {
      fallbackTimer = setTimeout(() => {
        if (!document.hidden) window.location.href = fallback;
      }, FALLBACK_DELAY_MS);
    }
  };

  return (
    <button className={className} type="button" onClick={openReport}>
      Open in Litterbugs
    </button>
  );
}
