'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@litterbugs/report-contract';

import { getSupabaseEnv } from '@/lib/env';

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function createClient() {
  if (!client) {
    const { url, publishableKey } = getSupabaseEnv();
    client = createBrowserClient<Database>(url, publishableKey);
  }
  return client;
}
