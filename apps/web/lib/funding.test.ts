import { describe, expect, it } from 'vitest';

import {
  calculatePlatformFee,
  edgeFunctionErrorMessage,
  parseContributionAmount,
} from '@/lib/funding';

describe('web cleanup funding amounts', () => {
  it('accepts the agreed contribution range with at most two decimals', () => {
    expect(parseContributionAmount('5')).toBe(500);
    expect(parseContributionAmount('25.50')).toBe(2550);
    expect(parseContributionAmount('5000')).toBe(500_000);
  });

  it('rejects out-of-range or ambiguous amounts', () => {
    expect(parseContributionAmount('4.99')).toBeNull();
    expect(parseContributionAmount('5000.01')).toBeNull();
    expect(parseContributionAmount('25.555')).toBeNull();
    expect(parseContributionAmount('abc')).toBeNull();
  });

  it('matches the backend half-up 10 percent fee calculation', () => {
    expect(calculatePlatformFee(500)).toBe(50);
    expect(calculatePlatformFee(505)).toBe(51);
    expect(calculatePlatformFee(500_000)).toBe(50_000);
  });

  it('shows the Edge Function response instead of Supabase transport language', async () => {
    const error = {
      context: new Response(JSON.stringify({ error: 'Cleanup payouts are not available yet' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      }),
      message: 'Edge Function returned a non-2xx status code',
    };

    await expect(edgeFunctionErrorMessage(null, error, 'Please try again.'))
      .resolves.toBe('Cleanup payouts are not available yet');
  });

  it('uses a human fallback for non-JSON Edge Function failures', async () => {
    const error = {
      context: new Response('Gateway unavailable', { status: 502 }),
      message: 'Edge Function returned a non-2xx status code',
    };

    await expect(edgeFunctionErrorMessage(null, error, 'Payout setup is temporarily unavailable.'))
      .resolves.toBe('Payout setup is temporarily unavailable.');
  });
});
