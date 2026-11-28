import { NextResponse, type NextRequest } from 'next/server';

import { resolveMissingPage } from '@/lib/missing-page-route';
import { resolvePublicReportRoute } from '@/lib/public-report-route';
import { localOccurrence } from '@/lib/local-site-store';
import { publicReportIdFromSlug } from '@/lib/public-report-url';
import { updateSession } from '@/lib/supabase/proxy';

const PRODUCTION_HOSTS = ['litterbugs.app', 'www.litterbugs.app'];

export async function proxy(request: NextRequest) {
  const production = PRODUCTION_HOSTS.includes(request.nextUrl.hostname);
  const path = request.nextUrl.pathname;
  const localId = path.match(/^\/reports\/([0-9a-f-]{36})$/i)?.[1]
    ?? (path.startsWith('/litter-reports/') ? publicReportIdFromSlug(path.slice('/litter-reports/'.length)) : null);
  const localReport = process.env.NODE_ENV === 'development' && !process.env.VERCEL
    && ['localhost', '127.0.0.1', '[::1]'].includes(request.nextUrl.hostname)
    && localId && await localOccurrence(localId);
  if (!localReport && (request.method === 'GET' || request.method === 'HEAD')) {
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
    // No page matches this address (a missing report, tip, member, site, town or archive page),
    // so the site's not-found page is served with a real 404 before anything streams.
    if (route.kind === 'missing' || await resolveMissingPage(request.nextUrl) === 'missing') {
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
