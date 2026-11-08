import { createClient } from '@/lib/supabase/server';
import { localPayoutSession } from '@/lib/local-payout-session';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  return localPayoutSession(request, { createClient, env: process.env, fetch });
}
