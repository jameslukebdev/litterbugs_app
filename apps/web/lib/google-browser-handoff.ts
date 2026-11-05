import { safeNextPath } from '@/lib/safe-next-path';

export function isEmbeddedSocialBrowser(userAgent: string): boolean {
  return /Instagram|FBAN|FBAV|FB_IAB/i.test(userAgent);
}

export function googleSignInNext(value: unknown): string {
  const next = safeNextPath(value);
  const parsed = new URL(next, 'https://litterbugs.app');
  if (parsed.origin !== 'https://litterbugs.app') return '/';
  const pathname = parsed.pathname;
  return pathname.startsWith('/auth/') || pathname.startsWith('/sign-in') ? '/account' : next;
}

// Only pass a fresh, same-origin entry URL to the external browser. OAuth and
// its PKCE verifier must be created there, never in the Instagram cookie jar.
export function googleBrowserHandoff(origin: string, next: string, userAgent: string): string | null {
  const entry = new URL('/auth/google', origin);
  entry.searchParams.set('next', googleSignInNext(next));
  if (/Android/i.test(userAgent)) {
    const fallback = new URL('/sign-in', origin);
    fallback.searchParams.set('next', googleSignInNext(next));
    fallback.searchParams.set('google', 'browser');
    return `intent://${entry.host}${entry.pathname}${entry.search}#Intent;scheme=${entry.protocol.slice(0, -1)};package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(fallback.href)};end`;
  }
  // Safari's scheme is best effort: Instagram/iOS may refuse the handoff.
  // The original dialog stays usable and displays the manual fallback.
  if (/iPhone|iPad|iPod/i.test(userAgent) && entry.protocol === 'https:') {
    return entry.href.replace(/^https:/, 'x-safari-https:');
  }
  return null;
}
