import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@litterbugs/report-contract';
import { getSupabaseEnv } from '@/lib/env';

/** Public pages and sitemap always use anonymous RLS, even for a signed-in visitor. */
export function createPublicClient() {
  const { url, publishableKey } = getSupabaseEnv();
  return createClient<Database>(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
