export const APP_STORE_URL = 'https://apps.apple.com/app/id6757313862';
export const GOOGLE_PLAY_URL = 'https://play.google.com/store/apps/details?id=com.litterbugs.app';

export function isInstagramStoreVisit(source: unknown): boolean {
  return source === 'ig' || source === 'instagram';
}

export function storeBadgeProperties(value: Record<string, unknown> | undefined) {
  if (value?.store !== 'app_store' && value?.store !== 'google_play') return null;
  return {
    store: value.store,
    ...(value.campaign === 'instagram' ? { campaign: 'instagram' } : {}),
  };
}

export function storeBadgeDestination(href: string) {
  const url = new URL(href);
  if (url.protocol !== 'https:') return null;
  if (url.origin === 'https://apps.apple.com' && url.pathname === '/app/id6757313862') return 'app_store';
  if (url.origin === 'https://play.google.com' && url.pathname === '/store/apps/details' && url.searchParams.get('id') === 'com.litterbugs.app') return 'google_play';
  return null;
}

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

export function beginAppHandoff(appUrl: string, storeUrl: string, navigate = (url: string) => window.location.assign(url), onFallback?: () => void) {
  const cancel = () => {
    window.clearTimeout(timer);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', cancel);
  };
  const onVisibility = () => { if (document.hidden) cancel(); };
  const timer = window.setTimeout(() => {
    cancel();
    if (!document.hidden) {
      try { onFallback?.(); } catch { /* Optional measurement must not prevent navigation. */ }
      navigate(storeUrl);
    }
  }, 1800);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', cancel);
  navigate(appUrl);
  return cancel;
}
