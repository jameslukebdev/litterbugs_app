import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@litterbugs/report-contract';

export type PayoutSetupState = { ready: boolean | null; started: boolean; ageConfirmed: boolean };

/** One read of the member's own payout row: ready to be paid, setup started, and 18+ already confirmed. */
export async function payoutSetupState(client: SupabaseClient<Database>, userId: string): Promise<PayoutSetupState> {
  const { data, error } = await client.from('cleaner_payout_accounts')
    .select('payouts_enabled,stripe_account_id,onboarding_status,country,age_18_confirmed_at')
    .eq('user_id', userId).maybeSingle();
  if (error) return { ready: null, started: false, ageConfirmed: false };
  return {
    ready: data?.onboarding_status === 'enabled' && data.payouts_enabled && Boolean(data.stripe_account_id)
      && data.country === 'US' && Boolean(data.age_18_confirmed_at),
    started: Boolean(data?.stripe_account_id),
    ageConfirmed: Boolean(data?.age_18_confirmed_at),
  };
}
