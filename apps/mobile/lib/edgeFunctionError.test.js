import { describe, expect, it } from 'vitest';

import { edgeFunctionErrorMessage } from './edgeFunctionError';

describe('Edge Function errors', () => {
  it('reads the server message from a Supabase FunctionsHttpError response', async () => {
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

  it('uses a human fallback when the server response is not JSON', async () => {
    const error = {
      context: new Response('Gateway unavailable', { status: 502 }),
      message: 'Edge Function returned a non-2xx status code',
    };

    await expect(edgeFunctionErrorMessage(null, error, 'Payout setup is temporarily unavailable.'))
      .resolves.toBe('Payout setup is temporarily unavailable.');
  });
});
