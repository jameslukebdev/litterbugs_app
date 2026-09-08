import { beforeEach, describe, expect, it, vi } from 'vitest';
const storage = vi.hoisted(() => new Map());
vi.mock('expo-secure-store', () => ({
  setItemAsync: vi.fn(async (k, v) => storage.set(k, v)),
  getItemAsync: vi.fn(async (k) => storage.get(k)),
  deleteItemAsync: vi.fn(async (k) => storage.delete(k)),
}));
import {
  savePaymentAttempt,
  loadPaymentAttempt,
  clearPaymentAttempt,
  paymentRecoveryState,
} from './contributionRecovery';
describe('payment recovery across navigation and restart', () => {
  beforeEach(() => storage.clear());
  it('preserves the same request and contribution before and after Stripe opens', async () => {
    const attempt = {
      clientRequestId: 'same-request',
      principalAmountCents: 1000,
      phase: 'submitted',
      intent: { contributionId: 'contribution-1' },
    };
    await savePaymentAttempt('alice', 'report-1', attempt);
    expect(await loadPaymentAttempt('alice', 'report-1')).toEqual(attempt);
    expect(await loadPaymentAttempt('bob', 'report-1')).toBeNull();
    expect(await loadPaymentAttempt('alice', 'report-2')).toBeNull();
    await clearPaymentAttempt('alice', 'report-1');
    expect(await loadPaymentAttempt('alice', 'report-1')).toBeNull();
  });
  it('ignores a late confirmation for an older attempt and rejects stale updates', async () => {
    await savePaymentAttempt('alice', 'report-1', { clientRequestId: 'new' });
    await clearPaymentAttempt('alice', 'report-1', 'old');
    expect((await loadPaymentAttempt('alice', 'report-1')).clientRequestId).toBe('new');
    await expect(savePaymentAttempt('alice', 'report-1', { clientRequestId: 'old' }, { updating: true })).rejects.toThrow('changed');
  });
  it('never interprets unknown or pending server status as a failed payment', () => {
    for (const status of [
      undefined,
      null,
      'payment_pending',
      'new-server-status',
    ])
      expect(paymentRecoveryState(status)).toBe('pending');
    for (const status of ['succeeded', 'paid_out'])
      expect(paymentRecoveryState(status)).toBe('received');
    for (const status of ['refund_pending', 'refund_processing', 'refunded'])
      expect(paymentRecoveryState(status)).toBe('refund');
    expect(paymentRecoveryState('failed')).toBe('failed');
  });
});
