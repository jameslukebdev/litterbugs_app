import { describe, expect, it, vi } from 'vitest';
vi.mock('expo-secure-store', () => ({}));
import { reconcileContribution } from './reconcileContribution';
const attempt = {
  clientRequestId: 'original-key',
  phase: 'submitted',
  intent: { contributionId: 'original-contribution' },
};
const setup = (status, stripeStatus) => ({
  attempt,
  findContribution: vi.fn(async () => ({
    status,
    principal_amount_cents: 1000,
    total_amount_cents: 1100,
  })),
  retrieveIntent: vi.fn(async () => ({
    paymentIntent: { status: stripeStatus },
  })),
  saveAttempt: vi.fn(),
  clearAttempt: vi.fn(),
});
describe('interrupted checkout reconciliation', () => {
  it('resumes the original payment after the app closes while an unpaid sheet is open', async () => {
    const deps = setup('payment_pending', 'RequiresPaymentMethod');
    const result = await reconcileContribution(deps);
    expect(result.attempt).toEqual({ ...attempt, phase: 'ready' });
    expect(deps.findContribution).toHaveBeenCalledWith('original-key');
    expect(deps.saveAttempt).toHaveBeenCalledWith({
      ...attempt,
      phase: 'ready',
    });
  });
  it('blocks a second checkout while Stripe is processing or the webhook has not arrived', async () => {
    for (const status of ['Processing', 'Succeeded', undefined]) {
      const deps = setup('payment_pending', status);
      const result = await reconcileContribution(deps);
      expect(result.attempt.phase).toBe('submitted');
      expect(deps.clearAttempt).not.toHaveBeenCalled();
    }
  });
  it('recovers a confirmed receipt from the server without reopening Stripe', async () => {
    const deps = setup('succeeded');
    const result = await reconcileContribution(deps);
    expect(result.state).toBe('received');
    expect(result.attempt).toBeNull();
    expect(deps.retrieveIntent).not.toHaveBeenCalled();
    expect(deps.clearAttempt).toHaveBeenCalledOnce();
  });
  it('keeps the saved attempt intact when the network fails', async () => {
    const deps = setup('payment_pending');
    deps.findContribution.mockRejectedValue(Error('offline'));
    await expect(reconcileContribution(deps)).rejects.toThrow('offline');
    expect(deps.clearAttempt).not.toHaveBeenCalled();
    expect(deps.saveAttempt).not.toHaveBeenCalled();
  });
  it('does not call a refunded payment a contribution received', async () => {
    const deps = setup('refund_processing');
    expect((await reconcileContribution(deps)).state).toBe('refund');
    expect(deps.retrieveIntent).not.toHaveBeenCalled();
  });
});
