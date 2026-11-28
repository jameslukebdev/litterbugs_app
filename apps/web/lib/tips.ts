import { createClient } from '@/lib/supabase/client';
import { edgeFunctionErrorMessage } from '@/lib/funding';

export const MIN_TIP_CENTS = 300;
export const MAX_TIP_CENTS = 100_000;

/** Service fee added on top: 50¢ plus 5%. Must match the backend and the database check. */
export const tipFeeCents = (tipCents: number) => 50 + Math.floor((tipCents + 10) / 20);

/** Whole dollars or dollars and cents, $3 to $1,000. Returns cents, or null when invalid. */
export function parseTipAmount(input: string): number | null {
  const value = input.trim().replace(/^\$/, '');
  if (!/^\d{1,4}(\.\d{1,2})?$/.test(value)) return null;
  const cents = Math.round(Number(value) * 100);
  return cents >= MIN_TIP_CENTS && cents <= MAX_TIP_CENTS ? cents : null;
}

export type TipStart = {
  tipId: string;
  clientSecret: string;
  publishableKey: string;
  tipAmountCents: number;
  platformFeeCents: number;
  totalAmountCents: number;
};

export async function startCleanerTip(input: { cleanerId: string; tipAmountCents: number; clientRequestId: string; receiptEmail?: string }): Promise<TipStart> {
  const { data, error } = await createClient().functions.invoke('create-cleaner-tip', { body: input });
  if (error || data?.error || typeof data?.clientSecret !== 'string' || !/^pk_(live|test)_/.test(data?.publishableKey ?? '')) {
    throw new Error(await edgeFunctionErrorMessage(data, error, 'We couldn’t start your tip. No payment has been made. Please try again.'));
  }
  return data as TipStart;
}
