import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { googleSignInNext, isEmbeddedSocialBrowser } from '@/lib/google-browser-handoff';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = googleSignInNext(url.searchParams.get('next') ?? '/account');
  const fallback = new URL('/sign-in', url.origin);
  fallback.searchParams.set('next', next);
  const respond = (destination: string | URL) => {
    const response = NextResponse.redirect(destination, 303);
    response.headers.set('Cache-Control', 'no-store');
    return response;
  };
  // A blocked intent must not start Google inside the same embedded browser.
  if (isEmbeddedSocialBrowser(request.headers.get('user-agent') ?? '')) {
    fallback.searchParams.set('google', 'browser');
    return respond(fallback);
  }
  try {
    const client = await createClient();
    const callback = new URL('/auth/callback', url.origin);
    callback.searchParams.set('next', next);
    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callback.href, skipBrowserRedirect: true },
    });
    if (error || !data.url) throw error ?? new Error('Missing Google authorization URL');
    return respond(data.url);
  } catch {
    fallback.searchParams.set('google', 'retry');
    return respond(fallback);
  }
}
