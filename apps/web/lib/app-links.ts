export const APP_STORE_URL = 'https://apps.apple.com/app/id6757313862';
export const GOOGLE_PLAY_URL = 'https://play.google.com/store/apps/details?id=com.litterbugs.app';

export function storeUrlForUserAgent(userAgent: string, touchPoints = 0) {
  if (/android/i.test(userAgent)) return GOOGLE_PLAY_URL;
  if (/iphone|ipad|ipod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && touchPoints > 1)) return APP_STORE_URL;
  return null;
}

export function reportAppUrl(reportId?: string) {
  return reportId ? `litterbugs://reports/${encodeURIComponent(reportId)}` : 'litterbugs://';
}

export function appDownloadPath(reportId?: string) {
  return reportId ? `/get-app?report=${encodeURIComponent(reportId)}` : '/get-app';
}

export function beginAppHandoff(appUrl: string, storeUrl: string, navigate = (url: string) => window.location.assign(url)) {
  const cancel = () => {
    window.clearTimeout(timer);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', cancel);
  };
  const onVisibility = () => { if (document.hidden) cancel(); };
  const timer = window.setTimeout(() => {
    cancel();
    if (!document.hidden) navigate(storeUrl);
  }, 1800);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', cancel);
  navigate(appUrl);
  return cancel;
}
