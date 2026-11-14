import { NextResponse, type NextRequest } from 'next/server';

import { resolvePublicReportRoute } from '@/lib/public-report-route';
import { updateSession } from '@/lib/supabase/proxy';

const PRODUCTION_HOSTS = ['litterbugs.app', 'www.litterbugs.app'];

export async function proxy(request: NextRequest) {
  const production = PRODUCTION_HOSTS.includes(request.nextUrl.hostname);
  if (request.method === 'GET' || request.method === 'HEAD') {
    const route = await resolvePublicReportRoute(request.nextUrl.pathname);
    if (route.kind === 'redirect') {
      const destination = request.nextUrl.clone();
      destination.pathname = route.path;
      // Temporary on purpose: the readable address follows the title and town, which can change,
      // and browsers keep a permanent redirect forever. The page's canonical tag carries the SEO signal.
      const redirect = NextResponse.redirect(destination, 307);
      if (!production) redirect.headers.set('X-Robots-Tag', 'noindex, nofollow');
      return redirect;
    }
    if (route.kind === 'missing') {
      // No page matches this address, so the site's not-found page is served with a real 404.
      const missing = NextResponse.rewrite(new URL('/report-not-found', request.url), { status: 404 });
      missing.headers.set('X-Robots-Tag', 'noindex, nofollow');
      return missing;
    }
  }
  const response = await updateSession(request);
  if (!production) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
