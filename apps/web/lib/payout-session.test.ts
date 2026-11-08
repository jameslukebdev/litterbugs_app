import { beforeEach, expect, it, vi } from 'vitest';
const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ functions: { invoke } }) }));
import { createPayoutSession } from './funding';
beforeEach(() => { vi.clearAllMocks(); });
it('requests a fresh embedded session without accepting a client-provided Stripe account ID', async () => {
  const data = { clientSecret: 'test_secret', publishableKey: 'pk_test_fixture', expiresAt: Math.floor(Date.now() / 1000) + 300 };
  invoke.mockResolvedValue({ data });
  expect(await createPayoutSession()).toEqual(data);
  expect(invoke).toHaveBeenCalledWith('create-cleaner-onboarding-link', { body: { mode: 'session', returnTarget: 'web', confirmAge18: true } });
});
it('rejects expired, malformed, and failed sessions without revealing server errors', async () => {
  for (const result of [
    { data: { clientSecret: '', publishableKey: 'pk_test_fixture', expiresAt: 1900000000 } },
    { data: { clientSecret: 'test_secret', publishableKey: 'sk_server_only', expiresAt: 1900000000 } },
    { data: { clientSecret: 'test_secret', publishableKey: 'pk_test_fixture', expiresAt: 1 } },
    { error: new Error('Provider internals') },
    { data: { error: 'Secret provider message' } },
  ]) {
    invoke.mockResolvedValue(result);
    await expect(createPayoutSession()).rejects.toThrow('Please retry or continue on Stripe');
  }
});
