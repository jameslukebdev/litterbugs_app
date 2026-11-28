import { beforeEach, describe, expect, it, vi } from 'vitest';
const invoke = vi.hoisted(() => vi.fn());
vi.mock('./supabase', () => ({ supabase: { functions: { invoke } } }));
vi.mock('./paymentVerification', () => ({ savePaymentVerification: vi.fn(), withPaymentVerification: vi.fn() }));
import { createCleanupContribution } from './funding';

describe('named native checkout', () => {
  const request = { reportId: 'report', principalAmountCents: 2500, clientRequestId: 'same-request', pricingVersion: 2 };
  beforeEach(() => invoke.mockReset());
  it.each([true, false])('sends and verifies the saved name choice: %s', async shown => {
    invoke.mockResolvedValue({ data: { contributionId: 'donation', showContributorName: shown } });
    await createCleanupContribution({ ...request, showContributorName: shown });
    expect(invoke).toHaveBeenCalledWith('create-cleanup-contribution', { body: { ...request, showContributorName: shown } });
  });
  it('shows names by default', async () => {
    invoke.mockResolvedValue({ data: { showContributorName: true } });
    await createCleanupContribution(request);
    expect(invoke.mock.calls[0][1].body.showContributorName).toBe(true);
  });
  it.each([true, null, undefined])('stops before payment if an anonymous choice is not confirmed: %s', async returned => {
    invoke.mockResolvedValue({ data: { showContributorName: returned } });
    await expect(createCleanupContribution({ ...request, showContributorName: false })).rejects.toThrow('could not be verified');
  });
});
