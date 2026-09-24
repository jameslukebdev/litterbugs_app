// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resumeOrCreatePayment } from './payment-attempt';
const { create, from, invoke, row } = vi.hoisted(() => ({ create: vi.fn(), from: vi.fn(), invoke: vi.fn(), row: { value: null as null | { id: string; status: string } } }));
vi.mock('@/lib/funding', () => ({ createCleanupContribution: create }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ from, functions: { invoke } }) }));
beforeEach(() => {
  localStorage.clear(); vi.clearAllMocks(); row.value = null;
  const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: row.value, error: null }) };
  from.mockReturnValue(query);
  create.mockResolvedValue({ contributionId: 'contribution-1' });
});
describe('web contribution recovery', () => {
  it('reuses the persisted request and amount after an uncertain network response', async () => {
    create.mockRejectedValueOnce(new Error('network'));
    await expect(resumeOrCreatePayment('u1', 'r1', 2500)).rejects.toThrow('network');
    await resumeOrCreatePayment('u1', 'r1', 5000);
    expect(create.mock.calls[1]).toEqual(create.mock.calls[0]);
    expect(create.mock.calls[1][1]).toBe(2500);
  });
  it('opens status instead of creating another charge when Stripe is processing', async () => {
    await resumeOrCreatePayment('u1', 'r1', 2500);
    row.value = { id: 'contribution-1', status: 'payment_pending' };
    invoke.mockResolvedValue({ data: { providerState: 'processing' } });
    expect(await resumeOrCreatePayment('u1', 'r1', 2500)).toEqual({ contributionId: 'contribution-1', amount: 2500 });
    expect(create).toHaveBeenCalledTimes(1);
    expect(localStorage.length).toBe(1);
  });
  it('does not create a payment when previous status cannot be checked', async () => {
    await resumeOrCreatePayment('u1', 'r1', 2500);
    row.value = { id: 'contribution-1', status: 'payment_pending' };
    invoke.mockResolvedValue({ error: new Error('offline') });
    await expect(resumeOrCreatePayment('u1', 'r1', 2500)).rejects.toThrow(/confirm/);
    expect(create).toHaveBeenCalledTimes(1);
  });
  it('does not replay an old Stripe idempotency key after its safe retry window', async () => {
    localStorage.setItem('litterbugs-payment:u1:r1', JSON.stringify({ requestId: 'saved-request', amount: 2500, createdAt: Date.now() - 24 * 60 * 60 * 1000 }));
    await expect(resumeOrCreatePayment('u1', 'r1', 2500)).rejects.toThrow(/earlier payment/);
    expect(create).not.toHaveBeenCalled();
  });
  it('keeps attempts isolated between accounts', async () => {
    await resumeOrCreatePayment('u1', 'r1', 2500);
    await resumeOrCreatePayment('u2', 'r1', 500);
    expect(create.mock.calls[0][2]).not.toBe(create.mock.calls[1][2]);
  });
});
