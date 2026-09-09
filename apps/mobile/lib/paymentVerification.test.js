import { beforeEach, expect, it, vi } from 'vitest';
const storage = vi.hoisted(() => new Map());
vi.mock('@react-native-async-storage/async-storage', () => ({ default: {
  getItem: vi.fn(async key => storage.get(key) || null),
  setItem: vi.fn(async (key, value) => storage.set(key, value)),
  removeItem: vi.fn(async key => storage.delete(key)),
} }));
import { savePaymentVerification, withPaymentVerification } from './paymentVerification';
import { paymentDisplayStatus } from './contributionPresentation';
const item = { id: 'payment1', status: 'payment_pending', created_at: '2026-01-01' };
beforeEach(() => storage.clear());
it('shares a checked result with history and isolates accounts', async () => {
  await savePaymentVerification('a', item, { providerState: 'requires_payment_method', checkedAt: '2026-09-09' }, 100);
  expect(paymentDisplayStatus(await withPaymentVerification('a', item, 200))).toBe('not_completed');
  expect(paymentDisplayStatus(await withPaymentVerification('b', item, 200))).toBe('needs_check');
});
it('expires cached checks and never overrides a terminal server result', async () => {
  await savePaymentVerification('a', item, { providerState: 'processing' }, 100);
  expect(paymentDisplayStatus(await withPaymentVerification('a', item, 400000))).toBe('needs_check');
  await savePaymentVerification('a', item, { providerState: 'processing' }, 100);
  expect(paymentDisplayStatus(await withPaymentVerification('a', { ...item, status: 'refunded' }, 200))).toBe('refunded');
  expect(storage.size).toBe(0);
});
it('keeps the ledger usable with corrupt local storage', async () => {
  storage.set('payment-check:v1:a:payment1', 'bad-json');
  expect(await withPaymentVerification('a', item)).toEqual(item);
});
