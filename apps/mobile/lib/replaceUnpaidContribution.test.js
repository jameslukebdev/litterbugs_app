import { describe, expect, it, vi } from 'vitest';
import { replaceUnpaidContribution } from './replaceUnpaidContribution';
const attempt = { clientRequestId: 'old', principalAmountCents: 2500, phase: 'ready', intent: { paymentIntentClientSecret: 'test' } };
const setup = (status) => ({ attempt, principalCents: 500, retrieveIntent: vi.fn(async () => ({ paymentIntent: { status } })), clearAttempt: vi.fn() });
describe('changing an unpaid contribution amount', () => {
  it('reuses the recovery identity when the amount is unchanged', async () => {
    const deps = { ...setup('RequiresPaymentMethod'), principalCents: 2500 };
    expect(await replaceUnpaidContribution(deps)).toBe(attempt);
    expect(deps.retrieveIntent).not.toHaveBeenCalled();
    expect(deps.clearAttempt).not.toHaveBeenCalled();
  });
  it.each(['RequiresPaymentMethod', 'RequiresConfirmation', 'Canceled'])('allows a new amount only after checking %s', async (status) => {
    const deps = setup(status);
    expect(await replaceUnpaidContribution(deps)).toBeNull();
    expect(deps.retrieveIntent).toHaveBeenCalledWith(attempt.intent);
    expect(deps.clearAttempt).toHaveBeenCalledWith('old');
  });
  it.each(['Processing', 'Succeeded', 'RequiresAction', 'RequiresCapture', undefined])('preserves recovery for %s', async (status) => {
    const deps = setup(status);
    await expect(replaceUnpaidContribution(deps)).rejects.toThrow();
    expect(deps.clearAttempt).not.toHaveBeenCalled();
  });
  it('preserves submitted or incomplete attempts', async () => {
    for (const saved of [{ ...attempt, phase: 'submitted' }, { ...attempt, intent: null }]) {
      const deps = { ...setup('RequiresPaymentMethod'), attempt: saved };
      await expect(replaceUnpaidContribution(deps)).rejects.toThrow();
      expect(deps.clearAttempt).not.toHaveBeenCalled();
    }
  });
  it('preserves recovery when Stripe cannot be checked', async () => {
    const deps = setup('RequiresPaymentMethod');
    deps.retrieveIntent.mockResolvedValue({ error: { message: 'offline' } });
    await expect(replaceUnpaidContribution(deps)).rejects.toThrow();
    expect(deps.clearAttempt).not.toHaveBeenCalled();
  });
  it('does not permit replacement if persistence fails', async () => {
    const deps = setup('RequiresPaymentMethod');
    deps.clearAttempt.mockRejectedValue(new Error('storage unavailable'));
    await expect(replaceUnpaidContribution(deps)).rejects.toThrow('storage unavailable');
  });
});
