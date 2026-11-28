import { NextResponse } from 'next/server';

import { authResultDestination, SHARED_REPORT_AUTH_PARAM } from '@/lib/participation-auth';
import { safeNextPath } from '@/lib/safe-next-path';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = safeNextPath(url.searchParams.get('next'));
  const sharedProvider = url.searchParams.get(SHARED_REPORT_AUTH_PARAM);

  try {
    if (code) {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL(authResultDestination(next, true, sharedProvider), url.origin));
    }

  } catch { /* Preserve the existing failure destination on network errors. */ }
  return NextResponse.redirect(new URL(authResultDestination(next, false, sharedProvider), url.origin));
}
