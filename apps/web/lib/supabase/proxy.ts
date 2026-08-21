import { createServerClient } from '@supabase/ssr';
import type { Database } from '@litterbugs/report-contract';
import { type NextRequest, NextResponse } from 'next/server';

import { getSupabaseEnv } from '@/lib/env';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, publishableKey } = getSupabaseEnv();
  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Validates the token with Supabase; never authorize from unvalidated cookies.
  await supabase.auth.getClaims();
  return response;
}
